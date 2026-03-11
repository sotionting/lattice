#!/usr/bin/env python3
"""
测试脚本：模拟登录跳转主页，诊断各页面 500 错误原因
"""

import requests
import json
from urllib.parse import urljoin

# 配置
BASE_URL = "http://localhost:5173"
API_BASE = "http://localhost:8000/api/v1/"  # 末尾加 / 以便 urljoin 正确拼接

# 测试的八个页面
PAGES = [
    "/",                    # 对话主页
    "/conversations",       # 历史记录
    "/generate",           # 生成页面
    "/agent",              # Agent
    "/resources",          # 资源库
    "/tasks",              # 任务状态
    "/settings/profile",   # 个人设置
    "/admin/users",        # 用户管理
]

def test_login():
    """测试登录 API"""
    print("=" * 60)
    print("【步骤 1】测试登录 API")
    print("=" * 60)

    login_url = urljoin(API_BASE, "auth/login")
    payload = {
        "username": "admin",
        "password": "admin123456"  # 使用 .env 中的 ADMIN_PASSWORD
    }

    print(f"POST {login_url}")
    print(f"Body: {json.dumps(payload, indent=2)}")

    try:
        resp = requests.post(login_url, json=payload, timeout=10)
        print(f"\n✓ Status: {resp.status_code}")

        if resp.status_code == 200:
            data = resp.json()
            token = data.get("data", {}).get("access_token")
            print(f"✓ 登录成功，Token: {token[:50]}...")
            return token
        else:
            print(f"✗ 登录失败: {resp.text}")
            return None
    except Exception as e:
        print(f"✗ 请求异常: {e}")
        return None

def test_frontend_pages(token):
    """通过 Vite 代理访问前端页面"""
    print("\n" + "=" * 60)
    print("【步骤 2】通过 Vite 代理（5173）访问前端页面")
    print("=" * 60)

    headers = {
        "Authorization": f"Bearer {token}" if token else "",
        "User-Agent": "Mozilla/5.0"
    }

    for page in PAGES:
        url = urljoin(BASE_URL, page)
        print(f"\nGET {url}")

        try:
            resp = requests.get(url, headers=headers, timeout=10, allow_redirects=False)
            print(f"  Status: {resp.status_code}")

            if resp.status_code >= 400:
                print(f"  ✗ 错误响应")
                # 尝试显示错误内容
                if len(resp.text) < 500:
                    print(f"  Body: {resp.text[:200]}")
            else:
                print(f"  ✓ 成功")
        except Exception as e:
            print(f"  ✗ 异常: {e}")

def test_api_endpoints(token):
    """测试后端 API 端点"""
    print("\n" + "=" * 60)
    print("【步骤 3】直接访问后端 API（绕过 Vite 代理）")
    print("=" * 60)

    headers = {
        "Authorization": f"Bearer {token}" if token else "",
    }

    apis = [
        "conversations?page=1",
        "generate/list",
        "resources?page=1",
        "agent/models",
        "tasks",
        "models/active",
        "admin/users?page=1",
        "admin/models?page=1",
    ]

    for api_path in apis:
        url = urljoin(API_BASE, api_path)
        print(f"\nGET {url}")

        try:
            resp = requests.get(url, headers=headers, timeout=10)
            print(f"  Status: {resp.status_code}")

            if resp.status_code == 200:
                print(f"  ✓ API 成功响应")
            else:
                print(f"  ✗ API 返回 {resp.status_code}")
                if resp.text:
                    print(f"  Error: {resp.text[:200]}")
        except Exception as e:
            print(f"  ✗ 异常: {e}")

def test_vite_api_proxy(token):
    """测试通过 Vite 代理的 API 请求"""
    print("\n" + "=" * 60)
    print("【步骤 4】通过 Vite 代理（5173）访问 API")
    print("=" * 60)

    headers = {
        "Authorization": f"Bearer {token}" if token else "",
        "Content-Type": "application/json",
    }

    test_apis = [
        ("GET", "/api/v1/models/active"),  # 这个是通过 Vite 代理，需要完整路径
        ("GET", "/api/v1/conversations?page=1"),
        ("GET", "/api/v1/generate/list"),
    ]

    for method, api_path in test_apis:
        url = urljoin(BASE_URL, api_path)
        print(f"\n{method} {url}")

        try:
            if method == "GET":
                resp = requests.get(url, headers=headers, timeout=10)
            else:
                resp = requests.post(url, headers=headers, timeout=10)

            print(f"  Status: {resp.status_code}")

            if resp.status_code >= 400:
                print(f"  ✗ 代理返回错误")
                if resp.text:
                    print(f"  Response: {resp.text[:300]}")
            else:
                print(f"  ✓ 代理成功")
        except Exception as e:
            print(f"  ✗ 异常: {e}")

if __name__ == "__main__":
    print("\n🔍 开始测试登录流程和页面访问...\n")

    # 步骤 1：测试登录
    token = test_login()

    if not token:
        print("\n✗ 登录失败，无法继续测试")
        exit(1)

    # 步骤 2：测试前端页面
    test_frontend_pages(token)

    # 步骤 3：测试后端 API（直接）
    test_api_endpoints(token)

    # 步骤 4：测试 Vite 代理的 API
    test_vite_api_proxy(token)

    print("\n" + "=" * 60)
    print("✓ 测试完成")
    print("=" * 60)
