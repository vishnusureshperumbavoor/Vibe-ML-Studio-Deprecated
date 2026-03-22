from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import subprocess
import os
import tempfile
import sys

# Create the FastAPI App
app = FastAPI(title="Vibe Training Execution Engine")

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

@app.post("/execute")
def execute_code(req: ExecuteRequest):
    code_lines = req.code.split('\n')
    python_code_lines = []
    
    # 1. Intercept "Magic Pip" Commands
    for line in code_lines:
        stripped = line.strip()
        if stripped.startswith("!pip install ") or stripped.startswith("%pip install "):
            # Extract just the package names
            packages = stripped.replace("!pip install ", "").replace("%pip install ", "").split()
            if packages:
                try:
                    # Run the pip installation synchronously using the exact venv python executable
                    print(f"Intercepted Magic Pip. Installing: {packages}")
                    subprocess.run(
                        [sys.executable, "-m", "pip", "install"] + packages, 
                        check=True, 
                        capture_output=True, 
                        text=True
                    )
                except subprocess.CalledProcessError as e:
                    return {"output": "", "is_error": True, "raw_error": f"Failed to run auto-install: {e.stderr}"}
        else:
            python_code_lines.append(line)
            
    clean_code = '\n'.join(python_code_lines)

    # 2. Execute the cleaned Python Script
    try:
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
            f.write(clean_code)
            temp_path = f.name
            
        # Spawn a python process to run the temporary file
        # We use sys.executable to ensure it uses the exact Python environment running the server!
        result = subprocess.run(
            [sys.executable, temp_path],
            capture_output=True,
            text=True,
            timeout=600  # 10 minute timeout for training runs
        )
        
        # Clean up the temp script file so we don't leak storage
        os.remove(temp_path)
        
        # Merge stdout and stderr
        output = result.stdout
        is_error = False
        
        if result.returncode != 0:
            output += "\n[Execution Error Traceback]:\n" + result.stderr
            is_error = True
        elif result.stderr:
            # Some libraries print progress bars to stderr even if successful
            output += "\n" + result.stderr
            
        if not output.strip() and not is_error:
            output = "<No Output>"
            
        return {"output": output, "is_error": is_error, "raw_error": result.stderr if is_error else None}
        
    except subprocess.TimeoutExpired:
        return {"output": "", "is_error": True, "raw_error": "Execution timed out after 10 minutes."}
    except Exception as e:
        return {"output": "", "is_error": True, "raw_error": str(e)}

if __name__ == "__main__":
    import uvicorn
    # Run server locally on port 8000
    uvicorn.run(app, host="127.0.0.1", port=8000)
