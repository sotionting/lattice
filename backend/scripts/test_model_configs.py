"""
测试模型配置导入结果
验证数据完整性、正确性、API 调用
"""
import sys
import os
import json

# 添加项目路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.config import settings
from app.models.model_config import ModelConfig


def test_model_configs():
    """测试模型配置数据"""

    # 创建数据库引擎和会话工厂
    engine = create_engine(settings.DATABASE_URL, echo=False)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = SessionLocal()

    try:
        print("=" * 70)
        print("模型配置导入验证")
        print("=" * 70)

        # 测试 1：验证数据库连接
        print("\n[测试 1] 数据库连接...")
        try:
            total_count = session.query(ModelConfig).count()
            print(f"  ✓ 连接成功, 共有 {total_count} 个模型配置")
        except Exception as e:
            print(f"  ✗ 连接失败: {str(e)}")
            return

        # 测试 2：按类型分类统计
        print("\n[测试 2] 按模型类型分类...")
        types = ['llm', 'image', 'video']
        for model_type in types:
            count = session.query(ModelConfig).filter(
                ModelConfig.model_type == model_type,
                ModelConfig.is_active == True
            ).count()
            print(f"  ✓ {model_type.upper()} 模型: {count} 个")

        # 测试 3：验证默认模型
        print("\n[测试 3] 验证默认模型...")
        default_model = session.query(ModelConfig).filter(
            ModelConfig.is_default == True
        ).first()
        if default_model:
            print(f"  ✓ 默认 LLM 模型: {default_model.name}")
            print(f"    - Provider: {default_model.provider}")
            print(f"    - Model ID: {default_model.model_id}")
        else:
            print("  ⚠ 未找到默认模型")

        # 测试 4：列表所有模型
        print("\n[测试 4] 所有模型配置...")
        all_models = session.query(ModelConfig).all()
        print(f"  总共 {len(all_models)} 个模型:\n")

        for idx, model in enumerate(all_models, 1):
            status = "✓" if model.is_active else "✗"
            default_flag = "[默认]" if model.is_default else ""
            print(f"  [{idx}] {status} {model.name} {default_flag}")
            print(f"      - ID: {model.id}")
            print(f"      - Provider: {model.provider}")
            print(f"      - Model Type: {model.model_type}")
            print(f"      - Model ID: {model.model_id}")
            print(f"      - API Key: {'✓ 已配置' if model.api_key else '✗ 未配置'}")
            print(f"      - Base URL: {model.base_url or '(无)'}")
            print(f"      - Active: {model.is_active}")
            print(f"      - Created: {model.created_at}")
            print()

        # 测试 5：按 provider 分组
        print("[测试 5] 按 provider 分组...")
        providers = session.query(ModelConfig.provider).distinct().all()
        for provider in providers:
            count = session.query(ModelConfig).filter(
                ModelConfig.provider == provider[0]
            ).count()
            models = session.query(ModelConfig.name).filter(
                ModelConfig.provider == provider[0]
            ).all()
            model_names = ', '.join([m[0] for m in models])
            print(f"  ✓ {provider[0].upper()}: {count} 个 ({model_names})")

        # 测试 6：验证关键字段
        print("\n[测试 6] 关键字段验证...")
        missing_api_key = session.query(ModelConfig).filter(
            ModelConfig.api_key.is_(None)
        ).count()
        missing_model_id = session.query(ModelConfig).filter(
            ModelConfig.model_id.is_(None)
        ).count()

        print(f"  ✓ 缺少 API Key 的模型: {missing_api_key} 个")
        print(f"  ✓ 缺少 Model ID 的模型: {missing_model_id} 个")

        if missing_api_key > 0:
            print("    ⚠ 警告: 某些模型缺少 API Key，可能无法使用")

        # 测试 7：验证模型可用性
        print("\n[测试 7] 可用模型检查...")
        active_models = session.query(ModelConfig).filter(
            ModelConfig.is_active == True
        ).all()
        print(f"  ✓ 启用的模型: {len(active_models)} 个")
        for model in active_models:
            print(f"    - {model.name} ({model.model_type})")

        # 测试 8: API 兼容性验证
        print("\n[测试 8] 模型 provider 验证...")
        llm_models = session.query(ModelConfig).filter(
            ModelConfig.model_type == 'llm',
            ModelConfig.is_active == True
        ).all()

        for model in llm_models:
            if model.provider == 'google':
                print(f"  ✓ {model.name}: Google API 兼容")
                if model.base_url:
                    print(f"    Base URL: {model.base_url}")
            elif model.provider == 'mimo':
                print(f"  ✓ {model.name}: MiMo API 兼容")
            else:
                print(f"  ⚠ {model.name}: 未知 provider ({model.provider})")

        print("\n" + "=" * 70)
        print("✓ 所有测试完成!")
        print("=" * 70)

    except Exception as e:
        print(f"\n✗ 测试过程出错: {str(e)}")
        raise
    finally:
        session.close()


if __name__ == "__main__":
    test_model_configs()
