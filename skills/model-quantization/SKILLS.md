# Model Quantization Skill (VibeML & Ollama Integration)

**Description:** This skill empowers the VML Agent to autonomously download, optimize, and register ANY model from the Hugging Face Hub directly into the local Ollama service.

## Optimization Workflow (MANDATORY STEPS)

1. **Skill Loading**: 
   ```python
   from quant_helper import VMLQuantOptimizer
   ```

2. **Download Protocol (STRICT)**:
   - **FORBIDDEN**: `!git clone`, `!wget`, or manual downloads.
   - **REQUIRED**: Use `huggingface_hub.snapshot_download` to the `./data/` subfolder.
   ```python
   import huggingface_hub
   repo_path = huggingface_hub.snapshot_download(model_id, local_dir=f"./data/{model_id.replace('/', '_')}")
   ```

3. **GGUF Conversion**:
   - Use `VMLQuantOptimizer.convert_to_gguf(repo_path, out_gguf_path)` to generate the model file.

4. **Ollama Registration (CRITICAL)**:
   - **A task is NOT complete until the model is registered in Ollama.**
   - Use `VMLQuantOptimizer.import_to_ollama(model_name, gguf_path)` to perform the registration.
   - **Pattern**: `results = VMLQuantOptimizer.import_to_ollama("MyModel-VML", "./data/model.gguf")`

5. **Verification**:
   - After registration, run `ollama list` using `subprocess` or `!ollama list` to confirm the model is available for the Chat UI.

## Implementation Guidelines

- **Hardware**: Always assume a **CPU-Only** environment.
- **Paths**: Use relative paths from the root (e.g., `./data/...`).
- **Cleaning**: Ensure `Modelfile.temp` is removed after registration (handled automatically by `import_to_ollama`).

## Benchmarking
Before concluding, use `VMLQuantOptimizer.benchmark_speed(model_path)` to provide the user with a performance report (Tokens Per Second).
