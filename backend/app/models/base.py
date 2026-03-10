"""
SQLAlchemy 声明式基类
所有数据库模型都继承自此 Base，alembic 通过 Base.metadata 发现所有表结构
"""
from sqlalchemy.orm import declarative_base

Base = declarative_base()
