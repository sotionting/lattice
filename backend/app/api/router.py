"""
统一 API 路由注册
新增 API 时：在 app/api/ 下新建文件 → 在本文件 include_router
"""
from fastapi import APIRouter

from app.api.auth import router as auth_router
from app.api.chat import router as chat_router              # 聊天 SSE 流式接口
from app.api.models import router as models_router          # 模型列表（普通用户可访问）
from app.api.conversations import router as conversations_router
from app.api.resources import router as resources_router
from app.api.task_status import router as tasks_router
from app.api.generate import router as generate_router
from app.api.langchain_agent import router as langchain_agent_router  # LangChain Agent 执行接口
from app.api.admin.users import router as admin_users_router
from app.api.admin.models_api import router as admin_models_router
from app.api.admin.skills import router as admin_skills_router
from app.api.admin.mcp import router as admin_mcp_router
from app.api.admin.quota import router as admin_quota_router

api_router = APIRouter()

api_router.include_router(auth_router, prefix="/auth", tags=["认证"])
api_router.include_router(chat_router, prefix="/chat", tags=["聊天"])
api_router.include_router(models_router, prefix="/models", tags=["模型"])  # 普通用户查询可用模型
api_router.include_router(conversations_router, prefix="/conversations", tags=["对话"])
api_router.include_router(resources_router, prefix="/resources", tags=["资源库"])
api_router.include_router(tasks_router, prefix="/tasks", tags=["任务状态"])
api_router.include_router(generate_router, prefix="/generate", tags=["生成"])
api_router.include_router(langchain_agent_router, prefix="/agent", tags=["LangChain Agent"])  # Agent 执行接口
api_router.include_router(admin_users_router, prefix="/admin/users", tags=["管理员-用户"])
api_router.include_router(admin_models_router, prefix="/admin/models", tags=["管理员-模型"])
api_router.include_router(admin_skills_router, prefix="/admin/skills", tags=["管理员-Skill"])
api_router.include_router(admin_mcp_router, prefix="/admin/mcp", tags=["管理员-MCP"])
api_router.include_router(admin_quota_router, prefix="/admin/quota", tags=["管理员-额度"])
