"""
LangChain Agent 抽象基类：所有 LangChain Agent 都继承此类。
注意：这是专门给 LangChain Agent 用的基类，和 app/agents/base.py（FastAPI 异步基类）是两套体系。
"""
from abc import ABC, abstractmethod  # 抽象类和抽象方法装饰器
from typing import Any  # 通用类型


class LangChainBaseAgent(ABC):
    """LangChain Agent 同步基类，所有 LangChain Agent 必须实现 run() 方法。"""

    def __init__(self, cfg: dict):
        self.cfg = cfg  # 存储整体配置字典（包含 llm / agents 两个子树）

    @abstractmethod
    def run(self, prompt: str) -> str:
        """执行一次 Agent 推理，返回字符串结果。子类必须实现此方法。"""

    def get_llm_cfg(self) -> dict:
        """快捷方法：返回 llm 子配置字典。"""
        return self.cfg.get("llm", {})
