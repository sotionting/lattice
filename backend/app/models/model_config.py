"""
模型配置数据库模型
存储各 AI 服务的 API Key、接口地址、模型 ID 等信息
管理员在前端配置后保存到此表，聊天时从此表读取默认配置来调用 AI API
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID

from app.models.base import Base


class ModelConfig(Base):
    __tablename__ = "model_configs"  # 对应数据库中的 model_configs 表

    # 主键：UUID 随机生成，避免自增 ID 暴露数量信息
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # 展示名称，如 "MiMo Flash"，只用于 UI 展示
    name = Column(String(100), nullable=False)

    # 提供商标识，如 "mimo" / "openai" / "custom"，用于前端渲染颜色标签
    provider = Column(String(50), nullable=False)

    # 实际调用时传给 API 的模型 ID，如 "mimo-v2-flash"
    model_id = Column(String(100), nullable=False)

    # API Key，明文存储（生产环境可加密，此处简化处理）
    api_key = Column(Text, nullable=True)

    # 自定义接口地址，留空则使用默认地址 https://api.xiaomimimo.com/v1
    base_url = Column(String(255), nullable=True)

    # 是否启用此配置（禁用后聊天接口不会选中它）
    is_active = Column(Boolean, nullable=False, default=True)

    # 是否为默认模型（同一时间只允许一个为 True，聊天时自动选用默认模型）
    is_default = Column(Boolean, nullable=False, default=False)

    # 模型类型：'llm'=大语言模型（对话）/ 'image'=图片生成 / 'video'=视频生成
    model_type = Column(String(20), nullable=False, default="llm")

    # 记录创建和更新时间，便于排序和审计
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<ModelConfig id={self.id} name={self.name} model={self.model_id}>"
