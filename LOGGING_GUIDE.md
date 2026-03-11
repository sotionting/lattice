# 🚀 实时日志系统 - Spring Boot 风格

现在后端可以像 Spring Boot 一样实时打印系统运行数据，方便调试。

## 📋 实时日志示例

### 启动日志
```
2026-03-10 18:52:57.992 ✓ INFO [root]
2026-03-10 18:52:57.992 ✓ INFO [root] ============================================================
2026-03-10 18:52:57.993 ✓ INFO [root] 🚀 Lattice v1.0.0 Starting
2026-03-10 18:52:57.993 ✓ INFO [root] ============================================================
2026-03-10 18:52:57.993 ✓ INFO [root] 📝 API Docs: http://0.0.0.0:8000/api/v1/docs
2026-03-10 18:52:57.993 ✓ INFO [root] 🔧 Debug Mode: False
2026-03-10 18:52:57.993 ✓ INFO [root] 🗄️  Database: postgres:5432/agent_system
2026-03-10 18:52:57.993 ✓ INFO [root] 🔴 Redis: configured
2026-03-10 18:52:57.993 ✓ INFO [root] ✓ Lattice is ready to serve requests!
```

### API 请求/响应日志
```
2026-03-10 18:53:44.683 ✓ INFO [root] → [7a223157] GET /api/v1/models/active | IP: 142.250.204.42
2026-03-10 18:53:44.688 ✓ INFO [root] ← [7a223157] ✓ 200 (6.3ms)
```

## 🎨 日志颜色和符号

### 状态码颜色
| 范围 | 颜色 | 符号 | 含义 |
|------|------|------|------|
| 200-299 | 🟢 绿色 | ✓ | 成功 |
| 300-399 | 🔵 青色 | → | 重定向 |
| 400-499 | 🟡 黄色 | ⚠ | 客户端错误 |
| 500-599 | 🔴 红色 | ✗ | 服务器错误 |

### 请求标识
- `→` 表示请求开始
- `←` 表示响应完成
- `[请求ID]` 用于关联请求和响应

## 📊 日志级别

### INFO (绿色)
主要的业务日志，包括：
- API 请求/响应
- 数据库操作
- 关键业务流程

### DEBUG (青色)
详细的调试信息，包括：
- 请求体内容
- 响应体预览
- 内部处理流程

### WARNING (黄色)
警告信息：
- 权限不足
- 数据验证失败
- API 限制

### ERROR (红色)
错误信息：
- 异常堆栈
- 连接失败
- 系统错误

## 💻 查看实时日志

### 方式 1: 持续监听（推荐）
```bash
docker-compose logs backend -f
```

### 方式 2: 查看最后 N 行
```bash
docker-compose logs backend --tail 50
```

### 方式 3: 从特定时间开始
```bash
docker-compose logs backend --since 5m
```

## 📝 在代码中使用日志

### 基础日志
```python
from app.core.logging import log_info, log_debug, log_error, log_success, log_database_operation

# INFO 日志
log_info("User login successful", user_id="xxx", username="admin")

# DEBUG 日志
log_debug("Processing request", request_id="abc123", data=payload)

# 成功日志 (绿色 ✓)
log_success("Conversation saved", conversation_id="xyz")

# 错误日志
log_error("Database connection failed", error=exc, retry_count=3)

# 数据库操作日志
log_database_operation("INSERT", "users", count=1, user_id="xxx")
```

### 输出格式
```
2026-03-10 19:00:00.123 INFO [root] User login successful | {"user_id": "xxx", "username": "admin"}
```

### API 调用日志
```python
from app.core.logging import log_api_call

log_api_call("ChatAPI", "POST", "/chat/stream", model="gemini-3-flash", prompt="Hello")

# 输出:
# 2026-03-10 19:00:00.123 INFO [root] API Call: POST /chat/stream | Params: {"model": "gemini-3-flash", "prompt": "Hello"}
```

## 🔒 敏感信息保护

系统自动隐藏以下字段：
- `password` → `***`
- `api_key` → `***`
- `token` → `***`

示例：
```
请求体: {"username": "admin", "password": "secret123"}
日志: Request Body: {"username": "admin", "password": "***"}
```

## ⏱️ 性能监控

每条 API 日志都包含执行时间：
```
2026-03-10 19:00:00.123 INFO [root] ← [abc12345] ✓ 200 (45.2ms)
                                                          ^^^^^^
                                                          执行时间
```

**如何分析性能：**
- < 10ms: ⚡ 超快
- 10-100ms: ✓ 正常
- 100-1000ms: ⚠ 需优化
- > 1000ms: 🔴 性能问题

## 🎯 调试技巧

### 1. 追踪完整请求
```
查看请求 ID，例如 [7a223157]
然后在日志中搜索 [7a223157]，找到所有相关操作
```

### 2. 按 IP 地址过滤
```bash
docker-compose logs backend -f | grep "IP: 192.168.1.100"
```

### 3. 按状态码过滤
```bash
# 只看错误
docker-compose logs backend -f | grep "✗ 5"

# 只看成功
docker-compose logs backend -f | grep "✓ 200"

# 只看警告
docker-compose logs backend -f | grep "⚠ 4"
```

### 4. 性能分析
```bash
# 找最慢的请求
docker-compose logs backend | grep "←" | sort -t'(' -k2 -rn | head -5
```

## 🚨 常见错误日志

### 401 Unauthorized
```
← [abc12345] ⚠ 401 (2.1ms)  # JWT token 无效或过期
```

### 404 Not Found
```
← [abc12345] ⚠ 404 (1.5ms)  # 端点不存在
```

### 500 Internal Server Error
```
← [abc12345] ✗ 500 (125.3ms)  # 服务器异常
```

## 📋 日志文件（可选）

如果需要持久化日志到文件，可以修改 `app/core/logging.py`：

```python
# 添加文件处理器
file_handler = logging.FileHandler('logs/app.log')
file_handler.setFormatter(formatter)
root_logger.addHandler(file_handler)
```

## ✅ 最佳实践

1. **关键操作必须记日志**
   - 用户登录/登出
   - 数据修改
   - 错误异常

2. **使用结构化日志**
   - 不要拼接字符串
   - 使用 `log_info(..., key=value)` 格式

3. **包含足够上下文**
   - 用户 ID
   - 请求 ID
   - 关键参数

4. **避免记录敏感信息**
   - 密码、API Key 自动隐藏
   - 个人隐私信息（邮箱、电话等）需谨慎

5. **定期检查日志**
   - 查看 ERROR 和 WARNING
   - 分析性能瓶颈
   - 追踪业务问题

## 🔧 配置调整

### 改变日志级别
在 `app/config.py` 中：
```python
LOG_LEVEL: str = "DEBUG"  # 改为 DEBUG 看更多日志
```

### 改变输出格式
修改 `app/core/logging.py` 中的 `ColoredFormatter`

### 添加自定义日志器
```python
from app.core.logging import logger

my_logger = logger.getChild("MyModule")
my_logger.info("My custom message")

# 输出: [MyModule] My custom message
```

---

**现在您可以像 Spring Boot 一样实时监控后端系统！** 🎉
