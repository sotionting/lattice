"""
Celery 异步任务队列配置
Celery 是一个分布式任务队列系统，用于在后台处理耗时任务（如调用 AI 接口）
Redis 作为消息中间件（Broker），负责传递任务消息
"""
from celery import Celery  # 导入 Celery 框架
from app.config import settings  # 导入应用配置（包含 Redis 连接地址）

# 创建 Celery 应用实例
# "agent_system" 是应用名称，用于区分不同的 Celery 应用
# broker 是消息中间件地址（Redis），任务会发送到这里排队
# backend 是任务结果存储地址（也是 Redis），任务完成后结果保存在这里
celery_app = Celery(
    "agent_system",
    broker=settings.CELERY_BROKER_URL,        # 任务队列地址
    backend=settings.CELERY_RESULT_BACKEND,   # 结果存储地址
)

# 更新 Celery 配置
celery_app.conf.update(
    task_serializer="json",      # 任务数据用 JSON 格式序列化（方便调试）
    accept_content=["json"],     # 只接受 JSON 格式的任务数据
    result_serializer="json",    # 任务结果也用 JSON 格式存储
    timezone="Asia/Shanghai",    # 时区设为上海（北京时间）
    enable_utc=True,             # 内部使用 UTC 时间，避免时区混乱
    task_track_started=True,     # 记录任务开始时间，方便查看进度
    task_soft_time_limit=settings.TASK_TIMEOUT,  # 任务软超时时间（秒），超时会发警告
)
