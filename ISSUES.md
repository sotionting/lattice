# 问题记录日志

> 此文件仅供用户查阅，Claude 不主动读取。
> 每次遇到问题时由 Claude 追加记录，永不覆盖历史。

---

## Issue #1 — 2026-03-02 · Docker 无法拉取镜像

**现象：**
```
failed to fetch oauth token: Post "https://auth.docker.io/token":
wsarecv: An existing connection was forcibly closed by the remote host.
```

**原因：** 国内网络无法直连 Docker Hub（docker.io 被墙）

**解决方案：** 在 Docker Desktop → Settings → Docker Engine 中添加国内镜像源：
```json
{
  "registry-mirrors": [
    "https://docker.m.daocloud.io",
    "https://hub-mirror.c.163.com",
    "https://dockerproxy.com"
  ]
}
```
点 Apply & Restart，重启后重新运行 `docker-compose up -d`

**状态：** 已解决 ✅（配置镜像源后镜像拉取成功）

---

## Issue #2 — 2026-03-02 · requirements.txt 版本冲突

**现象：**
```
pytest-asyncio 0.23.4 depends on pytest<8 and >=7.0.0
ERROR: ResolutionImpossible
```

**原因：** `pytest==8.0.0` 与 `pytest-asyncio==0.23.4` 不兼容，后者要求 pytest 版本 <8

**解决方案：** 将 `requirements.txt` 中 `pytest==8.0.0` 改为 `pytest==7.4.4`

**状态：** 已解决 ✅

---

## Issue #3 — 2026-03-02 · docker-compose.yml version 字段废弃警告

**现象：**
```
the attribute `version` is obsolete, it will be ignored
```

**原因：** 新版 Docker Compose 不再需要 `version` 字段

**解决方案：** 删除 `docker-compose.yml` 第一行 `version: '3.8'`

**状态：** 已解决 ✅

---

## Issue #4 — 2026-03-02 · backend 容器启动失败：uvicorn ImportError

**现象：**
```
ImportError: cannot import name 'main' from 'uvicorn.main'
```

**原因：** Docker 构建缓存残留，之前失败的构建留下了损坏的 uvicorn 安装

**解决方案：** 强制无缓存重新构建
```bash
docker-compose build --no-cache backend
docker-compose up -d
```

**状态：** 待验证 ⏳（被 Issue #5 阻塞）

---

## Issue #5 — 2026-03-02 · C 盘空间耗尽导致 Docker 存储持续损坏

**现象：**
```
commit failed: write .../metadata.db: input/output error
C: FreeSpace = 0
```

**原因：** C 盘完全没有剩余空间（0 bytes），Docker 无法写入任何数据

**解决方案：** 将 Docker 数据目录迁移至 D 盘（D 盘有 102GB 空闲）
- Docker Desktop → Settings → Resources → Advanced
- 修改 "Disk image location" 为 `D:\Docker`
- Apply & Restart

**状态：** 待验证 ⏳

---

## Issue #6 — 2026-03-02 · Docker 迁移后 WSL 卡死

**现象：** Docker Desktop 无响应，界面卡死，无法操作

**原因：** Docker 数据目录迁移至 D 盘后，WSL 实例未正确重启

**解决方案：**
```powershell
wsl --shutdown
Stop-Process -Name "Docker Desktop" -Force -ErrorAction SilentlyContinue
# 等待 10 秒后手动重启 Docker Desktop
```

**状态：** 已解决 ✅（重启后 Docker 正常运行）

---

## Issue #7 — 2026-03-02 · 5 个容器启动失败（backend/celery/frontend/nginx）

**现象：**
```
agent_backend      Exited (1)
agent_celery_beat  Exited (1)
agent_celery_worker Exited (1)
agent_frontend     Exited (254)
agent_nginx        Exited (127)
```
仅 postgres 和 redis 正常运行

**原因：** 待查（需要查看 `docker logs agent_backend` 确认根本原因）

**解决方案：** 待定，需要查看后端日志后确认

**状态：** 调查中 ⏳

---

## Issue #8 — 2026-03-02 · Docker Desktop 反复崩溃（SIGBUS / closed pipe）

**现象：**
```
fatal error: fault
signal SIGBUS: bus error
io: read/write on closed pipe
```

**原因：** Docker 数据目录迁移至 D 盘后，Docker 引擎内部状态损坏，buildkit 在处理构建任务时内存访问异常

**解决方案：**
1. 强制关闭所有进程：`wsl --shutdown` + 结束 Docker 进程
2. 执行 Docker Desktop 出厂重置：Settings → Troubleshoot → Reset to factory defaults
3. 重置后立即重新配置：Settings → Resources → Advanced → Disk image location = `D:\Docker`
4. Apply & Restart 后重新构建：`docker-compose build --no-cache && docker-compose up -d`

**状态：** 处理中 ⏳

---

## Issue #9 — 2026-03-02 · Docker 重装后镜像源配置丢失（Issue #1 重现）

**现象：**
```
failed to fetch oauth token: Post "https://auth.docker.io/token": dial tcp ... connectex: A connection attempt failed
```

**原因：** Docker Desktop 重装后配置清空，国内镜像源设置丢失，无法直连 Docker Hub

**解决方案：** Docker Desktop → Settings → Docker Engine，添加：
```json
{
  "registry-mirrors": [
    "https://docker.m.daocloud.io",
    "https://hub-mirror.c.163.com",
    "https://dockerproxy.com"
  ]
}
```
Apply & Restart 后重新构建

**状态：** 已解决 ✅

---

## Issue #10 — 2026-03-02 · celery 找不到 app.tasks.celery_app 模块

**现象：**
```
Unable to load celery application.
The module app.tasks.celery_app was not found.
```

**原因：** `backend/app/tasks/` 目录从未创建，docker-compose.yml 中 celery 命令引用的模块不存在

**解决方案：** 新建以下文件：
- `backend/app/tasks/__init__.py`（空包初始化文件）
- `backend/app/tasks/celery_app.py`（Celery 应用实例配置）

**状态：** 已解决 ✅

---

## Issue #11 — 2026-03-02 · frontend rollup SyntaxError（musl 修复方案升级）

**现象：**
```
file:///app/node_modules/rollup/dist/es/shared/parseAst.js:2097
SyntaxError: Invalid or unexpected token
```

**原因：** Dockerfile 中用 `--save-optional` 安装 musl 包不可靠；正确做法是直接写入 package.json devDependencies，确保每次 npm install 都会安装

**解决方案：** 在 `frontend/package.json` devDependencies 中直接添加 `"@rollup/rollup-linux-x64-musl": ">=4.0.0"`

**状态：** 已解决 ✅

---

## Issue #12 — 2026-03-02 · CORS_ORIGINS 格式错误导致 pydantic 解析失败

**现象：**
```
pydantic_settings.env_settings.EnvSettingsError: error parsing value for field "CORS_ORIGINS"
```

**原因：** pydantic-settings v2 对 `List[str]` 字段要求 `.env` 中使用 JSON 数组格式，旧的逗号分隔格式不再支持

**解决方案：** 修改 `.env` 中 CORS_ORIGINS 为 JSON 数组格式：
```
CORS_ORIGINS=["http://localhost:5173","http://localhost:3000"]
```

**状态：** 已解决 ✅

---

## Issue #13 — 2026-03-02 · frontend rollup SyntaxError（根本修复：从 Alpine 改为 Debian slim）

**现象：**
```
file:///app/node_modules/rollup/dist/es/shared/parseAst.js:2097
SyntaxError: Invalid or unexpected token
```

**原因：** `node:20-alpine` 使用 musl libc，而 rollup 4.x 在 Docker 构建环境中无法可靠地自动检测 musl 平台并安装对应的原生二进制 `@rollup/rollup-linux-x64-musl`。npm 在构建阶段误选了 glibc 版本（`linux-x64-gnu`），运行时 musl 环境加载该二进制失败，回退到含 WebAssembly 大整数字面量的纯 JS 文件，Node.js 无法解析，报 SyntaxError。
此前尝试的修补（`--save-optional` 额外安装 musl 包、在 devDependencies 中声明 musl 包）均不可靠，因为 rollup 的原生二进制加载机制依赖 rollup 自身 optionalDependencies 版本精确匹配。

**解决方案：** 从根本上切换基础镜像：
- `frontend/Dockerfile`：`FROM node:20-alpine` → `FROM node:20-slim`（Debian/glibc）
- `frontend/package.json`：移除 `"@rollup/rollup-linux-x64-musl": ">=4.0.0"`（glibc 环境不需要）
- 删除旧 volume 并重建：
  ```bash
  docker-compose stop frontend
  docker-compose rm -f frontend
  docker volume rm soiton2026_frontend_node_modules
  docker-compose build --no-cache frontend
  docker-compose up -d frontend
  ```

**状态：** 未解决 ❌（切换 node:20-slim 后仍然出现，根因见 Issue #14）

---

## Issue #14 — 2026-03-02 · frontend rollup SyntaxError（真正根因：Docker named volume 初始化失效）

**现象：** 同 Issue #13，切换 node:20-slim 后仍然出现：
```
SyntaxError: Invalid or unexpected token（parseAst.js:2097）
```

**原因：** 当容器同时挂载：
- bind mount：`./frontend:/app`（host 目录覆盖 /app）
- named volume：`frontend_node_modules:/app/node_modules`（挂载到 bind mount 子目录）

Docker 初始化新建空 volume 时，应从 image 复制 `/app/node_modules`。但由于 parent bind mount 已覆盖 `/app`，Docker 看到的是 host 侧 `./frontend/node_modules`（不存在），将空内容复制进 volume。容器启动后 node_modules 为空，rollup 回退到 WASM parseAst.js 并报 SyntaxError。

**解决方案：** 在容器启动时运行 `npm install`（而非 build 时）——见 Issue #14 的后续修正

**状态：** 未解决 ❌（仍报 SyntaxError，根因见 Issue #15）

---

## Issue #15 — 2026-03-02 · frontend rollup SyntaxError（最终根因：Windows package-lock.json 不含 Linux native binary）

**现象：** 无论怎样重建，仍然报：
```
SyntaxError: Invalid or unexpected token（parseAst.js:2097）
```
npm install 在容器内运行时显示 "up to date, 344 packages, 5s"（极快，说明它认为无需安装任何新包）

**原因（确认）：**
1. `package-lock.json` 在 Windows 上生成，lockfile 中只记录了 `@rollup/rollup-win32-x64-msvc`
2. npm 在 Linux 容器内用此 lockfile 运行时，跳过 Windows binary（正确），但**不补装** Linux binary（`@rollup/rollup-linux-x64-gnu`），因为 lockfile 中没有记录它
3. rollup 找不到任何原生二进制 → 回退到 WASM fallback（`parseAst.js`）→ Node.js 20.20.0 无法解析该文件中的 WASM 字节序列 → SyntaxError

**解决方案：** 在 docker-compose.yml 的 command 中加 `--no-package-lock` 标志，强制 npm 忽略 Windows lockfile，按当前 Linux glibc 平台全新解析并安装 `@rollup/rollup-linux-x64-gnu`：
```yaml
command: sh -c "npm install --no-package-lock && npm run dev -- --host 0.0.0.0"
```
同时需清空 named volume（否则旧的错误 node_modules 持续被复用）：
```powershell
docker-compose stop frontend
docker-compose rm -f frontend
docker volume rm soiton2026_frontend_node_modules
docker-compose up -d frontend
```
首次启动约 1-3 分钟（全量安装），后续重启快速（npm 增量检查）。

**状态：** 已解决 ✅（加 `--no-package-lock` 后 npm 全量重装 Linux binary，frontend 成功启动）

---

<!-- 后续问题由 Claude 续写，格式：
## Issue #N — YYYY-MM-DD · 标题
**现象：** 错误信息
**原因：** 分析
**解决方案：** 操作步骤
**状态：** 已解决 ✅ / 待验证 ⏳ / 未解决 ❌
-->

## Issue #16 — 2026-03-02 · 登录 500 错误（Vite proxy 指向错误地址）

**现象：** 访问 http://localhost:5173 后点击登录，报 500 错误

**原因：** `frontend/vite.config.ts` 中 Vite 开发服务器代理配置：
```js
proxy: { '/api': { target: 'http://localhost:8000' } }
```
Vite dev server 在 Docker 容器内运行，容器内 `localhost` 指向自身（前端容器），不是后端容器。因此代理连接失败，返回 502/500。

**解决方案：** 将 proxy target 改为 Docker 网络内的服务名：
```js
proxy: { '/api': { target: 'http://backend:8000', changeOrigin: true } }
```
Vite 重新加载后（热重载自动触发）即生效，无需重建容器。

**状态：** 已解决 ✅

## Issue #17 — 2026-03-02 · 登录仍报 500（Vite proxy 无法解析 Docker 服务名）

**现象：** 登录页面持续报 500 错误。Vite 日志：`http proxy error: connect ECONNREFUSED 127.0.0.1:8000`

**原因：** Vite 的内部代理库（http-proxy）在 Docker 容器环境下无法正确解析 Docker 内部服务名 `backend`，最终退化为 `127.0.0.1`，而前端容器的 8000 端口没有服务在监听，所以连接被拒绝。

验证过程：
- `getent hosts backend` → `172.18.0.6`（DNS 本身正常）
- Node.js `http.request({hostname:'backend', port:8000})` → 200（Node.js 直连正常）
- Vite proxy → `ECONNREFUSED 127.0.0.1:8000`（Vite 内部解析异常）

**解决方案：** 改用 Docker Desktop 提供的特殊域名 `host.docker.internal`：

```
// vite.config.ts
target: 'http://host.docker.internal:8000'
```

原理：`host.docker.internal` 解析为宿主机 IP（Docker Desktop 内置），宿主机上 backend 容器已映射了 8000 端口（`ports: "8000:8000"`），所以请求路径变为：前端容器 → host.docker.internal → 宿主机 → backend 容器。

**状态：** 已解决 ✅

---

## Issue #18 — 2026-03-03 · v2.6 前端崩溃：Cannot access 'modeModels' before initialization

**现象：**
```
Unexpected Application Error!
Cannot access 'modeModels' before initialization
ReferenceError: Cannot access 'modeModels' before initialization
    at Chat (http://localhost/src/pages/Chat.tsx:245:7)
```
打开聊天页面即崩溃，白屏。

**原因：** JavaScript `const` 存在「暂时性死区」（Temporal Dead Zone，TDZ）。
`frontend/src/pages/Chat.tsx` 中，引用 `modeModels` 的 `useEffect` 声明顺序在 `modeModels` 的 `useMemo` **之前**。
React 函数组件从上到下依次执行 Hook，当执行到 `useEffect` 时，`modeModels` 的 `const` 声明尚未运行，闭包捕获的是 TDZ 状态，触发 ReferenceError。

**解决方案：** 调换两个 Hook 的声明顺序：将 `modeModels` 的 `useMemo` 移到引用它的 `useEffect` **之前**。
```
useMemo modeModels            ← 先声明
useEffect 监听 modeModels 变化 ← 后引用
```

**文件：** `frontend/src/pages/Chat.tsx`

**状态：** 已解决 ✅（调整声明顺序后页面恢复正常）

## Issue #8 — 2026-03-03 · Chat.tsx 图像模式 markdownComponents 大小写崩溃

**现象：** 前端报错 `ReferenceError: markdownComponents is not defined at Chat.tsx:804`，图像生成模式无法使用
**原因：** 变量声明为 `const MarkdownComponents`（大写 M，第 86 行），但图像模式消息渲染处写成 `components={markdownComponents}`（小写 m，第 665 行）。JavaScript `const` 变量区分大小写，小写引用找不到声明，触发 TDZ（暂时性死区）ReferenceError
**解决方案：** 将 Chat.tsx 第 665 行的 `markdownComponents` 改为 `MarkdownComponents`
**状态：** 已解决 ✅

## Issue #9 — 2026-03-03 · 图像模式发送后界面不更新 + 历史无图片

**现象：** 图像生成模式点击生成后，界面看起来没有变化；在历史对话中只看到文字 Prompt 没有图片
**原因：**
1. 原设计中图像模式有独立的"引导面板"（messages.length===0 时显示），和"消息列表"（messages.length>0 时显示）两个分支，切换时 React 条件渲染导致视觉上"看起来没变"
2. loading 动画被放在消息列表顶部而不是底部，发送后 Spin 出现在用户消息上方，位置错误
3. 图像生成不走 SSE 接口，不会自动创建/更新对话记录，所以历史页看不到图片
**解决方案：**
- 统一所有模式使用同一消息列表（无条件分支），消除视觉割裂
- loading 动画移到消息列表最底部（在 messagesEndRef 之前）
- 图像生成结果以 assistant 消息 Markdown `![](base64)` 形式嵌入消息流
- 历史不保存问题暂接受（图像生成无法通过现有 SSE 接口保存，待后续添加专用保存接口）
**状态：** 已解决（本地会话显示问题） ✅ / 历史保存待实现 ⏳
