from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import subprocess
import asyncio
import os
import tempfile
import sys

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

from fastapi.responses import StreamingResponse
import json

@app.post("/execute")
async def execute_code(req: ExecuteRequest):
    code_lines = req.code.splitlines()
    python_code_lines = ["import os, sys"] # Ensure common libs imported
    
    # 1. Intercept "Magic Pip" Commands and convert others to os.system
    BUILT_INS = {"os", "sys", "urllib", "zipfile", "zipfile36", "tarfile", "time", "json", "math", "re", "shutil", "tempfile", "requests"}
    
    for line in code_lines:
        stripped = line.strip().lstrip('\ufeff')
        if stripped.startswith("!") or stripped.startswith("%"):
            if "pip install" in stripped:
                packages = stripped.replace("!pip install", "").replace("%pip install", "").strip().split()
                # FILTER: Remove any built-in modules accidentally included by AI
                packages = [p for p in packages if p.lower() not in BUILT_INS]
                
                if packages:
                    subprocess.run([sys.executable, "-m", "pip", "install"] + packages)
                continue 
            
            command = stripped.lstrip("!%")
            python_code_lines.append(line.replace(stripped, f'os.system("{command}")'))
            continue 
            
        python_code_lines.append(line)
            
    clean_code = '\n'.join(python_code_lines)

    async def stream_output():
        temp_path = None
        try:
            with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
                f.write(clean_code)
                temp_path = f.name
                
            # Use asyncio.create_subprocess_exec for non-blocking I/O
            process = await asyncio.create_subprocess_exec(
                sys.executable, "-u", temp_path,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.STDOUT
            )
            
            is_gradio = False
            
            # Read output line by line as it arrives
            while True:
                line_bytes = await process.stdout.readline()
                if not line_bytes:
                    break
                    
                line = line_bytes.decode('utf-8', errors='replace')
                
                # Detect Gradio startup
                if "Running on local URL" in line:
                    is_gradio = True
                    yield f"data: {json.dumps({'output': line, 'is_done': True, 'is_gradio': True})}\n\n"
                
                yield f"data: {json.dumps({'output': line, 'is_done': False})}\n\n"
            
            # Wait for process to finish
            return_code = await process.wait()
            
            if not is_gradio:
                yield f"data: {json.dumps({'output': '', 'is_done': True, 'is_error': return_code != 0})}\n\n"
            
        except Exception as e:
            yield f"data: {json.dumps({'output': str(e), 'is_done': True, 'is_error': True})}\n\n"
        finally:
            if temp_path and os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                except:
                    pass

    return StreamingResponse(stream_output(), media_type="text/event-stream")

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
    return FileResponse(file_path)

if __name__ == "__main__":
    import uvicorn
    # Run server locally on port 8000
    uvicorn.run(app, host="127.0.0.1", port=2000)
