"""
数据库连接管理
创建 SQLAlchemy 引擎和 Session 工厂，供 API 层通过依赖注入获取 db session
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.config import settings

# 创建同步数据库引擎
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,   # 每次取连接前检测是否仍然有效
    pool_size=10,         # 连接池大小
    max_overflow=20,      # 超出 pool_size 后最多允许额外创建的连接数
)

# Session 工厂
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """FastAPI 依赖注入：每次请求获取一个数据库 session，请求结束后自动关闭"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
