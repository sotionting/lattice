"""
密码安全工具
使用 passlib + bcrypt 进行密码哈希和验证
"""
from passlib.context import CryptContext

# 密码上下文：使用 bcrypt 算法，deprecated="auto" 表示自动升级旧算法
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_password_hash(password: str) -> str:
    """将明文密码哈希为 bcrypt 字符串"""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """验证明文密码与哈希是否匹配"""
    return pwd_context.verify(plain_password, hashed_password)
