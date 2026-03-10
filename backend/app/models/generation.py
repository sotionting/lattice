"""
生成记录数据库模型
GenerationRecord：用户生成的图片/视频记录（用于生成历史页面）
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID

from app.models.base import Base


class GenerationRecord(Base):
    __tablename__ = "generation_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # 归属用户（外键指向 users.id）
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    # 生成类型：'image' 或 'video'
    type = Column(String(20), nullable=False)
    # 生成结果：DataURL（图片）或文件路径/URL（视频）
    url = Column(String(2000), nullable=False)
    # 生成提示词
    prompt = Column(Text, nullable=False)
    # 使用的模型名称（冗余存储，便于展示）
    model_name = Column(String(100), nullable=False)
    # 使用的模型 ID
    model_id = Column(String(100), nullable=True)
    # 创建时间
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)

    def __repr__(self):
        return f"<GenerationRecord id={self.id} type={self.type} model={self.model_name}>"
