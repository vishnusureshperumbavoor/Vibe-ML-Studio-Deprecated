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
    // Phase 1 achieved: Instead of asking Kimi to simulate, we send it to our FastAPI server!
    const response = await fetch("http://127.0.0.1:8000/execute", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ code })
    });

    if (!response.ok) {
       throw new Error(`Execution server responded with status: ${response.status}`);
    }

    const data = await response.json();
    
    // If Python threw a hardcore Runtime error 
    if (data.is_error && data.raw_error) {
       return { text: data.output || '', error: data.raw_error };
    }

    return { text: data.output || '' };
  } catch (error: any) {
    console.error("Local Execution Connection Error:", error);
    return { text: '', error: "Make sure the FastAPI backend is running! Run: `python server/main.py`\n\nError: " + error.message };
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

CORE RULE: AUTONOMOUS DEPENDENCY MANAGEMENT
If your code requires ANY third-party libraries not in the standard library (e.g., xgboost, librosa, transformers, torch, monai, roboflow, kaggle), you MUST prepend a line at the very top of the FIRST code cell using the following syntax:
!pip install <package_name>
Example: !pip install xgboost scikit-image

KNOWLEDGE SKILLS AVAILABLE:
- Use 'roboflow' SDK for computer vision datasets.
- Use 'datasets' and 'transformers' for HuggingFace data.
- Use 'kaggle' API for tabular data (inject KAGGLE_USERNAME/KAGGLE_KEY from env).
- Use 'monai' and 'DecathlonDataset' for 3D medical images.

Guidelines:
1. Use Markdown cells to explain the steps.
2. Use Python Code cells for implementation.
3. Return the response strictly as a RAW JSON array of objects without markdown backticks.

Output Format (JSON):
[
    { "type": "markdown", "content": "## Step 1: Import Libraries..." },
    { "type": "code", "content": "!pip install xgboost\nimport xgboost as xgb" }
]
            `},
            { role: 'user', content: `Create a comprehensive Jupyter notebook for the following task: "${prompt}"` }
        ]);
        
        try {
            // Robust JSON extraction: Find the first '[' and last ']' to ignore conversational filler
            const startBracket = text.indexOf('[');
            const endBracket = text.lastIndexOf(']');
            
            if (startBracket === -1 || endBracket === -1) {
                throw new Error("No JSON array found in response.");
            }

            const cleanText = text.substring(startBracket, endBracket + 1);
            const cells = JSON.parse(cleanText);
            return { cells };
        } catch (parseError: any) {
            return { cells: [], error: "Kimi generated invalid format. Raw response: " + text };
        }
    } catch (error: any) {
        console.error("Kimi Generation Error:", error);
        return { cells: [], error: error.message };
    }
}