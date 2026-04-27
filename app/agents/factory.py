from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_openai import ChatOpenAI

class AgentFactory:
    """Agent 实例化工厂，统一管控大模型调用链路"""
    @staticmethod
    def create_agent(llm: ChatOpenAI, system_prompt: str):
        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            MessagesPlaceholder(variable_name="messages"),
        ])
        return prompt | llm