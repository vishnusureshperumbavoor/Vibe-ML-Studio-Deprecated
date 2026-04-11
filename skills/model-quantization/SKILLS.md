# Model Quantization Skill (Generic & Agent-Driven)

**Description:** This skill empowers the VML Agent to autonomously optimized and compress ANY model from the Hugging Face Hub. It is perfectly designed for **CPU/128MB VRAM** setups.

## Autonomous Optimization Protocol
When a user asks to quantize a model, follow these steps:

1. **Discovery (Generic)**: Use the `model_search` tool if the user provides a vague name. **DO NOT ask for permission** to choose a model unless multiple vastly different choices exist.
2. **Technical Decision (Mandatory)**: 
   - **Always choose GGUF/Ollama** for CPU-only systems (128MB VRAM). 
   - **DO NOT download GPTQ/AWQ versions** as they will fail on CPU.
   - **DO NOT ask for clarification** on formatting choices—autonomous execution is the priority in VML.
3. **Setup**: Load the `<load_skill_resource>{"skill": "model-quantization", "path": "quant_helper.py"}</load_skill_resource>`.
3. **Execution (Any Model)**:
   - Use `huggingface_hub.snapshot_download` to pull the weights.
   - Use `VMLQuantOptimizer` to benchmark and prepare the conversion.
   - **DO NOT hardcode model names**—always use the ID provided in the prompt.
4. **Integration**:
   - Generate a customized `Modelfile`.
   - Run `ollama create` via the `quant_helper` or a subprocess.
5. **Validation**: Test the newly imported model in the notebook to confirm it works.

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
