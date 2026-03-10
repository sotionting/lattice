"""
资源文件数据库模型
Resource：用户上传或 AI 生成的文件（记录元信息，实体文件存磁盘）
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, BigInteger, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID

from app.models.base import Base


class Resource(Base):
    __tablename__ = "resources"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # 归属用户
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    # 展示给用户的原始文件名
    name = Column(String(255), nullable=False)
    # 磁盘上的实际文件名（含 UUID 前缀防冲突）
    filename = Column(String(255), nullable=False)
    # MIME 类型，如 image/png、application/pdf
    mime_type = Column(String(100), nullable=True)
    # 文件大小（字节）
    size = Column(BigInteger, nullable=False, default=0)
    # 来源：upload（用户上传）或 generated（AI 生成）
    source = Column(String(50), nullable=False, default="upload")
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    def __repr__(self):
        return f"<Resource id={self.id} name={self.name}>"
