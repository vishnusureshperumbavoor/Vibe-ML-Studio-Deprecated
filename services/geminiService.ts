import { GoogleGenAI } from "@google/genai";
import { GeminiResponse } from "../types";

// Initialize Gemini Client
// In a real app, you might want to handle the case where the key is missing more gracefully in the UI.
const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

const SIMULATOR_SYSTEM_PROMPT = `
You are a Python Code Simulator for a web-based notebook environment.
Your task is to predict/simulate the standard output (stdout) and standard error (stderr) of the provided Python code.

Rules:
1. If the code is simple (print statements, math, logic), execute it mentally and return the output.
2. If the code implies external libraries (pandas, numpy, matplotlib, etc.), simulate the likely text output (e.g., DataFrame info, array printouts).
3. If the code contains errors, output a realistic Python traceback.
4. DO NOT explain the code. DO NOT wrap the output in markdown code blocks (e.g. \`\`\` ). Return ONLY the raw output string.
5. If the code produces no output, return the string "<No Output>".
`;

const GENERATOR_SYSTEM_PROMPT = `
You are an AI programming assistant embedded in a Jupyter-like notebook.
Your goal is to help the user write code or explain concepts.
When asked, provide a concise, helpful response. 
If providing code, formatting it correctly is crucial.
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
        temperature: 0.1, // Low temperature for deterministic output
      }
    });

    return { text: response.text || '' };
  } catch (error: any) {
    console.error("Gemini Simulation Error:", error);
    return { text: '', error: error.message || "Failed to simulate code execution." };
  }
};

export const generateNoteContent = async (prompt: string): Promise<GeminiResponse> => {
    if (!apiKey) {
        return { text: '', error: "API Key is missing." };
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: GENERATOR_SYSTEM_PROMPT,
            }
        });
        return { text: response.text || '' };
    } catch (error: any) {
        console.error("Gemini Generation Error:", error);
        return { text: '', error: error.message };
    }
}
