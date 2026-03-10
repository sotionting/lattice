"""
CsvAgent：上传 CSV 文件后，用自然语言进行数据分析。
使用 langchain_experimental 的 create_pandas_dataframe_agent。
"""
from app.agents.langchain.base_agent import LangChainBaseAgent  # 基类
from app.agents.llm_factory import build_llm_from_yaml as build_llm  # LLM 工厂


class CsvAgent(LangChainBaseAgent):
    """自然语言分析 CSV / DataFrame 的 Agent。"""

    def __init__(self, cfg: dict, csv_path: str | None = None, callbacks: list | None = None):
        super().__init__(cfg)
        self.llm = build_llm(cfg)  # 创建 LLM 实例
        self.callbacks = callbacks or []  # 可选回调
        self.agent_cfg = cfg.get("agents", {}).get("csv", {})  # 取 csv 专项配置
        self._executor = None  # executor 在 load_csv 后才初始化

        if csv_path:
            self.load_csv(csv_path)  # 如果构造时传入 CSV 路径则直接加载

    def load_csv(self, csv_path: str):
        """
        加载 CSV 文件，重建 pandas dataframe agent executor。
        返回 (行数, 列数) 供调用方展示数据概况。
        """
        import pandas as pd  # 动态导入，减少启动时的导入开销
        from langchain_experimental.agents import create_pandas_dataframe_agent

        df = pd.read_csv(csv_path)  # 读取 CSV 为 DataFrame
        verbose = self.agent_cfg.get("verbose", False)
        max_iterations = self.agent_cfg.get("max_iterations", 8)

        # 创建 pandas dataframe agent（底层用 LLM + Tool Calling 操作 DataFrame）
        self._executor = create_pandas_dataframe_agent(
            self.llm,
            df,
            verbose=verbose,
            max_iterations=max_iterations,
            agent_type="tool-calling",  # 使用 Tool Calling 模式，比 ReAct 更稳定
            allow_dangerous_code=True,  # 允许执行 pandas 代码（仅限受信环境）
            callbacks=self.callbacks,
        )
        return df.shape  # 返回 (行数, 列数)

    def run(self, prompt: str) -> str:
        """对已加载的 CSV 执行自然语言查询。"""
        if self._executor is None:
            return "❌ 请先上传 CSV 文件。"
        result = self._executor.invoke({"input": prompt})
        return result.get("output", "")
