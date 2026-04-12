import os
import sys
import subprocess

# Absolute paths
BASE_DIR = r"d:\Projects\VML-Studio\server"
DATA_DIR = os.path.join(BASE_DIR, "data")
MODEL_HP_PATH = os.path.join(DATA_DIR, "qwen_snapshot")
GGUF_PATH = os.path.join(DATA_DIR, "qwen2_05b.gguf")

sys.path.append(r"d:\Projects\VML-Studio\skills\model-quantization\references")
from quant_helper import VMLQuantOptimizer

try:
    print(f"Starting conversion for {MODEL_HP_PATH}...")
    result = VMLQuantOptimizer.convert_to_gguf(MODEL_HP_PATH, GGUF_PATH)
    print(f"Conversion Result: {result}")
    
    if "success" in result:
        print("Importing to Ollama as 'qwen2_05b_vml'...")
        import_result = VMLQuantOptimizer.import_to_ollama("qwen2_05b_vml", GGUF_PATH)
        print(f"Import Result: {import_result}")
    else:
        print(f"FAILURE: {result.get('error')}")

except Exception as e:
    print(f"UNEXPECTED ERROR: {str(e)}")
