"""create resources and task_records tables

Revision ID: 004
Revises: 003
Create Date: 2026-03-02

新增 resources 表（用户文件资源）和 task_records 表（异步任务记录）
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # resources：存储用户上传或 AI 生成的文件元信息
    op.create_table(
        "resources",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),          # 原始文件名
        sa.Column("filename", sa.String(255), nullable=False),      # 磁盘文件名（含 UUID 前缀）
        sa.Column("mime_type", sa.String(100), nullable=True),      # MIME 类型
        sa.Column("size", sa.BigInteger(), nullable=False, server_default="0"),  # 字节数
        sa.Column("source", sa.String(50), nullable=False, server_default="upload"),  # upload / generated
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_resources_user_id", "resources", ["user_id"])

    # task_records：AI 异步任务执行记录
    op.create_table(
        "task_records",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("celery_task_id", sa.String(255), nullable=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("task_type", sa.String(100), nullable=False, server_default="general"),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("progress", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("result", sa.Text(), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("model_id", sa.String(100), nullable=True),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_task_records_user_id", "task_records", ["user_id"])
    op.create_index("ix_task_records_celery_task_id", "task_records", ["celery_task_id"])


def downgrade() -> None:
    op.drop_index("ix_task_records_celery_task_id", "task_records")
    op.drop_index("ix_task_records_user_id", "task_records")
    op.drop_table("task_records")
    op.drop_index("ix_resources_user_id", "resources")
    op.drop_table("resources")
