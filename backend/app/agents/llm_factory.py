"""
LLM 工厂：提供两种方式创建 LangChain LLM 实例。

方式 A（生产，推荐）：build_llm_from_model_config(model_config)
  直接从数据库 ModelConfig 对象构建，不依赖 YAML 文件。
  provider 字段映射：
    google  → ChatGoogleGenerativeAI（Gemini 系列）
    openai  → ChatOpenAI（官方 OpenAI）
    doubao  → ChatOpenAI 指向豆包地址
    custom/mimo/其他 → ChatOpenAI 指向 base_url（OpenAI 兼容接口）

方式 B（开发/测试）：build_llm_from_yaml(cfg)
  从合并后的 YAML 配置字典构建（langchain_config.yaml + agents_config.yaml）。
"""
import os
from dotenv import load_dotenv

load_dotenv()  # 从项目根目录 .env 加载环境变量

# 各 provider 对应的默认 API 地址（ModelConfig.base_url 留空时使用）
_PROVIDER_BASE_URLS = {
    "openai": "https://api.openai.com/v1",
    "google": "https://generativelanguage.googleapis.com/v1beta/openai",
    "doubao": "https://ark.cn-beijing.volces.com/api/v3",
}


def build_llm_from_model_config(model_config):
    """
    从数据库 ModelConfig 对象构建 LangChain LLM 实例（生产用途）。

    Args:
        model_config: app.models.model_config.ModelConfig 实例（必须是 llm 类型）

    Returns:
        LangChain BaseChatModel 实例
    """
    provider = (model_config.provider or "custom").lower()  # 提供商标识
    api_key = model_config.api_key or ""                     # API Key（DB 中存储）
    model_id = model_config.model_id                         # 实际调用的模型 ID

    # base_url 优先用 DB 中的填写值，否则取 provider 默认值
    base_url = (
        model_config.base_url.rstrip("/")
        if model_config.base_url
        else _PROVIDER_BASE_URLS.get(provider, "")
    )

    # Google Gemini：使用专用 SDK（不走 OpenAI 兼容层，支持原生 Gemini 特性）
    if provider == "google":
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(
            model=model_id,
            google_api_key=api_key,
            temperature=0.2,
        )

    # OpenAI 官方 / 自定义代理 / 豆包 / mimo 等所有 OpenAI 兼容接口
    # 统一用 ChatOpenAI + base_url，无需为每个 provider 写专门代码
    from langchain_openai import ChatOpenAI
    kwargs: dict = dict(model=model_id, api_key=api_key, temperature=0.2)
    if base_url:
        kwargs["base_url"] = base_url  # 指向代理地址（留空则用 OpenAI 官方）
    return ChatOpenAI(**kwargs)


def build_llm_from_yaml(cfg: dict):
    """
    从 YAML 配置字典构建 LangChain LLM（开发/测试用途，不依赖数据库）。

    Args:
        cfg: 合并后的配置字典（langchain_config.yaml + agents_config.yaml）

    Returns:
        LangChain BaseChatModel 实例
    """
    llm_cfg = cfg.get("llm", {})
    provider = llm_cfg.get("provider", "google")
    model = llm_cfg.get("model", "gemini-2.5-flash")
    temperature = llm_cfg.get("temperature", 0.2)
    api_key = llm_cfg.get("api_key", "")

    if provider == "google":
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(
            model=model,
            temperature=temperature,
            google_api_key=api_key or os.getenv("GOOGLE_API_KEY", ""),
        )

    if provider in ("openai", "custom", "doubao"):
        from langchain_openai import ChatOpenAI
        key = api_key or os.getenv("OPENAI_API_KEY", "")
        base_url = llm_cfg.get("base_url") or _PROVIDER_BASE_URLS.get(provider, "")
        kwargs: dict = dict(model=model, temperature=temperature, api_key=key)
        if base_url:
            kwargs["base_url"] = base_url
        return ChatOpenAI(**kwargs)

    if provider == "local":
        from langchain_community.llms import Ollama
        return Ollama(model=model, temperature=temperature)

    raise ValueError(f"不支持的 provider: {provider}，可选：google | openai | doubao | local | custom")
