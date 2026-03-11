# 快速参考：模型配置导入

## 🚀 一键操作

### 导入模型配置
```bash
docker-compose exec backend python3 scripts/import_model_configs.py
```

**预期输出**：
```
开始导入模型配置...
共有 4 条记录要导入
  [1] ✓ 已添加: MiMo (llm)
  [2] ✓ 已添加: gemini-3-flash-preview (llm)
  [3] ✓ 已添加: nano banana pro (image)
  [4] ✓ 已添加: veo-3.1-generate-preview (video)

导入完成!
  ✓ 成功导入: 4 条
  ⊘ 已跳过: 0 条
```

### 验证导入结果
```bash
docker-compose exec backend python3 scripts/test_model_configs.py
```

### API 集成测试
```bash
docker-compose exec backend python3 scripts/test_model_api.py
```

---

## 📊 导入的模型

| 序号 | 名称 | 类型 | Provider | 默认 |
|------|------|------|----------|------|
| 1 | MiMo | LLM | mimo | ✗ |
| 2 | gemini-3-flash-preview | LLM | google | ✓ |
| 3 | nano banana pro | Image | google | ✗ |
| 4 | veo-3.1-generate-preview | Video | google | ✗ |

---

## 🔍 验证检查清单

### ✓ 导入验证
- [x] 4 条记录成功导入
- [x] 0 条记录被跳过
- [x] 所有 API Key 已配置
- [x] 所有模型已启用

### ✓ 数据库验证
- [x] 数据库连接成功
- [x] LLM 模型: 2 个
- [x] Image 模型: 1 个
- [x] Video 模型: 1 个
- [x] 默认模型正确

### ✓ API 验证
- [x] 未认证返回 403
- [x] 已认证可查询全部模型
- [x] API Key 正确脱敏
- [x] 必填字段完整
- [x] Provider 兼容性正常

---

## 🌐 Web 界面验证

### 1. 聊天页面
```
访问 http://localhost:5173 → 登录 → 对话页面
✓ 模型选择器显示 2 个 LLM 模型
✓ 默认选中 "gemini-3-flash-preview"
✓ 可正常发送消息
```

### 2. 模型管理页面
```
访问 http://localhost:5173 → 管理员 → 模型管理
✓ 显示 4 个模型
✓ 可按类型（LLM/Image/Video）过滤
✓ 可修改/禁用模型
```

### 3. API 文档
```
访问 http://localhost:8000/api/v1/docs
✓ /models/active 端点可调用
✓ 返回 4 个模型配置
✓ API Key 已脱敏
```

---

## 🛠️ 常用命令

### 查看所有模型
```bash
docker-compose exec backend python3 -c "
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.config import settings
from app.models.model_config import ModelConfig

engine = create_engine(settings.DATABASE_URL)
Session = sessionmaker(bind=engine)
session = Session()

for m in session.query(ModelConfig).all():
    print(f'{m.name} ({m.model_type}) - {m.provider} - {\"默认\" if m.is_default else \"\"}'.strip())
"
```

### 清空所有模型
```bash
docker-compose exec backend python3 -c "
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.config import settings
from app.models.model_config import ModelConfig

engine = create_engine(settings.DATABASE_URL)
Session = sessionmaker(bind=engine)
session = Session()
session.query(ModelConfig).delete()
session.commit()
print('已清空所有模型')
"
```

### 设置默认模型
```bash
docker-compose exec backend python3 -c "
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.config import settings
from app.models.model_config import ModelConfig

engine = create_engine(settings.DATABASE_URL)
Session = sessionmaker(bind=engine)
session = Session()

# 清除所有默认标记
session.query(ModelConfig).update({'is_default': False})

# 设置新默认（以 gemini-3-flash-preview 为例）
model = session.query(ModelConfig).filter_by(name='gemini-3-flash-preview').first()
if model:
    model.is_default = True
    session.commit()
    print(f'已设置 {model.name} 为默认模型')
"
```

---

## 📝 文件位置

| 文件 | 路径 |
|------|------|
| 导入脚本 | `backend/scripts/import_model_configs.py` |
| 数据库测试 | `backend/scripts/test_model_configs.py` |
| API 测试 | `backend/scripts/test_model_api.py` |
| 操作指南 | `MODEL_CONFIG_IMPORT_GUIDE.md` |
| 结果总结 | `IMPORT_RESULTS.md` |
| 快速参考 | `QUICK_REFERENCE.md`（本文件） |

---

## ⚡ 故障排查

### "数据库连接失败"
```bash
# 检查 PostgreSQL 容器状态
docker-compose ps postgres

# 检查连接
docker-compose exec postgres psql -U soiton -d agent_platform -c "SELECT COUNT(*) FROM model_configs;"
```

### "Permission denied"
```bash
# 检查权限
ls -la backend/scripts/

# 添加执行权限
chmod +x backend/scripts/*.py
```

### "ModuleNotFoundError"
```bash
# 重新初始化数据库
docker-compose exec backend alembic upgrade head

# 重启后端
docker-compose restart backend
```

---

## 📞 获取帮助

详见：
- 📘 [MODEL_CONFIG_IMPORT_GUIDE.md](./MODEL_CONFIG_IMPORT_GUIDE.md) - 详细操作指南
- 📊 [IMPORT_RESULTS.md](./IMPORT_RESULTS.md) - 导入结果详细报告
- 📖 [README.md](./README.md) - 项目文档
- 🚀 [QUICKSTART.md](./QUICKSTART.md) - 快速入门

---

**最后更新**：2026-03-11
**导入状态**：✅ 完成
**测试状态**：✅ 全通过
