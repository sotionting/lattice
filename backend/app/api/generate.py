"""
生成接口 — 支持图片生成（Google Imagen 3 / Gemini）和视频生成（Google Veo）

图片接口：
  POST /generate/image — 调用图片模型生成图片，返回 base64 DataURL 列表

视频接口：
  POST /generate/video — 提交 Veo 视频生成任务（异步轮询，最长 5 分钟）
                         生成完毕后保存 MP4 文件，返回文件名和对话 ID
  GET  /generate/video/file/{filename} — 凭 JWT 访问生成的视频文件
                                          （<video> 标签无法加 Auth Header，改用 ?token=xxx）
"""
import asyncio
import base64
import os
import uuid
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from jose import JWTError, jwt as jose_jwt
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import settings
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.generation import GenerationRecord
from app.models.model_config import ModelConfig
from app.models.user import User

router = APIRouter()

# Google Generative Language API 基础地址
GOOGLE_BASE = "https://generativelanguage.googleapis.com/v1beta"

# 视频文件存储目录（与 resources 同挂载卷）
VIDEO_DIR = "/app/uploads/videos"


# ── 请求体定义 ────────────────────────────────────────────────────────────────

class ImageGenRequest(BaseModel):
    prompt: str                        # 图片描述文字（必填）
    model_id: Optional[str] = None    # ModelConfig UUID；None 时自动选默认图片模型
    image_data: Optional[str] = None  # 参考图 DataURL（图生图）；None 时纯文生图


class VideoGenRequest(BaseModel):
    prompt: str                        # 视频描述文字（必填）
    model_id: Optional[str] = None    # ModelConfig UUID；None 时自动选默认视频模型
    image_data: Optional[str] = None  # 可选参考图 DataURL（图生视频，部分 Veo 模型支持）


# ── 工具函数 ──────────────────────────────────────────────────────────────────

def _build_base(m: ModelConfig) -> str:
    """从 ModelConfig 取 base_url，没填则使用 Google 默认地址"""
    return m.base_url.rstrip("/") if m.base_url else GOOGLE_BASE


def _find_model(db: Session, model_id: Optional[str], model_type: str) -> ModelConfig:
    """按 model_id 或默认规则查找指定类型的模型配置，找不到时抛出 400"""
    if model_id:
        m = db.query(ModelConfig).filter(
            ModelConfig.id == model_id,
            ModelConfig.model_type == model_type,
            ModelConfig.is_active == True,
        ).first()
    else:
        m = (
            db.query(ModelConfig)
            .filter(ModelConfig.model_type == model_type, ModelConfig.is_active == True)
            .order_by(ModelConfig.is_default.desc())
            .first()
        )

    type_label = {"image": "图片", "video": "视频"}.get(model_type, model_type)
    if not m:
        raise HTTPException(
            status_code=400,
            detail=f"未找到可用的{type_label}生成模型，请先在「模型管理」页面添加{type_label}模型",
        )
    if not m.api_key:
        raise HTTPException(status_code=400, detail=f"{type_label}模型未配置 API Key")
    return m


# ── 图片生成（Image）────────────────────────────────────────────────────────

async def _call_imagen(m: ModelConfig, prompt: str) -> list[str]:
    """
    Imagen 3 API：POST .../models/{model_id}:predict
    返回 predictions[].{bytesBase64Encoded, mimeType}
    """
    base = _build_base(m)
    url = f"{base}/models/{m.model_id}:predict?key={m.api_key}"
    payload = {
        "instances": [{"prompt": prompt}],
        "parameters": {"sampleCount": 1},
    }
    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(url, json=payload)

    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Imagen API 错误: {resp.text[:400]}")

    images: list[str] = []
    for pred in resp.json().get("predictions", []):
        b64 = pred.get("bytesBase64Encoded")
        mime = pred.get("mimeType", "image/png")
        if b64:
            images.append(f"data:{mime};base64,{b64}")  # 拼成 DataURL 格式
    return images


async def _call_gemini(m: ModelConfig, prompt: str, image_data: str | None = None) -> tuple[list[str], str]:
    """
    Gemini generateContent API：POST .../models/{model_id}:generateContent
    仅支持 image/png 输出；image_data 非 None 时走图生图模式
    """
    base = _build_base(m)
    url = f"{base}/models/{m.model_id}:generateContent?key={m.api_key}"

    parts: list[dict] = []
    if image_data and "," in image_data:
        header, b64 = image_data.split(",", 1)
        mime = header.split(":")[1].split(";")[0]        # 提取 MIME 类型（image/png 等）
        parts.append({"inline_data": {"mime_type": mime, "data": b64}})
    parts.append({"text": prompt})

    payload = {
        "contents": [{"parts": parts}],
        "generationConfig": {"responseModalities": ["TEXT", "IMAGE"]},
    }
    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(url, json=payload)

    if resp.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=(
                f"Gemini API 错误: {resp.text[:400]}"
                "（若报 'Unhandled generated data mime type: image/jpeg'，请改用 Imagen 模型）"
            ),
        )

    data = resp.json()
    try:
        parts = data["candidates"][0]["content"]["parts"]
    except (KeyError, IndexError):
        raise HTTPException(status_code=502, detail="Gemini API 返回格式异常")

    images: list[str] = []
    text = ""
    for part in parts:
        if "inlineData" in part:
            mime = part["inlineData"]["mimeType"]
            b64 = part["inlineData"]["data"]
            images.append(f"data:{mime};base64,{b64}")
        elif "text" in part:
            text = part["text"]

    return images, text


@router.post("/image")
async def generate_image(
    body: ImageGenRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """调用图片模型生成图片，返回 base64 DataURL 列表"""
    m = _find_model(db, body.model_id, "image")

    # Imagen（imagen-* 前缀）走 :predict 端点；其余 Gemini 走 :generateContent
    is_imagen = m.model_id.lower().startswith("imagen")
    if is_imagen:
        images = await _call_imagen(m, body.prompt)
        text = ""
    else:
        images, text = await _call_gemini(m, body.prompt, body.image_data)

    if not images:
        raise HTTPException(status_code=502, detail="图片生成失败，API 未返回图片数据")

    # ── 保存到生成记录（生成的内容不进入对话，只保存到生成记录表） ──────────
    for img_url in images:
        gen = GenerationRecord(
            user_id=current_user.id,
            type='image',
            url=img_url,
            prompt=body.prompt,
            model_name=m.name,
            model_id=str(m.id),
        )
        db.add(gen)

    db.commit()

    return {"code": 200, "message": "success", "data": {
        "images": images,
        "text": text,
    }}


# ── 视频生成（Video / Veo）──────────────────────────────────────────────────

async def _call_veo(m: ModelConfig, prompt: str, image_data: str | None = None) -> str:
    """
    Google Veo API — 两步式异步生成：
      步骤一：POST /models/{model_id}:predictLongRunning → 提交任务，得到 operation name
      步骤二：GET  /{operation_name}                     → 轮询，直到 done:true
    返回：保存在 VIDEO_DIR 下的 MP4 文件名（含扩展名）

    注意：
      - 视频生成通常需要 1~5 分钟，frontend 需设置足够长的 axios timeout
      - nginx proxy_read_timeout 也需要调大（已在 nginx.conf 中设为 600s）
    """
    base = _build_base(m)
    submit_url = f"{base}/models/{m.model_id}:predictLongRunning?key={m.api_key}"

    # 构建请求体：可选参考图（图生视频）
    instance: dict = {"prompt": prompt}
    if image_data and "," in image_data:
        header, b64 = image_data.split(",", 1)
        mime = header.split(":")[1].split(";")[0]
        instance["image"] = {"bytesBase64Encoded": b64, "mimeType": mime}

    payload = {
        "instances": [instance],
        "parameters": {
            "aspectRatio": "16:9",   # 宽高比
            "durationSeconds": 8,    # 视频时长（秒）
            "sampleCount": 1,        # 生成数量
        },
    }

    # ── 步骤一：提交任务 ────────────────────────────────────────────────────
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(submit_url, json=payload)

    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Veo API 提交任务失败: {resp.text[:400]}")

    operation_name = resp.json().get("name")
    if not operation_name:
        raise HTTPException(status_code=502, detail=f"Veo API 未返回任务 ID，响应: {resp.text[:200]}")

    # ── 步骤二：轮询任务状态（每 5 秒，最多 60 次 = 5 分钟）─────────────────
    # operation_name 格式通常为 "operations/xxx"，直接拼在 base 后面
    poll_url = f"{base}/{operation_name}?key={m.api_key}"

    for attempt in range(60):
        await asyncio.sleep(5)  # 等 5 秒再查询

        async with httpx.AsyncClient(timeout=30) as client:
            poll_resp = await client.get(poll_url)

        if poll_resp.status_code != 200:
            continue  # 网络抖动，跳过这次继续轮询

        poll_data = poll_resp.json()

        if not poll_data.get("done"):
            continue  # 任务尚未完成，继续等待

        # ── 任务完成，提取视频数据（可能是 base64 或 URL） ──────────────────
        try:
            response_data = poll_data.get("response", {})

            # 格式一：新 Veo API 返回 generateVideoResponse.generatedSamples[].video.uri
            if "generateVideoResponse" in response_data:
                video_uri = response_data["generateVideoResponse"]["generatedSamples"][0]["video"]["uri"]
                # 下载视频
                async with httpx.AsyncClient(timeout=120) as client:
                    video_resp = await client.get(video_uri)
                if video_resp.status_code != 200:
                    raise HTTPException(status_code=502, detail=f"下载 Veo 视频失败: {video_resp.status_code}")
                video_data = video_resp.content
                ext = "mp4"  # Veo 通常返回 MP4
            # 格式二：旧格式返回 predictions[].bytesBase64Encoded
            elif "predictions" in response_data:
                predictions = response_data["predictions"]
                b64_video = predictions[0]["bytesBase64Encoded"]
                mime = predictions[0].get("mimeType", "video/mp4")
                video_data = base64.b64decode(b64_video)
                ext = "webm" if "webm" in mime else "mp4"
            else:
                raise HTTPException(
                    status_code=502,
                    detail=f"Veo API 返回格式异常: {str(response_data)[:400]}",
                )
        except HTTPException:
            raise
        except (KeyError, IndexError, TypeError) as e:
            raise HTTPException(
                status_code=502,
                detail=f"Veo API 返回格式异常: {str(poll_data)[:400]}",
            )

        # ── 保存到磁盘 ───────────────────────────────────────────────────
        os.makedirs(VIDEO_DIR, exist_ok=True)
        file_id = str(uuid.uuid4())
        filename = f"{file_id}.{ext}"
        filepath = os.path.join(VIDEO_DIR, filename)

        with open(filepath, "wb") as f:
            f.write(video_data)

        return filename  # 返回文件名，调用方存入 DB 和 response

    raise HTTPException(
        status_code=504,
        detail="Veo 视频生成超时（最长等待 5 分钟）。Veo API 可能负载较高，请稍后重试。",
    )


@router.post("/video")
async def generate_video(
    body: VideoGenRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    调用视频模型（Google Veo）生成视频。
    - 异步等待 Veo API 完成（最长约 5 分钟）
    - 生成完成后保存 MP4 到 /app/uploads/videos/
    - 创建对话记录，assistant 消息存 [VIDEO_FILE]{filename}[/VIDEO_FILE]
    - 返回 { video_filename, conversation_id }
    """
    m = _find_model(db, body.model_id, "video")

    # 调用 Veo API，内部完成提交 + 轮询 + 文件保存
    filename = await _call_veo(m, body.prompt, body.image_data)

    # ── 保存到生成记录（生成的内容不进入对话，只保存到生成记录表） ──────────
    # 视频 URL 为相对路径，前端通过 /generate/video/file/{filename} 访问
    gen = GenerationRecord(
        user_id=current_user.id,
        type='video',
        url=filename,
        prompt=body.prompt,
        model_name=m.name,
        model_id=str(m.id),
    )
    db.add(gen)

    db.commit()

    return {"code": 200, "message": "success", "data": {
        "video_filename": filename,           # 前端用此文件名构造访问 URL
    }}


@router.get("/video/file/{filename}")
async def serve_video_file(
    filename: str,
    token: Optional[str] = Query(None),   # JWT 通过 query param 传递（<video> 标签不支持设置 Auth Header）
    db: Session = Depends(get_db),
):
    """
    提供视频文件访问（带 JWT 鉴权）。
    标准做法：Authorization header。
    但 HTML <video src="..."> 标签发起的 HTTP 请求无法附加自定义 Header，
    因此改用 ?token=xxx query param 传递 JWT，后端手动验证。
    """
    if not token:
        raise HTTPException(status_code=401, detail="缺少访问 Token，请重新登录")

    # 手动验证 JWT（与 get_current_user 逻辑相同）
    try:
        payload = jose_jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if not user_id:
            raise ValueError("missing sub")
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Token 无效或已过期")

    # 验证用户存在且未被禁用
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=401, detail="用户不存在或已被禁用")

    # 防路径穿越：只取文件名部分，拒绝 ../../../etc/passwd 类攻击
    safe_name = os.path.basename(filename)
    if safe_name != filename or not safe_name:
        raise HTTPException(status_code=400, detail="非法文件名")

    filepath = os.path.join(VIDEO_DIR, safe_name)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="视频文件不存在或已被清理")

    # 返回文件流，浏览器可直接播放（支持 range 请求，即拖动进度条）
    return FileResponse(
        filepath,
        media_type="video/mp4",
        headers={"Accept-Ranges": "bytes"},  # 明确支持断点续传，让 <video> 能拖动进度
    )


# ── 生成记录列表 ────────────────────────────────────────────────────────────────


class GenerationRecordResponse(BaseModel):
    id: str
    type: str
    url: str
    prompt: str
    model_name: str
    created_at: str


@router.get("/list")
async def list_generations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取用户的生成记录列表（按创建时间倒序）"""
    try:
        records = db.query(GenerationRecord)\
            .filter(GenerationRecord.user_id == current_user.id)\
            .order_by(GenerationRecord.created_at.desc())\
            .all()

        return {
            "code": 200,
            "message": "success",
            "data": [
                {
                    "id": str(r.id),
                    "type": r.type,
                    "url": r.url,
                    "prompt": r.prompt,
                    "model_name": r.model_name,
                    "created_at": r.created_at.isoformat(),
                }
                for r in records
            ],
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"获取生成记录失败: {str(e)}",
        )


@router.get("/{generation_id}")
async def get_generation(
    generation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取单个生成记录详情"""
    try:
        record = db.query(GenerationRecord)\
            .filter(
                GenerationRecord.id == generation_id,
                GenerationRecord.user_id == current_user.id,
            )\
            .first()

        if not record:
            raise HTTPException(
                status_code=404,
                detail="生成记录不存在或无访问权限",
            )

        return {
            "code": 200,
            "message": "success",
            "data": {
                "id": str(record.id),
                "type": record.type,
                "url": record.url,
                "prompt": record.prompt,
                "model_name": record.model_name,
                "model_id": record.model_id,
                "created_at": record.created_at.isoformat(),
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"获取生成记录失败: {str(e)}",
        )
