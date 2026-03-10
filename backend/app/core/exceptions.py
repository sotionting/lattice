"""
自定义异常类
参考README.md的错误处理策略
"""
from typing import Any, Optional


class CustomException(Exception):
    """自定义异常基类"""

    def __init__(
        self,
        code: int = 400,
        message: str = "Bad request",
        details: Optional[Any] = None
    ):
        self.code = code
        self.message = message
        self.details = details
        super().__init__(self.message)


class NotFoundException(CustomException):
    """资源未找到异常"""

    def __init__(self, message: str = "Resource not found", details: Optional[Any] = None):
        super().__init__(code=404, message=message, details=details)


class UnauthorizedException(CustomException):
    """未授权异常"""

    def __init__(self, message: str = "Unauthorized", details: Optional[Any] = None):
        super().__init__(code=401, message=message, details=details)


class ForbiddenException(CustomException):
    """禁止访问异常"""

    def __init__(self, message: str = "Forbidden", details: Optional[Any] = None):
        super().__init__(code=403, message=message, details=details)


class ValidationException(CustomException):
    """验证失败异常"""

    def __init__(self, message: str = "Validation failed", details: Optional[Any] = None):
        super().__init__(code=422, message=message, details=details)


class AgentException(CustomException):
    """Agent执行异常"""

    def __init__(self, message: str = "Agent execution failed", details: Optional[Any] = None):
        super().__init__(code=500, message=message, details=details)


class TaskException(CustomException):
    """任务执行异常"""

    def __init__(self, message: str = "Task execution failed", details: Optional[Any] = None):
        super().__init__(code=500, message=message, details=details)
