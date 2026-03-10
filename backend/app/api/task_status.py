"""
任务状态 API — 查询用户的 AI 异步任务记录
"""
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.task import TaskRecord

router = APIRouter()


def _serialize(task: TaskRecord) -> dict:
    duration = None
    if task.started_at and task.completed_at:
        secs = int((task.completed_at - task.started_at).total_seconds())
        duration = f"{secs // 60}m {secs % 60}s" if secs >= 60 else f"{secs}s"
    return {
        "id": str(task.id),
        "name": task.name,
        "type": task.task_type,
        "status": task.status,
        "progress": task.progress,
        "model": task.model_id or "-",
        "started_at": task.started_at.strftime("%H:%M:%S") if task.started_at else "-",
        "duration": duration or "-",
        "error": task.error,
        "created_at": task.created_at.isoformat(),
    }


@router.get("")
def list_tasks(
    page: int = 1,
    page_size: int = 50,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """列出当前用户的任务记录，支持按状态过滤，按创建时间倒序"""
    query = db.query(TaskRecord).filter(TaskRecord.user_id == current_user.id)
    if status and status != "all":
        query = query.filter(TaskRecord.status == status)
    total = query.count()
    items = (
        query.order_by(TaskRecord.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return {
        "code": 200, "message": "success",
        "data": {"items": [_serialize(t) for t in items], "total": total, "page": page, "page_size": page_size},
    }


@router.get("/{task_id}")
def get_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """查询单个任务的详情"""
    try:
        task_uuid = uuid.UUID(task_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="任务不存在")

    task = db.query(TaskRecord).filter(
        TaskRecord.id == task_uuid,
        TaskRecord.user_id == current_user.id,
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    return {"code": 200, "message": "success", "data": _serialize(task)}
