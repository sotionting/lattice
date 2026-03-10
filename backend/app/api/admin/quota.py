"""
管理员 — 用量与额度查询

路由：
  GET /admin/quota/summary  - 全局统计摘要（总请求数/token/活跃用户）
  GET /admin/quota/records  - 用量明细分页列表
  GET /admin/quota/by-user  - 按用户汇总用量
  GET /admin/quota/by-model - 按模型汇总用量
"""
from typing import Optional
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_admin
from app.models.usage import UsageRecord
from app.models.user import User
from app.models.model_config import ModelConfig

router = APIRouter()


@router.get("/summary")
def get_summary(
    days: int = Query(7, ge=1, le=90),  # 统计最近 N 天，默认 7 天
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """返回全局统计摘要：总请求数、总 token、总费用、活跃用户数。"""
    since = datetime.utcnow() - timedelta(days=days)
    records = db.query(UsageRecord).filter(UsageRecord.created_at >= since).all()

    total_requests = len(records)
    total_tokens = sum(r.input_tokens + r.cached_input_tokens + r.output_tokens for r in records)
    active_users = len({r.user_id for r in records})

    return {
        "code": 200, "message": "success",
        "data": {
            "total_requests": total_requests,
            "total_tokens": total_tokens,
            "active_users": active_users,
            "days": days,
        },
    }


@router.get("/records")
def list_records(
    page: int = 1,
    page_size: int = 20,
    user_id: Optional[str] = None,
    model_id: Optional[str] = None,
    days: int = Query(30, ge=1, le=365),
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """用量明细分页列表，支持按用户和模型过滤。"""
    since = datetime.utcnow() - timedelta(days=days)
    query = db.query(UsageRecord, User.username).join(
        User, UsageRecord.user_id == User.id
    ).filter(UsageRecord.created_at >= since)

    if user_id:
        query = query.filter(UsageRecord.user_id == user_id)
    if model_id:
        query = query.filter(UsageRecord.model_id == model_id)

    total = query.count()
    rows = (
        query.order_by(UsageRecord.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = [
        {
            "id": str(r.id),
            "username": username,
            "user_id": str(r.user_id),
            "model_id": r.model_id,
            "model_name": r.model_name,
            "provider": r.provider,
            "input_tokens": r.input_tokens,
            "cached_input_tokens": r.cached_input_tokens,
            "output_tokens": r.output_tokens,
            "created_at": r.created_at.isoformat(),
        }
        for r, username in rows
    ]

    return {
        "code": 200, "message": "success",
        "data": {"items": items, "total": total, "page": page, "page_size": page_size},
    }


@router.get("/by-user")
def usage_by_user(
    days: int = Query(30, ge=1, le=365),
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """按用户汇总用量（用于进度条展示）。"""
    since = datetime.utcnow() - timedelta(days=days)
    rows = (
        db.query(
            User.id, User.username,
            func.sum(UsageRecord.input_tokens).label("input_tokens"),
            func.sum(UsageRecord.cached_input_tokens).label("cached_input_tokens"),
            func.sum(UsageRecord.output_tokens).label("output_tokens"),
            func.count(UsageRecord.id).label("requests"),
        )
        .join(UsageRecord, User.id == UsageRecord.user_id)
        .filter(UsageRecord.created_at >= since)
        .group_by(User.id, User.username)
        .all()
    )

    return {
        "code": 200, "message": "success",
        "data": [
            {
                "user_id": str(r.id),
                "username": r.username,
                "input_tokens": r.input_tokens or 0,
                "cached_input_tokens": r.cached_input_tokens or 0,
                "output_tokens": r.output_tokens or 0,
                "total_tokens": (r.input_tokens or 0) + (r.cached_input_tokens or 0) + (r.output_tokens or 0),
                "requests": r.requests,
            }
            for r in rows
        ],
    }


@router.get("/by-model")
def usage_by_model(
    days: int = Query(30, ge=1, le=365),
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """按模型汇总用量，合并 DB 中的模型配置信息。"""
    since = datetime.utcnow() - timedelta(days=days)
    rows = (
        db.query(
            UsageRecord.model_id, UsageRecord.model_name, UsageRecord.provider,
            func.sum(UsageRecord.input_tokens).label("input_tokens"),
            func.sum(UsageRecord.cached_input_tokens).label("cached_input_tokens"),
            func.sum(UsageRecord.output_tokens).label("output_tokens"),
            func.count(UsageRecord.id).label("requests"),
        )
        .filter(UsageRecord.created_at >= since)
        .group_by(UsageRecord.model_id, UsageRecord.model_name, UsageRecord.provider)
        .all()
    )

    return {
        "code": 200, "message": "success",
        "data": [
            {
                "model_id": r.model_id,
                "model_name": r.model_name,
                "provider": r.provider,
                "input_tokens": r.input_tokens or 0,
                "cached_input_tokens": r.cached_input_tokens or 0,
                "output_tokens": r.output_tokens or 0,
                "total_tokens": (r.input_tokens or 0) + (r.cached_input_tokens or 0) + (r.output_tokens or 0),
                "requests": r.requests,
            }
            for r in rows
        ],
    }
