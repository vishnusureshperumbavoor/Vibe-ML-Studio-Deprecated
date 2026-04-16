import asyncio
from mcp.server.models import InitializationOptions
from mcp.server import NotificationOptions, Server
from mcp.server.stdio import stdio_server
import mcp.types as types
from huggingface_hub import HfApi
import os
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
            description="Search for models on the Hugging Face Hub.",
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
            description="Generate a Supervised Fine-Tuning (SFT) Python script for a given model and dataset. The returned script should then be executed by the VibeML execution engine.",
            inputSchema={
                "type": "object",
                "properties": {
                    "base_model": {"type": "string", "description": "Hugging Face Model ID (e.g., Qwen/Qwen2-0.5B)"},
                    "dataset_id": {"type": "string", "description": "Hugging Face Dataset ID (e.g., yahma/alpaca-cleaned)"},
                    "hardware_target": {"type": "string", "description": "Target hardware: 'CPU' or 'GPU'", "default": "CPU"}
                },
                "required": ["base_model", "dataset_id"],
            },
        )
    ]

@server.call_tool()
async def handle_call_tool(
    name: str, arguments: dict | None
) -> list[types.TextContent | types.ImageContent | types.EmbeddedResource]:
    """Handle tool execution requests via MCP."""
    hf_token = os.getenv("HF_TOKEN")
    
    if name == "model_search":
        query = arguments.get("query")
        limit = arguments.get("limit", 5)
        models = hf_api.list_models(search=query, limit=limit, token=hf_token)
        results = [f"- **{m.id}** (Downloads: {getattr(m, 'downloads', 'N/A')})" for m in models]
        text = "\n".join(results) or "No models found."
        return [types.TextContent(type="text", text=text)]

    elif name == "dataset_search":
        query = arguments.get("query")
        limit = arguments.get("limit", 5)
        datasets = hf_api.list_datasets(search=query, limit=limit, token=hf_token)
        results = [f"- **{d.id}** (Downloads: {getattr(d, 'downloads', 'N/A')})" for d in datasets]
        text = "\n".join(results) or "No datasets found."
        return [types.TextContent(type="text", text=text)]

    elif name == "start_sft_job":
        base_model = arguments.get("base_model")
        dataset_id = arguments.get("dataset_id")
        hardware = arguments.get("hardware_target", "CPU")
        
        script = f'''# Universal SFT Training Script - VML Studio
import os
import torch
import gc
import subprocess
from datasets import load_dataset
from transformers import AutoModelForCausalLM, AutoTokenizer, TrainingArguments
from trl import SFTTrainer, SFTConfig

model_id = "{base_model}"
dataset_id = "{dataset_id}"
hardware = "{hardware}"
device = "cuda" if torch.cuda.is_available() and hardware.upper() == "GPU" else "cpu"

print(f"🚀 Initializing Universal SFT: {{model_id}} on {{dataset_id}} ({{device}})")

# 1. Load Tokenizer & Model
tokenizer = AutoTokenizer.from_pretrained(model_id)
if tokenizer.pad_token is None:
    tokenizer.pad_token = tokenizer.eos_token

torch_dtype = torch.bfloat16 if device == "cuda" else torch.float32
model = AutoModelForCausalLM.from_pretrained(
    model_id,
    device_map=device,
    torch_dtype=torch_dtype,
)

# 2. Dynamic Dataset Discovery
print("📥 Loading and mapping dataset...")
dataset = load_dataset(dataset_id, split="train[:1000]")

def get_universal_format(example):
    """Dynamic column mapping for model-agnostic SFT"""
    # Potential keys for various dataset styles
    input_keys = ["instruction", "prompt", "query", "question", "input"]
    output_keys = ["output", "response", "answer", "target"]
    
    # 1. Check for Chat Template / Messages format first
    if "messages" in example:
        return {{"text": tokenizer.apply_chat_template(example["messages"], tokenize=False, add_generation_prompt=False)}}
        
    # 2. Map standard Instruction/Output keys
    instr = next((example[k] for k in input_keys if k in example), "")
    out = next((example[k] for k in output_keys if k in example), "")
    
    # Optional secondary input (common in Alpaca)
    context = example.get("input", "") if "instruction" in example else ""
    
    full_text = f"{{instr}}\\n{{context}}\\n{{out}}"
    return {{"text": full_text}}

dataset = dataset.map(get_universal_format)

# 3. Setup SFT Configuration
sft_config = SFTConfig(
    output_dir="./vml_sft_output",
    per_device_train_batch_size=1,
    gradient_accumulation_steps=4,
    learning_rate=2e-4,
    num_train_epochs=1,
    use_cpu=(device == "cpu"),
    logging_steps=5,
    max_steps=20, # Short run for testing
    report_to="none",
    save_strategy="no",
    dataset_text_field="text",
    max_length=512
)

# 4. Start Trainer
trainer = SFTTrainer(
    model=model,
    train_dataset=dataset,
    args=sft_config,
    processing_class=tokenizer
)

print("🔥 Starting training loop...")
trainer.train()

print("💾 Saving and Packaging for Ollama...")
trainer.save_model("./vml_sft_output")

modelfile_content = f"FROM ./vml_sft_output\\n"
with open("Modelfile", "w") as f:
    f.write(modelfile_content)

try:
    subprocess.run(["ollama", "create", "vml-finetuned", "-f", "Modelfile"], check=True)
    print("✅ Model successfully imported into Ollama as 'vml-finetuned'!")
except Exception as e:
    print(f"⚠️ Failed to import into Ollama: {{e}}")

print("✅ SFT Pipeline Complete.")
'''
        return [types.TextContent(type="text", text=script)]

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
