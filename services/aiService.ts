import { GeminiResponse } from "../types";

// User provided Kimi API Key
const apiKey = 'sk-93KoByBxOfJdwL9tOIGAIASIf9mNIeU93dyG19DCY2uH48Ol';
const API_URL = 'https://api.moonshot.ai/v1/chat/completions';

const SIMULATOR_SYSTEM_PROMPT = `
You are a Python Code Simulator for a web-based notebook environment.
Your task is to predict/simulate the standard output (stdout) and standard error (stderr) of the provided Python code.

Rules:
1. If the code is simple, execute it mentally and return the output.
2. If the code implies external libraries (pandas, numpy, matplotlib), simulate the likely text output.
3. If the code is a Machine Learning training loop, simulate realistic training logs (e.g., "Epoch 1/10... loss: 0.45...").
4. If the code contains errors, output a realistic Python traceback.
5. DO NOT explain the code. DO NOT wrap the output in markdown code blocks. Return ONLY the raw output string.
6. If the code produces no output, return the string "<No Output>".
`;

async function callKimi(messages: any[], temperature = 0.1) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'moonshot-v1-8k',
      messages: messages,
      temperature: temperature
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'Failed to fetch from Kimi API');
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

export const simulateCodeExecution = async (code: string): Promise<GeminiResponse> => {
  try {
    const output = await callKimi([
      { role: 'system', content: SIMULATOR_SYSTEM_PROMPT },
      { role: 'user', content: `Code to execute:\n${code}` }
    ]);
    return { text: output || '' };
  } catch (error: any) {
    console.error("Kimi Simulation Error:", error);
    return { text: '', error: error.message || "Failed to simulate code execution via Kimi." };
  }
};

export const fixCodeError = async (code: string, error: string): Promise<string> => {
    try {
        let fixedCode = await callKimi([
            { role: 'system', content: "You are an expert Python debugger. Your goal is to fix the provided code so it runs without the specified error. Maintain the original logic as much as possible." },
            { role: 'user', content: `Original Code:\n${code}\n\nError Traceback:\n${error}\n\nFix the code to resolve the error. Return ONLY the fixed python code. No markdown, no explanations.` }
        ]);
        
        // Clean up markdown if model adds it
        fixedCode = fixedCode.replace(/^\`\`\`python\n/, '').replace(/^\`\`\`\n/, '').replace(/\n\`\`\`$/, '');
        return fixedCode;
    } catch (err) {
        console.error("Kimi Auto-fix failed:", err);
        return code;
    }
}

export const generateNotebookStructure = async (prompt: string): Promise<{ cells: { type: 'code' | 'markdown', content: string }[], error?: string }> => {
    try {
        const text = await callKimi([
            { role: 'system', content: `
You are an expert Machine Learning Engineer and Data Scientist.
Your goal is to break down a complex ML task into a logical sequence of Jupyter notebook cells.

Guidelines:
1. Use Markdown cells to explain the steps.
2. Use Python Code cells for implementation (imports, data loading, model definition, training, evaluation).
3. The code should be realistic, using modern libraries (PyTorch, Transformers, Scikit-learn, Pandas).
4. Return the response strictly as a RAW JSON array of objects without markdown backticks.

Output Format (JSON):
[
    { "type": "markdown", "content": "## Step 1: Import Libraries..." },
    { "type": "code", "content": "import torch\nimport pandas as pd" }
]
            `},
            { role: 'user', content: `Create a comprehensive Jupyter notebook for the following task: "${prompt}"` }
        ]);
        
        try {
            // Clean up backticks if kimi wrapped it in ```json ... ```
            const cleanText = text.replace(/^\`\`\`json\n?/, '').replace(/\n?\`\`\`$/, '').trim();
            const cells = JSON.parse(cleanText);
            return { cells };
        } catch (parseError: any) {
            return { cells: [], error: "Kimi generated invalid JSON format: " + text };
        }
    } catch (error: any) {
        console.error("Kimi Generation Error:", error);
        return { cells: [], error: error.message };
    }
}