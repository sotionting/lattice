"""
ReplAgent：让 LLM 编写并执行 Python 代码来解决问题。
使用 langchain_experimental 的 PythonREPLTool。

⚠️ 安全警告：此 Agent 会在容器内执行任意 Python 代码，仅在受信任环境中开放。
"""
from app.agents.langchain.base_agent import LangChainBaseAgent  # 基类
from app.agents.llm_factory import build_llm_from_yaml as build_llm  # LLM 工厂
from langchain.agents import create_tool_calling_agent, AgentExecutor  # Agent 构建器
from langchain_core.prompts import ChatPromptTemplate  # 提示词模板
from langchain_experimental.tools import PythonREPLTool  # Python REPL 执行工具


# 提示词：引导 LLM 编写 Python 代码而不是直接口算
_PROMPT = ChatPromptTemplate.from_messages([
    ("system", (
        "你是一个 Python 编程助手。当需要计算、数据处理或验证逻辑时，"
        "请编写并执行 Python 代码来得出准确结果。用中文解释代码和结果。"
    )),
    ("human", "{input}"),
    ("placeholder", "{agent_scratchpad}"),
])


class ReplAgent(LangChainBaseAgent):
    """可编写并执行 Python 代码的 Agent。"""

    def __init__(self, cfg: dict, callbacks: list | None = None):
        super().__init__(cfg)
        llm = build_llm(cfg)  # 创建 LLM 实例
        agent_cfg = cfg.get("agents", {}).get("repl", {})  # 取 repl 专项配置
        verbose = agent_cfg.get("verbose", False)
        max_iterations = agent_cfg.get("max_iterations", 8)

        tools = [PythonREPLTool()]  # Python REPL 工具（执行代码并返回输出）
        agent = create_tool_calling_agent(llm, tools, _PROMPT)
        self.executor = AgentExecutor(
            agent=agent,
            tools=tools,
            verbose=verbose,
            max_iterations=max_iterations,
            handle_parsing_errors=True,
            callbacks=callbacks or [],
        )

    def run(self, prompt: str) -> str:
        """运行 Agent，LLM 会自动编写并执行 Python 代码后返回结果。"""
        result = self.executor.invoke({"input": prompt})
        return result.get("output", "")
