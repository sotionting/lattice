"""
模型列表接口（供所有登录用户使用）

与 admin/models_api.py 的区别：
  - 本接口只需普通 JWT 鉴权（get_current_user），无需管理员权限
  - 只返回已启用的模型，且不暴露 API Key
  - 供聊天界面「选择模型」下拉框使用

提供 API：
  GET /models/active — 返回所有启用的模型（id / name / provider / model_id / is_default）
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user       # 普通 JWT 鉴权，非管理员专用
from app.models.model_config import ModelConfig
from app.models.user import User

router = APIRouter()


@router.get("/active")
def get_active_models(
    current_user: User = Depends(get_current_user),   # 任意登录用户都可访问
    db: Session = Depends(get_db),
):
    """
    返回所有启用的模型配置列表，默认模型排最前面。
    前端聊天界面用此接口填充「选择模型」下拉框。
    注意：不返回 api_key / base_url 等敏感字段。
    """
    models = (
        db.query(ModelConfig)
        .filter(ModelConfig.is_active == True)                           # 只返回已启用的
        .order_by(ModelConfig.is_default.desc(), ModelConfig.created_at.desc())  # 默认模型排第一
        .all()
    )

    return {
        "code": 200,
        "message": "success",
        "data": [
            {
                "id": str(m.id),                       # 模型配置的 UUID，发消息时传给后端
                "name": m.name,                         # 展示名称，如 "GPT-4o"
                "provider": m.provider,                 # 提供商标识，如 "google" / "openai"
                "model_id": m.model_id,                 # 实际模型名，如 "gpt-4o"（仅供展示）
                "is_default": m.is_default,             # 是否为默认模型，前端初始化时自动选中
                "model_type": m.model_type or "llm",   # 类型：llm / image / video，用于前端模式过滤
            }
            for m in models
        ],
    }
