"""
视频生成工具：Agent 可调用此工具生成视频。
复用 generate.py 中的 _call_veo 逻辑。
视频生成耗时较长（1~5 分钟），返回视频文件名，前端通过 /generate/video/file/{name} 访问。
"""
import asyncio
from langchain_core.tools import Tool


def _make_video_gen_func(model_config):
    """返回绑定指定视频模型配置的同步函数。"""
    def generate(prompt: str) -> str:
        """调用视频生成 API，返回视频文件名（保存在 /app/uploads/videos/）。"""
        from app.api.generate import _call_veo  # 复用已有实现

        try:
            filename = asyncio.run(_call_veo(model_config, prompt))
            # 返回对前端有意义的信息：文件名 + 访问提示
            return (
                f"视频生成成功！文件名：{filename}\n"
                f"访问路径：/api/v1/generate/video/file/{filename}?token=<你的JWT>"
            )
        except Exception as e:
            return f"视频生成失败：{str(e)}"

    return generate


def get_video_gen_tool(db) -> Tool | None:
    """
    从数据库查找可用的视频模型，创建视频生成 LangChain Tool。
    没有配置视频模型时返回 None。

    Args:
        db: SQLAlchemy Session 实例

    Returns:
        LangChain Tool 或 None
    """
    from app.models.model_config import ModelConfig

    model = (
        db.query(ModelConfig)
        .filter(ModelConfig.model_type == "video", ModelConfig.is_active == True)
        .order_by(ModelConfig.is_default.desc())
        .first()
    )
    if not model or not model.api_key:
        return None

    return Tool(
        name="generate_video",
        func=_make_video_gen_func(model),
        description=(
            "根据文字描述生成短视频（8秒左右）。输入：详细的视频内容描述。"
            "输出：视频文件名，可通过对应接口访问播放。"
            "注意：生成需要 1~5 分钟，请告知用户耐心等待。"
            "使用场景：用户要求生成视频、动画、短片时调用。"
        ),
    )
