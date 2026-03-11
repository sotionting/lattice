"""
结构化日志系统
类似 Spring Boot 的日志输出，方便调试
"""
import logging
import json
import time
from datetime import datetime
from typing import Any, Dict
from app.config import settings

# 颜色代码
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'
    END = '\033[0m'


class ColoredFormatter(logging.Formatter):
    """彩色日志格式化器"""

    LEVEL_COLORS = {
        'DEBUG': Colors.CYAN,
        'INFO': Colors.GREEN,
        'WARNING': Colors.YELLOW,
        'ERROR': Colors.RED,
        'CRITICAL': Colors.RED + Colors.BOLD,
    }

    def format(self, record):
        level_color = self.LEVEL_COLORS.get(record.levelname, Colors.END)

        # 时间戳
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]

        # 日志行
        log_line = (
            f"{Colors.BOLD}{timestamp}{Colors.END} "
            f"{level_color}{record.levelname:8}{Colors.END} "
            f"{Colors.BLUE}[{record.name}]{Colors.END} "
            f"{record.getMessage()}"
        )

        return log_line


def setup_logging():
    """设置日志配置"""
    # 根logger
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.DEBUG if settings.DEBUG else logging.INFO)

    # 清除existing handlers
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)

    # 控制台handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.DEBUG)

    # 格式化器
    formatter = ColoredFormatter()
    console_handler.setFormatter(formatter)

    # 添加handler
    root_logger.addHandler(console_handler)

    # 设置第三方库日志级别
    logging.getLogger("uvicorn").setLevel(logging.INFO)
    logging.getLogger("uvicorn.access").setLevel(logging.INFO)
    logging.getLogger("sqlalchemy").setLevel(logging.WARNING)

    return root_logger


# 获取logger实例
logger = setup_logging()


class RequestLogger:
    """请求日志记录器"""

    _request_start_times: Dict[str, float] = {}

    @staticmethod
    def log_request(method: str, path: str, client_addr: str, request_id: str):
        """记录请求开始"""
        RequestLogger._request_start_times[request_id] = time.time()
        logger.info(
            f"→ {Colors.BOLD}{method}{Colors.END} {path} "
            f"from {Colors.YELLOW}{client_addr}{Colors.END}"
        )

    @staticmethod
    def log_response(request_id: str, status_code: int, response_data: Any = None):
        """记录响应"""
        start_time = RequestLogger._request_start_times.get(request_id, time.time())
        elapsed_ms = (time.time() - start_time) * 1000

        # 状态码颜色
        if status_code < 300:
            status_color = Colors.GREEN
        elif status_code < 400:
            status_color = Colors.CYAN
        elif status_code < 500:
            status_color = Colors.YELLOW
        else:
            status_color = Colors.RED

        logger.info(
            f"← {status_color}{status_code}{Colors.END} "
            f"({Colors.BOLD}{elapsed_ms:.1f}ms{Colors.END})"
        )

        if request_id in RequestLogger._request_start_times:
            del RequestLogger._request_start_times[request_id]


def log_info(message: str, **kwargs):
    """INFO级别日志"""
    if kwargs:
        msg = f"{message} | {json.dumps(kwargs, ensure_ascii=False)}"
    else:
        msg = message
    logger.info(msg)


def log_debug(message: str, **kwargs):
    """DEBUG级别日志"""
    if kwargs:
        msg = f"{message} | {json.dumps(kwargs, ensure_ascii=False)}"
    else:
        msg = message
    logger.debug(msg)


def log_warning(message: str, **kwargs):
    """WARNING级别日志"""
    if kwargs:
        msg = f"{message} | {json.dumps(kwargs, ensure_ascii=False)}"
    else:
        msg = message
    logger.warning(msg)


def log_error(message: str, error: Exception = None, **kwargs):
    """ERROR级别日志"""
    if error:
        msg = f"{message} | Error: {str(error)}"
    else:
        msg = message

    if kwargs:
        msg += f" | {json.dumps(kwargs, ensure_ascii=False)}"

    logger.error(msg)


def log_success(message: str, **kwargs):
    """成功日志（绿色）"""
    if kwargs:
        msg = f"{Colors.GREEN}✓{Colors.END} {message} | {json.dumps(kwargs, ensure_ascii=False)}"
    else:
        msg = f"{Colors.GREEN}✓{Colors.END} {message}"
    logger.info(msg)


def log_api_call(api_name: str, method: str, endpoint: str, **params):
    """记录API调用"""
    msg = f"API Call: {Colors.BOLD}{method}{Colors.END} {endpoint}"
    if params:
        msg += f" | Params: {json.dumps(params, ensure_ascii=False)}"
    logger.info(msg)


def log_database_operation(operation: str, table: str, count: int = None, **kwargs):
    """记录数据库操作"""
    msg = f"DB {operation}: {Colors.BOLD}{table}{Colors.END}"
    if count is not None:
        msg += f" ({count} records)"
    if kwargs:
        msg += f" | {json.dumps(kwargs, ensure_ascii=False)}"
    logger.info(msg)
