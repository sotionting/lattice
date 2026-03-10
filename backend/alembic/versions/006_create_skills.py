"""创建 skills 表（Agent 技能管理）

Revision ID: 006
Revises: 005
Create Date: 2026-03-09
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# 迁移版本标识
revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade():
    """创建 skills 表，存储 Agent 可调用的技能定义。"""
    op.create_table(
        "skills",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False, unique=True),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("skill_type", sa.String(20), nullable=False, server_default="api"),
        # JSONB 支持高效的 JSON 查询（PostgreSQL 专属）
        sa.Column("config", postgresql.JSONB, nullable=False, server_default="{}"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )
    # 为 is_active 建索引，Agent 加载时只查询 is_active=true 的记录
    op.create_index("ix_skills_is_active", "skills", ["is_active"])


def downgrade():
    """回滚：删除 skills 表。"""
    op.drop_index("ix_skills_is_active", table_name="skills")
    op.drop_table("skills")
