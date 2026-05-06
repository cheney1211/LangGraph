from typing import Dict, Any, List
from langchain_core.messages import AIMessage
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

from app.core.config import settings
from app.core.logger import setup_logger
from app.schemas.state import RoleplayState, RouteDecision
from app.agents.factory import AgentFactory

logger = setup_logger(__name__)


def supervisor_prompt(characters: List[dict]) -> str:
    """Build supervisor prompt dynamically based on character configs."""
    char_lines = []
    for c in characters:
        char_lines.append(
            f"- actor_{c['name']}: 🎭 角色演员({c['name']})，{c.get('personality', '无特定性格')}"
        )

    chars_section = "\n".join(char_lines) if char_lines else "- (当前没有配置角色演员)"

    return f"""你是一个多Agent剧本扮演系统的【总导演】。
你的任务是根据当前的对话上下文，决定下一步该由哪个角色发言。

当前可用角色：
- narrator: 🌫️ 旁白，负责描写环境、天气、人物动作神态。
- writer: 📝 编剧，负责制造突发事件或推动剧情。
{chars_section}
- FINISH: 如果AI角色的对话已经告一段落，需要等待玩家输入，则输出 FINISH。

规则：
1. 玩家输入后，通常先由 narrator 描述场景或 writer 推动剧情，然后再交由 actor 们对话。
2. 不要让同一个角色连续自言自语。
3. 如果没有角色演员配置，直接输出 FINISH。

请注意：角色名区分大小写，actor_后面的名字必须与配置完全一致。"""


def actor_prompt(char_name: str, personality: str) -> str:
    """Build actor prompt dynamically."""
    return f"""你是【{char_name}】，{personality}

请完全代入这个角色，根据对话历史和当前场景做出回应。
说话风格、语气、用词都要符合角色设定。直接以角色的身份说话即可，无需自我介绍。"""


class GraphNodes:
    def __init__(self, characters: List[dict] | None = None):
        self.llm = ChatOpenAI(
            api_key=settings.OPENAI_API_KEY,
            model=settings.MODEL_NAME,
            temperature=settings.TEMPERATURE,
        )
        self.llm_structured = self.llm.with_structured_output(RouteDecision)
        self.characters = characters or []
        logger.info(f"Initialized GraphNodes with model: {settings.MODEL_NAME}, {len(self.characters)} characters")

    def supervisor_node(self, state: RoleplayState) -> Dict[str, Any]:
        logger.info("Executing node: supervisor")
        chars = state.get("characters") or self.characters
        prompt_text = supervisor_prompt(chars)
        prompt = ChatPromptTemplate.from_messages([
            ("system", prompt_text),
            MessagesPlaceholder(variable_name="messages"),
        ])
        chain = prompt | self.llm_structured
        decision = chain.invoke({"messages": state["messages"]})
        logger.info(f"Supervisor routed to: {decision.next_agent}")
        return {"next_agent": decision.next_agent}

    def narrator_node(self, state: RoleplayState) -> Dict[str, Any]:
        logger.info("Executing node: narrator")
        agent = AgentFactory.create_agent(
            self.llm,
            "你是【旁白】。请用散文式的、极具沉浸感的语言描述当前场景的环境、光影、声音或角色的神态动作。只需输出描写，不要输出台词。格式如：🌫️旁白: 【雨水顺着霓虹灯管滴落...】"
        )
        result = agent.invoke({"messages": state["messages"]})
        return {"messages": [AIMessage(content=f"🌫️旁白: {result.content}")]}

    def writer_node(self, state: RoleplayState) -> Dict[str, Any]:
        logger.info("Executing node: writer")
        agent = AgentFactory.create_agent(
            self.llm,
            "你是【编剧】。为了增加戏剧张力，请在此刻抛出一个突发事件、核心矛盾或者关键线索。一两句话即可。格式如：📝编剧: 突然，远处的警报声划破了夜空。"
        )
        result = agent.invoke({"messages": state["messages"]})
        return {"messages": [AIMessage(content=f"📝编剧: {result.content}")]}

    def make_actor_node(self, char_name: str, personality: str):
        """Factory: creates an actor node function for a given character."""
        personality_text = personality or "一个独特的角色"
        prompt_text = actor_prompt(char_name, personality_text)

        def actor_node(state: RoleplayState) -> Dict[str, Any]:
            logger.info(f"Executing node: actor_{char_name}")
            agent = AgentFactory.create_agent(self.llm, prompt_text)
            result = agent.invoke({"messages": state["messages"]})
            return {
                "messages": [
                    AIMessage(
                        content=result.content,
                        additional_kwargs={"character_name": char_name},
                    )
                ]
            }

        return actor_node
