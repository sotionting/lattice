"""
MCP 服务器数据库模型
MCP（Model Context Protocol）服务器为 Agent 提供额外的工具能力。
管理员在「MCP 服务器管理」页面配置，后端通过 SSE 连接到 MCP 服务器获取工具列表。
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Integer
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import Base


class MCPServer(Base):
    __tablename__ = "mcp_servers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)           # 服务器名称
    url = Column(String(500), nullable=False)            # SSE 连接地址
    description = Column(String(500), nullable=True)     # 功能描述
    is_active = Column(Boolean, nullable=False, default=True)  # 是否启用
    # 连接状态：online / offline / unknown（由测试连接接口更新）
    status = Column(String(20), nullable=False, default="unknown")
    tool_count = Column(Integer, nullable=False, default=0)  # 该服务器提供的工具数量
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
