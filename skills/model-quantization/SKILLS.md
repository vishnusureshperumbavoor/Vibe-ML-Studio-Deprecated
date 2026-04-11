# Model Quantization Skill (Generic & Agent-Driven)

**Description:** This skill empowers the VML Agent to autonomously optimized and compress ANY model from the Hugging Face Hub. It is perfectly designed for **CPU/128MB VRAM** setups.

## Autonomous Optimization Protocol
When a user asks to quantize a model, follow these steps:

2. **Skill Loading**: You can import the quantization helper directly. The platform automatically handles all paths.
   ```python
   from quant_helper import VMLQuantOptimizer
   ```
3. **Download Protocol (STRICT)**:
   - **DO NOT USE `!git clone`**. It is slow and prone to errors.
   - **DO NOT USE `!wget`** or manual downloads for weights.
   - **ALWAYS USE `huggingface_hub.snapshot_download`**. It handles resumable downloads and caching perfectly.
   - **ALWAYS USE `./data/`** as your base directory for all weights and GGUF files.
   ```python
   import huggingface_hub
   repo_path = huggingface_hub.snapshot_download(model_id, local_dir=f"./data/{model_id.replace('/', '_')}")
   ```
4. **Execution Protocol**:
   - Use `VMLQuantOptimizer.convert_to_gguf(repo_path, out_gguf_path)` to generate the GGUF file.
   - Use `VMLQuantOptimizer.import_to_ollama(name, out_gguf_path)` to integrate with Ollama.
   - **MANDATORY**: A task is ONLY complete when the model is imported to Ollama.
   - **FORBIDDEN**: Do not print raw "Tensor" arrays or "Working on CPU" messages as proof of completion. These are "Fake" successes.

## Implementation Patterns & Guidelines

1. **Hardware Awareness (CRITICAL)**:
   - Always assume a **CPU-Only** environment due to low VRAM (128MB).
   - Use `device_map="cpu"` for all Python-based quantization/benchmarking logic.

2. **Quantization Levels**:
   - **Q4_K_M**: Standard starting point.
   - **Q2_K**: Fallback for extremely large models on low system RAM.

3. **In-Memory Pattern**:
   ```python
   # Generic loading for ANY model_id
   from transformers import AutoModelForCausalLM, BitsAndBytesConfig
   quant_config = BitsAndBytesConfig(load_in_4bit=True)
   model = AutoModelForCausalLM.from_pretrained(model_id, quantization_config=quant_config, device_map="cpu")
   ```

## Tools & Resources
- **Helper Script**: `skills/model-quantization/references/quant_helper.py`
- **Benchmarking Tool**: Use `VMLQuantOptimizer.benchmark_speed(model_path)` to show the user the value of the optimization.
