"""
网络搜索工具：使用 DuckDuckGo 进行免费网络搜索（无需 API Key）。
"""
from langchain_core.tools import Tool  # LangChain 工具基类


def _duckduckgo_search(query: str, max_results: int = 3) -> str:
    """调用 DuckDuckGo 搜索，返回前 N 条结果的摘要。"""
    try:
        from duckduckgo_search import DDGS  # 动态导入，避免未安装时报错
        results = []
        with DDGS() as ddgs:
            for r in ddgs.text(query, max_results=max_results):  # 搜索并限制结果数量
                results.append(f"【{r['title']}】\n{r['body']}\n来源: {r['href']}")
        return "\n\n".join(results) if results else "未找到相关结果。"
    except ImportError:
        return "请安装 duckduckgo-search：pip install duckduckgo-search"
    except Exception as e:
        return f"搜索失败: {e}"


def get_web_search_tool() -> Tool:
    """返回网络搜索 LangChain Tool 实例。"""
    return Tool(
        name="web_search",
        func=_duckduckgo_search,  # 绑定 DuckDuckGo 搜索函数
        description="搜索互联网信息。输入：搜索关键词或问题。输出：搜索结果摘要。",
    )
