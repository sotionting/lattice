"""
任务记录数据库模型
TaskRecord：AI 异步任务的执行记录（Skill 调用、文件生成等）
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID

from app.models.base import Base


class TaskRecord(Base):
    __tablename__ = "task_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # 归属用户
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    # Celery 异步任务 ID（非 Celery 任务可为空）
    celery_task_id = Column(String(255), nullable=True, index=True)
    # 任务描述（如 "生成项目需求文档"）
    name = Column(String(255), nullable=False)
    # 任务类型（如 "文本生成"、"代码生成"、"翻译"）
    task_type = Column(String(100), nullable=False, default="general")
    # 状态：pending / running / success / failed
    status = Column(String(20), nullable=False, default="pending")
    # 进度 0~100
    progress = Column(Integer, nullable=False, default=0)
    # 任务结果（JSON 字符串或纯文本）
    result = Column(Text, nullable=True)
    # 失败原因
    error = Column(Text, nullable=True)
    # 使用的模型 ID
    model_id = Column(String(100), nullable=True)
    # 任务开始/完成时间
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    def __repr__(self):
        return f"<TaskRecord id={self.id} status={self.status} name={self.name}>"
