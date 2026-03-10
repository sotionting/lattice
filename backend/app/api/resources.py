"""
资源库 API — 文件上传、列表、下载、删除
文件存储路径：/app/uploads/{user_id}/{uuid_prefix}{ext}
"""
import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.resource import Resource

router = APIRouter()

UPLOAD_DIR = "/app/uploads"


def _format_size(size_bytes: int) -> str:
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    else:
        return f"{size_bytes / 1024 / 1024:.1f} MB"


def _get_file_type(mime_type: str | None, name: str) -> str:
    if mime_type:
        if mime_type.startswith("image/"):
            return "image"
        if mime_type == "application/pdf":
            return "pdf"
        if "spreadsheet" in mime_type or "excel" in mime_type or mime_type == "text/csv":
            return "spreadsheet"
        if mime_type in ("text/plain", "text/markdown") or "word" in mime_type or "document" in mime_type:
            return "document"
    ext = os.path.splitext(name)[1].lower()
    if ext in (".md", ".txt", ".doc", ".docx"):
        return "document"
    if ext in (".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"):
        return "image"
    if ext == ".pdf":
        return "pdf"
    if ext in (".xls", ".xlsx", ".csv"):
        return "spreadsheet"
    return "other"


def _serialize(r: Resource) -> dict:
    return {
        "id": str(r.id),
        "name": r.name,
        "type": _get_file_type(r.mime_type, r.name),
        "size": _format_size(r.size),
        "size_bytes": r.size,
        "mime_type": r.mime_type,
        "source": "用户上传" if r.source == "upload" else "AI 生成",
        "created_at": r.created_at.strftime("%Y-%m-%d %H:%M"),
    }


@router.get("")
def list_resources(
    page: int = 1,
    page_size: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """列出当前用户的所有资源文件，按上传时间倒序"""
    base_q = db.query(Resource).filter(Resource.user_id == current_user.id)
    total = base_q.count()
    items = (
        base_q.order_by(Resource.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return {
        "code": 200, "message": "success",
        "data": {"items": [_serialize(r) for r in items], "total": total, "page": page, "page_size": page_size},
    }


@router.post("/upload")
async def upload_resource(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """上传文件：读取内容 → 写入磁盘 → 写入数据库"""
    user_dir = os.path.join(UPLOAD_DIR, str(current_user.id))
    os.makedirs(user_dir, exist_ok=True)

    original_name = file.filename or "upload"
    ext = os.path.splitext(original_name)[1]
    unique_name = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(user_dir, unique_name)

    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    resource = Resource(
        user_id=current_user.id,
        name=original_name,
        filename=unique_name,
        mime_type=file.content_type,
        size=len(content),
        source="upload",
    )
    db.add(resource)
    db.commit()
    db.refresh(resource)

    return {"code": 200, "message": "success", "data": _serialize(resource)}


@router.get("/{resource_id}/download")
def download_resource(
    resource_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """下载文件，返回文件内容（带正确的 Content-Disposition）"""
    try:
        resource_uuid = uuid.UUID(resource_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="文件不存在")

    resource = db.query(Resource).filter(
        Resource.id == resource_uuid,
        Resource.user_id == current_user.id,
    ).first()
    if not resource:
        raise HTTPException(status_code=404, detail="文件不存在")

    file_path = os.path.join(UPLOAD_DIR, str(current_user.id), resource.filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="文件已被删除或丢失")

    return FileResponse(
        file_path,
        filename=resource.name,
        media_type=resource.mime_type or "application/octet-stream",
    )


@router.delete("/{resource_id}")
def delete_resource(
    resource_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """删除文件：先从磁盘删除，再从数据库删除记录"""
    try:
        resource_uuid = uuid.UUID(resource_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="文件不存在")

    resource = db.query(Resource).filter(
        Resource.id == resource_uuid,
        Resource.user_id == current_user.id,
    ).first()
    if not resource:
        raise HTTPException(status_code=404, detail="文件不存在")

    file_path = os.path.join(UPLOAD_DIR, str(current_user.id), resource.filename)
    if os.path.exists(file_path):
        os.remove(file_path)

    db.delete(resource)
    db.commit()

    return {"code": 200, "message": "success", "data": None}
