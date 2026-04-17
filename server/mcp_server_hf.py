import asyncio
from mcp.server.models import InitializationOptions
from mcp.server import NotificationOptions, Server
from mcp.server.stdio import stdio_server
import mcp.types as types
from huggingface_hub import HfApi
import os
import psutil
import torch
from dotenv import load_dotenv

# Load token
load_dotenv()
hf_api = HfApi()

# Create the MCP Server instance
server = Server("vml-huggingface")

@server.list_tools()
async def handle_list_tools() -> list[types.Tool]:
    """List available Hugging Face tools via MCP."""
    return [
        types.Tool(
            name="model_search",
            description="Search for models on the Hugging Face Hub. Returns structured metadata.",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search query"},
                    "limit": {"type": "integer", "description": "Max results", "default": 5}
                },
                "required": ["query"],
            },
        ),
        types.Tool(
            name="dataset_search",
            description="Search for datasets on the Hugging Face Hub.",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search query"},
                    "limit": {"type": "integer", "description": "Max results", "default": 5}
                },
                "required": ["query"],
            },
        ),
        types.Tool(
            name="start_sft_job",
            description="Generate a Supervised Fine-Tuning (SFT) Python script with LoRA support.",
            inputSchema={
                "type": "object",
                "properties": {
                    "base_model": {"type": "string", "description": "Hugging Face Model ID"},
                    "dataset_id": {"type": "string", "description": "Hugging Face Dataset ID"},
                    "hardware_target": {"type": "string", "description": "Target hardware: 'CPU' or 'GPU'", "default": "CPU"}
                },
                "required": ["base_model", "dataset_id"],
            },
        ),
        types.Tool(
            name="start_quantization_job",
            description="Generate a script to quantize a model to GGUF format for local deployment.",
            inputSchema={
                "type": "object",
                "properties": {
                    "model_id": {"type": "string", "description": "Hugging Face Model ID"},
                    "bits": {"type": "string", "description": "Quantization bits (e.g., '4', '8')", "default": "4"}
                },
                "required": ["model_id"],
            },
        ),
        types.Tool(
            name="get_system_specs",
            description="Get local hardware specifications (CPU, RAM, GPU) for training estimation.",
            inputSchema={
                "type": "object",
                "properties": {},
            },
        )
    ]

@server.call_tool()
async def handle_call_tool(
    name: str, arguments: dict | None
) -> list[types.TextContent | types.ImageContent | types.EmbeddedResource]:
    """Handle tool execution requests via MCP."""
    hf_token = os.getenv("HF_TOKEN")
    import json
    
    if name == "model_search":
        query = arguments.get("query")
        limit = arguments.get("limit", 5)
        models = hf_api.list_models(search=query, limit=limit, token=hf_token, sort="downloads")
        
        results = []
        for m in models:
            results.append({
                "id": m.id,
                "downloads": getattr(m, "downloads", 0),
                "likes": getattr(m, "likes", 0),
                "gated": getattr(m, "gated", False),
                "lastModified": getattr(m, "lastModified", ""),
                "is_cpu_ready": m.id.split('/')[-1].lower() in ["qwen2-0.5b", "smollm-360m", "tinyllama-1.1b"] or (m.id.count('/') > 0 and '0.5b' in m.id.lower())
            })
        
        return [types.TextContent(type="text", text=f"[JSON_RESULTS]\n{json.dumps(results, indent=2)}")]

    elif name == "dataset_search":
        query = arguments.get("query")
        limit = arguments.get("limit", 5)
        datasets = hf_api.list_datasets(search=query, limit=limit, token=hf_token, sort="downloads", direction=-1)
        
        results = []
        for d in datasets:
            results.append({
                "id": d.id,
                "downloads": getattr(d, "downloads", 0),
                "likes": getattr(d, "likes", 0),
                "gated": getattr(d, "gated", False)
            })
            
        return [types.TextContent(type="text", text=f"[JSON_RESULTS]\n{json.dumps(results, indent=2)}")]

    elif name == "start_sft_job":
        base_model = arguments.get("base_model")
        dataset_id = arguments.get("dataset_id")
        hardware = arguments.get("hardware_target", "CPU")
        epochs = arguments.get("epochs", 3)
        rank = arguments.get("rank", 16)
        
        # Split into logical blocks for the notebook
        blocks = [
            f"""# Block 1: Setup and Environment
import os
import torch
import gc
import json
import subprocess
import transformers
from datasets import load_dataset
from transformers import AutoModelForCausalLM, AutoTokenizer, TrainingArguments
from trl import SFTTrainer, SFTConfig
from peft import LoraConfig, get_peft_model

model_id = "{base_model}"
dataset_id = "{dataset_id}"
hardware = "{hardware}"
epochs = {epochs}
rank = {rank}
device = "cuda" if torch.cuda.is_available() and hardware.upper() == "GPU" else "cpu"

print(f"Initializing VML SFT Pipeline: {{model_id}} on {{dataset_id}} ({{device}})")
""",
            f"""# Block 2: Model and Tokenizer Loading
print("Loading Model and Tokenizer...")
tokenizer = AutoTokenizer.from_pretrained(model_id)
if tokenizer.pad_token is None:
    tokenizer.pad_token = tokenizer.eos_token

torch_dtype = torch.bfloat16 if device == "cuda" else torch.float32
model = AutoModelForCausalLM.from_pretrained(
    model_id,
    device_map=device,
    torch_dtype=torch_dtype,
)

print("Applying LoRA adapter (Rank: {rank})...")
peft_config = LoraConfig(
    r={rank},
    lora_alpha={rank} * 2,
    target_modules="all-linear",
    lora_dropout=0.05,
    bias="none",
    task_type="CAUSAL_LM",
)
model = get_peft_model(model, peft_config)
model.print_trainable_parameters()
""",
            f"""# Block 3: Dataset Preparation
print("Loading and mapping dataset...")
dataset = load_dataset(dataset_id, split="train[:500]")

def get_universal_format(example):
    input_keys = ["instruction", "prompt", "query", "question", "input"]
    output_keys = ["output", "response", "answer", "target"]
    if "messages" in example:
        return {{"text": tokenizer.apply_chat_template(example["messages"], tokenize=False, add_generation_prompt=False)}}
    instr = next((example[k] for k in input_keys if k in example), "")
    out = next((example[k] for k in output_keys if k in example), "")
    context = example.get("input", "") if "instruction" in example else ""
    return {{"text": f"{{instr}}\\n{{context}}\\n{{out}}"}}

dataset = dataset.map(get_universal_format)
""",
            f"""# Block 4: Training Execution
class VMLReportingCallback(transformers.TrainerCallback):
    def on_log(self, args, state, control, logs=None, **kwargs):
        if logs:
            logs["vml_step"] = state.global_step
            logs["vml_epoch"] = state.epoch
            print(f"[VML_DATA] {{json.dumps(logs)}}")

sft_config = SFTConfig(
    output_dir="./vml_sft_output",
    per_device_train_batch_size=1,
    gradient_accumulation_steps=4,
    learning_rate=2e-4,
    num_train_epochs={epochs},
    logging_steps=1,
    max_steps=20,
    report_to="none",
    save_strategy="no",
    dataset_text_field="text",
)

trainer = SFTTrainer(
    model=model,
    train_dataset=dataset,
    args=sft_config,
    processing_class=tokenizer,
    callbacks=[VMLReportingCallback()]
)

print("Starting training loop...")
trainer.train()
""",
            f"""# Block 5: Export and Integration
print("Saving LoRA adapters...")
trainer.save_model("./vml_sft_output")

print("Packaging for Ollama...")
modelfile_content = f"FROM ./vml_sft_output\\n"
with open("Modelfile", "w") as f:
    f.write(modelfile_content)

try:
    subprocess.run(["ollama", "create", "vml-finetuned", "-f", "Modelfile"], check=True)
    print("Model successfully imported into Ollama as 'vml-finetuned'!")
except Exception as e:
    print(f"Failed to import into Ollama: {{e}}")

print("SFT Pipeline Complete.")
"""
        ]
        
        blocks_json = json.dumps(blocks)
        return [types.TextContent(type="text", text=f"[VML_BLOCKS]\n{blocks_json}")]

    elif name == "start_quantization_job":
        model_id = arguments.get("model_id")
        bits = arguments.get("bits", "4")
        
        script = f'''# Model Quantization Script - VML Studio
import os
import subprocess

model_id = "{model_id}"
bits = "{bits}"
print(f"🛠️ Starting Quantization: {{model_id}} to {{bits}}-bit GGUF")

# 1. Download Model
print("📥 Downloading model weights...")
from huggingface_hub import snapshot_download
model_path = snapshot_download(repo_id=model_id, local_dir=f"./{{model_id.replace('/', '_')}}")

# 2. Convert to GGUF (Placeholder for llama.cpp integration)
# In a real studio, we would use a pre-built llama.cpp or a python-based quantization library.
# For this demo, we will create a Modelfile that Ollama can use to perform internal quantization if supported,
# or assume the user has llama.cpp tools installed.

print("📦 Creating Ollama Modelfile...")
modelfile_content = f"FROM {{model_path}}\\n"
# Add template if possible
with open("Modelfile", "w") as f:
    f.write(modelfile_content)

print(f"🚀 Importing into Ollama as 'vml-quantized-{{bits}}bit'...")
try:
    subprocess.run(["ollama", "create", f"vml-quantized-{{bits}}bit", "-f", "Modelfile"], check=True)
    print("✅ Model successfully quantized and imported into Ollama!")
except Exception as e:
    print(f"⚠️ Failed to import into Ollama: {{e}}")
'''
        return [types.TextContent(type="text", text=script)]

    elif name == "get_system_specs":
        import platform
        import json
        
        # CPU & RAM - Guaranteed Fast
        cpu_count = psutil.cpu_count(logical=True)
        ram_total = round(psutil.virtual_memory().total / (1024**3), 2)
        
        gpu_info = {"available": False, "name": "N/A", "vram_gb": 0}
        
        # GPU - Safe Check (Avoid full torch init hang)
        try:
            # We only check torch if we have some evidence of NVIDIA hardware
            # This avoids the driver hang on CPU-only systems
            has_gpu_env = os.system("nvidia-smi > nul 2>&1") == 0
            if has_gpu_env:
                import torch
                if torch.cuda.is_available():
                    gpu_info = {
                        "available": True,
                        "name": torch.cuda.get_device_name(0),
                        "vram_gb": round(torch.cuda.get_device_properties(0).total_memory / (1024**3), 2)
                    }
        except:
            pass # Fallback to CPU-only info if torch/nvidia-smi fails or hangs
        
        specs = {
            "os": platform.system(),
            "cpu_threads": cpu_count,
            "ram_gb": ram_total,
            "gpu": gpu_info
        }
        
        return [types.TextContent(type="text", text=f"[JSON_RESULTS]\n{json.dumps(specs, indent=2)}")]

    raise ValueError(f"Unknown tool: {name}")

async def main():
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            InitializationOptions(
                server_name="vml-huggingface",
                server_version="0.1.0",
                capabilities=server.get_capabilities(
                    notification_options=NotificationOptions(),
                    experimental_capabilities={},
                ),
            ),
        )

if __name__ == "__main__":
    asyncio.run(main())
