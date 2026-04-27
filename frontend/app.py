import streamlit as st
import requests
import time

# ----------------- 页面配置 & 科技感 UI 注入 -----------------
st.set_page_config(page_title="NEON-NEXUS: 多维角色扮演终端", layout="wide")

# 自定义 CSS 实现赛博朋克风格
tech_css = """
<style>
    /* 全局暗色背景与科技字体 */
    .stApp {
        background-color: #050a15;
        color: #00ffff;
        font-family: 'Courier New', Courier, monospace;
    }
    
    /* 标题样式 */
    h1, h2, h3 {
        color: #ff00ff !important;
        text-shadow: 0 0 10px #ff00ff, 0 0 20px #ff00ff;
        text-transform: uppercase;
        letter-spacing: 2px;
    }

    /* 聊天框消息容器 */
    .stChatMessage {
        background-color: rgba(0, 255, 255, 0.05) !important;
        border-left: 3px solid #00ffff;
        margin-bottom: 15px;
        padding: 10px;
        border-radius: 0 !important;
        box-shadow: inset 0 0 10px rgba(0, 255, 255, 0.1);
    }
    
    /* 系统/旁白消息特别样式 */
    div[data-testid="stChatMessage"]:nth-child(even) {
        border-left: 3px solid #ff00ff;
        background-color: rgba(255, 0, 255, 0.05) !important;
    }

    /* 底部输入框科技感改造 */
    .stChatInputContainer {
        border: 1px solid #00ffff !important;
        box-shadow: 0 0 15px rgba(0, 255, 255, 0.3) !important;
        background-color: #02060d !important;
        border-radius: 5px;
    }
    .stChatInputContainer textarea {
        color: #00ffff !important;
        font-family: 'Courier New', Courier, monospace !important;
    }
    
    /* 侧边栏 */
    [data-testid="stSidebar"] {
        background-color: #02060d !important;
        border-right: 1px solid #00ffff;
    }
    
    /* 发光边框框体 */
    .glow-box {
        border: 1px solid #ff00ff;
        padding: 15px;
        box-shadow: 0 0 10px rgba(255, 0, 255, 0.5);
        margin-bottom: 20px;
    }
</style>
"""
st.markdown(tech_css, unsafe_allow_html=True)

# ----------------- 侧边栏与系统信息 -----------------
with st.sidebar:
    st.markdown("### SYSTEM OVERVIEW")
    st.markdown("<div class='glow-box'>系统状态: <span style='color:#0f0'>ONLINE</span><br/>节点连接: 5/5<br/>核心模块: LANGGRAPH</div>", unsafe_allow_html=True)
    
    st.markdown("### AGENT DIRECTORY")
    st.markdown("""
    * 🎬 **主控终端 (Supervisor)**
    * 🌫️ **环境渲染器 (Narrator)**
    * 📝 **事件驱动器 (Writer)**
    * 🎭 **实体单元 (Alice)**
    * 🎭 **实体单元 (Bob)**
    """)
    if st.button("🔄 重置记忆链路"):
        st.session_state.messages = []
        st.session_state.backend_history = []
        st.rerun()

# ----------------- 核心聊天逻辑 -----------------
st.title("⚡ NEON-NEXUS: 多核协控终端")
st.markdown(">> 连接建立完毕。等待玩家指令下达...")

# 初始化 session 状态
if "messages" not in st.session_state:
    st.session_state.messages = []
    # backend_history 用于传递给 FastAPI
    st.session_state.backend_history = []

# 渲染历史消息
for msg in st.session_state.messages:
    with st.chat_message(msg["role"]):
        st.markdown(msg["content"])

# 玩家输入框
if user_input := st.chat_input("输入指令或对角色说话..."):
    # 1. 显示玩家消息
    st.session_state.messages.append({"role": "user", "content": f"🎮 玩家: {user_input}"})
    with st.chat_message("user"):
        st.markdown(f"🎮 **玩家**: {user_input}")
    
    # 2. 调用 FastAPI 后端
    with st.spinner(">> 路由分配中... 主控 Agent 正在计算响应链路..."):
        try:
            response = requests.post(
                "http://127.0.0.1:8000/chat",
                json={
                    "user_input": user_input,
                    "history": st.session_state.backend_history
                }
            )
            response.raise_for_status()
            data = response.json()
            
            # 保存用户输入到后端历史
            st.session_state.backend_history.append({"role": "user", "content": user_input})
            
            # 3. 逐一展示 Agent 的响应
            if data.get("status") == "success":
                for item in data.get("responses", []):
                    content = item["content"]
                    # 添加到 UI 消息列表
                    st.session_state.messages.append({"role": "assistant", "content": content})
                    # 添加到传给后端的历史 (将多个角色的回应都算作AI的回复历史)
                    st.session_state.backend_history.append({"role": "assistant", "content": content})
                    
                    with st.chat_message("assistant"):
                        # 模拟打字机效果，增加科技感
                        placeholder = st.empty()
                        typed_text = ""
                        for char in content:
                            typed_text += char
                            placeholder.markdown(typed_text + " █")
                            time.sleep(0.01) # 控制打字速度
                        placeholder.markdown(typed_text)
                        
        except requests.exceptions.RequestException as e:
            st.error(f"⚠️ 系统连接断开 (后端未启动或报错): {e}")