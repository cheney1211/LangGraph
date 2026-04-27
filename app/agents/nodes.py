from typing import Dict, Any
from langchain_core.messages import AIMessage
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

from app.core.config import settings
from app.core.logger import setup_logger
from app.schemas.state import RoleplayState, RouteDecision
from app.prompts.templates import Prompts
from app.agents.factory import AgentFactory

logger = setup_logger(__name__)

class GraphNodes:
    """封装所有图节点的业务逻辑，便于依赖注入和单元测试"""
    def __init__(self):
        # 统一在此处初始化大模型，应用配置项
        self.llm = ChatOpenAI(
            api_key=settings.OPENAI_API_KEY,
            model=settings.MODEL_NAME, 
            temperature=settings.TEMPERATURE
        )
        # 为总导演特别设定结构化输出
        self.llm_structured = self.llm.with_structured_output(RouteDecision)
        logger.info(f"Initialized GraphNodes with model: {settings.MODEL_NAME}")

    def supervisor_node(self, state: RoleplayState) -> Dict[str, Any]:
        logger.info("Executing node: supervisor")
        prompt = ChatPromptTemplate.from_messages([
            ("system", Prompts.SUPERVISOR),
            MessagesPlaceholder(variable_name="messages"),
        ])
        chain = prompt | self.llm_structured
        decision = chain.invoke({"messages": state["messages"]})
        logger.info(f"Supervisor routed to: {decision.next_agent}")
        return {"next_agent": decision.next_agent}

    def narrator_node(self, state: RoleplayState) -> Dict[str, Any]:
        logger.info("Executing node: narrator")
        agent = AgentFactory.create_agent(self.llm, Prompts.NARRATOR)
        result = agent.invoke({"messages": state["messages"]})
        return {"messages": [AIMessage(content=f"🌫️旁白: {result.content}")]}

    def writer_node(self, state: RoleplayState) -> Dict[str, Any]:
        logger.info("Executing node: writer")
        agent = AgentFactory.create_agent(self.llm, Prompts.WRITER)
        result = agent.invoke({"messages": state["messages"]})
        return {"messages": [AIMessage(content=result.content)]}

    def actor_alice_node(self, state: RoleplayState) -> Dict[str, Any]:
        logger.info("Executing node: actor_alice")
        agent = AgentFactory.create_agent(self.llm, Prompts.ALICE)
        result = agent.invoke({"messages": state["messages"]})
        return {"messages": [AIMessage(content=f"👩‍💻 Alice: {result.content}")]}

    def actor_bob_node(self, state: RoleplayState) -> Dict[str, Any]:
        logger.info("Executing node: actor_bob")
        agent = AgentFactory.create_agent(self.llm, Prompts.BOB)
        result = agent.invoke({"messages": state["messages"]})
        return {"messages": [AIMessage(content=f"🕴️ Bob: {result.content}")]}