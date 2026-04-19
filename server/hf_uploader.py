import os
import sys
from huggingface_hub import HfApi, create_repo, login
from dotenv import load_dotenv

def upload_to_hf(file_path: str, model_name: str):
    """
    Uploads a quantized model (.gguf) to Hugging Face.
    Naming convention: {model-name}-gguf-vml
    Visibility: Public
    """
    load_dotenv()
    token = os.getenv("HF_TOKEN")
    
    if not token:
        print("❌ Error: HF_TOKEN not found in .env file.")
        return False

    api = HfApi(token=token)
    
    # 1. Get Username
    try:
        user_info = api.whoami()
        username = user_info['name']
        print(f"👤 Authenticated as: {username}")
    except Exception as e:
        print(f"❌ Authentication failed: {e}")
        return False

    # 2. Prepare Repo Details
    repo_id = f"{username}/{model_name.lower().replace('/', '_')}-gguf-vml"
    
    # 3. Create Repo if not exists
    try:
        create_repo(repo_id=repo_id, token=token, private=False, exist_ok=True, repo_type="model")
        print(f"✅ Repository ready: https://huggingface.co/{repo_id}")
    except Exception as e:
        print(f"⚠️ Repo creation/check failed: {e}")

    # 4. Upload File
    filename = os.path.basename(file_path)
    print(f"📤 Uploading {filename} to HF...")
    
    try:
        future = api.upload_file(
            path_or_fileobj=file_path,
            path_in_repo=filename,
            repo_id=repo_id,
            repo_type="model",
            commit_message=f"Upload quantized model: {filename}"
        )
        print(f"🚀 Success! Model available at: https://huggingface.co/{repo_id}/blob/main/{filename}")
        return True
    except Exception as e:
        print(f"❌ Upload failed: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python hf_uploader.py <file_path> <model_name>")
    else:
        upload_to_hf(sys.argv[1], sys.argv[2])
