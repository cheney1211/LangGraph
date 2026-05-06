from langgraph.graph import StateGraph, END, START
from app.schemas.state import RoleplayState
from app.agents.nodes import GraphNodes
from app.core.logger import setup_logger

logger = setup_logger(__name__)


class RoleplayGraphBuilder:
    def __init__(self, characters: list | None = None):
        self.nodes = GraphNodes(characters or [])
        self.workflow = StateGraph(RoleplayState)
        self.characters = characters or []

    def _route(self, state: RoleplayState) -> str:
        if state["next_agent"] == "FINISH":
            return END
        return state["next_agent"]

    def build(self):
        logger.info("Building LangGraph workflow...")

        # Register fixed nodes
        self.workflow.add_node("supervisor", self.nodes.supervisor_node)
        self.workflow.add_node("narrator", self.nodes.narrator_node)
        self.workflow.add_node("writer", self.nodes.writer_node)

        # Dynamically register actor nodes from character configs
        actor_names = []
        for c in self.characters:
            actor_key = f"actor_{c['name']}"
            actor_fn = self.nodes.make_actor_node(c["name"], c.get("personality", ""))
            self.workflow.add_node(actor_key, actor_fn)
            self.workflow.add_edge(actor_key, "supervisor")
            actor_names.append(actor_key)

        logger.info(f"Registered actor nodes: {actor_names}")

        # Edges: fixed agents go back to supervisor
        self.workflow.add_edge("narrator", "supervisor")
        self.workflow.add_edge("writer", "supervisor")

        # Conditional routing from supervisor
        self.workflow.add_conditional_edges("supervisor", self._route)
        self.workflow.add_edge(START, "supervisor")

        logger.info("Graph compilation successful.")
        return self.workflow.compile()
