#!/usr/bin/env python3
"""
全能 Agent API 测试脚本
- 测试 Agent 的各种功能
- 显示实时日志和详细错误信息
"""
import requests
import json
import time

# 配置
API_BASE = "http://localhost:8000/api/v1"

# 测试用户凭据
TEST_USERNAME = "admin"
TEST_PASSWORD = "admin123456"

def print_section(title):
    """打印分隔符"""
    print(f"\n{'='*70}")
    print(f"  {title}")
    print(f"{'='*70}\n")

def login():
    """登录获取 token"""
    print_section("步骤 1: 用户登录")
    url = f"{API_BASE}/auth/login"
    data = {
        "username": TEST_USERNAME,
        "password": TEST_PASSWORD
    }

    print(f"➜ POST {url}")
    print(f"  Body: {json.dumps(data)}")

    response = requests.post(url, json=data)
    print(f"  Status: {response.status_code}")

    if response.status_code == 200:
        result = response.json()
        token = result['data']['access_token']
        print(f"✓ Login successful")
        print(f"  Token: {token[:50]}...")
        return token
    else:
        print(f"✗ Login failed: {response.text}")
        return None

def get_agent_models(token: str):
    """获取可用的 Agent LLM 模型"""
    print_section("步骤 2: 获取可用 Agent 模型")
    url = f"{API_BASE}/agent/models"
    headers = {"Authorization": f"Bearer {token}"}

    print(f"➜ GET {url}")
    response = requests.get(url, headers=headers)
    print(f"  Status: {response.status_code}")

    if response.status_code == 200:
        result = response.json()
        data = result.get('data', {})
        models = data.get('models', [])
        print(f"✓ Found {len(models)} models:")
        for model in models:
            default_flag = " (默认)" if model.get('is_default') else ""
            print(f"  - {model['name']}{default_flag}")
            print(f"    ID: {model['id']}")
            print(f"    Provider: {model['provider']}")

        if models:
            return models[0]['id']
        else:
            print("✗ No models available")
            return None
    else:
        print(f"✗ Failed: {response.status_code}")
        print(f"  Response: {response.text}")
        return None

def run_agent(token: str, model_id: str, agent_type: str = "chat", prompt: str = "你好"):
    """运行 Agent"""
    print_section(f"运行 {agent_type} Agent")
    url = f"{API_BASE}/agent/run"
    headers = {"Authorization": f"Bearer {token}"}

    data = {
        "agent_type": agent_type,
        "prompt": prompt,
        "model_id": model_id
    }

    print(f"➜ POST {url}")
    print(f"  Body: {json.dumps(data, ensure_ascii=False, indent=2)}")

    try:
        response = requests.post(url, json=data, headers=headers, timeout=30)
        print(f"  Status: {response.status_code}")

        if response.status_code == 200:
            result = response.json()
            output = result.get('data', {}).get('output', '')
            print(f"✓ Agent execution successful")
            print(f"\n  Output ({len(output)} chars):")
            print(f"  {output[:300]}")
            if len(output) > 300:
                print(f"  ... (截断，完整内容 {len(output)} 字符)")
            return True
        else:
            print(f"✗ Failed with status {response.status_code}")
            print(f"  Response:")
            try:
                print(f"  {json.dumps(response.json(), ensure_ascii=False, indent=2)}")
            except:
                print(f"  {response.text}")
            return False
    except requests.Timeout:
        print(f"✗ Request timeout (30s)")
        return False
    except Exception as e:
        print(f"✗ Request error: {e}")
        return False

def main():
    print("""
╔══════════════════════════════════════════════════════════════════════╗
║                   🤖 全能 Agent API 完整测试                          ║
║                                                                      ║
║  观察后台日志: docker-compose logs backend -f                        ║
╚══════════════════════════════════════════════════════════════════════╝
""")

    # 步骤 1: 登录
    token = login()
    if not token:
        print("✗ 登录失败，无法继续")
        return

    # 步骤 2: 获取模型列表
    model_id = get_agent_models(token)
    if not model_id:
        print("✗ 未找到可用模型，无法继续")
        return

    # 步骤 3: 运行 Agent
    print_section("运行 Chat Agent")
    run_agent(token, model_id, "chat", "你好，请自我介绍一下")

if __name__ == "__main__":
    main()
