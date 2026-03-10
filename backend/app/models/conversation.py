"""
对话和消息数据库模型

Conversation：一次完整的对话会话（含多轮消息）
Message：对话中的单条消息（用户发的 / AI 回的 / system 提示）
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID

from app.models.base import Base


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # 归属用户（外键指向 users.id）
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    # 对话标题：默认"新对话"，首次回复后自动截取第一条用户消息前 20 字更新
    title = Column(String(200), nullable=False, default="新对话")
    # 使用的模型 ID（冗余存储，方便展示）
    model_id = Column(String(100), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    # 每次新增消息时更新，用于"最近对话"排序
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<Conversation id={self.id} title={self.title}>"


class Message(Base):
    __tablename__ = "messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # 归属对话（外键，删除对话时级联删除消息）
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    # 消息角色：user / assistant / system
    role = Column(String(20), nullable=False)
    # 消息内容（Text 支持长文本）
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    def __repr__(self):
        return f"<Message id={self.id} role={self.role} len={len(self.content or '')}>"
