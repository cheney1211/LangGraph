# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

多 Agent 角色扮演对话平台。后端使用 FastAPI + LangGraph 构建多 Agent 编排图，前端使用 React (Vite) + Live2D 模型查看器。支持动态角色配置与剧情驱动对话。

## 启动命令

```bash
# 后端（根目录）
python app/main.py              # 开发模式，uvicorn reload
# 或
uvicorn app.main:app --reload   # 默认端口 8000

# 前端（frontend/ 目录）
npm run dev                     # 开发模式，端口 5173，代理 /api -> 8000
npm run build                   # 生产构建
```

## 项目结构

```
app/
  main.py              # FastAPI 入口，路由：/chat, /live2d/upload, /avatars, /health
  core/
    config.py           # 环境变量配置 (OPENAI_API_KEY, MODEL_NAME, TEMPERATURE)
    logger.py           # 日志配置
  schemas/
    state.py            # RoleplayState (LangGraph State TypedDict), RouteDecision (结构化输出)
    request.py          # ChatRequest, CharacterConfig (Pydantic 请求模型)
  agents/
    factory.py          # AgentFactory — 统一创建 LangChain Chain (SystemPrompt + MessagesPlaceholder + LLM)
    nodes.py            # GraphNodes — supervisor/narrator/writer 节点 + make_actor_node 动态工厂
  graph/
    builder.py          # RoleplayGraphBuilder — 构建 LangGraph StateGraph，含动态 actor 节点注册
  prompts/
    templates.py        # 旧版静态 prompt 模板（仅供参考，实际使用 nodes.py 中的动态 prompt）
frontend/
  src/
    App.jsx             # 主应用，管理角色/Live2D 状态，localStorage 持久化
    api.js              # API 调用封装 (sendChatMessage, fetchAvatars, healthCheck)
    presets.js          # 预设头像列表与工具函数
    components/         # Chat, Settings, CharacterCard, AvatarPicker, Live2DViewer, Toast, MessageBubble
    main.jsx            # 入口
  vite.config.js        # Vite 配置，代理 /api 和 /static 到 8000
  app.py                # 旧版 Streamlit 原型（已弃用，保留参考）
```

## 核心架构：LangGraph 多 Agent 编排

1. **POST /chat** 接收用户输入、历史消息和角色配置
2. **RoleplayGraphBuilder** 构建 StateGraph，包含固定节点（supervisor/narrator/writer）和动态 actor 节点
3. **supervisor 节点**（总导演）：使用 `with_structured_output(RouteDecision)` 选择下一个发言 Agent
4. **actor 节点**：根据角色配置动态生成，每个角色一个独立节点
5. **路由循环**：所有节点执行后回到 supervisor，直到 supervisor 输出 `FINISH`
6. 使用 `graph.stream()` 流式收集所有节点输出并返回

## 关键配置

- **环境变量**：`OPENAI_API_KEY`, `MODEL_NAME` (默认 gpt-3.5-turbo), `TEMPERATURE` (默认 0.7)
- **配置类**：`app/core/config.py` — 使用 `pydantic-settings` 从 `.env` 文件加载
- 前端角色和 Live2D 状态持久化在 `localStorage`（key: `rp_characters`, `rp_live2d_models`, `rp_live2d_current`）

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/chat` | 发送对话消息 |
| POST | `/live2d/upload` | 上传 Live2D 模型 ZIP 包 |
| DELETE | `/live2d/model/{model_id}` | 删除 Live2D 模型 |
| GET | `/avatars` | 获取预设头像列表 |
| GET | `/health` | 健康检查 |

## 开发注意事项

- 当前无 `requirements.txt` — 依赖通过 `pip install` 直接安装到环境
- `.env` 文件在 `.gitignore` 中，需手动创建
- 前端开发时需同时启动后端（8000）和前端 dev server（5173）
- 添加新角色类型需在 `nodes.py` 的 `supervisor_node` 中更新 prompt 的角色列表
