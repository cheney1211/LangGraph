import operator
from typing import Annotated, Sequence, TypedDict
from pydantic import BaseModel, Field
from langchain_core.messages import BaseMessage

class RoleplayState(TypedDict):
    """定义 LangGraph 的全局流转状态"""
    # operator.add 确保每次图流转时，新的 message 都会追加到历史列表中，而不是覆盖
    messages: Annotated[Sequence[BaseMessage], operator.add]
    next_agent: str

class RouteDecision(BaseModel):
    """总导演节点输出的结构化路由决策"""
    next_agent: str = Field(
        description="下一个发言的Agent名称。可选值: 'narrator', 'writer', 'actor_alice', 'actor_bob', 'FINISH'"
    )