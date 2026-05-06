import operator
from typing import Annotated, Sequence, TypedDict, List
from pydantic import BaseModel, Field
from langchain_core.messages import BaseMessage

class RoleplayState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], operator.add]
    next_agent: str
    characters: List[dict]

class RouteDecision(BaseModel):
    next_agent: str = Field(description="下一个发言的Agent名称。可选值: 'narrator', 'writer', 'actor_<角色名>', 'FINISH'")
