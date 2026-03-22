# Vibe ML Platform - Backend Execution Server

### 1. Create a Virtual Environment
```bash
python -m venv venv
```

### 2. Activate the Virtual Environment
Before you install dependencies or run the server, you must activate the isolated sandbox.

1. Open your file explorer
2. Open the `venv` folder you just created, then open the `Scripts` folder (or `bin` if on Mac/Linux).
3. Find the activation file:
   - On Windows PowerShell: Look for `Activate.ps1`
   - On Mac/Linux/Git Bash: Look for `activate`
4. Simply **drag and drop** that file directly into your open terminal and press **Enter**!

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Boot the Execution Server
```bash
python main.py
```