"""
管理员 — MCP 服务器管理 CRUD + 连接测试

路由：
  GET    /admin/mcp           - 列表
  POST   /admin/mcp           - 创建
  PUT    /admin/mcp/{id}      - 更新
  DELETE /admin/mcp/{id}      - 删除
  POST   /admin/mcp/{id}/test - 测试连接（真实 HTTP 探测）
"""
from typing import Optional
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_admin
from app.models.mcp import MCPServer
from app.models.user import User

router = APIRouter()


class MCPCreate(BaseModel):
    name: str
    url: str
    description: Optional[str] = None
    is_active: bool = True


class MCPUpdate(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


def _to_dict(s: MCPServer) -> dict:
    return {
        "id": str(s.id),
        "name": s.name,
        "url": s.url,
        "description": s.description,
        "is_active": s.is_active,
        "status": s.status,
        "tool_count": s.tool_count,
        "created_at": s.created_at.isoformat() if s.created_at else None,
    }


@router.get("")
def list_mcp_servers(_admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    servers = db.query(MCPServer).order_by(MCPServer.created_at.desc()).all()
    return {"code": 200, "message": "success", "data": {"items": [_to_dict(s) for s in servers], "total": len(servers)}}


@router.post("")
def create_mcp_server(body: MCPCreate, _admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    server = MCPServer(name=body.name, url=body.url, description=body.description, is_active=body.is_active)
    db.add(server)
    db.commit()
    db.refresh(server)
    return {"code": 200, "message": "success", "data": _to_dict(server)}


@router.put("/{server_id}")
def update_mcp_server(server_id: UUID, body: MCPUpdate, _admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    server = db.query(MCPServer).filter(MCPServer.id == server_id).first()
    if not server:
        raise HTTPException(status_code=404, detail="MCP 服务器不存在")
    if body.name is not None:
        server.name = body.name
    if body.url is not None:
        server.url = body.url
    if body.description is not None:
        server.description = body.description
    if body.is_active is not None:
        server.is_active = body.is_active
    db.commit()
    db.refresh(server)
    return {"code": 200, "message": "success", "data": _to_dict(server)}


@router.delete("/{server_id}")
def delete_mcp_server(server_id: UUID, _admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    server = db.query(MCPServer).filter(MCPServer.id == server_id).first()
    if not server:
        raise HTTPException(status_code=404, detail="MCP 服务器不存在")
    db.delete(server)
    db.commit()
    return {"code": 200, "message": "success", "data": None}


@router.post("/{server_id}/test")
def test_mcp_connection(server_id: UUID, _admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    """
    真实测试 MCP 服务器连接。
    向 URL 发起 GET 请求（SSE 端点通常 GET 可触发），
    判断是否能建立连接并收到响应，更新 status 字段后返回结果。
    """
    server = db.query(MCPServer).filter(MCPServer.id == server_id).first()
    if not server:
        raise HTTPException(status_code=404, detail="MCP 服务器不存在")

    try:
        # 设置 5 秒超时，不跟随重定向，只探测连通性
        with httpx.Client(timeout=5, follow_redirects=False) as client:
            resp = client.get(server.url)
        # HTTP 200-499 均视为"可达"（MCP SSE 端点通常返回 200 或 307）
        connected = resp.status_code < 500
    except Exception:
        connected = False

    server.status = "online" if connected else "offline"
    db.commit()

    return {
        "code": 200,
        "message": "success",
        "data": {"status": server.status, "connected": connected},
    }
