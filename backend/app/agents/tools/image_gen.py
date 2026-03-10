"""
图片生成工具：Agent 可调用此工具生成图片。
复用 generate.py 中的核心逻辑（_call_imagen / _call_gemini），
以同步方式包装成 LangChain Tool，供 AgentExecutor 调用。
"""
import asyncio
from langchain_core.tools import Tool


def _make_image_gen_func(model_config):
    """
    返回一个同步函数，绑定指定的图片模型配置。
    闭包捕获 model_config，使 Tool 在不知道参数的情况下使用正确的模型。
    """
    def generate(prompt: str) -> str:
        """调用图片生成 API，返回 base64 DataURL 字符串（以逗号分隔多张图）。"""
        from app.api.generate import _call_imagen, _call_gemini  # 复用已有的 API 实现

        is_imagen = model_config.model_id.lower().startswith("imagen")

        try:
            # asyncio.run() 在线程池中运行没有问题（线程内没有正在运行的事件循环）
            if is_imagen:
                images = asyncio.run(_call_imagen(model_config, prompt))
                text = ""
            else:
                images, text = asyncio.run(_call_gemini(model_config, prompt))

            if not images:
                return "图片生成失败：API 未返回图片数据"

            # 返回所有图片 DataURL，用换行分隔，方便 LLM 在回复中引用
            result = "\n".join(images)
            if text:
                result += f"\n\n{text}"
            return result

        except Exception as e:
            return f"图片生成失败：{str(e)}"

    return generate


def get_image_gen_tool(db) -> Tool | None:
    """
    从数据库查找可用的图片模型，创建图片生成 LangChain Tool。
    如果没有配置图片模型则返回 None（Agent 工具列表中不添加此工具）。

    Args:
        db: SQLAlchemy Session 实例

    Returns:
        LangChain Tool 或 None
    """
    from app.models.model_config import ModelConfig

    # 查找默认图片模型，没有默认则取第一个启用的图片模型
    model = (
        db.query(ModelConfig)
        .filter(ModelConfig.model_type == "image", ModelConfig.is_active == True)
        .order_by(ModelConfig.is_default.desc())
        .first()
    )
    if not model or not model.api_key:
        return None  # 没有配置图片模型，不添加工具

    return Tool(
        name="generate_image",
        func=_make_image_gen_func(model),  # 闭包绑定模型配置
        description=(
            "根据文字描述生成图片。输入：详细的图片描述（中英文均可）。"
            "输出：图片的 base64 DataURL 字符串。"
            "使用场景：用户要求生成、画、创作图片时调用。"
        ),
    )
