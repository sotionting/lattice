"""
对话历史 API — 列表、详情、重命名、删除
"""
import re
import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.conversation import Conversation, Message

router = APIRouter()


class RenameBody(BaseModel):
    title: str


def _message_preview(content: str) -> str:
    """
    生成对话列表里显示的消息预览文字。
    把二进制标记替换为可读占位符，避免把几十 MB 的 base64 暴露给列表接口：
      [IMAGE_DATA]...base64...[/IMAGE_DATA]  →  [图片]
      [VIDEO_FILE]filename.mp4[/VIDEO_FILE]  →  [视频]
    最终截取前 100 个字符用于列表展示。
    """
    clean = re.sub(r'\[IMAGE_DATA\].*?\[/IMAGE_DATA\]', '[图片]', content, flags=re.DOTALL)
    clean = re.sub(r'\[VIDEO_FILE\].*?\[/VIDEO_FILE\]', '[视频]', clean, flags=re.DOTALL)
    return clean.strip()[:100]


def _conv_to_dict(conv: Conversation, last_msg: Message | None, msg_count: int) -> dict:
    return {
        "id": str(conv.id),
        "title": conv.title,
        "model_id": conv.model_id,
        "last_message": (_message_preview(last_msg.content) if last_msg else None),
        "message_count": msg_count,
        "created_at": conv.created_at.isoformat(),
        "updated_at": conv.updated_at.isoformat(),
    }


@router.get("")
def list_conversations(
    page: int = 1,
    page_size: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """列出当前用户的所有对话，按最后更新时间倒序"""
    base_q = db.query(Conversation).filter(Conversation.user_id == current_user.id)
    total = base_q.count()
    convs = (
        base_q.order_by(Conversation.updated_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    result = []
    for conv in convs:
        last_msg = (
            db.query(Message)
            .filter(Message.conversation_id == conv.id)
            .order_by(Message.created_at.desc())
            .first()
        )
        msg_count = db.query(Message).filter(Message.conversation_id == conv.id).count()
        result.append(_conv_to_dict(conv, last_msg, msg_count))

    return {"code": 200, "message": "success", "data": {"items": result, "total": total, "page": page, "page_size": page_size}}


@router.get("/{conversation_id}")
def get_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取对话详情，含所有消息（按时间正序）"""
    try:
        conv_uuid = uuid.UUID(conversation_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="对话不存在")

    conv = db.query(Conversation).filter(
        Conversation.id == conv_uuid,
        Conversation.user_id == current_user.id,
    ).first()
    if not conv:
        raise HTTPException(status_code=404, detail="对话不存在")

    messages = (
        db.query(Message)
        .filter(Message.conversation_id == conv.id)
        .order_by(Message.created_at.asc())
        .all()
    )

    return {
        "code": 200, "message": "success",
        "data": {
            "id": str(conv.id),
            "title": conv.title,
            "model_id": conv.model_id,
            "created_at": conv.created_at.isoformat(),
            "updated_at": conv.updated_at.isoformat(),
            "messages": [
                {
                    "id": str(m.id),
                    "role": m.role,
                    "content": m.content,
                    "created_at": m.created_at.isoformat(),
                }
                for m in messages
            ],
        },
    }


@router.put("/{conversation_id}")
def rename_conversation(
    conversation_id: str,
    body: RenameBody,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """重命名对话标题"""
    try:
        conv_uuid = uuid.UUID(conversation_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="对话不存在")

    conv = db.query(Conversation).filter(
        Conversation.id == conv_uuid,
        Conversation.user_id == current_user.id,
    ).first()
    if not conv:
        raise HTTPException(status_code=404, detail="对话不存在")

    conv.title = body.title.strip() or "新对话"
    db.commit()

    return {"code": 200, "message": "success", "data": {"id": str(conv.id), "title": conv.title}}


@router.delete("/{conversation_id}")
def delete_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """删除对话（消息由外键 CASCADE 自动级联删除）"""
    try:
        conv_uuid = uuid.UUID(conversation_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="对话不存在")

    conv = db.query(Conversation).filter(
        Conversation.id == conv_uuid,
        Conversation.user_id == current_user.id,
    ).first()
    if not conv:
        raise HTTPException(status_code=404, detail="对话不存在")

    db.delete(conv)
    db.commit()

    return {"code": 200, "message": "success", "data": None}
