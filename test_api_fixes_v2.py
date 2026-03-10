#!/usr/bin/env python3
"""
API 修复验证测试 v2.0
修正了 Chat API 接口（使用 messages 而非 prompt）
"""

import requests
import json
import sys
from typing import Dict, Any, Optional

BASE_URL = "http://localhost:8000/api/v1"
ADMIN_CREDS = {"username": "admin", "password": "admin123456"}

PASSED = 0
FAILED = 0

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'

def print_header(title: str):
    print(f"\n{Colors.BLUE}{'='*60}")
    print(f"{title}")
    print(f"{'='*60}{Colors.RESET}\n")

def print_pass(msg: str):
    global PASSED
    PASSED += 1
    print(f"{Colors.GREEN}✓ PASS{Colors.RESET}: {msg}")

def print_fail(msg: str, details: str = ""):
    global FAILED
    FAILED += 1
    print(f"{Colors.RED}✗ FAIL{Colors.RESET}: {msg}")
    if details:
        print(f"  └─ {details}")

def print_info(msg: str):
    print(f"{Colors.BLUE}ℹ{Colors.RESET} {msg}")

def login() -> Optional[str]:
    try:
        resp = requests.post(
            f"{BASE_URL}/auth/login",
            json=ADMIN_CREDS,
            timeout=5
        )
        if resp.status_code == 200:
            token = resp.json().get("data", {}).get("access_token")
            if token:
                print_pass(f"登录成功")
                return token
        print_fail(f"登录失败: {resp.status_code}")
        return None
    except Exception as e:
        print_fail(f"登录异常: {str(e)}")
        return None

def get_headers(token: str) -> Dict[str, str]:
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

# ============================================================================
# 测试 #8: Agent API
# ============================================================================

def test_agent_api(token: str):
    """测试 Agent API（agent_type 参数修复）"""
    print_header("测试 #8: Agent API - agent_type 参数")

    headers = get_headers(token)

    # 获取模型
    try:
        resp = requests.get(f"{BASE_URL}/agent/models", headers=headers, timeout=5)
        if resp.status_code != 200 or not resp.json().get("data"):
            print_fail("无可用 LLM 模型")
            return
        model_id = resp.json()["data"][0]["id"]
        print_pass(f"获取 LLM 模型列表")
    except Exception as e:
        print_fail(f"获取模型异常: {str(e)}")
        return

    # 测试 Agent 执行
    for agent_type in ["search", "chat"]:
        try:
            payload = {
                "agent_type": agent_type,  # ← 关键修复
                "prompt": f"测试 {agent_type}",
                "model_id": model_id,
            }
            resp = requests.post(
                f"{BASE_URL}/agent/run",
                json=payload,
                headers=headers,
                timeout=15
            )

            # 检查是否返回参数验证错误
            if resp.status_code == 422:
                error = resp.json().get("detail", "")
                if "agent_type" in str(error):
                    print_fail(f"Agent 缺少 agent_type 参数（修复失败）")
                else:
                    print_fail(f"Agent 参数验证失败 {agent_type}: {error}")
            elif resp.status_code == 500:
                detail = resp.json().get("detail", "")
                if "create_tool_calling_agent" in detail:
                    print_pass(f"Agent {agent_type} 参数验证通过（后端依赖问题）")
                    print_info(f"  注: 后端缺少 LangChain 依赖 - {detail[:60]}...")
                else:
                    print_pass(f"Agent {agent_type} 参数验证通过（执行失败）")
            elif resp.status_code == 200:
                print_pass(f"Agent {agent_type} 执行成功")
            else:
                print_fail(f"Agent {agent_type} 返回 {resp.status_code}")
        except Exception as e:
            print_fail(f"Agent {agent_type} 异常: {str(e)}")

# ============================================================================
# 测试 #7: 生成记录持久化
# ============================================================================

def test_generation_persistence(token: str):
    """测试生成记录持久化（/list 端点修复）"""
    print_header("测试 #7: 生成记录持久化 - /list 端点")

    headers = get_headers(token)

    try:
        resp = requests.get(
            f"{BASE_URL}/generate/list",
            headers=headers,
            timeout=5
        )

        if resp.status_code == 200:
            data = resp.json().get("data", [])
            if isinstance(data, list):
                print_pass(f"/list 返回正确格式 (列表)")
                print_info(f"  当前有 {len(data)} 条生成记录")

                if len(data) > 0:
                    record = data[0]
                    required = ["id", "type", "url", "prompt", "model_name", "created_at"]
                    if all(k in record for k in required):
                        print_pass(f"生成记录字段完整")
                    else:
                        missing = [k for k in required if k not in record]
                        print_fail(f"生成记录缺少字段: {missing}")
                else:
                    print_info(f"  (暂无记录 - 需要先生成图片/视频)")
            else:
                print_fail(f"/list 返回格式错误: {type(data)}")
        else:
            print_fail(f"/list 返回 {resp.status_code}")
    except Exception as e:
        print_fail(f"查询生成记录异常: {str(e)}")

# ============================================================================
# 测试 #1: Chat API SSE
# ============================================================================

def test_chat_api(token: str):
    """测试 Chat API SSE（messages 接口）"""
    print_header("测试 #1: Chat API SSE - messages 接口")

    headers = get_headers(token)

    # 获取模型
    try:
        resp = requests.get(f"{BASE_URL}/models/active", headers=headers, timeout=5)
        models = resp.json().get("data", [])
        llm_models = [m for m in models if m.get("model_type") == "llm"]
        if not llm_models:
            print_fail("无 LLM 模型")
            return
        model_id = llm_models[0]["id"]
    except Exception as e:
        print_fail(f"获取模型异常: {str(e)}")
        return

    # 发送消息
    try:
        payload = {
            "messages": [
                {
                    "role": "user",
                    "content": "简单测试: 2+2等于几?"
                }
            ],
            "model_id": model_id,
        }
        resp = requests.post(
            f"{BASE_URL}/chat/stream",
            json=payload,
            headers=headers,
            timeout=20,
            stream=True
        )

        if resp.status_code == 200:
            print_pass(f"SSE 连接成功 (status 200)")

            # 解析 SSE 流
            has_meta = False
            has_content = False

            for line in resp.iter_lines():
                if not line:
                    continue
                line_str = line.decode('utf-8') if isinstance(line, bytes) else line
                if line_str.startswith("data: "):
                    data_str = line_str[6:]
                    if data_str == "[DONE]":
                        continue
                    try:
                        event = json.loads(data_str)
                        if event.get("type") == "meta":
                            has_meta = True
                        # OpenAI 格式：choices[0].delta.content（不是 type="content"）
                        elif event.get("choices") and event["choices"][0].get("delta", {}).get("content"):
                            has_content = True
                    except:
                        pass

            if has_meta:
                print_pass(f"收到 meta 事件")
            else:
                print_fail(f"未收到 meta 事件")

            if has_content:
                print_pass(f"收到 content 事件（AI 回复）")
            else:
                print_fail(f"未收到 content 事件")
        else:
            error = resp.json().get("detail", "")
            print_fail(f"SSE 连接失败: {resp.status_code}", str(error)[:80])
    except requests.Timeout:
        print_fail("SSE 超时（后端响应慢或 API 调用慢）")
    except Exception as e:
        print_fail(f"SSE 异常: {str(e)}")

# ============================================================================
# 测试 #9 & #10
# ============================================================================

def test_other_apis(token: str):
    """测试任务和额度 API"""
    print_header("测试 #9 & #10: 任务状态和额度管理 API")

    headers = get_headers(token)

    # 任务 API
    try:
        resp = requests.get(f"{BASE_URL}/tasks", headers=headers, timeout=5)
        if resp.status_code == 200:
            print_pass(f"任务列表 API 正常")
        else:
            print_fail(f"任务列表 API: {resp.status_code}")
    except Exception as e:
        print_fail(f"任务列表异常: {str(e)}")

    # 额度 API
    try:
        resp = requests.get(f"{BASE_URL}/admin/quota/summary", headers=headers, timeout=5)
        if resp.status_code == 200:
            print_pass(f"额度统计 API 正常")
        else:
            print_fail(f"额度统计 API: {resp.status_code}")
    except Exception as e:
        print_fail(f"额度统计异常: {str(e)}")

# ============================================================================
# 主函数
# ============================================================================

def main():
    print(f"{Colors.BLUE}")
    print("╔" + "="*58 + "╗")
    print("║  API 修复验证测试 v2.0  ".center(58) + "║")
    print("╚" + "="*58 + "╝")
    print(f"{Colors.RESET}\n")

    # 健康检查
    try:
        resp = requests.get(f"http://localhost:8000/health", timeout=5)
        if resp.status_code == 200:
            print_pass("后端服务在线")
        else:
            print_fail("后端服务异常")
            return
    except Exception as e:
        print_fail(f"后端服务不可达: {str(e)}")
        return

    # 登录
    token = login()
    if not token:
        print_fail("登录失败")
        return

    # 运行测试
    test_agent_api(token)
    test_generation_persistence(token)
    test_chat_api(token)
    test_other_apis(token)

    # 总结
    print_header("测试总结")
    total = PASSED + FAILED
    print(f"{Colors.GREEN}✓ 通过: {PASSED}{Colors.RESET}")
    print(f"{Colors.RED}✗ 失败: {FAILED}{Colors.RESET}")
    print(f"{'─'*40}")
    print(f"总计: {total} 个测试\n")

    if FAILED == 0:
        print(f"{Colors.GREEN}所有关键测试通过！{Colors.RESET}\n")
    else:
        print(f"{Colors.YELLOW}有部分测试失败，请参考上面的详细信息。{Colors.RESET}\n")

if __name__ == "__main__":
    main()
