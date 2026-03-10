"""
应用配置管理
从环境变量读取配置，参考README.md中的环境变量配置部分
"""
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """应用配置类"""

    # 项目信息
    PROJECT_NAME: str = "AI Agent 对话平台"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"

    # 服务器配置
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = False

    # 数据库配置
    DATABASE_URL: str

    # Redis配置
    REDIS_URL: str

    # JWT配置
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24小时

    # Celery配置
    CELERY_BROKER_URL: str
    CELERY_RESULT_BACKEND: str

    # CORS配置
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]

    # Agent API配置
    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    
    # 小米 MiMo API配置
    MIMO_API_URL: str = "http://localhost:8080"  # MiMo2API 服务地址，或直接使用小米 MiMo API
    MIMO_API_KEY: str = ""  # API Key（如果使用 MiMo2API，默认是 sk-default）
    MIMO_MODEL: str = "mimo-v2-flash-studio"  # 默认模型
    MIMO_AUTH_TOKEN: str = ""  # 小米 MiMo 认证 Token（从浏览器开发者工具获取）
    MIMO_COOKIE: str = ""  # 小米 MiMo Cookie（如果需要直接调用）

    # 任务配置
    TASK_TIMEOUT: int = 1800  # 30分钟
    MAX_RETRY_ATTEMPTS: int = 3

    # 日志配置
    LOG_LEVEL: str = "INFO"
    LOG_RETENTION_DAYS: int = 30

    class Config:
        env_file = ".env"
        case_sensitive = True


# 创建全局配置实例
settings = Settings()
