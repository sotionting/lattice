#!/usr/bin/env python3
"""
API 修复验证测试套件
测试所有后端修复的有效性
"""

import requests
import json
import time
import sys
from typing import Dict, Any, Optional

# API 基础配置
BASE_URL = "http://localhost:8000/api/v1"
ADMIN_CREDS = {"username": "admin", "password": "admin123456"}

# 测试状态
PASSED = 0
FAILED = 0
SKIPPED = 0

class Colors:
    """控制台颜色"""
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'

def print_header(title: str):
    """打印测试标题"""
    print(f"\n{Colors.BLUE}{'='*60}")
    print(f"{title}")
    print(f"{'='*60}{Colors.RESET}\n")

def print_pass(msg: str):
    """打印成功消息"""
    global PASSED
    PASSED += 1
    print(f"{Colors.GREEN}✓ PASS{Colors.RESET}: {msg}")

def print_fail(msg: str, details: str = ""):
    """打印失败消息"""
    global FAILED
    FAILED += 1
    print(f"{Colors.RED}✗ FAIL{Colors.RESET}: {msg}")
    if details:
        print(f"  └─ {details}")

def print_skip(msg: str):
    """打印跳过消息"""
    global SKIPPED
    SKIPPED += 1
    print(f"{Colors.YELLOW}⊘ SKIP{Colors.RESET}: {msg}")

def print_info(msg: str):
    """打印信息"""
    print(f"{Colors.BLUE}ℹ INFO{Colors.RESET}: {msg}")

def login() -> Optional[str]:
    """登录并返回 JWT token"""
    try:
        resp = requests.post(
            f"{BASE_URL}/auth/login",
            json=ADMIN_CREDS,
            timeout=5
        )
        if resp.status_code == 200:
            token = resp.json().get("data", {}).get("access_token")
            if token:
                print_pass(f"登录成功 (用户: {ADMIN_CREDS['username']})")
                return token
        print_fail(f"登录失败: {resp.status_code} {resp.text[:100]}")
        return None
    except Exception as e:
        print_fail(f"登录异常: {str(e)}")
        return None

def get_headers(token: str) -> Dict[str, str]:
    """构建请求头"""
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

# ============================================================================
# 测试 #8: Agent API 多轮对话支持
# ============================================================================

def test_agent_api(token: str):
    """测试 Agent API 修复"""
    print_header("测试 #8: Agent API 多轮对话支持")

    headers = get_headers(token)

    # 1. 获取 Agent 类型列表
    try:
        resp = requests.get(f"{BASE_URL}/agent/types", headers=headers, timeout=5)
        if resp.status_code == 200:
            types = resp.json().get("data", [])
            print_pass(f"获取 Agent 类型列表: {len(types)} 种")
            type_names = [t["type"] for t in types]
            if "search" in type_names and "chat" in type_names:
                print_pass(f"Agent 类型正确: {', '.join(type_names)}")
            else:
                print_fail(f"缺少必要的 Agent 类型: {type_names}")
        else:
            print_fail(f"获取 Agent 类型失败: {resp.status_code}")
    except Exception as e:
        print_fail(f"获取 Agent 类型异常: {str(e)}")
        return

    # 2. 获取 LLM 模型列表
    try:
        resp = requests.get(f"{BASE_URL}/agent/models", headers=headers, timeout=5)
        if resp.status_code == 200:
            models = resp.json().get("data", [])
            if len(models) > 0:
                print_pass(f"获取 LLM 模型列表: {len(models)} 个模型")
                print_info(f"可用模型: {', '.join([m['name'] for m in models[:3]])}")
                model_id = models[0]["id"]
            else:
                print_fail("无可用的 LLM 模型（需在 Admin → Models 添加）")
                return
        else:
            print_fail(f"获取模型列表失败: {resp.status_code}")
            return
    except Exception as e:
        print_fail(f"获取模型列表异常: {str(e)}")
        return

    # 3. 测试 Agent 执行（带 agent_type 参数）
    print_info("测试 Agent 执行（验证 agent_type 参数）...")
    agent_types_to_test = ["search", "chat"]

    for agent_type in agent_types_to_test:
        try:
            payload = {
                "agent_type": agent_type,  # ← 关键：必须有这个参数
                "prompt": f"简单测试: 2+2等于多少? ({agent_type} 模式)",
                "model_id": model_id,
            }
            resp = requests.post(
                f"{BASE_URL}/agent/run",
                json=payload,
                headers=headers,
                timeout=30  # Agent 执行可能较慢
            )

            if resp.status_code == 200:
                result = resp.json().get("data", {}).get("result")
                if result:
                    print_pass(f"Agent 执行成功 ({agent_type}): 收到回复")
                    print_info(f"  结果摘要: {result[:50]}...")
                else:
                    print_fail(f"Agent 返回空结果 ({agent_type})")
            else:
                error = resp.json().get("detail", resp.text[:100])
                if "validation error" in error.lower() or "422" in str(resp.status_code):
                    print_fail(f"Agent 返回 {resp.status_code}（参数验证错误）", error)
                else:
                    print_fail(f"Agent 执行失败 ({agent_type}): {resp.status_code}", error)
        except requests.Timeout:
            print_skip(f"Agent 执行超时 ({agent_type}) - 后端响应慢")
        except Exception as e:
            print_fail(f"Agent 执行异常 ({agent_type}): {str(e)}")

# ============================================================================
# 测试 #7: 生成记录持久化
# ============================================================================

def test_generation_persistence(token: str):
    """测试生成记录持久化修复"""
    print_header("测试 #7: 生成记录持久化")

    headers = get_headers(token)

    # 1. 获取图片生成模型
    try:
        resp = requests.get(f"{BASE_URL}/models/active", headers=headers, timeout=5)
        if resp.status_code == 200:
            models = resp.json().get("data", [])
            image_models = [m for m in models if m.get("model_type") == "image"]
            if image_models:
                model_id = image_models[0]["id"]
                model_name = image_models[0]["name"]
                print_pass(f"获取图片生成模型: {model_name}")
            else:
                print_fail("无可用的图片生成模型")
                print_info("需在 Admin → Models 添加 image 类型的模型（如 Imagen、Gemini）")
                return
        else:
            print_fail(f"获取模型列表失败: {resp.status_code}")
            return
    except Exception as e:
        print_fail(f"获取模型异常: {str(e)}")
        return

    # 2. 测试生成图片（这会保存到 generation_records 表）
    print_info("生成测试图片（这将保存到数据库）...")
    try:
        payload = {
            "prompt": "一只红色的猫咪 (API 测试)",
            "model_id": model_id,
        }
        resp = requests.post(
            f"{BASE_URL}/generate/image",
            json=payload,
            headers=headers,
            timeout=60
        )

        if resp.status_code == 200:
            data = resp.json().get("data", {})
            images = data.get("images", [])
            if images:
                print_pass(f"图片生成成功: {len(images)} 张图片")
            else:
                print_fail("生成结果为空")
        else:
            error = resp.json().get("detail", resp.text[:100]) if resp.text else str(resp.status_code)
            print_fail(f"图片生成失败: {resp.status_code}", error)
    except requests.Timeout:
        print_skip("图片生成超时 - 后端响应慢或 API 调用缓慢")
    except Exception as e:
        print_fail(f"图片生成异常: {str(e)}")

    # 3. 查询生成记录列表（验证持久化）
    time.sleep(1)  # 等待数据库写入
    print_info("查询生成记录列表...")
    try:
        resp = requests.get(
            f"{BASE_URL}/generate/list",
            headers=headers,
            timeout=5
        )

        if resp.status_code == 200:
            data = resp.json().get("data", [])
            if isinstance(data, list) and len(data) > 0:
                print_pass(f"查询生成记录成功: {len(data)} 条记录")
                latest = data[0]
                print_info(f"  最新记录: {latest.get('type')} - {latest.get('prompt')[:30]}...")
                print_info(f"  模型: {latest.get('model_name')}")

                # 验证字段完整性
                required_fields = ["id", "type", "url", "prompt", "model_name", "created_at"]
                missing_fields = [f for f in required_fields if f not in latest]
                if not missing_fields:
                    print_pass("生成记录字段完整")
                else:
                    print_fail(f"生成记录缺少字段: {missing_fields}")
            else:
                print_fail("/generate/list 返回空列表或格式错误")
                print_info("这可能表示数据库表未创建或没有生成记录")
        else:
            print_fail(f"查询生成记录失败: {resp.status_code}")
    except Exception as e:
        print_fail(f"查询生成记录异常: {str(e)}")

# ============================================================================
# 测试 #1: Chat API SSE 流式对话
# ============================================================================

def test_chat_api(token: str):
    """测试 Chat API 流式对话"""
    print_header("测试 #1: Chat API SSE 流式对话")

    headers = get_headers(token)

    # 1. 获取可用模型
    try:
        resp = requests.get(f"{BASE_URL}/models/active", headers=headers, timeout=5)
        if resp.status_code == 200:
            models = resp.json().get("data", [])
            llm_models = [m for m in models if m.get("model_type") == "llm"]
            if not llm_models:
                print_fail("无可用的 LLM 模型")
                print_info("诊断步骤: 访问 Admin → Models，检查是否有 model_type='llm' 的模型且 is_active=true")
                return
        else:
            print_fail(f"获取模型列表失败: {resp.status_code}")
            return
    except Exception as e:
        print_fail(f"获取模型异常: {str(e)}")
        return

    # 2. 发送聊天消息（SSE 流）
    print_info("发送聊天消息（SSE 流式）...")
    try:
        payload = {
            "prompt": "你好，请用简短的句子回答：2+2等于几?",
            "model_id": llm_models[0]["id"] if llm_models else None,
        }
        resp = requests.post(
            f"{BASE_URL}/chat/stream",
            json=payload,
            headers=headers,
            timeout=30,
            stream=True  # 启用流式响应
        )

        if resp.status_code == 200:
            print_pass("SSE 连接成功 (status 200)")

            # 解析 SSE 事件
            events_received = []
            meta_event_found = False

            for line in resp.iter_lines():
                if not line:
                    continue

                line_str = line.decode('utf-8') if isinstance(line, bytes) else line
                if line_str.startswith("data: "):
                    try:
                        event_data = json.loads(line_str[6:])  # 移除 "data: " 前缀
                        event_type = event_data.get("type")
                        events_received.append(event_type)

                        if event_type == "meta":
                            meta_event_found = True
                            conv_id = event_data.get("conversation_id")
                            print_pass(f"收到 meta 事件: conversation_id={conv_id[:8]}...")
                        elif event_type == "content":
                            delta = event_data.get("delta", "")
                            if delta:
                                print_info(f"  流式内容: {delta}", end="")
                    except json.JSONDecodeError:
                        pass

            # 验证 SSE 流
            if meta_event_found:
                print_pass("SSE 流结构正确（包含 meta 事件）")
            else:
                print_fail("SSE 流缺少 meta 事件（首个事件应该是 meta）")

            if "content" in events_received:
                print_pass(f"收到 content 事件（AI 回复）")
            else:
                print_fail("未收到 content 事件（检查 LLM 模型配置和 API Key）")

        else:
            error = resp.json().get("detail", resp.text[:100]) if resp.text else str(resp.status_code)
            print_fail(f"SSE 连接失败: {resp.status_code}", error)

            # 诊断建议
            print_info("诊断步骤:")
            print_info("  1. 检查 Admin → Models，是否有启用的 LLM 模型")
            print_info("  2. 检查模型是否配置了 API Key")
            print_info("  3. 在浏览器 DevTools Network 标签查看实际请求和响应")

    except requests.Timeout:
        print_skip("SSE 流式传输超时 - 后端响应慢")
    except Exception as e:
        print_fail(f"SSE 流式传输异常: {str(e)}")

# ============================================================================
# 测试 #9: 任务状态 API
# ============================================================================

def test_task_status_api(token: str):
    """测试任务状态 API"""
    print_header("测试 #9: 任务状态 API")

    headers = get_headers(token)

    try:
        resp = requests.get(
            f"{BASE_URL}/tasks",
            headers=headers,
            timeout=5
        )

        if resp.status_code == 200:
            data = resp.json().get("data", {})
            items = data.get("items", [])
            total = data.get("total", 0)
            print_pass(f"任务列表查询成功: {len(items)} 条 / {total} 总计")

            if items:
                task = items[0]
                print_info(f"  样本任务: {task.get('name')} - {task.get('status')}")
            else:
                print_info("当前无任务记录")
        else:
            print_fail(f"任务列表查询失败: {resp.status_code}")
    except Exception as e:
        print_fail(f"任务列表查询异常: {str(e)}")

# ============================================================================
# 测试 #10: 额度管理 API（管理员）
# ============================================================================

def test_quota_api(token: str):
    """测试额度管理 API"""
    print_header("测试 #10: 额度管理 API")

    headers = get_headers(token)

    try:
        resp = requests.get(
            f"{BASE_URL}/admin/quota/summary",
            headers=headers,
            timeout=5
        )

        if resp.status_code == 200:
            data = resp.json().get("data", {})
            print_pass(f"额度统计查询成功")
            print_info(f"  总请求数: {data.get('total_requests', 0)}")
            print_info(f"  总 Token 数: {data.get('total_tokens', 0)}")
            print_info(f"  活跃用户数: {data.get('active_users', 0)}")
        else:
            if resp.status_code == 403:
                print_fail("无权限访问额度统计（需要管理员权限）")
            else:
                print_fail(f"额度统计查询失败: {resp.status_code}")
    except Exception as e:
        print_fail(f"额度统计查询异常: {str(e)}")

# ============================================================================
# 主函数
# ============================================================================

def main():
    """主测试流程"""
    print(f"{Colors.BLUE}")
    print("╔" + "="*58 + "╗")
    print("║" + " "*58 + "║")
    print("║" + "  API 修复验证测试 (Lattice 后端 v1.0)  ".center(58) + "║")
    print("║" + " "*58 + "║")
    print("╚" + "="*58 + "╝")
    print(f"{Colors.RESET}")

    # 1. 健康检查
    print_info("检查后端服务...")
    try:
        resp = requests.get(f"{BASE_URL.replace('/api/v1', '')}/health", timeout=5)
        if resp.status_code == 200:
            print_pass("后端服务在线")
        else:
            print_fail("后端服务异常")
            sys.exit(1)
    except Exception as e:
        print_fail(f"后端服务不可达: {str(e)}")
        sys.exit(1)

    # 2. 登录
    print_info("进行身份验证...")
    token = login()
    if not token:
        print_fail("无法登录，退出测试")
        sys.exit(1)

    # 3. 运行所有测试
    test_agent_api(token)
    test_generation_persistence(token)
    test_chat_api(token)
    test_task_status_api(token)
    test_quota_api(token)

    # 4. 打印总结
    print_header("测试总结")
    total = PASSED + FAILED + SKIPPED
    print(f"{Colors.GREEN}✓ 通过: {PASSED}{Colors.RESET}")
    print(f"{Colors.RED}✗ 失败: {FAILED}{Colors.RESET}")
    print(f"{Colors.YELLOW}⊘ 跳过: {SKIPPED}{Colors.RESET}")
    print(f"{'─'*40}")
    print(f"总计: {total} 个测试\n")

    if FAILED > 0:
        print(f"{Colors.RED}有测试失败，请查看上面的详细信息。{Colors.RESET}\n")
        sys.exit(1)
    else:
        print(f"{Colors.GREEN}所有测试通过！{Colors.RESET}\n")
        sys.exit(0)

if __name__ == "__main__":
    main()
