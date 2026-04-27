from langgraph.graph import StateGraph, END, START
from app.schemas.state import RoleplayState
from app.agents.nodes import GraphNodes
from app.core.logger import setup_logger

logger = setup_logger(__name__)

class RoleplayGraphBuilder:
    """负责构建和编译 LangGraph，将流转定义代码化"""
    def __init__(self):
        self.nodes = GraphNodes()
        self.workflow = StateGraph(RoleplayState)

    def _route(self, state: RoleplayState) -> str:
        """内部路由策略"""
        if state["next_agent"] == "FINISH":
            return END
        return state["next_agent"]

    def build(self):
        """装配节点与边，生成可执行图"""
        logger.info("Building LangGraph workflow...")
        
        # 1. 注册节点
        self.workflow.add_node("supervisor", self.nodes.supervisor_node)
        self.workflow.add_node("narrator", self.nodes.narrator_node)
        self.workflow.add_node("writer", self.nodes.writer_node)
        self.workflow.add_node("actor_alice", self.nodes.actor_alice_node)
        self.workflow.add_node("actor_bob", self.nodes.actor_bob_node)

        # 2. 注册图的边：每次具体Agent完成工作，均交还给总导演评估下一步
        self.workflow.add_edge("narrator", "supervisor")
        self.workflow.add_edge("writer", "supervisor")
        self.workflow.add_edge("actor_alice", "supervisor")
        self.workflow.add_edge("actor_bob", "supervisor")

        # 3. 启动点与条件路由
        self.workflow.add_conditional_edges("supervisor", self._route)
        self.workflow.add_edge(START, "supervisor")

        logger.info("Graph compilation successful.")
        return self.workflow.compile()