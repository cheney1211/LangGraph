from pydantic import BaseModel
from typing import List, Dict

class ChatRequest(BaseModel):
    """前端向后端 FastAPI 发送的对话请求体"""
    user_input: str
    history: List[Dict[str, str]] = []  # 例: [{"role": "user", "content": "你好"}]