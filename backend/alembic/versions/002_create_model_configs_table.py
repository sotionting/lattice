"""create model_configs table

Revision ID: 002
Revises: 001
Create Date: 2026-03-02

新增 model_configs 表，存储 AI 模型的 API 配置（Key、接口地址、模型 ID 等）
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = "002"
down_revision: Union[str, None] = "001"  # 依赖 001（users 表先建）
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 创建 model_configs 表，每列含义见 ModelConfig 模型注释
    op.create_table(
        "model_configs",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),           # 展示名称
        sa.Column("provider", sa.String(50), nullable=False),        # 提供商标识
        sa.Column("model_id", sa.String(100), nullable=False),       # 传给 API 的模型 ID
        sa.Column("api_key", sa.Text(), nullable=True),              # API Key 明文
        sa.Column("base_url", sa.String(255), nullable=True),        # 自定义接口地址
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),   # 是否启用
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default="false"), # 是否默认
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    # 回滚时删除 model_configs 表
    op.drop_table("model_configs")
