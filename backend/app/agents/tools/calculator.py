"""
计算器工具：安全地执行数学表达式（只允许基本算术，防止代码注入）。
"""
import ast  # 用于解析数学表达式的抽象语法树
import operator  # 提供 +、-、*、/ 等运算符函数
from langchain_core.tools import Tool  # LangChain 工具基类


def _safe_eval(expr: str) -> str:
    """只允许基本算术运算，防止任意代码执行。"""
    allowed_ops = {  # 白名单：只允许这些运算符
        ast.Add: operator.add,
        ast.Sub: operator.sub,
        ast.Mult: operator.mul,
        ast.Div: operator.truediv,
        ast.Pow: operator.pow,
        ast.USub: operator.neg,
    }

    def _eval(node):  # 递归解析 AST 节点
        if isinstance(node, ast.Constant):  # 数字常量，直接返回值
            return node.value
        if isinstance(node, ast.BinOp):  # 二元运算（如 2+3）
            op_type = type(node.op)
            if op_type not in allowed_ops:
                raise ValueError(f"不支持的运算符: {op_type}")
            return allowed_ops[op_type](_eval(node.left), _eval(node.right))
        if isinstance(node, ast.UnaryOp) and isinstance(node.op, ast.USub):  # 负号
            return -_eval(node.operand)
        raise ValueError(f"不支持的表达式类型: {type(node)}")

    try:
        tree = ast.parse(expr.strip(), mode="eval")  # 解析为 AST
        result = _eval(tree.body)  # 求值
        return str(result)
    except Exception as e:
        return f"计算错误: {e}"


def get_calculator_tool() -> Tool:
    """返回计算器 LangChain Tool 实例。"""
    return Tool(
        name="calculator",
        func=_safe_eval,  # 绑定安全计算函数
        description="计算数学表达式。输入：数学表达式字符串（如 '2 + 3 * 4'）。输出：计算结果。",
    )
