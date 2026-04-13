When diving into the world of LLM compression and pruning, researchers broadly split techniques into Unstructured Pruning (randomly zeroing out individual weights) and Structured Pruning (completely deleting entire rows, columns, or layers from the neural network).

Here is a breakdown of the other major cutting-edge techniques and toolkits out there right now:

1. Structural Pruning (The Holy Grail)
Unstructured methods (like Wanda and SparseGPT) change numbers to 0, but your computer still has to load that 0 into memory unless you have highly specialized hardware. Structural pruning literally deletes the math, guaranteeing instant speedups on any hardware.

SliceGPT: Instead of deleting random neurons, SliceGPT applies orthogonal transformations to the network's matrices, allowing it to take a digital "chainsaw" and cleanly slice off 20-30% of the entire model's infrastructure while barely hurting its intelligence.
LLM-Pruner: Analyzes the gradients of the model and identifies redundant "modules" (entire attention heads or MLP sets). It structurally deletes them and then uses a tiny bit of LoRA fine-tuning to quickly patch up the brain damage.
Layer Dropping / Depth Pruning: An extremely aggressive approach where you simply delete the last 10 layers of a 32-layer LLM and then fine-tune it to recover the lost logic. Surprisingly effective for shrinking massive models.
2. State-of-the-Art Toolkits & Frameworks
If you are writing code, you rarely build the math from scratch. You pull from these ecosystems:

Neural Magic (SparseML / mamba): As you noted, this is the current industry leader. They own the SparseGPT implementations and provide tools that natively convert pruned models into DeepSparse formats so CPUs and GPUs can actually run them faster.
Torch.prune (Native PyTorch): PyTorch has built-in primitives (torch.nn.utils.prune) for standard L1/L2 magnitude pruning. It's the easiest to write, but highly ineffective on modern LLMs without extensive retraining.
OpenAssistant / Hugging Face PEFT: While technically meant for fine-tuning, you can combine HuggingFace's PEFT (LoRA) library with pruning to create "Sparse-LoRA" workflows, trimming the model and healing it via LoRA adapters concurrently.
3. The "Cousins" of Pruning (Advanced Quantization)
Often, people who want to prune are better served by the absolute cutting edge of Quantization, which uses the exact same calibration math as SparseGPT:

AWQ (Activation-aware Weight Quantization): Observes which weights are responsible for the most important "activations" during a prompt, and protects those weights while aggressively squishing the rest.
GPTQ: Post-training quantization that uses the Inverse Hessian matrix math (similar to SparseGPT) to extremely compress models to 4-bit, 3-bit, or even 2-bit sizes while maintaining coherence.
If we are mapping out the next skill for your VML Studio, SliceGPT is incredibly exciting because it physically shrinks the matrix sizes (meaning standard Hugging Face loaders instantly run it faster without needing special Sparse engines), while SparseML provides the most robust enterprise tools.