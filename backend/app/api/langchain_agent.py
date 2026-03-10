"""
LangChain Agent API 路由（DB 驱动版）
用户在前端选择一个 LLM 模型作为 Agent 大脑 → 传 model_id → 后端从 DB 读取配置 → 构建 Agent。

Agent 工具池（自动从 DB 装配，有配置才加载）：
  ✅ 计算器         — 始终可用
  ✅ 网络搜索       — 始终可用（DuckDuckGo，无需 API Key）
  ✅ Python REPL    — 始终可用（代码执行能力）
  ✅ 图片生成       — 有 image 类型模型时自动加载
  ✅ 视频生成       — 有 video 类型模型时自动加载
  ✅ Skills         — 从 skills 表动态加载所有启用的技能

路由：
  GET  /api/v1/agent/types    — 获取可用 Agent 类型
  GET  /api/v1/agent/models   — 获取可用作 Agent 大脑的 LLM 模型列表
  POST /api/v1/agent/run      — 运行 Agent
"""
import asyncio
from concurrent.futures import ThreadPoolExecutor
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.model_config import ModelConfig
from app.models.user import User

router = APIRouter()

# 在线程池中运行同步 Agent，避免阻塞 FastAPI 的 async 事件循环
_executor = ThreadPoolExecutor(max_workers=4)


# ── 请求模型 ──────────────────────────────────────────────────────────────────

class AgentRunRequest(BaseModel):
    """运行 Agent 的请求体。"""
    agent_type: str                      # Agent 类型：search | repl | chat | csv
    prompt: str                          # 用户输入
    model_id: Optional[str] = None       # LLM 模型 UUID，不传则用默认 LLM 模型
    conversation_id: Optional[str] = None # 对话 ID，若提供则加载历史消息作为上下文
    csv_path: Optional[str] = None       # CsvAgent 专用：CSV 文件路径


# ── 内部工具函数 ──────────────────────────────────────────────────────────────

def _find_llm_model(db: Session, model_id: Optional[str]) -> ModelConfig:
    """
    从 DB 查找 LLM 类型的模型配置。
    有 model_id 则精确查找；无则取默认 LLM（is_default=True），再无则取第一个启用的。
    """
    query = db.query(ModelConfig).filter(
        ModelConfig.model_type == "llm",
        ModelConfig.is_active == True,
    )
    if model_id:
        model = query.filter(ModelConfig.id == model_id).first()
    else:
        model = query.order_by(ModelConfig.is_default.desc()).first()

    if not model:
        raise HTTPException(
            status_code=400,
            detail="未找到可用的 LLM 模型，请先在「模型 API 管理」添加并启用一个 LLM 模型",
        )
    if not model.api_key:
        raise HTTPException(status_code=400, detail=f"模型「{model.name}」未配置 API Key")
    return model


def _build_tools(db: Session, llm) -> list:
    """
    构建 Agent 工具列表。
    静态工具（计算器/搜索/REPL）始终加载；
    生成类工具（图片/视频）和 Skills 按 DB 动态装配。
    """
    from app.agents.tools.calculator import get_calculator_tool
    from app.agents.tools.web_search import get_web_search_tool
    from app.agents.tools.image_gen import get_image_gen_tool
    from app.agents.tools.video_gen import get_video_gen_tool
    from app.agents.tools.skill_tools import get_skill_tools
    from langchain_experimental.tools import PythonREPLTool

    tools = [
        get_calculator_tool(),   # 算术计算（安全 AST eval）
        get_web_search_tool(),   # DuckDuckGo 网络搜索
        PythonREPLTool(),        # Python 代码执行（LLM 自己写代码解决问题）
    ]

    # 图片生成（DB 中有 image 类型模型才加）
    img_tool = get_image_gen_tool(db)
    if img_tool:
        tools.append(img_tool)

    # 视频生成（DB 中有 video 类型模型才加）
    vid_tool = get_video_gen_tool(db)
    if vid_tool:
        tools.append(vid_tool)

    # 从 Skills 表动态加载全部启用技能（prompt 类型需要传 llm）
    skill_tools = get_skill_tools(db, llm=llm)
    tools.extend(skill_tools)

    return tools


def _run_agent_sync(
    agent_type: str,
    prompt: str,
    llm,
    tools: list,
    agent_cfg: dict,
    csv_path: Optional[str],
    conversation_history: Optional[str] = None,
) -> str:
    """
    同步运行 Agent（在线程池中执行，不阻塞事件循环）。
    接收预构建好的 llm 和 tools，不再依赖 YAML 配置。

    如果 conversation_history 非空，会附加在系统提示词中以维护上下文。
    """
    try:
        from langchain.agents import create_tool_calling_agent, AgentExecutor
        from langchain_core.prompts import ChatPromptTemplate
    except ImportError as e:
        raise ImportError(
            f"LangChain 依赖缺失或版本不兼容: {str(e)}\n"
            f"请确保已安装: langchain>=0.3.0, langchain-core>=0.2.0\n"
            f"运行命令: pip install -U langchain langchain-core"
        )

    # 构建系统提示词：包含对话历史上下文（若有）
    system_prompt = (
        "你是一个智能 AI 助手，拥有多种工具能力。"
        "根据用户需求，合理调用工具完成任务，并用中文解释每步操作和最终结果。"
    )
    if conversation_history:
        system_prompt += f"\n\n【对话历史】\n{conversation_history}"

    # 通用提示词模板
    prompt_template = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", "{input}"),
        ("placeholder", "{agent_scratchpad}"),  # 工具调用中间过程的占位符
    ])

    max_iterations = agent_cfg.get("max_iterations", 8)

    # ── CSV Agent：特殊处理，需要加载 DataFrame ──────────────────────────────
    if agent_type == "csv":
        from langchain_experimental.agents import create_pandas_dataframe_agent
        import pandas as pd

        if not csv_path:
            return "❌ CSV Agent 需要提供 csv_path 参数（已上传 CSV 文件的路径）"
        try:
            df = pd.read_csv(csv_path)
        except Exception as e:
            return f"❌ 读取 CSV 文件失败：{str(e)}"

        executor = create_pandas_dataframe_agent(
            llm, df,
            verbose=False,
            max_iterations=max_iterations,
            agent_type="tool-calling",  # 使用 Tool Calling 模式（比 ReAct 更稳定）
            allow_dangerous_code=True,  # 允许执行 pandas 数据分析代码
        )
        result = executor.invoke({"input": prompt})
        return result.get("output", "")

    # ── Chat Agent：纯对话，不走 Tool Calling（但可选择带工具）──────────────
    if agent_type == "chat":
        from langchain_core.messages import HumanMessage, SystemMessage
        messages = [
            SystemMessage(content="你是一个有帮助的中文智能助手，回答简洁准确。"),
            HumanMessage(content=prompt),
        ]
        response = llm.invoke(messages)
        return response.content

    # ── 通用 Tool Calling Agent（search / repl）────────────────────────────
    agent = create_tool_calling_agent(llm, tools, prompt_template)
    executor = AgentExecutor(
        agent=agent,
        tools=tools,
        verbose=False,
        max_iterations=max_iterations,
        handle_parsing_errors=True,  # 工具解析失败时自动重试，不抛异常
    )
    result = executor.invoke({"input": prompt})
    return result.get("output", "")


# ── 路由 ──────────────────────────────────────────────────────────────────────

@router.get("/types")
async def list_agent_types(current_user: User = Depends(get_current_user)):
    """返回可用 Agent 类型列表。前端据此渲染 Agent 选择下拉框。"""
    return {
        "code": 200,
        "message": "success",
        "data": [
            {"type": "search", "name": "搜索 Agent",  "desc": "联网搜索 + 工具调用，适合需要查资料的任务"},
            {"type": "repl",   "name": "代码 Agent",  "desc": "编写并执行 Python 代码，解决计算/数据处理问题"},
            {"type": "chat",   "name": "对话 Agent",  "desc": "纯对话，适合写作、翻译、问答等语言任务"},
            {"type": "csv",    "name": "CSV Agent",   "desc": "自然语言分析上传的 CSV 数据文件"},
        ],
    }


@router.get("/models")
async def list_agent_models(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    返回可用作 Agent 大脑的 LLM 模型列表。
    前端据此渲染「选择大脑模型」下拉框。
    """
    models = (
        db.query(ModelConfig)
        .filter(ModelConfig.model_type == "llm", ModelConfig.is_active == True)
        .order_by(ModelConfig.is_default.desc(), ModelConfig.created_at.asc())
        .all()
    )
    return {
        "code": 200,
        "message": "success",
        "data": [
            {
                "id": str(m.id),
                "name": m.name,
                "provider": m.provider,
                "model_id": m.model_id,
                "is_default": m.is_default,
            }
            for m in models
        ],
    }


@router.post("/run")
async def run_agent(
    req: AgentRunRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    运行指定 Agent。

    调用链路：
      前端选 agent_type + prompt + model_id + 可选 conversation_id
        → 从 DB 查 ModelConfig（LLM 大脑）
          → 若有 conversation_id，加载历史消息作为上下文
            → build_llm_from_model_config → LangChain LLM 实例
              → _build_tools(db, llm) → 工具列表（含图片/视频/Skills）
                → 线程池 _run_agent_sync → 返回结果
    """
    # 参数校验
    if req.agent_type not in ("search", "repl", "chat", "csv"):
        raise HTTPException(
            status_code=400,
            detail=f"不支持的 Agent 类型: {req.agent_type}，可用：search | repl | chat | csv",
        )
    if not req.prompt.strip():
        raise HTTPException(status_code=400, detail="prompt 不能为空")

    # 1. 从 DB 查找 LLM 模型配置（验证可用性 + API Key）
    try:
        model = _find_llm_model(db, req.model_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"模型查询失败: {str(e)}")

    # 2. 若提供了 conversation_id，加载历史消息作为上下文
    conversation_history = None
    if req.conversation_id:
        try:
            from app.models.conversation import Conversation, Message
            conv = db.query(Conversation).filter(
                Conversation.id == req.conversation_id,
                Conversation.user_id == current_user.id,
            ).first()

            if conv:
                messages = db.query(Message).filter(
                    Message.conversation_id == conv.id
                ).order_by(Message.created_at).all()

                # 格式化历史消息
                history_lines = []
                for msg in messages[-10:]:  # 只取最近 10 条消息，避免 token 溢出
                    role = "用户" if msg.role == "user" else "助手" if msg.role == "assistant" else msg.role
                    history_lines.append(f"{role}：{msg.content[:200]}")  # 消息内容截断到 200 字
                if history_lines:
                    conversation_history = "\n".join(history_lines)
        except Exception as e:
            # 历史加载失败不阻断执行，继续执行 Agent
            pass

    # 3. 用 DB 配置构建 LangChain LLM 实例（这里是实际的大脑）
    try:
        from app.agents.llm_factory import build_llm_from_model_config
        llm = build_llm_from_model_config(model)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM 实例化失败: {str(e)}")

    # 4. 构建工具列表（图片/视频/Skills 全部自动从 DB 装配）
    try:
        tools = _build_tools(db, llm)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"工具加载失败: {str(e)}")

    # 5. 读取 Agent 专项配置（max_iterations 等），不影响 LLM 选择
    from pathlib import Path
    import yaml
    cfg_path = Path(__file__).parent.parent.parent.parent / "configs" / "agents_config.yaml"
    agent_cfg = {}
    if cfg_path.exists():
        try:
            with open(cfg_path, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f) or {}
                agent_cfg = data.get("agents", {}).get(req.agent_type, {})
        except Exception:
            pass  # 配置加载失败不阻断执行

    try:
        # 6. 在线程池中运行同步 Agent（不阻塞 async 事件循环）
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            _executor,
            lambda: _run_agent_sync(
                req.agent_type,
                req.prompt,
                llm,
                tools,
                agent_cfg,
                req.csv_path,
                conversation_history,
            ),
        )
    except ValueError as e:
        # 参数验证错误
        raise HTTPException(status_code=400, detail=f"参数错误: {str(e)}")
    except Exception as e:
        # 真正的执行错误
        raise HTTPException(status_code=500, detail=f"Agent 执行失败: {str(e)}")

    # 7. 若提供了 conversation_id，保存结果到对话
    if req.conversation_id:
        try:
            from app.models.conversation import Message
            db.add(Message(
                conversation_id=req.conversation_id,
                role="user",
                content=req.prompt,
            ))
            db.add(Message(
                conversation_id=req.conversation_id,
                role="assistant",
                content=result,
            ))
            db.commit()
        except Exception as e:
            # 保存失败不影响返回结果
            db.rollback()

    return {
        "code": 200,
        "message": "success",
        "data": {
            "agent_type": req.agent_type,
            "model_name": model.name,   # 告知前端是哪个模型在工作
            "result": result,
        },
    }
