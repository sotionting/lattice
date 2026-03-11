#!/bin/bash

# PostgreSQL 数据库恢复脚本
# 用法：bash restore_database.sh <备份文件>
# 示例：bash restore_database.sh database_backups/postgres_backup_20260310_150000.sql

set -e

if [ -z "$1" ]; then
    echo "❌ 用法: bash restore_database.sh <备份文件路径>"
    echo ""
    echo "可用的备份文件:"
    ls -lht /Users/sotionting/Desktop/soiton2026/database_backups/postgres_backup_*.sql 2>/dev/null | head -10 || echo "找不到备份文件"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ 文件不存在: $BACKUP_FILE"
    exit 1
fi

FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "⚠️  警告：恢复将覆盖现有数据库"
echo "备份文件: $BACKUP_FILE ($FILE_SIZE)"
echo ""
read -p "确认恢复? (y/N): " confirm

if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "已取消"
    exit 0
fi

echo "🔄 开始恢复数据库..."

# 使用 docker exec 执行 psql 恢复
docker exec -i agent_postgres psql -U postgres -d agent_system < "$BACKUP_FILE"

echo "✅ 数据库恢复成功"
echo ""
echo "验证: docker exec agent_postgres psql -U postgres -d agent_system -c 'SELECT COUNT(*) as conversations FROM conversations;'"
