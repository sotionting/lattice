"""
管理员 — 用户管理 CRUD
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_admin
from app.models.user import User, UserRole
from app.utils.security import get_password_hash

router = APIRouter()


class CreateUserRequest(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: str = "user"


class UpdateUserRequest(BaseModel):
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None


def _user_dict(user: User) -> dict:
    return {
        "id": str(user.id),
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "is_active": user.is_active,
        "created_at": user.created_at.isoformat(),
        "updated_at": user.updated_at.isoformat(),
    }


@router.get("")
def list_users(
    page: int = 1,
    page_size: int = 20,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    offset = (page - 1) * page_size
    total = db.query(User).count()
    users = db.query(User).order_by(User.created_at.desc()).offset(offset).limit(page_size).all()
    return {
        "code": 200,
        "message": "success",
        "data": {"items": [_user_dict(u) for u in users], "total": total, "page": page, "page_size": page_size},
    }


@router.post("")
def create_user(
    body: CreateUserRequest,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if db.query(User).filter(User.username == body.username).first():
        raise HTTPException(status_code=400, detail="用户名已存在")
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=400, detail="邮箱已被注册")
    role = UserRole.ADMIN if body.role == "admin" else UserRole.USER
    user = User(
        username=body.username,
        email=body.email,
        password_hash=get_password_hash(body.password),
        role=role,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"code": 200, "message": "success", "data": _user_dict(user)}


@router.put("/{user_id}")
def update_user(
    user_id: str,
    body: UpdateUserRequest,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    if body.email is not None:
        user.email = body.email
    if body.role is not None:
        user.role = UserRole.ADMIN if body.role == "admin" else UserRole.USER
    if body.is_active is not None:
        user.is_active = body.is_active
    if body.password:
        user.password_hash = get_password_hash(body.password)
    db.commit()
    db.refresh(user)
    return {"code": 200, "message": "success", "data": _user_dict(user)}


@router.delete("/{user_id}")
def delete_user(
    user_id: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if str(admin.id) == user_id:
        raise HTTPException(status_code=400, detail="不能删除自己的账号")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    db.delete(user)
    db.commit()
    return {"code": 200, "message": "success", "data": None}
