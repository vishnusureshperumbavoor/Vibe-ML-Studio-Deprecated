# Model Quantization Skill (GGUF & Ollama)

**Description:** This skill provides a standardized workflow for downloading Hugging Face models, converting them to GGUF format, and importing them into your local Ollama instance for optimized local inference.

## Workflow Rules & Guidelines
1. **Dependencies:** Requires `huggingface_hub`, `gguf`, and `sentencepiece`. These are handled automatically by the `VMLQuantOptimizer` helper.
2. **Helper Import:** ALWAYS import the optimizer from `quant_helper`:
   ```python
   from quant_helper import VMLQuantOptimizer
   ```
3. **Download Protocol:** Use `huggingface_hub.snapshot_download` to pull only the necessary weights. Avoid downloading entire repos with `.bin` files if `.safetensors` are available.
4. **Ollama Integration:** The `import_to_ollama` method automatically generates a `Modelfile` and creates the local model.

## Mandatory Implementation Pattern
To quantize any model from Hugging Face, determine the requested **bit-depth** (default to `q4_k_m` if not specified) and use the following block:

| Request | `out_type` | Use Case |
| :--- | :--- | :--- |
| **4-bit** | `"q4_k_m"` | **Default.** Best for local use (fast & small). |
| **8-bit** | `"q8_0"` | Near-perfect accuracy, 2x smaller than FP16. |
| **16-bit** | `"f16"` | Reference precision (no accuracy loss). |

```python
import os
import huggingface_hub
from quant_helper import VMLQuantOptimizer

# 1. Targeted Download
print("[VML] Pulling optimized weights from Hub...")
repo_id = "{USER_PROVIDED_REPO_ID}"
model_dir = f"./data/{repo_id.split('/')[-1]}"

repo_path = huggingface_hub.snapshot_download(
    repo_id=repo_id,
    local_dir=model_dir,
    allow_patterns=["*.safetensors", "*.json", "*.model", "*.txt"]
)

# 2. Dynamic GGUF Conversion (Check user's requested bit-depth)
target_type = "{q4_k_m | q8_0 | f16}" 
gguf_path = f"{model_dir}_{target_type}.gguf"

print(f"[VML] Converting {repo_id} to GGUF ({target_type})...")
conv_result = VMLQuantOptimizer.convert_to_gguf(repo_path, gguf_path, out_type=target_type)

if "success" in conv_result:
    # 3. Import to Ollama
    model_name = f"{repo_id.split('/')[-1].lower().replace('-', '_')}_{target_type}"
    print(f"[VML] Importing to local Ollama instance as '{model_name}'...")
    import_result = VMLQuantOptimizer.import_to_ollama(model_name, gguf_path)
    print(import_result)
else:
    print(f"[VML] Error during conversion: {conv_result.get('error')}")
```


## Performance Tips
- **GGUF Type:** Default is `f16`. You can specify `out_type="q4_k_m"` in `convert_to_gguf` for higher compression if RAM is limited.
- **Selective Patterns:** Only download `*.safetensors` to avoid redundant `.bin` files.
