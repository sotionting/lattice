"""
请求/响应中间件
自动记录所有 API 调用、执行时间、参数等
"""
import time
import uuid
import json
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, StreamingResponse
from app.core.logging import logger, Colors


class RequestResponseLoggingMiddleware(BaseHTTPMiddleware):
    """请求/响应日志中间件"""

    async def dispatch(self, request: Request, call_next) -> Response:
        # 生成请求ID
        request_id = str(uuid.uuid4())[:8]

        # 记录请求信息
        start_time = time.time()

        # 客户端IP
        client_ip = request.client.host if request.client else "unknown"

        # 请求路径
        path = request.url.path
        query_params = dict(request.query_params) if request.query_params else {}

        # 记录请求开始
        method = request.method
        log_msg = (
            f"{Colors.BOLD}→ [{request_id}]{Colors.END} "
            f"{Colors.CYAN}{method}{Colors.END} {Colors.BOLD}{path}{Colors.END}"
        )
        if query_params:
            log_msg += f" ?{json.dumps(query_params, ensure_ascii=False)}"
        log_msg += f" | IP: {client_ip}"
        logger.info(log_msg)

        # 获取请求体（仅用于POST/PUT）
        if method in ["POST", "PUT", "PATCH"]:
            try:
                body = await request.body()
                if body:
                    try:
                        body_data = json.loads(body)
                        # 隐藏敏感字段
                        sanitized = {
                            k: "***" if k in ["password", "api_key", "token"]
                            else v
                            for k, v in body_data.items()
                        }
                        logger.debug(f"   Request Body: {json.dumps(sanitized, ensure_ascii=False)}")
                    except:
                        pass
            except:
                pass

        try:
            # 调用下一个中间件/处理器
            response = await call_next(request)

            # 计算执行时间
            process_time = time.time() - start_time

            # 状态码颜色
            status_code = response.status_code
            if status_code < 300:
                status_color = Colors.GREEN
                status_emoji = "✓"
            elif status_code < 400:
                status_color = Colors.CYAN
                status_emoji = "→"
            elif status_code < 500:
                status_color = Colors.YELLOW
                status_emoji = "⚠"
            else:
                status_color = Colors.RED
                status_emoji = "✗"

            # 记录响应
            elapsed_ms = process_time * 1000
            log_msg = (
                f"{Colors.BOLD}← [{request_id}]{Colors.END} "
                f"{status_emoji} {status_color}{status_code}{Colors.END} "
                f"({Colors.BOLD}{elapsed_ms:.1f}ms{Colors.END})"
            )
            logger.info(log_msg)

            # 对于流式响应，包装它以记录完成
            if isinstance(response, StreamingResponse):
                return response

            # 返回响应
            return response

        except Exception as e:
            # 记录异常
            process_time = time.time() - start_time
            elapsed_ms = process_time * 1000
            logger.error(
                f"{Colors.BOLD}← [{request_id}]{Colors.END} "
                f"{Colors.RED}✗ ERROR{Colors.END} ({elapsed_ms:.1f}ms): {str(e)}"
            )
            raise
