"""
用量记录数据库模型
每次 AI 调用结束后写入一条记录，用于额度管理和费用统计。
目前由 chat.py 在流式对话结束后写入（待实现），其他生成接口类似。
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import Base


class UsageRecord(Base):
    __tablename__ = "usage_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # 关联用户（外键）
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    # 关联对话（可选，Agent 任务可能没有对话）
    conversation_id = Column(UUID(as_uuid=True), nullable=True)
    # 使用的模型信息（记录快照，即使模型被删除也能查历史）
    model_id = Column(String(100), nullable=False)    # 模型 ID 字符串（如 gpt-4o）
    model_name = Column(String(100), nullable=False)  # 模型显示名称
    provider = Column(String(50), nullable=False)     # 提供商
    # Token 用量（分三类便于精确计费）
    input_tokens = Column(Integer, nullable=False, default=0)          # 普通输入 token
    cached_input_tokens = Column(Integer, nullable=False, default=0)   # 命中缓存的输入 token
    output_tokens = Column(Integer, nullable=False, default=0)         # 输出 token
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
