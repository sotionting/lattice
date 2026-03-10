"""
ChatAgent：多轮对话 Agent，带消息历史记忆。
每次调用 run() 会把新消息追加到历史，实现上下文感知对话。
"""
from app.agents.langchain.base_agent import LangChainBaseAgent  # 基类
from app.agents.llm_factory import build_llm_from_yaml as build_llm  # LLM 工厂函数
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage  # 消息类型


class ChatAgent(LangChainBaseAgent):
    """支持多轮对话和历史记忆的 Agent。"""

    def __init__(self, cfg: dict):
        super().__init__(cfg)
        self.llm = build_llm(cfg)  # 根据配置创建 LLM 实例
        agent_cfg = cfg.get("agents", {}).get("chat", {})  # 取 chat 专项配置
        self.max_history: int = agent_cfg.get("max_history", 20)  # 最多保留的历史轮数
        self.system_prompt: str = agent_cfg.get("system_prompt", "你是一个有帮助的中文助手。")
        self.history: list = []  # 存储对话历史（HumanMessage / AIMessage 交替）

    def run(self, prompt: str) -> str:
        """追加用户消息 → 调用 LLM → 追加 AI 回复 → 返回回复文本。"""
        self.history.append(HumanMessage(content=prompt))  # 记录用户输入
        # 拼接：系统提示 + 最近 N 轮历史，避免历史过长超出 token 限制
        messages = [SystemMessage(content=self.system_prompt)] + self.history[-self.max_history:]
        response = self.llm.invoke(messages)  # 调用 LLM
        reply = response.content  # 取出回复文本
        self.history.append(AIMessage(content=reply))  # 记录 AI 回复
        return reply

    def clear_history(self):
        """清空对话历史，开始新对话。"""
        self.history = []
