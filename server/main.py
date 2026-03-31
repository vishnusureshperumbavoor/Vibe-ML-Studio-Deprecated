from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import subprocess
import os
import tempfile
import sys

# Create the FastAPI App
app = FastAPI(title="Vibe Training Execution Engine")

# Base directory for skills and file access (Project Root)
BASE_DIR = os.path.dirname(os.path.abspath(__file__)) # Directory of main.py (server/)
PROJECT_ROOT = os.path.dirname(BASE_DIR)              # One level up (Vibe-ML-platform/)

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
        try:
            with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
                f.write(clean_code)
                temp_path = f.name
                
            # Use a shell to support pipes and redirects if needed, but -u for unbuffered python
            process = subprocess.Popen(
                [sys.executable, "-u", temp_path],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
                universal_newlines=True
            )
            
            # Use non-blocking read or a simple loop for real-time output
            while True:
                line = process.stdout.readline()
                if not line and process.poll() is not None:
                    break
                if line:
                    yield f"data: {json.dumps({'output': line, 'is_done': False})}\n\n"
            
            return_code = process.wait()
            
            if os.path.exists(temp_path):
                os.remove(temp_path)
            
            yield f"data: {json.dumps({'output': '', 'is_done': True, 'is_error': return_code != 0})}\n\n"
            
        except Exception as e:
            yield f"data: {json.dumps({'output': str(e), 'is_done': True, 'is_error': True})}\n\n"

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

if __name__ == "__main__":
    import uvicorn
    # Run server locally on port 8000
    uvicorn.run(app, host="127.0.0.1", port=2000)
