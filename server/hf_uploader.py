import os
import sys
from huggingface_hub import HfApi, create_repo, login
from dotenv import load_dotenv

def upload_to_hf(path: str, repo_slug: str):
    """
    Uploads a file or a folder to Hugging Face.
    Path: Absolute path to the file or directory.
    Repo Slug: The base name of the repository to create/update.
    """
    # Load environment variables
    load_dotenv()
    
    token = os.getenv("HF_TOKEN")
    if not token:
        print("❌ Error: HF_TOKEN not found. Deployment aborted.")
        return False

    api = HfApi(token=token)
    
    # 1. Fetch authenticated user
    try:
        user_info = api.whoami()
        username = user_info['name']
    except Exception as e:
        print(f"❌ Authentication failed: {e}")
        return False

    # 2. Prepare Repository
    # Convention: {username}/{repo_slug}-vml
    repo_id = f"{username}/{repo_slug}-vml"
    
    print(f"🔄 Preparing repository: {repo_id}...")
    try:
        create_repo(repo_id=repo_id, token=token, private=False, exist_ok=True, repo_type="model")
    except Exception as e:
        print(f"⚠️ Repo access issue: {e}")

    # 3. Handle Upload
    try:
        if os.path.isdir(path):
            print(f"📂 Uploading entire folder to HF: {os.path.basename(path)}...")
            api.upload_folder(
                folder_path=path,
                repo_id=repo_id,
                repo_type="model",
                commit_message=f"Upload model directory: {os.path.basename(path)}"
            )
        else:
            print(f"📄 Uploading single file to HF: {os.path.basename(path)}...")
            api.upload_file(
                path_or_fileobj=path,
                path_in_repo=os.path.basename(path),
                repo_id=repo_id,
                repo_type="model",
                commit_message=f"Upload model file: {os.path.basename(path)}"
            )
            
        final_url = f"https://huggingface.co/{repo_id}"
        print(f"✅ DEPLOYMENT SUCCESSFUL!")
        print(f"[VML_DEPLOYMENT_URL] {final_url}")
        return True
    except Exception as e:
        print(f"❌ Upload failed: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python hf_uploader.py <path> <repo_slug>")
    else:
        upload_to_hf(sys.argv[1], sys.argv[2])
