"""
Skill 动态工具工厂：从数据库加载 Skill 定义，转换为 LangChain Tool 列表。

三种 Skill 类型的执行逻辑：
  api    → 发起 HTTP 请求，支持变量占位符替换（如 {{input}}）
  code   → 执行预定义 Python 代码，input 变量注入代码环境
  prompt → 将 input 传给特定系统提示词，调用当前 Agent 的 LLM 获得回答
"""
import json
import re
from typing import Callable

from langchain_core.tools import Tool


def _make_api_skill_func(skill_config: dict) -> Callable[[str], str]:
    """
    构造 api 类型 Skill 的执行函数。
    config 格式：
    {
      "method": "POST",
      "url": "https://api.example.com/endpoint",
      "headers": {"Content-Type": "application/json"},
      "body_template": "{\"query\": \"{{input}}\"}"  // {{input}} 会被替换为用户输入
    }
    """
    def run(user_input: str) -> str:
        import httpx

        method = skill_config.get("method", "POST").upper()
        url = skill_config.get("url", "")
        headers = skill_config.get("headers", {})
        body_template = skill_config.get("body_template", "")

        if not url:
            return "Skill 配置错误：缺少 url 字段"

        # 将 body_template 中的 {{input}} 替换为实际用户输入
        body_str = re.sub(r"\{\{input\}\}", user_input, body_template)
        try:
            body = json.loads(body_str) if body_str else None  # 尝试解析为 JSON
        except json.JSONDecodeError:
            body = {"input": user_input}  # 解析失败则直接传 input 字段

        try:
            with httpx.Client(timeout=30) as client:
                if method == "GET":
                    resp = client.get(url, headers=headers, params={"input": user_input})
                else:
                    resp = client.request(method, url, headers=headers, json=body)
            return resp.text  # 返回响应文本
        except Exception as e:
            return f"API 调用失败：{str(e)}"

    return run


def _make_code_skill_func(skill_config: dict) -> Callable[[str], str]:
    """
    构造 code 类型 Skill 的执行函数。
    config 格式：{"code": "def run(input):\n    return input.upper()"}
    代码中必须定义 run(input) 函数，返回字符串结果。
    """
    code = skill_config.get("code", "")

    def run(user_input: str) -> str:
        if not code:
            return "Skill 配置错误：缺少 code 字段"
        try:
            local_ns = {}  # 隔离的命名空间，防止污染全局变量
            exec(code, {}, local_ns)  # 执行代码，将定义的函数注入 local_ns
            if "run" not in local_ns:
                return "Skill 配置错误：代码中未定义 run(input) 函数"
            result = local_ns["run"](user_input)  # 调用 run 函数
            return str(result)
        except Exception as e:
            return f"代码执行失败：{str(e)}"

    return run


def _make_prompt_skill_func(skill_config: dict, llm) -> Callable[[str], str]:
    """
    构造 prompt 类型 Skill 的执行函数。
    config 格式：{"system_prompt": "你是一个专业翻译，请将文本翻译成英文："}
    会用当前 Agent 的 LLM，以指定 system_prompt 处理用户输入。
    """
    system_prompt = skill_config.get("system_prompt", "")

    def run(user_input: str) -> str:
        if not system_prompt:
            return "Skill 配置错误：缺少 system_prompt 字段"
        try:
            from langchain_core.messages import SystemMessage, HumanMessage
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_input),
            ]
            response = llm.invoke(messages)  # 调用绑定的 LLM
            return response.content
        except Exception as e:
            return f"Prompt Skill 执行失败：{str(e)}"

    return run


def get_skill_tools(db, llm=None) -> list[Tool]:
    """
    从数据库加载所有启用的 Skill，转换为 LangChain Tool 列表。

    Args:
        db:  SQLAlchemy Session（用于查询 Skill 表）
        llm: LangChain LLM 实例（prompt 类型 Skill 需要，其他类型可不传）

    Returns:
        LangChain Tool 列表（按技能类型动态创建）
    """
    from app.models.skill import Skill

    skills = (
        db.query(Skill)
        .filter(Skill.is_active == True)
        .order_by(Skill.created_at.asc())
        .all()
    )

    tools = []
    for skill in skills:
        # 根据 skill_type 选择不同的执行函数
        if skill.skill_type == "api":
            func = _make_api_skill_func(skill.config or {})
        elif skill.skill_type == "code":
            func = _make_code_skill_func(skill.config or {})
        elif skill.skill_type == "prompt":
            if llm is None:
                continue  # prompt 类型需要 LLM，没有传则跳过
            func = _make_prompt_skill_func(skill.config or {}, llm)
        else:
            continue  # 未知类型，跳过

        tools.append(Tool(
            name=skill.name,             # LLM 通过名称识别工具
            func=func,
            description=skill.description,  # LLM 通过描述判断何时调用
        ))

    return tools
