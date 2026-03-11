#!/usr/bin/env python3
"""
日志系统测试脚本
演示 Spring Boot 风格的日志输出
"""
import requests
import json
import time
from datetime import datetime

# 配置
API_BASE = "http://localhost:8000/api/v1"
FAKE_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0OTU3Yjg4YS03YTQyLTRmNDgtOWVmNy0yZGE2MWVkZDM3ZGUiLCJleHAiOjE3NzExMjU4OTd9.test"

headers = {
    "Authorization": f"Bearer {FAKE_TOKEN}",
    "Content-Type": "application/json"
}

def print_section(title):
    """打印分隔符"""
    print(f"\n{'='*70}")
    print(f"  {title}")
    print(f"{'='*70}\n")


def test_api(method, endpoint, data=None, should_fail=False):
    """测试 API 并显示日志"""
    url = f"{API_BASE}{endpoint}"

    try:
        if method == "GET":
            response = requests.get(url, headers=headers)
        elif method == "POST":
            response = requests.post(url, headers=headers, json=data)
        elif method == "PUT":
            response = requests.put(url, headers=headers, json=data)
        else:
            response = requests.get(url, headers=headers)

        status = "✓" if response.status_code < 400 else "✗"
        result = f"{status} {response.status_code}"

        if should_fail:
            if response.status_code >= 400:
                print(f"✓ Test passed: Got expected error {response.status_code}")
            else:
                print(f"✗ Test failed: Expected error but got {response.status_code}")
        else:
            print(f"Response: {result}")
            if response.status_code < 400:
                try:
                    data = response.json()
                    if 'data' in data:
                        print(f"Data: {json.dumps(data['data'], ensure_ascii=False, indent=2)[:200]}...")
                except:
                    pass

        return response
    except Exception as e:
        print(f"✗ Request failed: {e}")
        return None


print("""
╔══════════════════════════════════════════════════════════════════════╗
║                 🚀 实时日志系统测试（Spring Boot 风格）              ║
║                                                                      ║
║  观察后台日志输出：                                                   ║
║  docker-compose logs backend -f                                      ║
║                                                                      ║
║  查看日志中的：                                                       ║
║  - 请求ID标识 [xxx]                                                   ║
║  - 彩色状态符号 ✓ ⚠ ✗                                                ║
║  - 执行时间 (xx.xms)                                                 ║
║  - 客户端IP地址                                                       ║
╚══════════════════════════════════════════════════════════════════════╝
""")

# 测试 1: 健康检查
print_section("测试 1: 健康检查 (200 成功)")
print("➜ GET /health")
test_api("GET", "/health")
time.sleep(0.5)

# 测试 2: 获取模型列表 (需要认证)
print_section("测试 2: 获取可用模型 (401 认证失败)")
print("➜ GET /models/active (无有效 Token)")
test_api("GET", "/models/active", should_fail=True)
time.sleep(0.5)

# 测试 3: 非存在端点
print_section("测试 3: 访问不存在的端点 (404 错误)")
print("➜ GET /nonexistent")
test_api("GET", "/nonexistent", should_fail=True)
time.sleep(0.5)

# 测试 4: 无效的 JSON
print_section("测试 4: 发送无效的 JSON (可能出现 422 或 400)")
print("➜ POST /chat/stream (无效数据)")
try:
    response = requests.post(
        f"{API_BASE}/chat/stream",
        headers=headers,
        json={"invalid": "data"}  # 缺少必需字段
    )
    print(f"Response: {response.status_code}")
except Exception as e:
    print(f"Request error: {e}")
time.sleep(0.5)

# 测试 5: 连续多个请求
print_section("测试 5: 连续发送多个请求（观察日志中的请求ID关联）")
for i in range(3):
    print(f"➜ 请求 {i+1}/3: GET /health")
    test_api("GET", "/health")
    time.sleep(0.3)

print_section("📊 测试完成")
print("""
✓ 日志系统已工作，您应该在后台看到：

✓ 绿色 INFO 日志
  - 每个请求都有唯一的请求ID [xxxxxxxx]
  - 显示方法（GET/POST）、路径、客户端IP
  - 显示响应状态码和执行时间

✓ 颜色编码
  - 200-299: 绿色 ✓
  - 300-399: 青色 →
  - 400-499: 黄色 ⚠
  - 500-599: 红色 ✗

✓ 执行时间监控
  - 每个请求的响应时间都被记录
  - 格式: (xx.xms)

现在您可以在开发时：
1. 在终端运行: docker-compose logs backend -f
2. 在浏览器测试前端功能
3. 在后台实时看到所有 API 调用和执行时间
4. 快速定位性能瓶颈和问题

这就像 Spring Boot 一样！🎉
""")
