# 数据库自动备份指南

## 快速开始

### 手动备份（立即执行）

```bash
cd /Users/sotionting/Desktop/soiton2026
bash backup_database.sh
```

### 自动备份设置（每天凌晨 2 点）

在终端执行以下命令打开 crontab 编辑器：

```bash
crontab -e
```

添加以下行（在文件末尾）：

```bash
# 每天凌晨 2 点自动备份数据库
0 2 * * * cd /Users/sotionting/Desktop/soiton2026 && bash backup_database.sh >> /tmp/postgres_backup.log 2>&1
```

保存并退出（vim 编辑器：按 `Esc`，然后输入 `:wq` 并回车）

### 验证 cron 任务

```bash
crontab -l
```

应该能看到刚刚添加的备份任务。

---

## 备份和恢复

### 查看所有备份

```bash
ls -lht /Users/sotionting/Desktop/soiton2026/database_backups/
```

### 恢复数据库

```bash
bash restore_database.sh database_backups/postgres_backup_<日期时间>.sql
```

示例：
```bash
bash restore_database.sh database_backups/postgres_backup_20260310_150000.sql
```

---

## 备份策略

- **备份频率**：每天 1 次（凌晨 2 点）
- **保留策略**：自动保留最近 7 个备份
- **备份位置**：`database_backups/` 目录
- **备份大小**：通常 < 1MB（仅包含数据，不包含索引）

---

## 紧急恢复

如果数据丢失，可以：

1. 查看最近的备份：
   ```bash
   ls -lht database_backups/ | head -3
   ```

2. 恢复最近的备份：
   ```bash
   bash restore_database.sh database_backups/$(ls -t database_backups/*.sql | head -1)
   ```

---

## 云备份（可选）

为了更安全，可以额外上传备份到云存储：

```bash
# 添加到 crontab
0 3 * * * aws s3 cp /Users/sotionting/Desktop/soiton2026/database_backups/ s3://your-bucket/backups/ --recursive --exclude "*" --include "postgres_backup_*.sql"
```

或使用其他云存储服务（Google Drive、Dropbox、OneDrive 等）。
