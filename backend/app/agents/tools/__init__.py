"""
工具注册表：统一管理所有可用 LangChain 工具。
新增工具时：1）在本目录新建文件  2）在 _TOOL_REGISTRY 中注册名称
"""
from app.agents.tools.calculator import get_calculator_tool  # 算术计算工具
from app.agents.tools.web_search import get_web_search_tool  # DuckDuckGo 搜索工具

# 工具名称 → 工厂函数 的映射表
_TOOL_REGISTRY = {
    "calculator": get_calculator_tool,
    "web_search": get_web_search_tool,
}


def get_tools(names: list) -> list:
    """根据名称列表返回对应的 LangChain Tool 实例列表。"""
    tools = []
    for name in names:
        if name not in _TOOL_REGISTRY:
            raise ValueError(f"未知工具: {name}，可用工具: {list(_TOOL_REGISTRY.keys())}")
        tools.append(_TOOL_REGISTRY[name]())  # 调用工厂函数创建工具实例
    return tools
