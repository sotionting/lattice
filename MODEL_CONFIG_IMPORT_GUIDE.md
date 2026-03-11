# 模型配置导入指南

## 概述
从备份文件 `agent_system_backup_clean.sql` 中提取模型配置数据，导入到当前数据库。

## 导入数据

共 4 个模型配置：

| 名称 | Provider | Model ID | 类型 | 状态 |
|------|----------|----------|------|------|
| MiMo | mimo | mimo-v2-flash | llm | 启用 |
| gemini-3-flash-preview | google | gemini-3-flash-preview | llm | 启用（默认） |
| nano banana pro | google | gemini-3-pro-image-preview | image | 启用 |
| veo-3.1-generate-preview | google | veo-3.1-generate-preview | video | 启用 |

## 执行步骤

### 方式 1：在 Docker 容器中执行

```bash
# 进入 backend 容器
docker-compose exec backend bash

# 运行导入脚本
cd /app
python scripts/import_model_configs.py

# 运行测试脚本
python scripts/test_model_configs.py
```

### 方式 2：本地 Python 执行

首先确保本地有 Python 环境和依赖：

```bash
cd /Users/sotionting/Desktop/soiton2026/backend

# 如果未安装依赖
pip install -r requirements.txt

# 运行导入
python scripts/import_model_configs.py

# 运行测试
python scripts/test_model_configs.py
```

## 脚本说明

### import_model_configs.py
- **功能**：将硬编码的模型配置数据导入到数据库
- **特性**：
  - 自动检测重复数据（已存在则跳过）
  - 详细的导入日志
  - 异常处理和事务回滚

### test_model_configs.py
- **功能**：验证导入的数据完整性
- **检查项**：
  1. 数据库连接
  2. 按类型分类统计
  3. 默认模型验证
  4. 所有模型列表
  5. Provider 分组
  6. 关键字段验证
  7. 模型可用性检查
  8. API 兼容性验证

## 导入后验证

### Web API 验证
访问 http://localhost:8000/api/v1/docs 查看 Swagger 文档

```bash
# 获取活跃模型列表
curl -H "Authorization: Bearer <YOUR_TOKEN>" \
  http://localhost:8000/api/v1/models/active
```

### 预期响应
```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "id": "5485cde5-68d0-4d29-bcf0-bc4b84a87030",
      "name": "gemini-3-flash-preview",
      "provider": "google",
      "model_id": "gemini-3-flash-preview",
      "model_type": "llm",
      "is_default": true,
      "api_key": "••••••••••••••••••••••••••••gQw"
    },
    ...
  ]
}
```

## 故障排查

### 问题 1：ImportError
如果遇到 `ImportError: cannot import name 'ModelConfig'`，请检查：
- 后端数据库迁移是否已执行：`docker-compose exec backend alembic upgrade head`
- 是否在正确的目录执行脚本

### 问题 2：数据库连接失败
检查 `.env` 文件中的 `DATABASE_URL` 是否正确配置：
```
DATABASE_URL=postgresql://soiton:soiton2026db@postgres:5432/agent_platform
```

### 问题 3：重复数据
脚本设计了自动去重机制，同一 ID 的数据只会导入一次。若需要重新导入，可以先手动删除：

```sql
DELETE FROM model_configs
WHERE id IN (
  'dcf88d3a-2f2e-4504-ad11-810a8c433812',
  '5485cde5-68d0-4d29-bcf0-bc4b84a87030',
  '6c60517e-59cc-4f9a-9c5d-30154532275b',
  '62519283-f130-49c0-a591-59dbe797963e'
);
```

## 文件列表

- `backend/scripts/import_model_configs.py` - 导入脚本
- `backend/scripts/test_model_configs.py` - 测试脚本
- `MODEL_CONFIG_IMPORT_GUIDE.md` - 本文档

## 注意事项

1. **API Key 安全**：这些 API Key 是备份文件中的测试密钥，生产环境应该使用真实密钥
2. **数据库备份**：导入前建议备份数据库
3. **权限检查**：执行 import 脚本需要数据库写入权限
4. **Python 版本**：需要 Python 3.8+

## 后续步骤

1. 在管理后台修改 API Key（如需更新）
2. 测试各模型的实际 API 调用
3. 在聊天页面选择模型并测试流式生成
