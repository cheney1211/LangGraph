import os
import io
import zipfile
import shutil
import uuid
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from langchain_core.messages import HumanMessage, AIMessage

from app.schemas.request import ChatRequest
from app.graph.builder import RoleplayGraphBuilder
from app.core.logger import setup_logger
import uvicorn

logger = setup_logger(__name__)

logger.info("Starting up multi-agent backend...")
app_graph_cache = {}

# Live2D 模型静态文件目录
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
LIVE2D_DIR = os.path.join(STATIC_DIR, "live2d")
os.makedirs(LIVE2D_DIR, exist_ok=True)

app = FastAPI(title="Multi-Agent Roleplay API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 提供已上传的 Live2D 模型文件
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


def get_or_build_graph(characters: list):
    """按角色配置指纹缓存已编译的图。"""
    key = str([(c["name"], c.get("personality", "")) for c in characters])
    if key not in app_graph_cache:
        app_graph_cache[key] = RoleplayGraphBuilder(characters).build()
    return app_graph_cache[key]


def safe_extract_zip(zf: zipfile.ZipFile, extract_path: str):
    """安全解压 ZIP，防止路径穿越攻击（zip slip）。"""
    for info in zf.infolist():
        safe_name = os.path.normpath(info.filename)
        if safe_name.startswith("..") or os.path.isabs(safe_name):
            logger.warning(f"Skipping unsafe ZIP entry: {info.filename}")
            continue
        zf.extract(info, extract_path)


@app.post("/live2d/upload")
async def upload_live2d_model(file: UploadFile = File(...), name: str = Form("")):
    if not file.filename or not file.filename.lower().endswith(".zip"):
        raise HTTPException(status_code=400, detail="只支持 ZIP 格式的模型包")

    model_id = f"l2d_{uuid.uuid4().hex[:8]}"
    extract_dir = os.path.join(LIVE2D_DIR, model_id)

    try:
        os.makedirs(extract_dir)

        # 读取上传的文件内容
        contents = await file.read()
        if len(contents) < 4:
            shutil.rmtree(extract_dir)
            raise HTTPException(status_code=400, detail="ZIP 文件为空或已损坏")

        # 在内存中解压 ZIP
        try:
            with zipfile.ZipFile(io.BytesIO(contents)) as zf:
                safe_extract_zip(zf, extract_dir)
        except zipfile.BadZipFile:
            shutil.rmtree(extract_dir)
            raise HTTPException(status_code=400, detail="无效的 ZIP 文件，请确认文件未损坏")

    except HTTPException:
        raise
    except Exception as e:
        if os.path.exists(extract_dir):
            shutil.rmtree(extract_dir)
        logger.error(f"ZIP extraction error: {e}")
        raise HTTPException(status_code=500, detail=f"解压失败: {str(e)}")

    # 查找 .model3.json 文件
    model3_path = None
    for root, _dirs, files in os.walk(extract_dir):
        for f in files:
            if f.endswith(".model3.json"):
                model3_path = os.path.join(root, f)
                break
        if model3_path:
            break

    if not model3_path:
        shutil.rmtree(extract_dir)
        raise HTTPException(
            status_code=400,
            detail="ZIP 包中未找到 .model3.json 文件，请确认是有效的 Live2D 模型包",
        )

    # 构建相对于静态文件挂载点的 URL
    rel_path = os.path.relpath(model3_path, STATIC_DIR)
    url = f"/static/{rel_path.replace(os.sep, '/')}"

    model_display_name = name.strip() if name.strip() else os.path.splitext(os.path.basename(file.filename))[0]
    logger.info(f"Live2D model imported: {model_display_name} -> {url}")

    return {
        "id": model_id,
        "name": model_display_name,
        "url": url,
    }


@app.delete("/live2d/model/{model_id}")
async def delete_live2d_model(model_id: str):
    model_dir = os.path.join(LIVE2D_DIR, model_id)

    # 安全检查：确保仅删除 LIVE2D_DIR 内的文件
    if not os.path.exists(model_dir):
        raise HTTPException(status_code=404, detail="模型不存在")
    if not os.path.realpath(model_dir).startswith(os.path.realpath(LIVE2D_DIR)):
        raise HTTPException(status_code=400, detail="无效的模型 ID")

    try:
        shutil.rmtree(model_dir)
        logger.info(f"Live2D model deleted: {model_id}")
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Failed to delete Live2D model {model_id}: {e}")
        raise HTTPException(status_code=500, detail=f"删除失败: {str(e)}")


@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    try:
        chars = [c.model_dump() for c in request.characters]

        messages = []
        for msg in request.history:
            if msg["role"] == "user":
                messages.append(HumanMessage(content=msg["content"]))
            else:
                messages.append(AIMessage(content=msg["content"]))

        messages.append(HumanMessage(content=f"🎮玩家: {request.user_input}"))

        graph = get_or_build_graph(chars)
        state = {"messages": messages, "next_agent": "", "characters": chars}

        new_responses = []
        for output in graph.stream(state, config={"recursion_limit": 15}):
            for node_name, node_state in output.items():
                if "messages" in node_state:
                    latest_msg = node_state["messages"][-1]
                    content = latest_msg.content
                    char_name = latest_msg.additional_kwargs.get("character_name", "")
                    new_responses.append({
                        "agent": node_name,
                        "content": content,
                        "character_name": char_name,
                    })

        return {"status": "success", "responses": new_responses}

    except Exception as e:
        logger.error(f"Error during graph execution: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/avatars")
async def list_avatars():
    """返回 static/avatars/ 目录下的预设头像列表。"""
    import json
    avatars_dir = os.path.join(STATIC_DIR, "avatars")
    manifest_path = os.path.join(avatars_dir, "avatars.json")

    if os.path.exists(manifest_path):
        with open(manifest_path, "r", encoding="utf-8") as f:
            avatars = json.load(f)
    else:
        avatars = []

    # 补充未在 manifest 中但存在文件的头像
    known_ids = {a["id"] for a in avatars}
    if os.path.isdir(avatars_dir):
        for fname in os.listdir(avatars_dir):
            name_no_ext, ext = os.path.splitext(fname)
            if ext.lower() in (".png", ".jpg", ".jpeg", ".svg", ".webp") and name_no_ext not in known_ids:
                avatars.append({"id": name_no_ext, "name": name_no_ext})

    # 为每个头像附加文件扩展名
    result = []
    for a in avatars:
        aid = a["id"]
        found_ext = None
        for ext in (".svg", ".png", ".jpg", ".jpeg", ".webp"):
            if os.path.exists(os.path.join(avatars_dir, aid + ext)):
                found_ext = ext
                break
        result.append({
            "id": aid,
            "name": a.get("name", aid),
            "color": a.get("color", "#d4a574"),
            "url": f"/static/avatars/{aid}{found_ext or '.svg'}",
        })

    return result


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
