from pydantic import BaseModel
from typing import List, Dict, Optional

class CharacterConfig(BaseModel):
    id: str
    name: str
    personality: str = ""
    avatarId: str = "adv-1"
    color: str = "#4facfe"

class ChatRequest(BaseModel):
    user_input: str
    history: List[Dict[str, str]] = []
    characters: List[CharacterConfig] = []
