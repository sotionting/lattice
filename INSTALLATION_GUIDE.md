# 安装指南

## 当前系统环境检查结果

✅ **已安装的组件：**
- Python 3.13.5 （满足要求 ✓）
- Git 2.50.1 （满足要求 ✓）

❌ **需要安装的组件：**
- Node.js 18+ （未安装）
- Docker Desktop （未安装）

---

## 安装步骤

### 第一步：安装 Node.js

**推荐方式：官方安装器**

1. 访问 Node.js 官网下载页面：
   ```
   https://nodejs.org/
   ```

2. 下载 LTS 版本（Long Term Support，长期支持版）
   - 点击 "LTS" 按钮下载
   - 当前推荐版本：v20.x 或更高

3. 运行下载的安装程序（例如：node-v20.11.0-x64.msi）
   - 接受许可协议
   - 使用默认安装路径
   - ✅ 勾选 "Automatically install the necessary tools"
   - 完成安装

4. 验证安装：
   ```bash
   # 重新打开命令行窗口
   node --version
   npm --version
   ```

---

### 第二步：安装 Docker Desktop

**推荐方式：官方安装器**

1. 访问 Docker Desktop 官网：
   ```
   https://www.docker.com/products/docker-desktop/
   ```

2. 点击 "Download for Windows" 下载安装包

3. 运行下载的安装程序（Docker Desktop Installer.exe）
   - 接受许可协议
   - ✅ 勾选 "Use WSL 2 instead of Hyper-V"（推荐）
   - 完成安装
   - **重启电脑**（必须）

4. 启动 Docker Desktop
   - 从开始菜单启动 Docker Desktop
   - 等待 Docker Engine 启动（任务栏图标变为绿色）
   - 如果提示安装 WSL 2，按照提示完成安装

5. 验证安装：
   ```bash
   docker --version
   docker-compose --version
   ```

---

### 第三步：配置环境变量

1. 进入项目目录：
   ```bash
   cd d:\soiton2026
   ```

2. 复制环境变量模板：
   ```bash
   copy .env.example .env
   ```

3. 编辑 .env 文件：
   ```bash
   notepad .env
   ```

4. 修改以下配置项（重要）：
   ```env
   # 数据库密码（建议修改为强密码）
   DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@postgres:5432/agent_system

   # JWT密钥（必须修改为随机字符串）
   SECRET_KEY=your-random-secret-key-at-least-32-characters-long

   # Agent API密钥（如果有的话）
   OPENAI_API_KEY=sk-your-openai-key
   ANTHROPIC_API_KEY=sk-ant-your-anthropic-key

   # 开发模式
   DEBUG=True
   ```

5. 保存并关闭文件

---

### 第四步：启动所有服务（使用Docker）

1. 确保 Docker Desktop 正在运行

2. 启动所有服务：
   ```bash
   cd d:\soiton2026
   docker-compose up -d
   ```

3. 查看服务状态：
   ```bash
   docker-compose ps
   ```

   应该看到以下服务都在运行：
   - agent_postgres
   - agent_redis
   - agent_backend
   - agent_celery_worker
   - agent_celery_beat
   - agent_frontend
   - agent_nginx

4. 查看服务日志（如果有问题）：
   ```bash
   # 查看所有服务日志
   docker-compose logs

   # 查看特定服务日志
   docker-compose logs backend
   docker-compose logs frontend
   ```

---

### 第五步：初始化数据库

1. 运行数据库迁移：
   ```bash
   docker-compose exec backend alembic upgrade head
   ```

2. 创建管理员账户：
   ```bash
   docker-compose exec backend python scripts/create_admin.py
   ```

---

### 第六步：验证系统运行

1. 访问以下地址验证服务：

   **后端API：**
   ```
   http://localhost:8000/health
   ```
   应该返回：`{"code":200,"message":"success","data":{"status":"healthy","version":"1.0.0"}}`

   **API文档：**
   ```
   http://localhost:8000/api/v1/docs
   ```
   应该能看到 Swagger UI 界面

   **前端页面：**
   ```
   http://localhost:5173
   ```
   应该能看到前端界面

2. 测试登录：
   - 默认管理员账户：admin
   - 默认密码：admin123456
   - （建议首次登录后立即修改密码）

---

## 常见问题解决

### 问题1：Docker启动失败

**症状：** docker-compose up -d 报错

**解决方案：**
```bash
# 1. 确保Docker Desktop正在运行
# 2. 检查端口是否被占用
netstat -ano | findstr "5432"  # PostgreSQL
netstat -ano | findstr "6379"  # Redis
netstat -ano | findstr "8000"  # Backend
netstat -ano | findstr "5173"  # Frontend

# 3. 清理Docker并重新启动
docker-compose down
docker-compose up -d
```

### 问题2：后端启动失败

**症状：** agent_backend 容器状态为 Exit

**解决方案：**
```bash
# 查看详细错误日志
docker-compose logs backend

# 常见原因：
# - .env 文件配置错误
# - 数据库连接失败
# - Python依赖安装失败
```

### 问题3：前端无法连接后端

**症状：** 前端页面API请求失败

**解决方案：**
```bash
# 1. 检查后端是否正常运行
curl http://localhost:8000/health

# 2. 检查CORS配置
# 编辑 backend/app/config.py 确保前端地址在 CORS_ORIGINS 中
```

### 问题4：数据库迁移失败

**症状：** alembic upgrade head 报错

**解决方案：**
```bash
# 1. 检查数据库是否运行
docker-compose ps postgres

# 2. 手动连接数据库测试
docker-compose exec postgres psql -U postgres -d agent_system

# 3. 重置数据库（警告：会删除所有数据）
docker-compose down -v
docker-compose up -d
docker-compose exec backend alembic upgrade head
```

---

## 下一步

安装完成后，你可以：

1. 阅读 [QUICKSTART.md](QUICKSTART.md) 了解开发流程
2. 阅读 [README.md](README.md) 了解系统架构和业务逻辑
3. 开始开发第一个功能模块

---

## 需要帮助？

如果遇到问题，请：
1. 检查 docker-compose logs 查看详细日志
2. 确保所有端口未被占用
3. 确保 .env 配置正确
4. 重启 Docker Desktop 后再试
