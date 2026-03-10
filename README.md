# Lattice

一个以对话为核心交互界面的 AI Agent 平台。用户通过聊天与 Agent 交互，Agent 在后端调用各类 Skill 完成任务（视频生成、网页爬取、代码执行等）。管理员可在后台管理模型 API、Skill、MCP 服务器、用户额度等资源。

---

## 技术栈

| 层次 | 技术 |
|---|---|
| 后端 | Python + FastAPI + SQLAlchemy + Alembic |
| 前端 | React + Vite + TypeScript + Ant Design |
| 数据库 | PostgreSQL（主库）+ Redis（缓存/队列） |
| 异步任务 | Celery（Skill 异步执行） |
| AI | 多模型支持（OpenAI / Google Gemini / Imagen 3 / 字节豆包 / 任意 OpenAI 兼容代理） |
| 容器 | Docker Compose（7 个服务） |

---

## 功能模块

### 用户功能
- **对话（主界面）**：与 Agent 聊天，发起 Skill 任务
- **对话历史**：查看和管理历史会话
- **资源库**：查看 Agent 生成的文件（图片、视频、代码等）
- **任务状态**：查看异步 Skill 任务进度

### 管理员功能
- **用户管理**：增删改查用户、启用/禁用账号、重置密码
- **模型管理**：配置各厂商 AI API（base_url、api_key、支持的模型名）
- **Skill 管理**：注册/配置可供 Agent 调用的 Skill（含参数模板）
- **MCP 管理**：连接和配置 MCP 服务器（Model Context Protocol）
- **额度管理**：查看各用户 token 用量、设置配额上限

---

## 数据模型

### users（用户表）
```sql
id UUID PK
username VARCHAR(50) UNIQUE NOT NULL
email VARCHAR(100) UNIQUE NOT NULL
password_hash VARCHAR(255) NOT NULL
role VARCHAR(20) NOT NULL DEFAULT 'user'   -- 'admin' | 'user'
is_active BOOLEAN NOT NULL DEFAULT true
created_at TIMESTAMP NOT NULL
updated_at TIMESTAMP NOT NULL
```

### conversations（对话表）
```sql
id UUID PK
user_id UUID FK → users.id
title VARCHAR(200)
created_at TIMESTAMP NOT NULL
updated_at TIMESTAMP NOT NULL
```

### messages（消息表）
```sql
id UUID PK
conversation_id UUID FK → conversations.id
role VARCHAR(20) NOT NULL   -- 'user' | 'assistant'
content TEXT NOT NULL
metadata JSONB DEFAULT '{}'
created_at TIMESTAMP NOT NULL
```

### model_configs（模型配置表）
```sql
id UUID PK
name VARCHAR(100) UNIQUE NOT NULL    -- 显示名称，如 "GPT-4o"
provider VARCHAR(50) NOT NULL        -- openai / google / doubao / custom
model_type VARCHAR(20) NOT NULL DEFAULT 'llm'  -- llm / image / video
base_url VARCHAR(500)
api_key_encrypted TEXT NOT NULL
model_name VARCHAR(100) NOT NULL     -- 实际传给 API 的 model 参数
is_active BOOLEAN NOT NULL DEFAULT true
is_default BOOLEAN NOT NULL DEFAULT false
created_at TIMESTAMP NOT NULL
updated_at TIMESTAMP NOT NULL
```

### skills（Skill 定义表）
```sql
id UUID PK
name VARCHAR(100) UNIQUE NOT NULL
description TEXT
handler VARCHAR(200) NOT NULL    -- Python 函数路径，如 "app.skills.video.generate"
parameters JSONB DEFAULT '{}'    -- JSON Schema 描述参数
is_active BOOLEAN NOT NULL DEFAULT true
created_at TIMESTAMP NOT NULL
updated_at TIMESTAMP NOT NULL
```

### mcp_servers（MCP 服务器表）
```sql
id UUID PK
name VARCHAR(100) UNIQUE NOT NULL
endpoint VARCHAR(500) NOT NULL
description TEXT
is_active BOOLEAN NOT NULL DEFAULT true
created_at TIMESTAMP NOT NULL
updated_at TIMESTAMP NOT NULL
```

### resources（资源表）
```sql
id UUID PK
user_id UUID FK → users.id
conversation_id UUID FK → conversations.id  -- 可为空
name VARCHAR(200) NOT NULL
type VARCHAR(50) NOT NULL     -- image / video / code / file
url TEXT NOT NULL             -- 存储路径或外部 URL
size_bytes BIGINT
metadata JSONB DEFAULT '{}'
created_at TIMESTAMP NOT NULL
```

### usage_logs（用量日志表）
```sql
id UUID PK
user_id UUID FK → users.id
model_config_id UUID FK → model_configs.id  -- 可为空
tokens_input INT NOT NULL DEFAULT 0
tokens_output INT NOT NULL DEFAULT 0
created_at TIMESTAMP NOT NULL
```

---

## API 路由

所有接口前缀：`/api/v1`

### 认证（auth）
```
POST /auth/login           用户登录 → JWT token
POST /auth/register        用户注册
GET  /auth/me              获取当前用户
PUT  /auth/password        修改密码
```

### 聊天（chat）
```
POST   /chat/stream            SSE 流式对话（支持多模型、图片/视频/音频附件）
```

### 模型（models）
```
GET    /models/active          获取当前用户可用的已启用模型列表（不含 API Key）
```

### 对话（conversations）
```
GET    /conversations          对话列表（分页）
POST   /conversations          新建对话
GET    /conversations/{id}     对话详情（含消息）
DELETE /conversations/{id}     删除对话
PUT    /conversations/{id}     重命名对话
```

### 生成（generate）
```
POST   /generate/image         图片生成（支持 Google Imagen 3 / Gemini 多模态）
```

### 资源（resources）
```
GET    /resources              用户资源列表（分页）
DELETE /resources/{id}         删除资源
```

### 任务（tasks）
```
GET    /tasks                  用户任务列表（分页）
GET    /tasks/{id}             任务详情/进度
```

### 管理员（admin）
```
GET    /admin/users            用户列表
POST   /admin/users            新建用户
PUT    /admin/users/{id}       修改用户
DELETE /admin/users/{id}       删除用户

GET    /admin/models           模型配置列表
POST   /admin/models           新建模型配置
PUT    /admin/models/{id}      修改模型配置
DELETE /admin/models/{id}      删除模型配置

GET    /admin/skills           Skill 列表
POST   /admin/skills           新建 Skill
PUT    /admin/skills/{id}      修改 Skill
DELETE /admin/skills/{id}      删除 Skill

GET    /admin/mcp              MCP 服务器列表
POST   /admin/mcp              添加 MCP 服务器
PUT    /admin/mcp/{id}         修改 MCP 服务器
DELETE /admin/mcp/{id}         删除 MCP 服务器

GET    /admin/quota            用量统计（分页，可按用户过滤）
```

---

## 统一响应格式

```json
{
  "code": 200,
  "message": "success",
  "data": {}
}
```

分页数据：
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [],
    "total": 100,
    "page": 1,
    "page_size": 20
  }
}
```

---

## 前端页面结构

```
/                   → 对话（主界面）
/conversations      → 对话历史列表
/resources          → 用户资源库
/tasks              → 任务状态
/admin/users        → 用户管理（仅管理员）
/admin/models       → 模型管理（仅管理员）
/admin/skills       → Skill 管理（仅管理员）
/admin/mcp          → MCP 管理（仅管理员）
/admin/quota        → 额度管理（仅管理员）
/settings/profile   → 个人设置
/login              → 登录
```

---

## 开发规范

- **后端**：PEP 8，Pydantic schemas 严格类型，所有 endpoint 使用 `Depends(get_current_user)` 验证
- **前端**：Ant Design 组件，Zustand 状态管理，axios interceptor 自动注入 Bearer token
- **分支策略**：main 分支为稳定版本，feature/* 为开发分支
- **API key 安全**：model_configs 的 api_key 在存库前加密，接口返回时脱敏（只显示最后 4 位）

---

## Docker 运行

```bash
# 启动所有容器
docker-compose up -d

# 初始化数据库
docker-compose exec backend alembic upgrade head

# 创建管理员账号
docker-compose exec backend python scripts/create_admin.py

# 查看日志
docker-compose logs -f backend
```

访问：
- 前端：http://localhost:5173
- API 文档：http://localhost:8000/api/v1/docs

---

## 环境变量（.env）

```env
DATABASE_URL=postgresql://soiton:soiton2026db@postgres:5432/agent_platform
REDIS_URL=redis://redis:6379/0
SECRET_KEY=<随机32位字符串>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
CELERY_BROKER_URL=redis://redis:6379/1
CELERY_RESULT_BACKEND=redis://redis:6379/2
CORS_ORIGINS=["http://localhost:5173","http://localhost:3000"]
```

---

## 文件修改指南

- 添加新 API：在 `backend/app/api/` 下新建文件，在 `router.py` 注册
- 添加新模型：在 `backend/app/models/` 下新建文件，在 `models/__init__.py` 导出，创建 alembic migration
- 添加新前端页面：在 `frontend/src/pages/` 下新建文件，在 `router/index.tsx` 和 `Sidebar.tsx` 注册
- 修改某功能时，只需阅读本 README 对应模块 + 相关文件，无需全览代码库
