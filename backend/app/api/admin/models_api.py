"""
管理员 — 模型 API 配置管理（完整 CRUD 实现）

提供 API：
  GET    /admin/models           — 列出所有模型配置
  POST   /admin/models           — 新建模型配置
  PUT    /admin/models/{id}      — 更新模型配置
  DELETE /admin/models/{id}      — 删除模型配置
  PATCH  /admin/models/{id}/default — 设为默认模型

API Key 在返回前做脱敏（只显示前8位和后4位），
但在数据库中以明文完整存储，方便聊天时使用。
"""
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_admin
from app.models.model_config import ModelConfig
from app.models.user import User

router = APIRouter()


# ─── Pydantic 输入校验模型 ────────────────────────────────────────────

class ModelConfigCreate(BaseModel):
    """新建模型配置时前端传入的字段"""
    name: str                         # 展示名称，如 "MiMo Flash"
    provider: str                     # 提供商，如 "google" / "openai" / "doubao" / "custom"
    model_id: str                     # 传给 API 的模型 ID，如 "gemini-2.0-flash"
    api_key: Optional[str] = None     # API Key（可为空，如本地 Ollama 不需要）
    base_url: Optional[str] = None    # 自定义接口地址（空则用提供商默认地址）
    is_active: bool = True            # 是否启用
    is_default: bool = False          # 是否设为默认模型
    model_type: str = "llm"           # 模型类型：'llm' 大语言模型 / 'image' 图片生成 / 'video' 视频生成


class ModelConfigUpdate(BaseModel):
    """更新时所有字段都是可选的（只传要改的字段）"""
    name: Optional[str] = None
    provider: Optional[str] = None
    model_id: Optional[str] = None
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    is_active: Optional[bool] = None
    is_default: Optional[bool] = None
    model_type: Optional[str] = None   # 允许单独更新模型类型


# ─── 辅助函数 ────────────────────────────────────────────────────────

def _mask_key(key: Optional[str]) -> str:
    """对 API Key 做脱敏处理：显示前8位和后4位，中间替换为 '...'"""
    if not key:
        return ""  # 没有 Key 则返回空字符串
    if len(key) <= 12:
        return key[:4] + "..."  # Key 太短则只显示前4位
    return key[:8] + "..." + key[-4:]  # 正常长度：前8位 + ... + 后4位


def _serialize(m: ModelConfig) -> dict:
    """将 ModelConfig 对象转为可 JSON 序列化的字典，API Key 已脱敏"""
    return {
        "id": str(m.id),
        "name": m.name,
        "provider": m.provider,
        "model_id": m.model_id,
        "api_key": _mask_key(m.api_key),      # 脱敏后返回给前端，原始 key 不出接口
        "base_url": m.base_url or "",
        "is_active": m.is_active,
        "is_default": m.is_default,
        "model_type": m.model_type or "llm",  # 模型分类：llm / image / video
    }


# ─── API 路由 ─────────────────────────────────────────────────────────

@router.get("")
def list_models(
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """列出所有模型配置，按创建时间降序排列"""
    models = db.query(ModelConfig).order_by(ModelConfig.created_at.desc()).all()
    return {
        "code": 200,
        "message": "success",
        "data": {"items": [_serialize(m) for m in models], "total": len(models)},
    }


@router.post("")
def create_model(
    body: ModelConfigCreate,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """新建模型配置。如果 is_default=True，则先把其他模型的 default 清掉"""
    if body.is_default:
        # 同时只允许一个默认模型：新设之前先清空所有旧默认
        db.query(ModelConfig).filter(ModelConfig.is_default == True).update({"is_default": False})

    m = ModelConfig(
        id=uuid.uuid4(),              # 生成新 UUID
        name=body.name,
        provider=body.provider,
        model_id=body.model_id,
        api_key=body.api_key,         # 明文存储
        base_url=body.base_url,
        is_active=body.is_active,
        is_default=body.is_default,
        model_type=body.model_type,   # 保存模型类型分类
    )
    db.add(m)
    db.commit()
    db.refresh(m)  # 刷新以获取数据库生成的字段（如 created_at）
    return {"code": 200, "message": "success", "data": _serialize(m)}


@router.put("/{model_id}")
def update_model(
    model_id: str,
    body: ModelConfigUpdate,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """更新指定模型配置。如果更新的字段包含 is_default=True，先清其他默认"""
    m = db.query(ModelConfig).filter(ModelConfig.id == model_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="模型配置不存在")

    if body.is_default:
        # 把除本条之外的其他默认模型先清掉
        db.query(ModelConfig).filter(
            ModelConfig.is_default == True,
            ModelConfig.id != m.id,
        ).update({"is_default": False})

    # 只更新传入的字段（exclude_unset=True 排除未传的可选字段）
    for field, val in body.dict(exclude_unset=True).items():
        setattr(m, field, val)

    db.commit()
    db.refresh(m)
    return {"code": 200, "message": "success", "data": _serialize(m)}


@router.delete("/{model_id}")
def delete_model(
    model_id: str,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """删除指定模型配置"""
    m = db.query(ModelConfig).filter(ModelConfig.id == model_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="模型配置不存在")
    db.delete(m)
    db.commit()
    return {"code": 200, "message": "success", "data": None}


@router.patch("/{model_id}/default")
def set_default_model(
    model_id: str,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """将指定模型设为默认（同时清除其他默认标记）"""
    m = db.query(ModelConfig).filter(ModelConfig.id == model_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="模型配置不存在")

    # 先清所有旧默认
    db.query(ModelConfig).filter(ModelConfig.is_default == True).update({"is_default": False})
    m.is_default = True  # 设新默认
    db.commit()
    return {"code": 200, "message": "success", "data": None}
