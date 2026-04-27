from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    """统一管理环境变量与应用配置"""
    OPENAI_API_KEY: str = "sk-placeholder"
    MODEL_NAME: str = "gpt-3.5-turbo"
    TEMPERATURE: float = 0.7

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

# 实例化全局配置对象
settings = Settings()