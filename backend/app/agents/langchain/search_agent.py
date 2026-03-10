"""
SearchAgent：基于 create_tool_calling_agent 的工具调用 Agent。
使用模型原生 Tool Calling（Gemini/OpenAI 均支持），比旧版 ReAct 更稳定。
工具：DuckDuckGo 搜索 + 算术计算器。
"""
from app.agents.langchain.base_agent import LangChainBaseAgent  # 基类
from app.agents.llm_factory import build_llm_from_yaml as build_llm  # LLM 工厂
from app.agents.tools import get_tools  # 工具注册表
from langchain.agents import create_tool_calling_agent, AgentExecutor  # Agent 构建器
from langchain_core.prompts import ChatPromptTemplate  # 提示词模板


# 提示词模板：定义 Agent 的角色和输入格式
_PROMPT = ChatPromptTemplate.from_messages([
    ("system", "你是一个有帮助的中文助手，可以使用工具来回答问题。请用中文回复。"),
    ("human", "{input}"),  # 用户输入占位符
    ("placeholder", "{agent_scratchpad}"),  # 工具调用中间过程占位符
])


class SearchAgent(LangChainBaseAgent):
    """使用模型原生 Tool Calling 的工具调用 Agent。"""

    def __init__(self, cfg: dict, callbacks: list | None = None):
        super().__init__(cfg)
        llm = build_llm(cfg)  # 创建 LLM 实例
        agent_cfg = cfg.get("agents", {}).get("search", {})  # 取 search 专项配置
        tool_names = agent_cfg.get("tools", ["calculator", "web_search"])  # 要加载的工具名列表
        verbose = agent_cfg.get("verbose", False)  # 是否打印推理过程日志
        max_iterations = agent_cfg.get("max_iterations", 5)  # 最大工具调用轮数

        tools = get_tools(tool_names)  # 从注册表实例化工具
        agent = create_tool_calling_agent(llm, tools, _PROMPT)  # 构建 Tool Calling Agent
        self.executor = AgentExecutor(
            agent=agent,
            tools=tools,
            verbose=verbose,
            max_iterations=max_iterations,
            handle_parsing_errors=True,  # 解析失败时自动重试，不抛出异常
            callbacks=callbacks or [],  # 可选的回调（用于记录中间步骤）
        )

    def run(self, prompt: str) -> str:
        """运行 Agent，返回最终回答（已完成工具调用链）。"""
        result = self.executor.invoke({"input": prompt})
        return result.get("output", "")  # 取出最终输出文本
