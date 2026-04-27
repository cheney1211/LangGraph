from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from langchain_core.messages import HumanMessage, AIMessage

from app.schemas.request import ChatRequest
from app.graph.builder import RoleplayGraphBuilder
from app.core.logger import setup_logger
import uvicorn

logger = setup_logger(__name__)

# 启动时构建 LangGraph
logger.info("Starting up multi-agent backend...")
app_graph = RoleplayGraphBuilder().build()

app = FastAPI(title="Enterprise Multi-Agent Roleplay API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    try:
        # 将前端历史字典转化为 LangChain 要求的 Message 格式
        messages = []
        for msg in request.history:
            if msg["role"] == "user":
                messages.append(HumanMessage(content=msg["content"]))
            else:
                messages.append(AIMessage(content=msg["content"]))
        
        # 补充当前用户的最新输入
        messages.append(HumanMessage(content=f"🎮玩家: {request.user_input}"))
        
        # 初始化图的起始状态
        state = {"messages": messages, "next_agent": ""}
        
        # 流式跑图并收集所有新增回复
        new_responses = []
        for output in app_graph.stream(state, config={"recursion_limit": 15}):
            for node_name, node_state in output.items():
                if "messages" in node_state:
                    latest_msg = node_state["messages"][-1].content
                    new_responses.append({
                        "agent": node_name,
                        "content": latest_msg
                    })
                    
        return {"status": "success", "responses": new_responses}
    
    except Exception as e:
        logger.error(f"Error during graph execution: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)