"""
Skill 数据库模型
管理员在「Skill 管理」页面配置可供 Agent 调用的能力单元。

Skill 类型（skill_type）：
  api   — 调用外部 HTTP API（config 存 method/url/headers/body_template）
  code  — 执行预定义 Python 代码片段（config 存 code 字段）
  prompt — 转发给另一个 LLM 提示词（config 存 system_prompt 字段）
"""
import uuid
from datetime import datetime

from sqlalchemy import Column, String, Boolean, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB

from app.models.base import Base


class Skill(Base):
    __tablename__ = "skills"  # 对应数据库中的 skills 表

    # 主键：UUID
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # 技能名称，Agent 会看到这个名称来决定是否使用
    name = Column(String(100), nullable=False, unique=True)

    # 技能描述（重要！LLM 根据此文字判断何时调用该技能）
    description = Column(Text, nullable=False)

    # 技能类型：api | code | prompt
    skill_type = Column(String(20), nullable=False, default="api")

    # 技能配置（JSON）：
    #   api  → {"method": "POST", "url": "...", "headers": {}, "body_template": "..."}
    #   code → {"code": "def run(input):\n    ..."}
    #   prompt → {"system_prompt": "你是..."}
    config = Column(JSONB, nullable=False, default=dict)

    # 是否启用（禁用后 Agent 不会加载此技能）
    is_active = Column(Boolean, nullable=False, default=True)

    # 时间戳
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<Skill id={self.id} name={self.name} type={self.skill_type}>"
