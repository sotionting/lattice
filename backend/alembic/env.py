"""
Alembic 迁移环境配置
负责连接数据库并执行迁移脚本
"""
import sys
import os
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context

# 将 /app 加入 Python 路径，使 app.* 模块可被导入
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import settings
# 导入所有模型，确保 Base.metadata 包含所有表定义
from app.models.base import Base
from app.models.user import User  # noqa: F401

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# alembic autogenerate 使用 Base.metadata 来对比数据库现有结构
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """离线模式：直接输出 SQL 语句，不连接数据库"""
    context.configure(
        url=settings.DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """在线模式：连接数据库并执行迁移（正常使用此模式）"""
    configuration = config.get_section(config.config_ini_section, {})
    # 用环境变量中的 DATABASE_URL 覆盖 alembic.ini 中的配置
    configuration["sqlalchemy.url"] = settings.DATABASE_URL
    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
