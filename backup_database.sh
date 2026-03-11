#!/bin/bash

# PostgreSQL 自动备份脚本
# 用法：bash backup_database.sh
# 或设置 cron 定时运行：0 2 * * * cd /Users/sotionting/Desktop/soiton2026 && bash backup_database.sh

set -e

BACKUP_DIR="/Users/sotionting/Desktop/soiton2026/database_backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/postgres_backup_$TIMESTAMP.sql"

# 创建备份目录
mkdir -p "$BACKUP_DIR"

echo "🔄 开始备份数据库..."
echo "备份文件: $BACKUP_FILE"

# 使用 docker exec 执行 pg_dump
docker exec agent_postgres pg_dump -U postgres -d agent_system > "$BACKUP_FILE"

if [ -f "$BACKUP_FILE" ]; then
    FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "✅ 备份成功: $BACKUP_FILE ($FILE_SIZE)"

    # 只保留最近 7 个备份，删除旧备份
    echo "🧹 清理旧备份（保留最近 7 个）..."
    ls -t "$BACKUP_DIR"/postgres_backup_*.sql 2>/dev/null | tail -n +8 | xargs -r rm
    echo "✅ 清理完成"
else
    echo "❌ 备份失败"
    exit 1
fi
