"""
创建管理员账户脚本
运行方式：docker-compose exec backend python scripts/create_admin.py
"""
import os
import sys

# 将 /app 加入路径（与 alembic/env.py 保持一致的方式）
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal          # 复用已配置的连接池
from app.models.user import User, UserRole          # UserRole 枚举，消除魔法字符串
from app.utils.security import get_password_hash

ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_EMAIL    = os.getenv("ADMIN_EMAIL",    "admin@example.com")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")
if not ADMIN_PASSWORD:
    print("错误：未设置 ADMIN_PASSWORD 环境变量，请在 .env 中配置")
    sys.exit(1)


def create_admin() -> None:
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.username == ADMIN_USERNAME).first()
        if existing:
            print(f"管理员账户 '{ADMIN_USERNAME}' 已存在，无需重复创建")
            return

        admin = User(
            username=ADMIN_USERNAME,
            email=ADMIN_EMAIL,
            password_hash=get_password_hash(ADMIN_PASSWORD),
            role=UserRole.ADMIN,
            is_active=True,
        )
        db.add(admin)
        db.commit()
        print(f"管理员账户创建成功！")
        print(f"  用户名: {ADMIN_USERNAME}")
        print(f"  邮箱:   {ADMIN_EMAIL}")
        print(f"  提示：请登录后立即修改密码！")
    except Exception as e:
        db.rollback()
        print(f"创建失败：{e}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    create_admin()
