import os
import torch
import gc
import subprocess
from datasets import load_dataset
from transformers import AutoModelForCausalLM, AutoTokenizer, TrainingArguments
from trl import SFTTrainer, SFTConfig
from dotenv import load_dotenv

# Load environment variables for HF_TOKEN
load_dotenv()
hf_token = os.getenv("HF_TOKEN")

# Try importing SFTTrainer, install if missing
try:
    from trl import SFTTrainer
except ImportError:
    print("Installing trl...")
    subprocess.run(["pip", "install", "trl"], check=True)
    from trl import SFTTrainer

model_id = "Qwen/Qwen2-0.5B"
dataset_id = "yahma/alpaca-cleaned"
hardware = "GPU"

# Derive organized directory paths
model_name_part = model_id.split('/')[-1].lower().replace('.', '-')
dataset_name_part = dataset_id.split('/')[-1].lower().replace('.', '-')
model_slug = f"{model_name_part}-{dataset_name_part}-instruct-vml1"
output_dir = f"./data/{model_slug}"

device = "cuda" if torch.cuda.is_available() and hardware == "GPU" else "cpu"

print(f"🚀 Starting Automated SFT Job: {model_id} on {dataset_id}")

# 1. Load Dataset (Limited for initial demonstration)
print("📥 Loading dataset...")
dataset = load_dataset(dataset_id, split="train[:500]", token=hf_token)

# Format function for Alpaca
def format_prompt(example):
    instruction = example.get('instruction', '')
    input_text = example.get('input', '')
    output_text = example.get('output', '')
    # Combined text for SFT
    text = f"Instruction: {instruction}\nInput: {input_text}\nResponse: {output_text}"
    return {"text": text}

dataset = dataset.map(format_prompt)

# 2. Load Tokenizer & Model
print("🧠 Loading tokenizer and model...")
tokenizer = AutoTokenizer.from_pretrained(model_id, token=hf_token)
if tokenizer.pad_token is None:
    tokenizer.pad_token = tokenizer.eos_token

torch_dtype = torch.bfloat16 if device == "cuda" else torch.float32

model = AutoModelForCausalLM.from_pretrained(
    model_id,
    device_map=device,
    torch_dtype=torch_dtype,
    token=hf_token
)

# 3. Setup Training Configuration
print("⚙️ Configuring training parameters...")
sft_config = SFTConfig(
    output_dir=output_dir,
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
    max_length=512 # Changed from max_seq_length in trl 1.1.0
)

# 4. Start Trainer
trainer = SFTTrainer(
    model=model,
    train_dataset=dataset,
    args=sft_config,
    processing_class=tokenizer # Modern way to pass tokenizer
)

print("🔥 Starting training loop...")
trainer.train()

print(f"💾 Saving final model weights to {output_dir}...")
os.makedirs(output_dir, exist_ok=True)
trainer.save_model(output_dir)

print("📦 Packaging model for Ollama...")
# Ollama LoRA support: FROM base, ADAPTER for weights
modelfile_content = f"FROM {model_id}\nADAPTER .\n"
modelfile_path = os.path.join(output_dir, "Modelfile")

with open(modelfile_path, "w") as f:
    f.write(modelfile_content)

print(f"Running 'ollama create {model_slug}' from {modelfile_path}...")
try:
    subprocess.run(["ollama", "create", model_slug, "-f", modelfile_path], check=True)
    print(f"✅ Model successfully imported into Ollama as '{model_slug}'!")
except Exception as e:
    print(f"⚠️ Failed to import into Ollama: {e}")

print("✅ SFT Pipeline Complete.")
