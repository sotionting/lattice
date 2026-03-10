"""
Agent 基类
所有 Agent 都应该继承这个基类
"""
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional, AsyncIterator
from pydantic import BaseModel


class Message(BaseModel):
    """消息模型"""
    role: str  # user, assistant, system
    content: str


class AgentResponse(BaseModel):
    """Agent 响应模型"""
    content: str
    metadata: Dict[str, Any] = {}


class BaseAgent(ABC):
    """Agent 基类"""
    
    def __init__(self, config: Dict[str, Any]):
        """
        初始化 Agent
        
        Args:
            config: Agent 配置字典
        """
        self.config = config
        self.name = config.get("name", "Unknown")
        self.type = config.get("type", "unknown")
    
    @abstractmethod
    async def chat(
        self,
        messages: List[Message],
        **kwargs
    ) -> AgentResponse:
        """
        发送聊天消息
        
        Args:
            messages: 消息列表
            **kwargs: 其他参数
            
        Returns:
            AgentResponse: Agent 响应
        """
        pass
    
    @abstractmethod
    async def chat_stream(
        self,
        messages: List[Message],
        **kwargs
    ) -> AsyncIterator[str]:
        """
        流式发送聊天消息
        
        Args:
            messages: 消息列表
            **kwargs: 其他参数
            
        Yields:
            str: 流式响应片段
        """
        pass
    
    @abstractmethod
    async def test_connection(self) -> bool:
        """
        测试连接
        
        Returns:
            bool: 连接是否成功
        """
        pass
    
    def get_config(self) -> Dict[str, Any]:
        """获取配置"""
        return self.config