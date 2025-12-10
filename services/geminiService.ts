import { GoogleGenAI } from "@google/genai";
import { GeminiResponse } from "../types";

// Initialize Gemini Client
const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

const SIMULATOR_SYSTEM_PROMPT = `
You are a Python Code Simulator for a web-based notebook environment.
Your task is to predict/simulate the standard output (stdout) and standard error (stderr) of the provided Python code.

Rules:
1. If the code is simple (print statements, math, logic), execute it mentally and return the output.
2. If the code implies external libraries (pandas, numpy, matplotlib, etc.), simulate the likely text output (e.g., DataFrame info, array printouts).
3. If the code is a Machine Learning training loop (PyTorch, TensorFlow, HuggingFace), simulate realistic training logs (e.g., "Epoch 1/10... loss: 0.45... accuracy: 0.82").
4. If the code contains errors, output a realistic Python traceback.
5. DO NOT explain the code. DO NOT wrap the output in markdown code blocks. Return ONLY the raw output string.
6. If the code produces no output, return the string "<No Output>".
`;

export const simulateCodeExecution = async (code: string): Promise<GeminiResponse> => {
  if (!apiKey) {
    return { text: '', error: "API Key is missing. Please check your environment variables." };
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Code to execute:\n${code}`,
      config: {
        systemInstruction: SIMULATOR_SYSTEM_PROMPT,
        temperature: 0.1,
      }
    });

    return { text: response.text || '' };
  } catch (error: any) {
    console.error("Gemini Simulation Error:", error);
    return { text: '', error: error.message || "Failed to simulate code execution." };
  }
};

export const fixCodeError = async (code: string, error: string): Promise<string> => {
    if (!apiKey) return code;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Original Code:\n${code}\n\nError Traceback:\n${error}\n\nFix the code to resolve the error. Return ONLY the fixed python code. No markdown, no explanations.`,
            config: {
                systemInstruction: "You are an expert Python debugger. Your goal is to fix the provided code so it runs without the specified error. Maintain the original logic as much as possible.",
                temperature: 0.1
            }
        });
        
        let fixedCode = response.text || code;
        // Clean up markdown if model adds it despite instructions
        fixedCode = fixedCode.replace(/^```python\n/, '').replace(/^```\n/, '').replace(/\n```$/, '');
        return fixedCode;
    } catch (err) {
        console.error("Auto-fix failed:", err);
        return code;
    }
}

export const generateNotebookStructure = async (prompt: string): Promise<{ cells: { type: 'code' | 'markdown', content: string }[], error?: string }> => {
    if (!apiKey) {
        return { cells: [], error: "API Key is missing." };
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Create a comprehensive Jupyter notebook for the following task: "${prompt}"`,
            config: {
                systemInstruction: `
                    You are an expert Machine Learning Engineer and Data Scientist.
                    Your goal is to break down a complex ML task into a logical sequence of Jupyter notebook cells.
                    
                    Guidelines:
                    1. Use Markdown cells to explain the steps, theory, or analysis.
                    2. Use Python Code cells for implementation (imports, data loading, model definition, training, evaluation).
                    3. The code should be realistic, using modern libraries (PyTorch, Transformers, Scikit-learn, Pandas).
                    4. Ensure the flow is step-by-step. Do not put everything in one huge cell. Split it up.
                    5. Return the response as a JSON array of objects.
                    
                    Output Format (JSON):
                    [
                      { "type": "markdown", "content": "## Step 1: Import Libraries..." },
                      { "type": "code", "content": "import torch\nimport ..." }
                    ]
                `,
                responseMimeType: "application/json"
            }
        });
        
        const text = response.text || '[]';
        const cells = JSON.parse(text);
        return { cells };
    } catch (error: any) {
        console.error("Gemini Generation Error:", error);
        return { cells: [], error: error.message };
    }
}