"""
FileAgent：本地文件管理 Agent，可读写、列举、搜索文件。
使用 langchain_community 的 FileManagementToolkit。
工作目录默认为 /app/uploads（Docker 容器内），可通过配置或参数覆盖。
"""
from app.agents.langchain.base_agent import LangChainBaseAgent  # 基类
from app.agents.llm_factory import build_llm_from_yaml as build_llm  # LLM 工厂
from langchain.agents import create_tool_calling_agent, AgentExecutor  # Agent 构建器
from langchain_core.prompts import ChatPromptTemplate  # 提示词模板
from langchain_community.agent_toolkits import FileManagementToolkit  # 文件管理工具集


# 提示词：引导 LLM 谨慎操作文件
_PROMPT = ChatPromptTemplate.from_messages([
    ("system", (
        "你是一个文件管理助手，可以读取、写入、列举和搜索本地文件。"
        "操作前请确认路径，用中文描述每步操作和结果。"
    )),
    ("human", "{input}"),
    ("placeholder", "{agent_scratchpad}"),
])


class FileAgent(LangChainBaseAgent):
    """可操作本地文件系统的 Agent。"""

    def __init__(self, cfg: dict, root_dir: str = "/app/uploads", callbacks: list | None = None):
        super().__init__(cfg)
        llm = build_llm(cfg)  # 创建 LLM 实例
        agent_cfg = cfg.get("agents", {}).get("file", {})  # 取 file 专项配置
        verbose = agent_cfg.get("verbose", False)
        max_iterations = agent_cfg.get("max_iterations", 8)
        work_dir = agent_cfg.get("root_dir", root_dir)  # 配置优先，其次用参数默认值

        # FileManagementToolkit：提供 read_file / write_file / list_directory / file_search 4 个工具
        toolkit = FileManagementToolkit(
            root_dir=work_dir,
            selected_tools=["read_file", "write_file", "list_directory", "file_search"],
        )
        tools = toolkit.get_tools()  # 获取工具实例列表
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
        """运行 Agent，LLM 会自动调用文件工具完成任务。"""
        result = self.executor.invoke({"input": prompt})
        return result.get("output", "")
