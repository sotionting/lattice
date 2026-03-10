# QUICKSTART — 每次对话必读，唯一参考文件

---

## 一、我的身份与要求（强制遵守）

- **所有回答必须用中文**，无论任何情况，不得使用英文回复
- 写的**每一行代码后面都必须加中文注释**，解释这行在做什么
- 每次回答都要说明代码的**原理、意图和功能**（为什么这么写、它解决了什么问题）
- 用**简单易懂**的语言解释，不要假设我懂专业术语

---

## 二、项目概述

**项目名称：** Lattice
**GitHub：** https://github.com/sotionting/lattice
**项目路径（macOS）：** `/Users/sotionting/Desktop/soiton2026`
**技术栈：** Python FastAPI + React + TypeScript + PostgreSQL + Redis + Celery + Docker + Nginx

**产品定位：** 以聊天为主界面，用户发消息给 Agent，Agent 调用各类 Skill 完成任务。管理员可配置模型 API、Skill、MCP 服务器、用户额度。

**安全规范：** 所有 AI 模型 API Key 统一在前端「模型 API 管理」页面配置到数据库，不在 .env 或代码中硬编码。

---

## 三、当前开发状态（实时更新）

### ✅ 已完成
- 7 个 Docker 容器全部运行（postgres / redis / backend / celery_worker / celery_beat / frontend / nginx）
- 数据库已初始化（alembic upgrade head 已运行），管理员账号通过 ADMIN_PASSWORD 环境变量创建（不再有默认密码）
- 后端真实 JWT 认证（登录验 DB、bcrypt 密码、jose 签 token）
- 用户管理 CRUD 完整实现（前端表格 + 后端 API）
- 登录正常（Vite proxy 已修复，改用 host.docker.internal:8000）
- **前端全页面美化完成（v1.9 · 2026-03-02）：**
  - 登录页：深色渐变背景、圆角卡片、机器人 Logo
  - Chat 页：自动滚动、消息时间戳、三点 loading 动画、新建/清空对话
  - 对话历史：List 列表 + 搜索框 + 操作菜单
  - 资源库：卡片网格 + 搜索 + 类型过滤
  - 任务状态：统计卡片 + 进度条 + 状态过滤
  - 个人设置：大头像 + 信息展示卡片
  - 模型管理：完整 CRUD + API Key 脱敏显示
  - Skill 管理：完整 CRUD + 类型图标颜色
  - MCP 管理：完整 CRUD + 测试连接 + 状态 Badge
  - 额度管理：统计卡片 + 用户进度条 + 用量明细表格
  - 侧边栏：深色渐变 + 机器人 Logo + 展/收 220/72px
  - 顶部栏：头像首字母 + 用户信息下拉 + 通知按钮

### ✅ v2.0 新增（2026-03-02）
- **mimo API 接入完成**：后端代理架构（前端 → 后端 SSE → mimo API）
- **模型管理真实 CRUD**：model_configs 表 + 完整后端 API + 前端接入
- **聊天功能真实流式**：打字机效果、光标动画、回复中状态

### ✅ v2.1 新增（2026-03-02）
- **额度管理升级**：模型定价卡片（¥/$ 双货币切换）、Token 三分类（输入/缓存/输出）、合并/分模型视图

### ✅ v2.3 新增（2026-03-02）
- **模型 API 架构升级**：`chat.py` 改用 `openai` SDK 替代 `httpx` 直连，兼容所有 OpenAI 格式代理（老张API等）
- **多模型选择**：前端聊天界面顶部加入模型选择下拉框，发消息时携带 `model_id`
- **新增接口** `GET /api/v1/models/active`：普通登录用户可查询已启用模型列表（不暴露 API Key）
- **新增文件** `backend/app/api/models.py`：用户侧模型查询路由
- **模型配置方式**：管理员在「模型 API 管理」填写 `base_url=https://api.laozhang.ai/v1`、`api_key=老张Key`、`model_id=gpt-4o` 即可接入任意代理服务

### ✅ v2.2 新增（2026-03-02）
- **对话历史持久化**：Conversation + Message 表，chat.py 自动建/续接对话，保存 user + assistant 消息
- **资源库真实实现**：Resource 表，文件上传（`/app/uploads/{user_id}/`），列表/下载/删除全功能
- **任务状态真实实现**：TaskRecord 表，API 列表+状态过滤，前端有运行中任务时每 8s 自动刷新
- **Chat 接入对话历史**：`?cid=xxx` URL 参数加载历史对话，`meta` SSE 事件传 conversation_id，新建对话清空 URL
- **对话历史页**：真实 API + 重命名 Modal + 删除 Popconfirm + 点击续接对话
- **资源库页**：真实 API + 拖放上传 + 带 JWT 鉴权的文件下载
- **任务状态页**：真实 API + 有进行中任务时自动刷新

> **上线前需执行：** `docker-compose exec backend alembic upgrade head`（建 conversations/messages/resources/task_records 四张表）

### ✅ v2.4 新增（2026-03-02）
- **图片上传（输入）**：聊天框新增回形针按钮，支持选择 JPG/PNG/GIF/WebP 等图片，自动转 base64，以 OpenAI vision 格式发给 AI（AI 可看图分析）
- **视频上传（输入）**：支持选择 MP4/WebM 等视频，本地预览播放，文件名以文字形式告知 AI
- **附件预览栏**：发送前在输入框上方显示缩略图，支持逐个删除
- **AI 回复 Markdown 渲染**：使用 `react-markdown` + `remark-gfm`，支持加粗/斜体/代码块/表格/删除线等语法
- **图片/视频渲染（输出）**：AI 回复中的图片链接用 Ant Design Image 显示（可点击放大）；视频链接渲染为内联播放器
- **修复消息 ID bug**：从 `Date.now()+1` 改为模块级自增计数器，彻底避免同毫秒 ID 重复
- **优化滚动**：`scrollIntoView` 改用 `behavior:'auto'`，流式输出时不再抖动
- **新增文件**：`frontend/src/services/chat.ts` 加入 `ContentPart` 接口

### ✅ v2.5 新增（2026-03-03）
- **音频上传（输入）**：支持上传 MP3/WAV/OGG/AAC 等音频文件，聊天气泡内显示 `<audio>` 播放器，文件名告知 AI
- **音频渲染（输出）**：AI 回复中的音频链接自动渲染为内联播放器
- **拖放上传**：将图片/视频/音频文件直接拖入聊天窗口即可上传，拖入时显示蓝色虚线遮罩提示
- **附件预览支持点击放大**：发送前图片缩略图改用 AntImage，支持点击查看大图
- **多提供商模型支持**：`chat.py` 按 provider 字段路由到对应 API 端点
  - `google` → `https://generativelanguage.googleapis.com/v1beta/openai`（Google Gemini）
  - `openai` → `https://api.openai.com/v1`（OpenAI 官方）
  - `doubao` → `https://ark.cn-beijing.volces.com/api/v3`（字节豆包）
  - `custom` → 管理员手动填写的 Base URL（第三方 OpenAI 兼容接口）
- **模型管理页重设计**：新增提供商选择，动态显示模型 ID 提示和 Base URL 必填规则；自定义提供商 Base URL 必填
- **错误弹窗**：所有 AI 请求错误（网络 / 鉴权 / 模型报错）改用 Modal.error() 弹窗展示，点 × 关闭
- **nginx 上传限制**：`client_max_body_size` 调整为 20m，支持约 15MB 以内的原图上传

### ✅ v2.6 新增（2026-03-03）
- **模型类型分类**：model_configs 表新增 `model_type` 字段，取值 `llm`（大语言模型）/ `image`（图片生成）/ `video`（视频生成）
  - 数据库迁移：`005_add_model_type.py`（执行 `alembic upgrade head` 后生效）
  - 存量数据自动归类为 `llm`，无需手动更新
- **模型管理页新增分类选择器**：添加/编辑模型时可选择模型分类，表格新增「分类」列（颜色标签区分）
- **聊天界面三模式切换**：工具栏新增 Segmented 切换组件，支持在线切换三种模式
  - **对话模式**（蓝色）：普通 LLM 问答，完整实现
  - **图像生成模式**（粉色）：发送按钮变「生成」，模型下拉只显示 image 类型模型
  - **视频生成模式**（紫色）：占位面板（后端接口待接入）
- **模型列表按模式过滤**：切换模式时，上方模型选择下拉框自动只显示对应类型的模型

> **上线前需执行：** `docker-compose exec backend alembic upgrade head`（新增 model_type 列）

### ✅ v2.7 新增（2026-03-03）
- **图像生成 API**：新建 `backend/app/api/generate.py`，`POST /api/v1/generate/image`
  - 支持 **Google Imagen 3**（`model_id` 以 `imagen` 开头，使用 `:predict` 端点，返回 PNG）
    - 推荐模型：`imagen-3.0-generate-002`（高质量）/ `imagen-3.0-fast-generate-001`（快速）
  - 支持 **Gemini 多模态**（其余 `model_id`，使用 `:generateContent + responseModalities:IMAGE`）
  - 返回 base64 DataURL 列表，前端 ReactMarkdown 自动渲染大图（支持点击放大）
- **图像模式前端接入**：Chat.tsx 图像模式「生成」按钮真实调用后端，结果以消息气泡形式展示
  - 生成中显示 `Spin` 加载动画
  - 失败时错误信息以 `⚠️ 生成失败：xxx` assistant 消息展示（不再只靠弹窗）
- **图像模式 UX 修复**：
  - 无文字 Prompt 时「生成」按钮禁用（修复仅有附件时静默无响应的 bug）
  - 生成完成后自动清空附件栏
  - 引导面板正确检测是否存在 image 类型模型（修复 `modeModels.length===0` 永远为 false 的 bug）
- **新增 service**：`frontend/src/services/generate.ts`（`generateImage` 函数）

> **使用图像生成前**：在「模型管理」添加图片模型，分类选「图片模型」，model_id 填 `imagen-3.0-generate-002`

### ✅ v2.8 新增（2026-03-03）
- **Chat 页面大重构**：参考 Claude.ai / ChatGPT 设计语言，全面现代化
  - 浅灰页面背景 `#f7f7f8`，消息区居中 `max-width: 760px`
  - 统一消息列表：所有模式共用同一消息流，消除图像模式"界面不变"的 bug
  - 欢迎屏：空消息时显示大图标 + 描述 + 示例 Prompt 快捷按钮
  - Enter 键全模式发送（之前仅对话模式有效），Shift+Enter 换行
  - loading 指示器始终在消息列表底部（之前错误显示在顶部）
  - 模式切换器移至输入框上方居中（之前在顶部左侧）
  - 输入框改为白色圆角卡片（textarea 自动撑高，最高 160px）
  - AI 头像颜色随模式主题色变化（蓝/粉/紫）
  - 视频模式占位回复（点击生成返回"接入中"提示消息）

### ✅ v2.9 新增（2026-03-09）
- **LangChain 全面集成（DB 驱动）**：Agent 从数据库读取模型配置，前端选模型作为 Agent 大脑
  - `backend/app/agents/langchain/`：5 个 LangChain Agent（Chat / Search / Repl / Csv / File）
  - `backend/app/agents/tools/`：工具池（计算器 / DuckDuckGo 搜索 / 图片生成 / 视频生成 / Skills）
  - `backend/app/agents/llm_factory.py`：双模式 LLM 工厂（`build_llm_from_model_config` DB模式 + `build_llm_from_yaml` 开发模式）
  - `backend/app/models/skill.py`：Skill 数据模型（api / code / prompt 三种类型）
  - `backend/alembic/versions/006_create_skills.py`：skills 表迁移
  - `backend/app/api/admin/skills.py`：Skill 完整 CRUD（之前是 TODO，现已实现）
  - `backend/app/api/langchain_agent.py`：DB 驱动重构，新增 `GET /agent/models` 接口
  - `backend/configs/langchain_config.yaml` / `agents_config.yaml`：仅存 Agent 行为参数，不存 API Key
- **Agent 工具自动装配**：`_build_tools(db, llm)` 自动从 DB 加载图片模型/视频模型/Skills，有配置就加入工具池

> **上线前需执行：**
> ```bash
> docker-compose exec backend pip install -r requirements.txt   # 安装新 LangChain 依赖
> docker-compose exec backend alembic upgrade head              # 创建 skills 表
> ```

### ✅ v3.0 新增（2026-03-10）
- **安全审计全面清理**：
  - `backend/app/config.py`：移除 `OPENAI_API_KEY`、`ANTHROPIC_API_KEY`、所有 MiMo 硬编码字段；项目名更新为 Lattice
  - `backend/app/agents/llm_factory.py`：移除 `os.getenv` API Key 回退，所有密钥统一从 DB 读取
  - `docker-compose.yml`：DB 密码改为 `${POSTGRES_PASSWORD}` 环境变量引用，不再硬编码
  - `scripts/create_admin.py` + `backend/scripts/create_admin.py`：移除默认密码 admin123456，强制要求 ADMIN_PASSWORD 环境变量
  - `.gitignore`：新增 `Agent/`、`.claude/`、`celerybeat-schedule*`、`**/.env` 等排除规则
  - `.env.example`：提供安全配置模板，注明 API Key 在前端管理页配置
- **额度管理页修复**：修复 axios 数据路径（`sumRes.data.data` 而非 `sumRes.data`）；修复 Ant Design v5 `bodyStyle` → `styles={{ body: {} }}` 废弃警告
- **项目重命名为 Lattice**：config.py PROJECT_NAME、README.md 标题
- **GitHub 发布**：项目首次推送至 https://github.com/sotionting/lattice（已验证无密钥泄露）
- **个人 GitHub 主页 README 恢复**：force push 误覆盖后从 git object 还原

### ⏳ 待实现
- MCP 管理后端（MCPServer 数据模型 + 连通测试 API）
- 额度管理后端（UsageRecord 表 + 用量记录写入 API）
- 用量记录：chat.py 对话结束后写入 UsageRecord（token 计费）
- Agent 页面前端：模型选择下拉 + Agent 类型切换 + 对话界面

---

## 四、节省 Token 的操作规则（严格遵守）

1. **对话开始时**：只读本文件（QUICKSTART.md），不要读其他文件
2. **需要改代码时**：根据下方"关键文件速查"定位具体文件，**只读要修改的那个文件**
3. **不要全览代码库**，按需读取，一次只处理一个任务
4. **对话开始后的流程：**
   - 第一步：读本文件，掌握当前状态
   - 第二步：告诉我读到的进度摘要和建议下一步
   - 第三步：**等我确认后**再开始，不要自行决定修改哪些文件
   - 第四步：每完成一个操作，立即追加更新 `PROGRESS.md` 和 `ISSUES.md`（有问题时）

### ❗ 修改任何前端文件前的强制步骤

**每次修改前端代码之前，必须先阅读 `UX_DESIGN.md`，确认改动符合所有设计规范。**

重点检查清单（改完自查）：
- [ ] 所有 `handleSend` 分支的 `userMsg` 是否都携带了 `attachments: currentAttachments`
- [ ] Loading 状态是否显示在消息列表底部（不是顶部/中间）
- [ ] 所有模式是否共用同一消息列表（无独立面板）
- [ ] Enter 键是否在所有模式下均可发送
- [ ] 附件（图片/视频/音频）是否在用户消息气泡中完整显示
- [ ] 组件/变量引用大小写是否正确

---

### ❗❗ 写前后端交互代码前的强制检查（血泪教训，绝对不允许跳过）

> **背景**：图像生成功能写了三轮才对，根本原因是没有在写代码前追踪完整的数据链路。每次只修一个点，导致浪费大量时间。

**每写一个前后端交互功能，必须先在脑子里或草稿里过一遍以下链路，确认每个节点都对，再开始写代码：**

```
用户操作
  → 前端收集哪些数据？（input / state / attachments / 每一个字段）
    → 前端 service 函数签名是否接收了这些数据？
      → axios/fetch 请求体是否真的携带了这些字段？
        → 后端 Pydantic 模型是否定义了这些字段？
          → 后端业务逻辑是否真的使用了这些字段？
            → 后端返回了什么？（response body 每个字段）
              → 前端 service 返回类型是否包含这些字段？
                → 前端组件是否真的消费了返回值的每个字段？
                  → UI 渲染时是否正确使用了这些数据？
```

**用图生图的失误举例，说明每步漏掉会怎样：**

| 漏掉的节点 | 实际后果 |
|---|---|
| 前端 service 函数没有 `imageData` 参数 | 图片永远传不到后端，图生图从来不工作 |
| 后端未创建 Conversation 记录 | 图像生成会话在历史里永远是空的 |
| 前端 `useEffect([], [])` 不随路由刷新 | 历史页面从不更新，新对话永远看不到 |
| 生成图片存为 Markdown `![](base64)` | ReactMarkdown 崩溃，图片显示为破损 |

**强制执行：写任何一个新的前后端交互点之前，先把上面的链路逐节点写出来确认，再写代码。不确认，不开始写。**

---

## 五、MD 文件管理规则

| 文件 | 我的职责 | 规则 |
|---|---|---|
| `QUICKSTART.md`（本文件） | **实时更新** | 开发途中有任何状态变化立即同步，是唯一启动参考 |
| `README.md` | **实时更新** | 功能/模型/API 有变化时同步，保持与代码一致 |
| `PROJECT_STRUCTURE.md` | **实时更新** | 新增/删除文件后立即同步目录结构 |
| `PROGRESS.md` | **只续写，不读** | 按格式追加，永不覆盖历史；开发出问题时可以读 |
| `ISSUES.md` | **只续写，不读** | 遇到报错立即记录；解决后更新状态；开发出问题时可以校对 |
| `INSTALLATION_GUIDE.md` | **完全不管** | 安装指南，不读不改 |

### PROGRESS.md 追加格式
```
### vX.X — YYYY-MM-DD · 操作标题

**完成：** 做了什么
**下一步：** 接下来要做什么
**问题：** 有什么已知问题（没有则省略）
```

### ISSUES.md 追加格式
```
## Issue #N — YYYY-MM-DD · 标题

**现象：** 错误信息
**原因：** 分析原因
**解决方案：** 操作步骤
**状态：** 已解决 ✅ / 待验证 ⏳ / 未解决 ❌
```

### GitHub 发布规则（重要）

**每次更新 MD 文件或完成一个开发阶段后，必须询问用户：**

> "MD 文件已更新完毕。要把这次的改动同步推送到 GitHub（https://github.com/sotionting/lattice）吗？"

- **不得自动 push**，必须等用户确认
- 用户说"推"/"发布"/"同步"才执行 `git add` → `git commit` → `git push`
- push 前确认 `.gitignore` 正常，绝不允许携带 `.env`、API Key、JWT secret

---

## 六、已知问题 / 踩过的坑（每次操作前对照检查，不允许重复踩坑）

| 问题 | 已知原因 | 已知解法 |
|---|---|---|
| frontend rollup SyntaxError | Windows lockfile 仅含 win32 binary，Linux 下跳过安装 | docker-compose command 加 `npm install --no-package-lock` |
| Vite proxy 500 错误 | http-proxy 无法解析 Docker 服务名 `backend` | vite.config.ts 改用 `http://host.docker.internal:8000` |
| 登录 500 | alembic 未运行，users 表不存在 | 先执行 `alembic upgrade head` |
| celery vine ImportError | vine/amqp 版本冲突 | 固定 `vine==5.1.0`, `amqp==5.2.0` |
| uvicorn ImportError | uvicorn CLI 脚本损坏 | 改用 `python -m uvicorn` 启动 |
| C 盘空间耗尽 | Docker 默认存储 C 盘 | Docker 数据目录已迁移至 D 盘 |
| Docker Desktop 崩溃 SIGBUS | 迁移后引擎状态损坏 | Reset to factory defaults，重新配置 D 盘 |
| Docker 拉取镜像失败 | 重装后镜像源配置丢失 | Settings → Docker Engine 重新添加国内镜像源 |
| pytest 版本冲突 | pytest==8.0.0 与 pytest-asyncio 不兼容 | 固定 `pytest==7.4.4` |

---

## 七、关键文件速查

### 后端
| 文件 | 作用 |
|---|---|
| `backend/app/main.py` | FastAPI 入口，注册路由和全局异常处理 |
| `backend/app/config.py` | 从 .env 读取所有配置（JWT、DB、Redis 等） |
| `backend/app/api/router.py` | 注册所有 API 路由（新增 API 在这里 include_router） |
| `backend/app/api/auth.py` | 登录 / 注册 / 获取当前用户 / 改密码 |
| `backend/app/api/chat.py` | SSE 流式聊天（openai SDK + 对话持久化，支持 model_id 选模型） |
| `backend/app/api/models.py` | 普通用户查询已启用模型列表（GET /models/active） |
| `backend/app/api/conversations.py` | 对话 CRUD：列表/详情/重命名/删除（完整实现） |
| `backend/app/api/resources.py` | 资源库：列表/上传/下载/删除（完整实现） |
| `backend/app/api/task_status.py` | 任务记录：列表/详情（完整实现） |
| `backend/app/api/generate.py` | 图片生成：POST /generate/image（Imagen + Gemini 双端点） |
| `backend/app/api/langchain_agent.py` | LangChain Agent 执行：GET /agent/types + POST /agent/run |
| `backend/app/agents/llm_factory.py` | LLM 工厂（google/openai/local 三种 provider） |
| `backend/app/agents/langchain/` | 5 个 LangChain Agent（chat/search/repl/csv/file） |
| `backend/app/agents/tools/` | LangChain 工具（calculator/web_search） |
| `backend/configs/langchain_config.yaml` | LangChain LLM 配置（provider/model/api_key/proxy） |
| `backend/configs/agents_config.yaml` | Agent 专项配置（history/tools/iterations） |
| `backend/app/api/admin/users.py` | 管理员用户 CRUD（完整实现） |
| `backend/app/api/admin/models_api.py` | 模型配置 CRUD + 设为默认 + API Key 脱敏（完整实现） |
| `backend/app/core/deps.py` | JWT 鉴权依赖：`get_current_user` / `require_admin` |
| `backend/app/core/database.py` | SQLAlchemy engine + SessionLocal + get_db |
| `backend/app/models/user.py` | User 模型 + UserRole 枚举 |
| `backend/app/models/model_config.py` | ModelConfig 模型（AI 模型配置） |
| `backend/app/models/conversation.py` | Conversation + Message 模型 |
| `backend/app/models/resource.py` | Resource 模型（文件元信息） |
| `backend/app/models/task.py` | TaskRecord 模型（异步任务记录） |
| `backend/alembic/versions/` | 迁移文件：001~004（users/model_configs/conversations+messages/resources+task_records） |
| `backend/scripts/create_admin.py` | 创建管理员脚本 |

### 前端
| 文件 | 作用 |
|---|---|
| `frontend/src/router/index.tsx` | 所有页面路由（新增页面在这里加） |
| `frontend/src/components/layout/Sidebar.tsx` | 侧边导航菜单（管理员分组按 role 动态显示） |
| `frontend/src/pages/Chat.tsx` | 主对话界面（真实 SSE + 对话持久化，支持 ?cid 续接） |
| `frontend/src/pages/Conversations.tsx` | 对话历史（真实 API + 重命名 + 删除 + 续接） |
| `frontend/src/pages/Resources.tsx` | 资源库（真实 API + 拖放上传 + 下载 + 删除） |
| `frontend/src/pages/Tasks.tsx` | 任务状态（真实 API + 自动轮询） |
| `frontend/src/pages/admin/Users.tsx` | 用户管理表格（完整 CRUD） |
| `frontend/src/pages/admin/Models.tsx` | 模型管理（真实 API + 设为默认） |
| `frontend/src/pages/admin/Quota.tsx` | 额度管理（mimo 定价卡片 + 双货币 + 分模型视图） |
| `frontend/src/services/api.ts` | axios 实例，自动注入 Bearer token，统一错误处理 |
| `frontend/src/services/auth.ts` | 登录 / 注册 / 获取当前用户 API 调用 |
| `frontend/src/services/chat.ts` | SSE 流式聊天（fetch + ReadableStream，含 meta 事件回调） |
| `frontend/src/services/conversation.ts` | 对话 CRUD（list/get/rename/remove） |
| `frontend/src/services/resources.ts` | 资源库（list/upload/download/remove） |
| `frontend/src/services/tasks.ts` | 任务查询（list/get） |
| `frontend/src/services/models.ts` | 模型配置 CRUD |
| `frontend/src/services/generate.ts` | 图片生成（generateImage 函数） |
| `frontend/src/store/authStore.ts` | Zustand 登录状态（token / user / isAuthenticated） |
| `frontend/src/types/index.ts` | 所有 TypeScript 类型定义 |
| `frontend/vite.config.ts` | Vite 配置（proxy → host.docker.internal:8000） |

---

## 八、快速启动

```bash
cd /Users/sotionting/Desktop/soiton2026   # macOS 路径
docker-compose up -d        # 启动所有容器
docker-compose ps           # 确认 7 个容器都是 running
```

访问：
- **前端**：http://localhost:5173
- **API 文档**：http://localhost:8000/api/v1/docs
- **管理员账号**：admin / （.env 中 ADMIN_PASSWORD 的值）

---

## 九、常用运维命令

```bash
# 查看容器状态
docker-compose ps

# 查看某容器日志
docker-compose logs -f backend

# 重启某容器
docker-compose restart backend

# 执行数据库迁移
docker-compose exec backend alembic upgrade head

# 创建新的迁移文件
docker-compose exec backend alembic revision --autogenerate -m "描述"

# 重建管理员
docker-compose exec backend python scripts/create_admin.py

# 前端 node_modules 出问题时清空重装
docker-compose stop frontend && docker-compose rm -f frontend
docker volume rm soiton2026_frontend_node_modules
docker-compose up -d frontend
```

---

## 十、添加新功能的步骤

### 后端新增 API
1. 在 `backend/app/api/` 下新建文件（管理员功能放 `admin/` 子目录）
2. 在 `backend/app/api/router.py` 用 `include_router` 注册
3. 如需新数据表：在 `backend/app/models/` 新建模型，在 `models/__init__.py` 导出，运行 `alembic revision --autogenerate`
4. 鉴权：普通接口加 `Depends(get_current_user)`，管理员接口加 `Depends(require_admin)`

### 前端新增页面
1. 在 `frontend/src/pages/` 下新建 `.tsx` 文件
2. 在 `frontend/src/router/index.tsx` 添加路由
3. 在 `frontend/src/components/layout/Sidebar.tsx` 添加菜单项
4. 如需调用后端 API：在 `frontend/src/services/` 新建或修改 service 文件

---

## 十一、API 设计规范

所有接口前缀：`/api/v1`

**统一响应格式：**
```json
{"code": 200, "message": "success", "data": {...}}
```

**分页响应：**
```json
{"code": 200, "message": "success", "data": {"items": [], "total": 0, "page": 1, "page_size": 20}}
```

---

## 十二、页面路由总览

| 路径 | 页面 | 权限 |
|---|---|---|
| `/` | 对话（主界面） | 所有登录用户 |
| `/conversations` | 对话历史 | 所有登录用户 |
| `/resources` | 资源库 | 所有登录用户 |
| `/tasks` | 任务状态 | 所有登录用户 |
| `/settings/profile` | 个人设置 | 所有登录用户 |
| `/admin/users` | 用户管理 | 管理员 |
| `/admin/models` | 模型 API 管理 | 管理员 |
| `/admin/skills` | Skill 管理 | 管理员 |
| `/admin/mcp` | MCP 服务器管理 | 管理员 |
| `/admin/quota` | 额度管理 | 管理员 |
