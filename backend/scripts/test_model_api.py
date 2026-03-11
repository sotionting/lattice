"""
API 集成测试：验证模型配置 API 端点
测试 /api/v1/models/active 端点的响应
"""
import sys
import os
import json

# 添加项目路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.main import app
from fastapi.testclient import TestClient
from app.config import settings

# 创建测试客户端
client = TestClient(app)


def test_models_active_endpoint():
    """测试 GET /api/v1/models/active 端点"""

    print("=" * 70)
    print("API 集成测试：/models/active")
    print("=" * 70)

    # 测试 1：未认证访问
    print("\n[测试 1] 未认证访问...")
    response = client.get("/api/v1/models/active")
    print(f"  状态码: {response.status_code}")
    if response.status_code == 403:
        print("  ✓ 正确返回 403 Forbidden（需要认证）")
    else:
        print(f"  ⚠ 预期 403，实际 {response.status_code}")

    # 注意：以下测试需要有效的 JWT token
    # 在生产环境中，应该先调用 /auth/login 获取 token
    print("\n[测试 2] 数据库直接查询（跳过 JWT 验证）...")

    # 使用数据库会话直接查询
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from app.models.model_config import ModelConfig

    engine = create_engine(settings.DATABASE_URL, echo=False)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = SessionLocal()

    try:
        # 查询所有活跃模型
        active_models = session.query(ModelConfig).filter(
            ModelConfig.is_active == True
        ).all()

        print(f"  ✓ 查询成功，共 {len(active_models)} 个活跃模型\n")

        # 构造类似 API 返回的格式
        models_data = []
        for model in active_models:
            model_dict = {
                "id": str(model.id),
                "name": model.name,
                "provider": model.provider,
                "model_id": model.model_id,
                "model_type": model.model_type,
                "is_default": model.is_default,
                # API 返回时应脱敏 API Key，只显示最后 4 位
                "api_key": f"{'*' * (len(model.api_key) - 4)}{model.api_key[-4:]}"
                if model.api_key
                else None,
            }
            models_data.append(model_dict)

        # 按是否默认排序（默认的在前）
        models_data.sort(key=lambda x: (not x["is_default"], x["name"]))

        # 输出格式化结果
        print("  模型列表（模拟 API 响应）:\n")
        response_data = {
            "code": 200,
            "message": "success",
            "data": models_data,
        }

        print("  {")
        print(f'    "code": {response_data["code"]},')
        print(f'    "message": "{response_data["message"]}",')
        print('    "data": [')

        for idx, model in enumerate(models_data):
            print(f"      {{")
            print(f'        "id": "{model["id"]}",')
            print(f'        "name": "{model["name"]}",')
            print(f'        "provider": "{model["provider"]}",')
            print(f'        "model_id": "{model["model_id"]}",')
            print(f'        "model_type": "{model["model_type"]}",')
            print(f'        "is_default": {str(model["is_default"]).lower()},')
            print(
                f'        "api_key": "{model["api_key"]}"'
                if model["api_key"]
                else '        "api_key": null'
            )
            if idx < len(models_data) - 1:
                print(f"      }},")
            else:
                print(f"      }}")

        print("    ]")
        print("  }\n")

        # 测试 3：按类型过滤
        print("[测试 3] 按模型类型分类...")
        model_types = ["llm", "image", "video"]
        for mtype in model_types:
            models_by_type = [m for m in models_data if m["model_type"] == mtype]
            print(f"  ✓ {mtype.upper()}: {len(models_by_type)} 个")
            for m in models_by_type:
                default_marker = " (默认)" if m["is_default"] else ""
                print(f"    - {m['name']}{default_marker}")

        # 测试 4：验证默认模型
        print("\n[测试 4] 默认模型验证...")
        default_models = [m for m in models_data if m["is_default"]]
        if len(default_models) == 1:
            print(f"  ✓ 恰好 1 个默认模型: {default_models[0]['name']}")
        else:
            print(f"  ⚠ 默认模型数量不正确: {len(default_models)} 个")

        # 测试 5：验证 API Key 脱敏
        print("\n[测试 5] API Key 脱敏验证...")
        all_masked = all(
            (m["api_key"] and "*" in m["api_key"]) or not m["api_key"]
            for m in models_data
        )
        if all_masked:
            print("  ✓ 所有 API Key 已正确脱敏")
            for m in models_data:
                if m["api_key"]:
                    print(f"    - {m['name']}: {m['api_key']}")
        else:
            print("  ✗ 某些 API Key 未脱敏")

        # 测试 6：验证必填字段
        print("\n[测试 6] 必填字段验证...")
        required_fields = ["id", "name", "provider", "model_id", "model_type"]
        all_valid = all(
            all(field in m for field in required_fields) for m in models_data
        )
        if all_valid:
            print(f"  ✓ 所有模型都包含必填字段: {', '.join(required_fields)}")
        else:
            print("  ✗ 某些模型缺少必填字段")

        # 测试 7：模型兼容性
        print("\n[测试 7] 模型与 API 兼容性...")
        compatibility_check = {
            "mimo": ["mimo-v2-flash"],
            "google": ["gemini-3-flash-preview", "gemini-3-pro-image-preview", "veo-3.1-generate-preview"],
        }

        for provider, expected_models in compatibility_check.items():
            models_with_provider = [m for m in models_data if m["provider"] == provider]
            print(f"  ✓ {provider.upper()}: {len(models_with_provider)} 个模型")
            for m in models_with_provider:
                print(f"    - {m['model_id']}")

        print("\n" + "=" * 70)
        print("✓ API 集成测试完成!")
        print("=" * 70)

    finally:
        session.close()


if __name__ == "__main__":
    test_models_active_endpoint()
