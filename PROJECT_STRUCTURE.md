# 项目目录结构（实际文件）

> 本文件描述项目的**真实**目录结构，与代码保持同步。

```
d:\soiton2026\
│
├── README.md                        # 产品设计文档（功能、数据模型、API 规范）
├── QUICKSTART.md                    # 快速参考手册（当前状态、文件速查、运维命令）
├── START.md                         # 每次对话开头粘给 Claude 的规则文件
├── PROGRESS.md                      # 开发进度日志（只追加，不覆盖）
├── ISSUES.md                        # 问题记录日志（只追加，不覆盖）
├── PROJECT_STRUCTURE.md             # 本文件
├── UX_DESIGN.md                     # 前端 UX 设计规范（每次改前端代码必读）
├── INSTALLATION_GUIDE.md            # 安装指南（首次安装参考）
├── docker-compose.yml               # Docker 编排（7 个服务）
├── .env                             # 环境变量（不提交 Git）
│
├── backend/                         # 后端（Python + FastAPI）
│   ├── Dockerfile
│   ├── requirements.txt             # Python 依赖（含版本固定）
│   ├── alembic.ini                  # alembic 配置文件
│   │
│   ├── alembic/                     # 数据库迁移
│   │   ├── env.py                   # alembic 环境配置（读 DATABASE_URL）
│   │   ├── script.py.mako           # 迁移文件模板
│   │   └── versions/
│   │       ├── 001_create_users_table.py              # 初始迁移：users 表
│   │       ├── 002_create_model_configs_table.py      # model_configs 表
│   │       ├── 003_create_conversations_messages.py   # conversations + messages 表
│   │       ├── 004_create_resources_tasks.py          # resources + task_records 表
│   │       └── 005_add_model_type.py                  # model_configs 新增 model_type 字段（llm/image/video）
│   │
│   ├── scripts/
│   │   └── create_admin.py          # 创建管理员账号脚本
│   │
│   └── app/
│       ├── __init__.py
│       ├── main.py                  # FastAPI 入口，注册路由和全局异常处理
│       ├── config.py                # 从 .env 读取所有配置（JWT、DB、Redis 等）
│       │
│       ├── core/
│       │   ├── database.py          # SQLAlchemy engine + SessionLocal + get_db 依赖
│       │   ├── deps.py              # JWT 鉴权：get_current_user / require_admin
│       │   └── exceptions.py        # 自定义异常类
│       │
│       ├── models/                  # SQLAlchemy 数据模型（对应数据库表）
│       │   ├── __init__.py          # 导出所有模型（供 alembic 发现表结构）
│       │   ├── base.py              # declarative_base()
│       │   ├── user.py              # User 表 + UserRole 枚举（admin/user）
│       │   ├── model_config.py      # ModelConfig 表（模型配置）
│       │   ├── conversation.py      # Conversation + Message 表（对话历史）
│       │   ├── resource.py          # Resource 表（文件资源元信息）
│       │   └── task.py              # TaskRecord 表（Celery 任务记录）
│       │
│       ├── utils/
│       │   ├── __init__.py
│       │   └── security.py          # bcrypt 密码工具：get_password_hash / verify_password
│       │
│       ├── tasks/                   # Celery 异步任务
│       │   ├── __init__.py
│       │   └── celery_app.py        # Celery 配置（broker=Redis）
│       │
│       ├── agents/                  # Agent 执行器（旧代码，待重构）
│       │   ├── __init__.py
│       │   ├── base.py
│       │   ├── mimo_agent.py
│       │   └── mimo_example.py
│       │
│       └── api/
│           ├── __init__.py
│           ├── router.py            # 统一路由注册（新增 API 在这里 include_router）
│           │
│           ├── auth.py              # 登录 / 注册 / 获取当前用户 / 改密码（完整实现）
│           ├── chat.py              # SSE 流式聊天 + 对话持久化（完整实现）
│           ├── conversations.py     # 对话历史 CRUD API（完整实现）
│           ├── resources.py         # 资源库 API：上传/下载/列表/删除（完整实现）
│           ├── task_status.py       # 任务状态 API：列表/详情（完整实现）
│           ├── models.py            # 普通用户查询可用模型列表（GET /models/active）
│           ├── generate.py          # 图片生成 API（Imagen 3 :predict / Gemini :generateContent）
│           │
│           └── admin/               # 管理员专用 API（需要 require_admin 权限）
│               ├── __init__.py
│               ├── users.py         # 用户 CRUD（完整实现）
│               ├── models_api.py    # 模型配置管理（完整实现，含 model_type 分类）
│               ├── skills.py        # Skill 管理（骨架）
│               ├── mcp.py           # MCP 服务器管理（骨架）
│               └── quota.py         # 用量/额度查询（骨架）
│
├── frontend/                        # 前端（React + Vite + TypeScript + Ant Design）
│   ├── Dockerfile                   # node:20-slim，启动时 npm install --no-package-lock
│   ├── package.json
│   ├── vite.config.ts               # proxy target: http://host.docker.internal:8000
│   ├── tsconfig.json
│   │
│   └── src/
│       ├── main.tsx                 # React 入口
│       ├── App.tsx                  # 根组件（初始化 authStore、渲染路由）
│       ├── vite-env.d.ts
│       │
│       ├── types/
│       │   └── index.ts             # 所有 TS 类型（User/Conversation/Message/Resource 等）
│       │
│       ├── router/
│       │   └── index.tsx            # 所有路由配置（新增页面在这里加）
│       │
│       ├── store/
│       │   ├── index.ts             # 导出所有 store
│       │   ├── authStore.ts         # 登录状态（token/user/isAuthenticated）
│       │   └── uiStore.ts           # UI 状态（侧边栏收起/展开）
│       │
│       ├── services/
│       │   ├── api.ts               # axios 实例（自动注入 Bearer token，统一错误处理）
│       │   ├── auth.ts              # 登录 / 注册 / 获取当前用户 API 调用
│       │   ├── admin.ts             # 用户管理 API 调用
│       │   ├── chat.ts              # SSE 流式聊天（streamChat 异步生成器）
│       │   ├── conversation.ts      # 对话历史 API 调用（list/get/rename/remove）
│       │   ├── resources.ts         # 资源库 API 调用（list/upload/download/remove）
│       │   ├── tasks.ts             # 任务状态 API 调用（list/get）
│       │   ├── models.ts            # 模型配置 CRUD + 查询可用模型
│       │   └── generate.ts          # 图片生成（generateImage 函数）
│       │
│       ├── utils/
│       │   ├── constants.ts         # 常量（TOKEN_KEY / USER_KEY）
│       │   ├── storage.ts           # localStorage 工具
│       │   └── format.ts            # 格式化函数
│       │
│       ├── components/
│       │   └── layout/
│       │       ├── AppLayout.tsx    # 整体布局（侧边栏 + 顶部 + 内容区）
│       │       ├── Sidebar.tsx      # 侧边导航（管理员分组按 role 动态显示）
│       │       └── Header.tsx       # 顶部栏（折叠按钮 + 用户下拉菜单）
│       │
│       └── pages/
│           ├── Login.tsx            # 登录页
│           ├── Chat.tsx             # 主对话界面（SSE 流式 + 对话历史加载，完整实现）
│           ├── Conversations.tsx    # 对话历史列表（完整实现，支持重命名/删除）
│           ├── Resources.tsx        # 资源库（完整实现，上传/下载/删除）
│           ├── Tasks.tsx            # 任务状态（完整实现，自动轮询）
│           ├── settings/
│           │   └── Profile.tsx      # 个人设置
│           └── admin/
│               ├── Users.tsx        # 用户管理表格（完整 CRUD）
│               ├── Models.tsx       # 模型管理（完整实现，含 provider 选择 + model_type 分类）
│               ├── Skills.tsx       # Skill 管理（骨架）
│               ├── MCP.tsx          # MCP 管理（骨架）
│               └── Quota.tsx        # 额度管理（完整实现，双货币 + 定价卡片 + 分模型视图）
│
└── nginx/
    └── nginx.conf                   # 反向代理：/api → backend:8000，/ → frontend:5173
```

---

## 快速定位

| 要修改的内容 | 找这个文件 |
|---|---|
| 登录 / 注册逻辑 | `backend/app/api/auth.py` |
| JWT 鉴权依赖 | `backend/app/core/deps.py` |
| 用户管理 API | `backend/app/api/admin/users.py` |
| 新增 API 路由注册 | `backend/app/api/router.py` |
| 数据库模型 | `backend/app/models/` |
| 数据库迁移 | `backend/alembic/versions/` |
| SSE 聊天 + 对话持久化 | `backend/app/api/chat.py` |
| 对话历史 API | `backend/app/api/conversations.py` |
| 资源库 API | `backend/app/api/resources.py` |
| 任务状态 API | `backend/app/api/task_status.py` |
| 主对话界面 | `frontend/src/pages/Chat.tsx` |
| 对话历史界面 | `frontend/src/pages/Conversations.tsx` |
| 资源库界面 | `frontend/src/pages/Resources.tsx` |
| 任务状态界面 | `frontend/src/pages/Tasks.tsx` |
| 用户管理界面 | `frontend/src/pages/admin/Users.tsx` |
| 侧边菜单 | `frontend/src/components/layout/Sidebar.tsx` |
| 前端路由 | `frontend/src/router/index.tsx` |
| axios 配置 | `frontend/src/services/api.ts` |
| SSE 流式聊天服务 | `frontend/src/services/chat.ts` |
| 所有 TS 类型 | `frontend/src/types/index.ts` |
| Vite 代理配置 | `frontend/vite.config.ts` |
