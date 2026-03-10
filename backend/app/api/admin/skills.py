"""
管理员 — Skill 管理 CRUD
Skill 是 Agent 可以调用的能力单元，管理员在此页面定义。

路由：
  GET    /admin/skills          - 分页列表
  POST   /admin/skills          - 创建
  GET    /admin/skills/{id}     - 详情
  PUT    /admin/skills/{id}     - 更新
  DELETE /admin/skills/{id}     - 删除
"""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_admin
from app.models.skill import Skill
from app.models.user import User

router = APIRouter()


# ── 请求/响应模型 ──────────────────────────────────────────────────────────────

class SkillCreate(BaseModel):
    """创建 Skill 的请求体。"""
    name: str                        # 技能名称（唯一，英文下划线风格，如 send_email）
    description: str                 # 技能描述（LLM 据此判断何时调用）
    skill_type: str = "api"          # api | code | prompt
    config: dict = {}                # 技能配置，格式随 skill_type 而异
    is_active: bool = True


class SkillUpdate(BaseModel):
    """更新 Skill 的请求体（所有字段可选）。"""
    name: Optional[str] = None
    description: Optional[str] = None
    skill_type: Optional[str] = None
    config: Optional[dict] = None
    is_active: Optional[bool] = None


def _to_dict(s: Skill) -> dict:
    """将 Skill ORM 对象转为字典（用于 API 响应）。"""
    return {
        "id": str(s.id),
        "name": s.name,
        "description": s.description,
        "skill_type": s.skill_type,
        "config": s.config,
        "is_active": s.is_active,
        "created_at": s.created_at.isoformat() if s.created_at else None,
        "updated_at": s.updated_at.isoformat() if s.updated_at else None,
    }


# ── 路由 ──────────────────────────────────────────────────────────────────────

@router.get("")
def list_skills(
    page: int = 1,
    page_size: int = 20,
    skill_type: Optional[str] = None,    # 可按类型过滤
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """返回 Skill 分页列表。管理员专属。"""
    query = db.query(Skill)  # 查询所有技能
    if skill_type:
        query = query.filter(Skill.skill_type == skill_type)  # 按类型过滤

    total = query.count()  # 总数（用于前端分页）
    items = (
        query.order_by(Skill.created_at.desc())  # 最新的排在前面
        .offset((page - 1) * page_size)          # 跳过前 N 条（分页）
        .limit(page_size)
        .all()
    )
    return {
        "code": 200,
        "message": "success",
        "data": {
            "items": [_to_dict(s) for s in items],
            "total": total,
            "page": page,
            "page_size": page_size,
        },
    }


@router.post("")
def create_skill(
    body: SkillCreate,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """创建新 Skill。name 必须全局唯一。"""
    # 检查名称是否重复
    if db.query(Skill).filter(Skill.name == body.name).first():
        raise HTTPException(status_code=400, detail=f"Skill 名称 '{body.name}' 已存在")

    # 校验 skill_type
    if body.skill_type not in ("api", "code", "prompt"):
        raise HTTPException(status_code=400, detail="skill_type 必须为 api / code / prompt")

    skill = Skill(
        name=body.name,
        description=body.description,
        skill_type=body.skill_type,
        config=body.config,
        is_active=body.is_active,
    )
    db.add(skill)
    db.commit()
    db.refresh(skill)  # 刷新以获取 DB 生成的 id/created_at
    return {"code": 200, "message": "success", "data": _to_dict(skill)}


@router.get("/{skill_id}")
def get_skill(
    skill_id: UUID,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """按 ID 获取 Skill 详情。"""
    skill = db.query(Skill).filter(Skill.id == skill_id).first()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill 不存在")
    return {"code": 200, "message": "success", "data": _to_dict(skill)}


@router.put("/{skill_id}")
def update_skill(
    skill_id: UUID,
    body: SkillUpdate,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """更新 Skill 信息，只修改传入的字段。"""
    skill = db.query(Skill).filter(Skill.id == skill_id).first()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill 不存在")

    # 如果要改名，检查新名称是否与其他 Skill 重复
    if body.name and body.name != skill.name:
        if db.query(Skill).filter(Skill.name == body.name).first():
            raise HTTPException(status_code=400, detail=f"Skill 名称 '{body.name}' 已存在")

    # 逐字段更新（None 表示不修改）
    if body.name is not None:
        skill.name = body.name
    if body.description is not None:
        skill.description = body.description
    if body.skill_type is not None:
        if body.skill_type not in ("api", "code", "prompt"):
            raise HTTPException(status_code=400, detail="skill_type 必须为 api / code / prompt")
        skill.skill_type = body.skill_type
    if body.config is not None:
        skill.config = body.config
    if body.is_active is not None:
        skill.is_active = body.is_active

    db.commit()
    db.refresh(skill)
    return {"code": 200, "message": "success", "data": _to_dict(skill)}


@router.delete("/{skill_id}")
def delete_skill(
    skill_id: UUID,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """删除 Skill。"""
    skill = db.query(Skill).filter(Skill.id == skill_id).first()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill 不存在")
    db.delete(skill)
    db.commit()
    return {"code": 200, "message": "success", "data": None}
