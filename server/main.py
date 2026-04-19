from fastapi import FastAPI, HTTPException, Body
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import subprocess
import asyncio
import os
import tempfile
import sys
from dotenv import load_dotenv
from contextlib import asynccontextmanager
from inference import native_manager
from typing import List, Optional

# Load HF_TOKEN from server/.env
load_dotenv()

# Create the FastAPI App
app = FastAPI(title="Vibe Training Execution Engine")

# Base directory for skills and file access (Project Root)
BASE_DIR = os.path.dirname(os.path.abspath(__file__)) # Directory of main.py (server/)
PROJECT_ROOT = os.path.dirname(BASE_DIR)              # One level up (Vibe-ML-platform/)
DATA_DIR = os.path.join(BASE_DIR, "data")             # server/data/

# Ensure the data directory exists for generated images
if not os.path.exists(DATA_DIR):
    os.makedirs(DATA_DIR)

# Allow the React frontend to communicate with this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for local development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ExecuteRequest(BaseModel):
    code: str

class FileReadRequest(BaseModel):
    path: str

class FileWriteRequest(BaseModel):
    skill_name: str
    filename: str
    content: str



class NativeChatRequest(BaseModel):
    model_filename: str
    messages: List[dict]
    lora_slug: Optional[str] = None

from fastapi.responses import StreamingResponse
import json

def get_skill_paths():
    """Scans the skills directory and returns all 'references' subfolders."""
    paths = []
    skills_root = os.path.join(PROJECT_ROOT, "skills")
    if not os.path.exists(skills_root):
        return paths
        
    for skill in os.listdir(skills_root):
        ref_path = os.path.join(skills_root, skill, "references")
        if os.path.exists(ref_path):
            paths.append(os.path.abspath(ref_path).replace("\\", "/"))
    return paths

from kernel import kernel_manager

@app.post("/execute")
async def execute_code(req: ExecuteRequest):
    code_lines = req.code.splitlines()
    skill_paths = get_skill_paths()
    python_code_lines = [
        "import os, sys",
        f"sys.path.extend({json.dumps(skill_paths)})"
    ]
    
    # 1. Intercept "Magic Pip" Commands and convert to os.system for the kernel
    BUILT_INS = {"os", "sys", "urllib", "zipfile", "zipfile36", "tarfile", "time", "json", "math", "re", "shutil", "tempfile", "requests"}
    
    for line in code_lines:
        stripped = line.strip().lstrip('\ufeff')
        if stripped.startswith("!") or stripped.startswith("%"):
            if "pip install" in stripped:
                packages = stripped.replace("!pip install", "").replace("%pip install", "").strip().split()
                packages = [p for p in packages if p.lower() not in BUILT_INS]
                if packages:
                    pkg_str = " ".join(packages)
                    python_code_lines.append(f'import os; os.system("{sys.executable} -m pip install {pkg_str}")')
                continue 
            
            command = stripped.lstrip("!%")
            python_code_lines.append(f'import os; os.system("{command}")')
            continue 
            
        python_code_lines.append(line)
            
    clean_code = '\n'.join(python_code_lines)

    async def stream_output():
        try:
            is_gradio = False
            has_error = False
            async for line in kernel_manager.execute(clean_code):
                # Clean prompt noise
                clean_line = line.lstrip('> ').lstrip('. ').replace('\r', '\n')
                
                # Detect Tracebacks for error reporting (since kernel doesn't exit)
                if "Traceback (most recent call last):" in line or "NameError:" in line or "ValueError:" in line:
                    has_error = True

                # Detect Gradio startup
                if "Running on local URL" in clean_line:
                    is_gradio = True
                    yield f"data: {json.dumps({'output': clean_line, 'is_done': True, 'is_gradio': True})}\n\n"
                
                yield f"data: {json.dumps({'output': clean_line, 'is_done': False})}\n\n"
            
            if not is_gradio:
                yield f"data: {json.dumps({'output': '', 'is_done': True, 'is_error': has_error})}\n\n"
            
        except Exception as e:
            yield f"data: {json.dumps({'output': str(e), 'is_done': True, 'is_error': True})}\n\n"

    return StreamingResponse(stream_output(), media_type="text/event-stream")

@app.post("/restart_kernel")
async def restart_kernel():
    await kernel_manager.stop()
    await kernel_manager.start()
    return {"status": "Kernel restarted"}

@app.get("/list_skills")
async def list_skills():
    try:
        skills_path = os.path.join(PROJECT_ROOT, "skills")
        if not os.path.exists(skills_path):
            return {"skills": []}
            
        skills = []
        for d in os.listdir(skills_path):
            if os.path.isdir(os.path.join(skills_path, d)):
                skills.append(d)
        return {"skills": skills}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/read_file")
async def read_file(req: FileReadRequest):
    try:
        # Security: Normalize path and prevent directory traversal
        abs_path = os.path.abspath(os.path.join(PROJECT_ROOT, req.path))
        if not abs_path.startswith(PROJECT_ROOT):
            raise HTTPException(status_code=403, detail="Access denied: Path outside workspace")
            
        # Allowed extensions
        ext = os.path.splitext(abs_path)[1].lower()
        if ext not in [".md", ".py", ".json", ".txt", ".csv", ".yaml", ".yml"]:
            raise HTTPException(status_code=400, detail=f"File extension {ext} not allowed for reading.")

        if not os.path.exists(abs_path):
            raise HTTPException(status_code=404, detail="File not found")

        with open(abs_path, 'r', encoding='utf-8') as f:
            content = f.read()
        return {"content": content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/save_skill")
async def save_skill(req: FileWriteRequest):
    """
    Skill Factory: Saves a new skill definition (L2) or resource (L3) to the skills/ directory.
    Standard Path: skills/<skill_name>/SKILL.md
    Resource Path: skills/<skill_name>/references/<filename>
    """
    try:
        # Security: kebab-case names only
        import re
        if not re.match(r'^[a-z0-9\-]+$', req.skill_name):
            raise HTTPException(status_code=400, detail="Invalid skill name. Use kebab-case.")
            
        skill_dir = os.path.join(PROJECT_ROOT, "skills", req.skill_name)
        
        # Handle reference files vs main skill docs
        if req.filename.startswith("references/"):
            target_dir = os.path.join(skill_dir, "references")
            target_filename = req.filename.replace("references/", "")
        else:
            target_dir = skill_dir
            target_filename = req.filename

        if not os.path.exists(target_dir):
            os.makedirs(target_dir)

        abs_path = os.path.join(target_dir, target_filename)
        
        with open(abs_path, 'w', encoding='utf-8') as f:
            f.write(req.content)
            
        return {"success": True, "path": abs_path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/images/{filename}")
async def get_image(filename: str):
    """
    Serves a generated image file from the server/data directory.
    Usage: [IMAGE: slice.png] in stdout will be picked up by React.
    """
    file_path = os.path.join(DATA_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Image not found")
    from fastapi.responses import FileResponse
    return FileResponse(file_path)


@app.post("/v1/native/chat")
async def native_chat(req: NativeChatRequest):
    """
    Streaming endpoint for native llama.cpp inference.
    Supports base GGUF + optional LoRA adapters.
    """
    async def chat_generator():
        try:
            # 1. Resolve LoRA path if provided
            lora_path = None
            if req.lora_slug:
                # Adapters are stored in server/data/<slug>
                abs_lora_dir = os.path.join(DATA_DIR, req.lora_slug)
                if os.path.exists(abs_lora_dir):
                    lora_path = abs_lora_dir
            
            # 2. Load the model (manager handles swapping/caching)
            native_manager.load_model(req.model_filename, lora_path)
            
            # 3. Stream tokens
            for token in native_manager.chat_stream(req.messages):
                yield f"data: {json.dumps({'content': token})}\n\n"
            
            yield f"data: {json.dumps({'done': True})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            
    return StreamingResponse(chat_generator(), media_type="text/event-stream")


@app.get("/list_native_models")
async def list_native_models():
    """
    Returns a unified list of available native models.
    Includes base GGUFs and detected Fine-tuned adapters.
    """
    models_dir = os.path.join(BASE_DIR, "models")
    results = []
    
    # 1. Base Models (.gguf)
    if os.path.exists(models_dir):
        for f in os.listdir(models_dir):
            if f.lower().endswith(".gguf"):
                results.append({"name": f, "source": "native", "type": "base"})
    
    # 2. Fine-tuned Adapters (Folders in /data with safetensors)
    if os.path.exists(DATA_DIR):
        for slug in os.listdir(DATA_DIR):
            lora_dir = os.path.join(DATA_DIR, slug)
            if os.path.isdir(lora_dir):
                # Check for adapter weights
                if os.path.exists(os.path.join(lora_dir, "adapter_model.safetensors")):
                    results.append({
                        "name": f"Fine-tuned: {slug}", 
                        "source": "native", 
                        "type": "adapter",
                        "lora_slug": slug
                    })
                    
    return {"models": results}


@app.post("/save_token")
async def save_token(payload: dict = Body(...)):
    """
    Persists a token (e.g., HF_TOKEN) to the .env file in the server directory.
    """
    try:
        token_key = payload.get("key")
        token_val = payload.get("value")
        if not token_key or not token_val:
            raise HTTPException(status_code=400, detail="Key and Value required")

        env_path = os.path.join(BASE_DIR, ".env")
        
        # Read existing lines
        lines = []
        if os.path.exists(env_path):
            with open(env_path, "r", encoding="utf-8") as f:
                lines = f.readlines()
        
        # Update or add the key
        found = False
        new_line = f"{token_key}={token_val}\n"
        for i, line in enumerate(lines):
            if line.startswith(f"{token_key}="):
                lines[i] = new_line
                found = True
                break
        
        if not found:
            lines.append(new_line)
            
        with open(env_path, "w", encoding="utf-8") as f:
            f.writelines(lines)
            
        # Also update the current environment so it's active immediately
        os.environ[token_key] = token_val
        
        return {"success": True, "message": f"{token_key} saved and active."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    # Run server locally on port 8000
    uvicorn.run(app, host="127.0.0.1", port=2000)
