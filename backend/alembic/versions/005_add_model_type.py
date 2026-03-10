"""add model_type to model_configs

Revision ID: 005
Revises: 004
Create Date: 2026-03-03

给 model_configs 表新增 model_type 字段，区分大语言模型、图片生成模型、视频生成模型。
默认值 'llm'，存量数据自动归类为大语言模型，无需手动迁移。
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "005"
down_revision: Union[str, None] = "004"   # 依赖 004（resources/tasks 表先建）
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 在 model_configs 表添加 model_type 列
    # server_default='llm' 确保已有记录自动填入默认值，无需手写 UPDATE
    op.add_column(
        "model_configs",
        sa.Column(
            "model_type",
            sa.String(20),
            nullable=False,
            server_default="llm",   # 存量数据默认视为大语言模型
        ),
    )


def downgrade() -> None:
    # 回滚时删除 model_type 列
    op.drop_column("model_configs", "model_type")
