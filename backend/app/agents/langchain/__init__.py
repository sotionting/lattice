"""
LangChain Agent 包：提供各类专用 Agent 的统一入口。
"""
from app.agents.langchain.chat_agent import ChatAgent      # 多轮对话 Agent
from app.agents.langchain.search_agent import SearchAgent  # 工具调用搜索 Agent
from app.agents.langchain.repl_agent import ReplAgent      # Python 代码执行 Agent
from app.agents.langchain.csv_agent import CsvAgent        # CSV 数据分析 Agent
from app.agents.langchain.file_agent import FileAgent      # 文件管理 Agent

# 对外暴露的 Agent 类型映射（供 API 层按字符串名称选择）
AGENT_REGISTRY = {
    "chat": ChatAgent,
    "search": SearchAgent,
    "repl": ReplAgent,
    "csv": CsvAgent,
    "file": FileAgent,
}
