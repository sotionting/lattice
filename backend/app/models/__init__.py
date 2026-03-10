# 导入所有模型，确保 alembic 的 Base.metadata 能发现所有表
# 每次新增模型文件后，必须在这里 import，否则 alembic 看不见新表
from app.models.base import Base
from app.models.user import User, UserRole
from app.models.model_config import ModelConfig      # 模型配置表
from app.models.conversation import Conversation, Message  # 对话 + 消息
from app.models.resource import Resource             # 资源文件
from app.models.task import TaskRecord               # 异步任务记录
from app.models.skill import Skill                   # Agent 技能
from app.models.mcp import MCPServer                 # MCP 服务器
from app.models.usage import UsageRecord             # 用量记录

__all__ = [
    "Base", "User", "UserRole",
    "ModelConfig",
    "Conversation", "Message",
    "Resource",
    "TaskRecord",
    "Skill",
    "MCPServer",
    "UsageRecord",
]
