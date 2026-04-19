import os
import gc
from typing import List, Dict, Generator
try:
    from llama_cpp import Llama
except ImportError:
    # Fallback for during installation
    Llama = None

class NativeInferenceManager:
    def __init__(self, models_dir: str):
        self.models_dir = models_dir
        self.current_model: Llama = None
        self.current_model_path = None
        self.current_lora_path = None

    def load_model(self, model_filename: str, lora_path: str = None):
        if Llama is None:
            raise ImportError("llama-cpp-python not installed yet.")

        model_path = os.path.join(self.models_dir, model_filename)
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Base GGUF model not found at {model_path}")

        # Check if we need to reload
        if self.current_model and self.current_model_path == model_path and self.current_lora_path == lora_path:
            return self.current_model
            
        # Ensure lora_path points to the gguf adapter file if it's a directory
        if lora_path and os.path.isdir(lora_path):
            lora_path = os.path.join(lora_path, "adapter.gguf")
            if not os.path.exists(lora_path):
                raise FileNotFoundError(f"GGUF LoRA adapter not found at {lora_path}. You need to convert the safetensors adapter to GGUF format first.")

        print(f"--- Loading Native Model: {model_filename} ---")
        if lora_path:
            print(f"--- Applying LoRA: {lora_path} ---")
        
        # Free memory from previous model
        if self.current_model:
            del self.current_model
            gc.collect()

        # Initialize Llama.cpp engine
        self.current_model = Llama(
            model_path=model_path,
            lora_path=lora_path,
            n_ctx=2048,
            n_threads=os.cpu_count() or 4,
            n_gpu_layers=0, # Force CPU for compatibility
            verbose=False
        )
        self.current_model_path = model_path
        self.current_lora_path = lora_path
        return self.current_model

    def chat_stream(self, messages: List[Dict]):
        if not self.current_model:
            raise RuntimeError("Model not loaded. Call load_model first.")

        # Basic Chat Template for Qwen2 / Llama3 style
        prompt = ""
        for msg in messages:
            role = msg['role']
            content = msg['content']
            if role == 'user':
                prompt += f"<|im_start|>user\n{content}<|im_end|>\n<|im_start|>assistant\n"
            elif role == 'assistant':
                prompt += f"{content}<|im_end|>\n"

        stream = self.current_model(
            prompt,
            max_tokens=1024,
            stop=["<|im_end|>", "<|endoftext|>"],
            stream=True
        )
        
        for chunk in stream:
            text = chunk['choices'][0]['text']
            if text:
                yield text

# Singleton instance
base_dir = os.path.dirname(os.path.abspath(__file__))
native_manager = NativeInferenceManager(os.path.join(base_dir, "models"))
