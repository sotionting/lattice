"""
小米 MiMo Agent
支持通过 MiMo2API 或直接调用小米 MiMo API
"""
import httpx
from typing import List, Dict, Any, Optional, AsyncIterator
from app.agents.base import BaseAgent, Message, AgentResponse
from app.config import settings
import json


class MimoAgent(BaseAgent):
    """小米 MiMo Agent"""
    
    def __init__(self, config: Dict[str, Any]):
        """
        初始化小米 MiMo Agent
        
        Args:
            config: Agent 配置字典，包含：
                - api_url: API 地址（可选，默认使用配置中的 MIMO_API_URL）
                - api_key: API Key（可选，默认使用配置中的 MIMO_API_KEY）
                - model: 模型名称（可选，默认使用配置中的 MIMO_MODEL）
                - auth_token: 认证 Token（可选）
                - cookie: Cookie（可选）
        """
        super().__init__(config)
        self.api_url = config.get("api_url") or settings.MIMO_API_URL
        self.api_key = config.get("api_key") or settings.MIMO_API_KEY
        self.model = config.get("model") or settings.MIMO_MODEL
        self.auth_token = config.get("auth_token") or settings.MIMO_AUTH_TOKEN
        self.cookie = config.get("cookie") or settings.MIMO_COOKIE
        
        # 确保 API URL 不以 / 结尾
        self.api_url = self.api_url.rstrip("/")
        
        # 构建请求头
        self.headers = {
            "Content-Type": "application/json",
        }
        
        # 如果使用 MiMo2API（OpenAI 兼容格式）
        if self.api_key:
            self.headers["Authorization"] = f"Bearer {self.api_key}"
        
        # 如果直接调用小米 MiMo API
        if self.auth_token:
            self.headers["Authorization"] = f"Bearer {self.auth_token}"
        
        if self.cookie:
            self.headers["Cookie"] = self.cookie
    
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
                - reasoning_effort: 深度思考模式（low/medium/high）
                - temperature: 温度参数
                - max_tokens: 最大 token 数
                
        Returns:
            AgentResponse: Agent 响应
        """
        # 转换消息格式
        formatted_messages = [
            {"role": msg.role, "content": msg.content}
            for msg in messages
        ]
        
        # 构建请求体
        request_data = {
            "model": self.model,
            "messages": formatted_messages,
        }
        
        # 添加可选参数
        if "reasoning_effort" in kwargs:
            request_data["reasoning_effort"] = kwargs["reasoning_effort"]
        if "temperature" in kwargs:
            request_data["temperature"] = kwargs["temperature"]
        if "max_tokens" in kwargs:
            request_data["max_tokens"] = kwargs["max_tokens"]
        
        # 发送请求
        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                response = await client.post(
                    f"{self.api_url}/v1/chat/completions",
                    headers=self.headers,
                    json=request_data
                )
                response.raise_for_status()
                
                result = response.json()
                
                # 解析响应（OpenAI 兼容格式）
                if "choices" in result and len(result["choices"]) > 0:
                    content = result["choices"][0]["message"]["content"]
                    metadata = {
                        "model": result.get("model"),
                        "usage": result.get("usage", {}),
                        "finish_reason": result["choices"][0].get("finish_reason"),
                    }
                    return AgentResponse(content=content, metadata=metadata)
                else:
                    raise ValueError(f"Unexpected response format: {result}")
                    
            except httpx.HTTPStatusError as e:
                error_msg = f"HTTP error: {e.response.status_code}"
                if e.response.text:
                    try:
                        error_data = e.response.json()
                        error_msg += f" - {error_data}"
                    except:
                        error_msg += f" - {e.response.text}"
                raise Exception(error_msg)
            except Exception as e:
                raise Exception(f"Failed to call MiMo API: {str(e)}")
    
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
        # 转换消息格式
        formatted_messages = [
            {"role": msg.role, "content": msg.content}
            for msg in messages
        ]
        
        # 构建请求体
        request_data = {
            "model": self.model,
            "messages": formatted_messages,
            "stream": True,
        }
        
        # 添加可选参数
        if "reasoning_effort" in kwargs:
            request_data["reasoning_effort"] = kwargs["reasoning_effort"]
        if "temperature" in kwargs:
            request_data["temperature"] = kwargs["temperature"]
        if "max_tokens" in kwargs:
            request_data["max_tokens"] = kwargs["max_tokens"]
        
        # 发送流式请求
        async with httpx.AsyncClient(timeout=300.0) as client:
            try:
                async with client.stream(
                    "POST",
                    f"{self.api_url}/v1/chat/completions",
                    headers=self.headers,
                    json=request_data
                ) as response:
                    response.raise_for_status()
                    
                    async for line in response.aiter_lines():
                        if not line.strip():
                            continue
                        
                        # SSE 格式：data: {...}
                        if line.startswith("data: "):
                            data_str = line[6:]  # 移除 "data: " 前缀
                            
                            if data_str == "[DONE]":
                                break
                            
                            try:
                                data = json.loads(data_str)
                                if "choices" in data and len(data["choices"]) > 0:
                                    delta = data["choices"][0].get("delta", {})
                                    content = delta.get("content", "")
                                    if content:
                                        yield content
                            except json.JSONDecodeError:
                                continue
                                
            except httpx.HTTPStatusError as e:
                error_msg = f"HTTP error: {e.response.status_code}"
                if e.response.text:
                    error_msg += f" - {e.response.text}"
                raise Exception(error_msg)
            except Exception as e:
                raise Exception(f"Failed to stream from MiMo API: {str(e)}")
    
    async def test_connection(self) -> bool:
        """
        测试连接
        
        Returns:
            bool: 连接是否成功
        """
        try:
            # 发送一个简单的测试消息
            test_message = Message(role="user", content="你好")
            response = await self.chat([test_message])
            return response.content is not None
        except Exception as e:
            print(f"MiMo connection test failed: {str(e)}")
            return False