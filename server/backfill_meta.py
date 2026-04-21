import os
import json

dataset_dir = "d:/Projects/VML-Studio/server/data/datasets"
username = "vishnusureshperumbavoor"

if os.path.exists(dataset_dir):
    for f in os.listdir(dataset_dir):
        if f.endswith(".jsonl"):
            # Skip if already has meta
            if os.path.exists(os.path.join(dataset_dir, f + ".meta")):
                continue
                
            collection_name = f.split("_distilled_")[0]
            # Construct the standard repository name we use in dataset_uploader.py
            # repo_name = f"{collection_name}-vml-distilled"
            hf_url = f"https://huggingface.co/datasets/{username}/{collection_name}-vml-distilled"
            
            meta_path = os.path.join(dataset_dir, f + ".meta")
            with open(meta_path, 'w') as mf:
                json.dump({"hf_url": hf_url}, mf)
            print(f"Backfilled metadata for: {f} -> {hf_url}")
