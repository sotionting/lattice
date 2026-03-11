"""
从备份 SQL 文件导入模型配置数据
仅导入 model_configs 表的数据到数据库
"""
import sys
import os
from datetime import datetime
from uuid import UUID

# 添加项目路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))


def parse_datetime(dt_str):
    """解析不同格式的日期字符串"""
    try:
        return datetime.fromisoformat(dt_str)
    except ValueError:
        # 尝试用 strptime 解析带微秒的格式
        try:
            return datetime.strptime(dt_str, '%Y-%m-%d %H:%M:%S.%f')
        except ValueError:
            return datetime.strptime(dt_str, '%Y-%m-%d %H:%M:%S')

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.config import settings
from app.models.model_config import ModelConfig


# 从备份文件提取的模型配置数据
MODEL_CONFIGS_DATA = [
    {
        'id': 'dcf88d3a-2f2e-4504-ad11-810a8c433812',
        'name': 'MiMo',
        'provider': 'mimo',
        'model_id': 'mimo-v2-flash',
        'api_key': 'sk-cn8ebup9s2rwmr5qox2ih9dp1ar8ewsvivxoqkmxz18nlh02',
        'base_url': None,
        'is_active': True,
        'is_default': False,
        'model_type': 'llm',
        'created_at': parse_datetime('2026-03-02 06:52:50.828421'),
        'updated_at': parse_datetime('2026-03-02 16:05:59.353152'),
    },
    {
        'id': '5485cde5-68d0-4d29-bcf0-bc4b84a87030',
        'name': 'gemini-3-flash-preview',
        'provider': 'google',
        'model_id': 'gemini-3-flash-preview',
        'api_key': 'AIzaSyAGk8fJCfMZbe2y4NGD-w4_dQF737gtgQw',
        'base_url': None,
        'is_active': True,
        'is_default': True,
        'model_type': 'llm',
        'created_at': parse_datetime('2026-03-02 16:05:59.363593'),
        'updated_at': parse_datetime('2026-03-02 16:07:06.392643'),
    },
    {
        'id': '6c60517e-59cc-4f9a-9c5d-30154532275b',
        'name': 'nano banana pro',
        'provider': 'google',
        'model_id': 'gemini-3-pro-image-preview',
        'api_key': 'AIzaSyAGk8fJCfMZbe2y4NGD-w4_dQF737gtgQw',
        'base_url': None,
        'is_active': True,
        'is_default': False,
        'model_type': 'image',
        'created_at': parse_datetime('2026-03-02 16:59:45.989120'),
        'updated_at': parse_datetime('2026-03-02 16:59:45.989125'),
    },
    {
        'id': '62519283-f130-49c0-a591-59dbe797963e',
        'name': 'veo-3.1-generate-preview',
        'provider': 'google',
        'model_id': 'veo-3.1-generate-preview',
        'api_key': 'AIzaSyAGk8fJCfMZbe2y4NGD-w4_dQF737gtgQw',
        'base_url': None,
        'is_active': True,
        'is_default': False,
        'model_type': 'video',
        'created_at': parse_datetime('2026-03-03 16:00:05.851453'),
        'updated_at': parse_datetime('2026-03-03 16:00:05.851465'),
    },
]


def import_model_configs():
    """导入模型配置数据到数据库"""

    # 创建数据库引擎和会话工厂
    engine = create_engine(settings.DATABASE_URL, echo=False)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = SessionLocal()

    try:
        print("开始导入模型配置...")
        print(f"共有 {len(MODEL_CONFIGS_DATA)} 条记录要导入")

        # 清空现有配置（可选）
        # session.query(ModelConfig).delete()
        # session.commit()
        # print("已清空现有配置")

        imported_count = 0
        skipped_count = 0

        for idx, config_data in enumerate(MODEL_CONFIGS_DATA, 1):
            try:
                # 检查是否已存在
                existing = session.query(ModelConfig).filter(
                    ModelConfig.id == UUID(config_data['id'])
                ).first()

                if existing:
                    print(f"  [{idx}] ⊘ 跳过 (已存在): {config_data['name']}")
                    skipped_count += 1
                    continue

                # 创建新配置
                model_config = ModelConfig(
                    id=UUID(config_data['id']),
                    name=config_data['name'],
                    provider=config_data['provider'],
                    model_id=config_data['model_id'],
                    api_key=config_data['api_key'],
                    base_url=config_data['base_url'],
                    is_active=config_data['is_active'],
                    is_default=config_data['is_default'],
                    model_type=config_data['model_type'],
                    created_at=config_data['created_at'],
                    updated_at=config_data['updated_at'],
                )
                session.add(model_config)
                print(f"  [{idx}] ✓ 已添加: {config_data['name']} ({config_data['model_type']})")
                imported_count += 1

            except Exception as e:
                print(f"  [{idx}] ✗ 导入失败: {config_data['name']} - {str(e)}")
                session.rollback()
                continue

        # 提交所有更改
        session.commit()
        print(f"\n导入完成!")
        print(f"  ✓ 成功导入: {imported_count} 条")
        print(f"  ⊘ 已跳过: {skipped_count} 条")

    except Exception as e:
        print(f"导入过程出错: {str(e)}")
        session.rollback()
        raise
    finally:
        session.close()


if __name__ == "__main__":
    import_model_configs()
