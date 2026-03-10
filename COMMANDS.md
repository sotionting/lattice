# 常用命令速查

## 启动项目

```bash
cd /Users/sotionting/Desktop/soiton2026
docker-compose up -d
docker-compose ps        # 确认 7 个容器都是 running
```

访问：
- 前端：http://localhost:5173
- API 文档：http://localhost:8000/api/v1/docs
- 管理员账号：admin / admin123456

---

## 关闭项目

```bash
docker-compose down
```

---

## 查看日志

```bash
docker-compose logs -f backend        # 后端日志
docker-compose logs -f frontend       # 前端日志
docker-compose logs -f celery_worker  # Celery 日志
docker-compose logs -f postgres       # 数据库日志
```

`Ctrl + C` 退出日志查看。

---

## 重启容器

```bash
docker-compose restart backend        # 重启后端
docker-compose restart frontend       # 重启前端
docker-compose restart                # 重启所有容器
```

---

## 数据库

```bash
# 执行数据库迁移（新增表/字段后必须执行）
docker-compose exec backend alembic upgrade head

# 创建新的迁移文件
docker-compose exec backend alembic revision --autogenerate -m "描述"

# 重建管理员账号
docker-compose exec backend python scripts/create_admin.py

# 进入数据库命令行
docker-compose exec postgres psql -U postgres agent_system
```

---

## 前端 node_modules 出问题时重装

```bash
docker-compose stop frontend
docker-compose rm -f frontend
docker volume rm soiton2026_frontend_node_modules
docker-compose up -d frontend
docker-compose logs -f frontend      # 等待出现 "VITE vX.X ready"
```

---

## 首次启动 / 迁移后初始化

```bash
docker-compose up -d
docker-compose exec backend alembic upgrade head
docker-compose exec backend python scripts/create_admin.py
```
