"""
聊天 SSE 流式接口（含对话持久化）

工作原理：
1. 前端 POST /api/v1/chat/stream，携带消息列表、可选 conversation_id、可选 model_id
2. 后端从数据库查找对应模型配置（指定 ID 或默认模型），取出 api_key / base_url / model_id
3. 在 generate() 中：
   a. 创建或加载 Conversation 记录
   b. 保存用户消息到 messages 表
   c. 先发送 meta 事件（含 conversation_id）给前端
   d. 用 openai SDK（base_url 指向老张API或任意 OpenAI 兼容接口）发起流式请求
   e. 把每个 delta 转成标准 SSE 格式转发给前端
   f. 流结束后保存助手回复消息
4. 前端实时解析 delta.content，并从 meta 事件获取 conversation_id

兼容性：任何 OpenAI 格式的 API 代理（老张API、One API、LiteLLM 等）都可以直接接入，
        只需在模型管理页配置对应的 base_url 和 api_key 即可。
"""
import json
import uuid
from datetime import datetime
from typing import Any, List, Optional, Union  # Union/Any 用于支持 vision 格式的数组内容

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from openai import AsyncOpenAI           # 使用 openai SDK，支持任意 OpenAI 兼容接口
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from app.core.database import get_db, SessionLocal
from app.core.deps import get_current_user
from app.models.conversation import Conversation, Message
from app.models.model_config import ModelConfig
from app.models.user import User

router = APIRouter()


class ChatMessage(BaseModel):
    role: str                       # "system" | "user" | "assistant"
    content: Union[str, List[Any]]  # 纯文本字符串，或 vision 格式的内容数组（含图片+文字）


class ChatRequest(BaseModel):
    # Pydantic v2 中 "model_" 开头的字段会触发保护命名空间警告，这里显式关闭保护
    model_config = ConfigDict(protected_namespaces=())

    messages: List[ChatMessage]                  # 完整消息历史（含 system prompt）
    conversation_id: Optional[str] = None        # 已有对话 UUID，None 表示新建
    model_id: Optional[str] = None               # 模型配置 UUID，None 表示用默认模型


@router.post("/stream")
async def chat_stream(
    body: ChatRequest,
    current_user: User = Depends(get_current_user),  # JWT 鉴权
    db: Session = Depends(get_db),
):
    """SSE 流式对话：自动选模型 → 创建/续接对话 → 转发流 → 持久化消息"""

    # ── 查询模型配置 ──────────────────────────────────────────────────
    if body.model_id:
        # 前端明确指定了模型 ID（UUID 格式）
        model_cfg = (
            db.query(ModelConfig)
            .filter(ModelConfig.id == body.model_id, ModelConfig.is_active == True)
            .first()
        )
        if not model_cfg:
            raise HTTPException(status_code=404, detail="指定模型不存在或已禁用")
    else:
        # 前端没有指定，使用管理员设置的默认模型
        model_cfg = (
            db.query(ModelConfig)
            .filter(ModelConfig.is_default == True, ModelConfig.is_active == True)
            .first()
        )
        if not model_cfg:
            raise HTTPException(
                status_code=400,
                detail="未配置默认模型，请管理员在「模型 API 管理」中添加并设为默认",
            )

    if not model_cfg.api_key:
        raise HTTPException(status_code=400, detail="该模型未填写 API Key，请在模型管理页补充")

    # 各提供商的默认 OpenAI 兼容端点（管理页留空 base_url 时自动使用）
    # 所有接口都与 openai SDK 兼容，使用 "Authorization: Bearer {api_key}" 认证
    PROVIDER_URLS: dict[str, str] = {
        "google":  "https://generativelanguage.googleapis.com/v1beta/openai",  # Google Gemini
        "openai":  "https://api.openai.com/v1",                                # OpenAI 官方
        "doubao":  "https://ark.cn-beijing.volces.com/api/v3",                 # 字节豆包 ARK
    }

    # 快照关键字段（generate() 是异步生成器，运行期间 db session 已关闭，ORM 对象不可访问）
    model_api_id = model_cfg.model_id                          # 传给 API 的模型名
    api_key      = model_cfg.api_key                           # 完整 API Key
    provider     = (model_cfg.provider or "").lower()          # 提供商标识（小写）

    # base_url 优先级：管理页手动填写的 > 提供商默认值
    # 如果两者都没有（custom 提供商却未填 base_url），后端 400 报错提示
    if model_cfg.base_url:
        base_url = model_cfg.base_url.rstrip("/")              # 使用手动填写的地址
    elif provider in PROVIDER_URLS:
        base_url = PROVIDER_URLS[provider]                     # 使用提供商默认地址
    else:
        raise HTTPException(
            status_code=400,
            detail="该模型未填写 Base URL，请在模型管理页补充",
        )
    user_id      = current_user.id
    conv_id_input = body.conversation_id

    # 取最后一条用户消息（用于生成对话标题和存库）
    user_messages = [m for m in body.messages if m.role == "user"]
    raw_content   = user_messages[-1].content if user_messages else ""

    # vision 格式时 content 是数组，提取其中 type="text" 的文字部分存库
    # 普通文本时直接用，这样数据库里始终存的是可读字符串
    if isinstance(raw_content, list):
        text_parts = [
            p.get("text", "")                          # 取出每个 text 类型部分的文字
            for p in raw_content
            if isinstance(p, dict) and p.get("type") == "text"  # 只处理文字块，跳过图片块
        ]
        last_user_content = " ".join(text_parts)       # 合并成一条字符串
    else:
        last_user_content = raw_content                # 普通文本直接用

    async def generate():
        """异步生成器：负责对话持久化 + 调用 AI API + 转发 SSE 给前端"""
        db_gen = SessionLocal()   # 独立的数据库 session，避免与 Depends get_db 生命周期冲突
        try:
            # ── 1. 创建或加载 Conversation ────────────────────────────
            conv = None
            if conv_id_input:
                try:
                    conv = db_gen.query(Conversation).filter(
                        Conversation.id == uuid.UUID(conv_id_input),   # 字符串转 UUID
                        Conversation.user_id == user_id,               # 验证归属，防越权
                    ).first()
                except Exception:
                    conv = None   # UUID 格式错误或查询失败时新建对话

            if conv is None:
                # 用用户消息前 20 个字符作为标题
                title = (last_user_content[:20] + "…") if len(last_user_content) > 20 else (last_user_content or "新对话")
                conv = Conversation(user_id=user_id, title=title, model_id=model_api_id)
                db_gen.add(conv)
                db_gen.commit()
                db_gen.refresh(conv)

            conv_id = str(conv.id)

            # ── 2. 保存用户消息 ───────────────────────────────────────
            if last_user_content:
                db_gen.add(Message(
                    conversation_id=conv.id,
                    role="user",
                    content=last_user_content,
                ))
                db_gen.commit()

            # ── 3. 发 meta 事件，让前端得到 conversation_id ──────────
            yield f"data: {json.dumps({'type': 'meta', 'conversation_id': conv_id})}\n\n"

            # ── 4. 调用 Google Gemini API（openai SDK + Google 兼容端点）────
            # Google 支持通过 OpenAI 兼容接口调用 Gemini，认证方式与 OpenAI 相同：
            # "Authorization: Bearer {api_key}"，openai SDK 会自动添加此 Header
            client = AsyncOpenAI(
                api_key=api_key,    # Google AI Studio API Key
                base_url=base_url,  # 指向 Google 的 OpenAI 兼容端点
            )

            assistant_chunks: List[str] = []  # 累积助手回复，用于最后存库

            try:
                stream = await client.chat.completions.create(
                    model=model_api_id,   # 传给 API 的模型名，如 "gpt-4o" / "claude-3.5-sonnet"
                    messages=[{"role": m.role, "content": m.content} for m in body.messages],
                    stream=True,          # 开启流式输出
                    temperature=0.7,      # 创造性：0=保守确定，2=高度随机，0.7 是通用值
                )

                async for chunk in stream:
                    # 从 chunk 提取这次增量的文字内容
                    delta = (
                        chunk.choices[0].delta.content
                        if chunk.choices and chunk.choices[0].delta
                        else None
                    )
                    if delta:
                        assistant_chunks.append(delta)
                        # 转成 OpenAI SSE 格式发给前端（与 chat.ts 解析逻辑对应）
                        sse_data = {"choices": [{"delta": {"content": delta}, "index": 0}]}
                        yield f"data: {json.dumps(sse_data, ensure_ascii=False)}\n\n"

                yield "data: [DONE]\n\n"   # 流结束标志，与 OpenAI 协议一致

            except Exception as api_err:
                # API 调用报错（如 Key 无效、模型不存在、余额不足等）
                yield f"data: {json.dumps({'error': str(api_err)})}\n\n"
                return

            # ── 5. 保存助手回复，更新对话时间 ────────────────────────
            full_reply = "".join(assistant_chunks)
            if full_reply:
                db_gen.add(Message(
                    conversation_id=conv.id,
                    role="assistant",
                    content=full_reply,
                ))
                conv.updated_at = datetime.utcnow()   # 更新对话的最后活跃时间
                db_gen.commit()

        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
        finally:
            db_gen.close()   # 无论成功还是失败，都要关闭 session

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",   # SSE 的 Content-Type
        headers={
            "Cache-Control": "no-cache",       # 禁止缓存，保证实时性
            "X-Accel-Buffering": "no",         # 禁止 nginx 缓冲，避免流式响应被攒批发送
            "Connection": "keep-alive",        # 保持长连接
        },
    )
