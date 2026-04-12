import urllib.request
import os
import sys
import subprocess
import gguf

# 1. Ensure we have a clean converter
URL = 'https://raw.githubusercontent.com/ggerganov/llama.cpp/master/convert_hf_to_gguf.py'
PATH = r'd:\Projects\VML-Studio\skills\model-quantization\references\convert_hf_to_gguf.py'

if not os.path.exists(PATH):
    print(f"Downloading from {URL}...")
    urllib.request.urlretrieve(URL, PATH)

# 2. Mock the missing attributes in the 'gguf' module
if not hasattr(gguf.MODEL_ARCH, "GEMMA4"):
    gguf.MODEL_ARCH.GEMMA4 = "gemma4"
if not hasattr(gguf.MODEL_ARCH, "MISTRAL4"):
    gguf.MODEL_ARCH.MISTRAL4 = "mistral4"

# 3. Define paths
MODEL_PATH = r"d:\Projects\VML-Studio\server\data\qwen_snapshot"
GGUF_PATH = r"d:\Projects\VML-Studio\server\data\qwen2_05b.gguf"

# 4. Run the conversion by importing the script's main or calling it via subprocess
# To avoid the attribute error in subprocess, we'll run it in a way that injects the mocks.
# But actually, the easiest way is to just use the converter as a module if possible, 
# or just run it with a wrapper.

WRAPPER_PATH = r"d:\Projects\VML-Studio\scratch\converter_wrapper.py"
with open(WRAPPER_PATH, "w", encoding="utf-8") as f:
    f.write(f"""
import gguf
if not hasattr(gguf.MODEL_ARCH, "GEMMA4"): gguf.MODEL_ARCH.GEMMA4 = "gemma4"
if not hasattr(gguf.MODEL_ARCH, "MISTRAL4"): gguf.MODEL_ARCH.MISTRAL4 = "mistral4"
import sys
sys.path.append(r"d:\\Projects\\VML-Studio\\skills\\model-quantization\\references")
import convert_hf_to_gguf
sys.argv = ["convert_hf_to_gguf.py", r"{MODEL_PATH}", "--outfile", r"{GGUF_PATH}", "--outtype", "f16"]
convert_hf_to_gguf.main()
""")

print("Running conversion...")
subprocess.run([sys.executable, WRAPPER_PATH], check=True)

# 5. Import to Ollama
sys.path.append(r"d:\Projects\VML-Studio\skills\model-quantization\references")
from quant_helper import VMLQuantOptimizer
print("Importing to Ollama...")
res = VMLQuantOptimizer.import_to_ollama("qwen2_05b_vml", GGUF_PATH)
print(f"Import Result: {res}")
