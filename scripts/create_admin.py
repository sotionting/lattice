"""
创建管理员账户脚本
原理：连接数据库，检查管理员是否已存在，不存在则创建
运行方式：docker-compose exec backend python scripts/create_admin.py
"""
import os
import sys

# 将项目根目录加入 Python 的模块搜索路径，确保能找到 app 目录
sys.path.append("/app")

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# 从环境变量读取数据库连接地址（.env 文件中配置的）
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("错误：未找到 DATABASE_URL 环境变量，请检查 .env 文件")
    sys.exit(1)

# 读取管理员信息（从 .env 文件中读取，没有则使用默认值）
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_EMAIL    = os.getenv("ADMIN_EMAIL",    "admin@example.com")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")
if not ADMIN_PASSWORD:
    print("错误：未设置 ADMIN_PASSWORD 环境变量，请在 .env 中配置")
    sys.exit(1)

def create_admin():
    """连接数据库并创建管理员账户"""
    try:
        # 创建数据库连接引擎
        engine = create_engine(DATABASE_URL)
        SessionLocal = sessionmaker(bind=engine)
        db = SessionLocal()

        # 导入 User 模型和密码加密工具
        from app.models.user import User
        from app.utils.security import get_password_hash

        # 检查管理员是否已存在，避免重复创建
        existing = db.query(User).filter(User.username == ADMIN_USERNAME).first()
        if existing:
            print(f"管理员账户 '{ADMIN_USERNAME}' 已存在，无需重复创建")
            return

        # 创建管理员用户对象
        admin_user = User(
            username=ADMIN_USERNAME,
            email=ADMIN_EMAIL,
            password_hash=get_password_hash(ADMIN_PASSWORD),  # 密码使用 bcrypt 加密存储
            role="admin",       # 角色设置为管理员
            is_active=True      # 账户默认激活
        )

        # 保存到数据库
        db.add(admin_user)
        db.commit()
        print(f"管理员账户创建成功！")
        print(f"  用户名: {ADMIN_USERNAME}")
        print(f"  邮箱:   {ADMIN_EMAIL}")
        print(f"  提示：请登录后立即修改密码！")

    except Exception as e:
        print(f"创建失败：{e}")
        sys.exit(1)
    finally:
        db.close()  # 无论成功失败都关闭数据库连接，释放资源

if __name__ == "__main__":
    create_admin()
