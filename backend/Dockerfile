# 使用 Python 3.11 精简版作为基础镜像（体积更小）
FROM python:3.11-slim

# 设置容器内的工作目录
WORKDIR /app

# 复制依赖文件到容器（先复制再安装，利用 Docker 缓存层加速后续构建）
COPY requirements.txt .

# 安装 Python 依赖包（--no-cache-dir 不保存安装缓存，减小镜像体积）
RUN pip install --no-cache-dir -r requirements.txt

# 将当前目录所有文件复制到容器的 /app 目录
COPY . .

# 声明容器对外暴露 8000 端口（后端 API 端口）
EXPOSE 8000

# 容器启动时执行的默认命令：启动 FastAPI 应用
# --host 0.0.0.0 表示接受所有来源的连接
# --port 8000 指定端口
# --reload 代码修改后自动重启（开发模式用）
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
