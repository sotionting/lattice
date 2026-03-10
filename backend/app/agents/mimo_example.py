"""
小米 MiMo Agent 使用示例
"""
import asyncio
from app.agents.mimo_agent import MimoAgent
from app.agents.base import Message


async def main():
    """示例：如何使用小米 MiMo Agent"""
    
    # 方式1: 使用环境变量配置（推荐）
    # 在 .env 文件中设置：
    # MIMO_API_URL=http://localhost:8080
    # MIMO_API_KEY=sk-default
    # MIMO_MODEL=mimo-v2-flash-studio
    
    config = {
        "name": "MiMo Agent",
        "type": "mimo",
    }
    
    # 方式2: 直接在配置中指定（可选）
    # config = {
    #     "name": "MiMo Agent",
    #     "type": "mimo",
    #     "api_url": "http://localhost:8080",  # MiMo2API 服务地址
    #     "api_key": "sk-default",  # API Key
    #     "model": "mimo-v2-flash-studio",  # 模型名称
    # }
    
    # 创建 Agent 实例
    agent = MimoAgent(config)
    
    # 测试连接
    print("测试连接...")
    is_connected = await agent.test_connection()
    print(f"连接状态: {'成功' if is_connected else '失败'}")
    
    if not is_connected:
        print("请检查配置是否正确")
        return
    
    # 发送普通消息
    print("\n发送普通消息...")
    messages = [
        Message(role="user", content="你好，请介绍一下你自己")
    ]
    
    response = await agent.chat(messages)
    print(f"回复: {response.content}")
    print(f"元数据: {response.metadata}")
    
    # 发送带深度思考的消息
    print("\n发送带深度思考的消息...")
    messages = [
        Message(role="user", content="解释一下量子纠缠的原理")
    ]
    
    response = await agent.chat(
        messages,
        reasoning_effort="medium"  # low/medium/high
    )
    print(f"回复: {response.content}")
    
    # 流式响应
    print("\n流式响应...")
    messages = [
        Message(role="user", content="写一首关于春天的诗")
    ]
    
    print("回复: ", end="", flush=True)
    async for chunk in agent.chat_stream(messages):
        print(chunk, end="", flush=True)
    print("\n")


if __name__ == "__main__":
    asyncio.run(main())