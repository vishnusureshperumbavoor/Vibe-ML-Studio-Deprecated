import { NotebookResponse, GeminiResponse, ExecutionMode } from "../types";

// API Key from environment variables
const apiKey = import.meta.env.VITE_KIMI_API_KEY;
const API_URL = 'https://api.moonshot.ai/v1/chat/completions';

async function callKimi(messages: any[], temperature = 0.1) {
  const maxRetries = 4; // Increased retries for Tier 2 handling
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'moonshot-v1-32k', // Upgraded to 32k for Tier 2 stability
          messages: messages,
          temperature: temperature
        })
      });

      // Handle Rate Limiting (429) specifically as suggested by Kimi K2
      if (response.status === 429) {
        attempt++;
        if (attempt > maxRetries) throw new Error("Kimi API Rate limit exceeded. Please wait a moment.");
        
        // Exponential backoff: 2s, 4s, 8s... + random jitter
        const delay = Math.pow(2, attempt) * 1000 + (Math.random() * 500); 
        console.warn(`[Kimi Tier 2] Rate limited (429). Retrying in ${Math.round(delay)}ms... (Attempt ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `API Error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;

    } catch (error: any) {
      if (attempt >= maxRetries) throw error;
      attempt++;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

export const simulateCodeExecution = async (code: string): Promise<GeminiResponse> => {
  try {
    const response = await fetch("http://127.0.0.1:2000/execute", {
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
            { role: 'system', content: `
You are an expert Python debugger and autonomous recovery agent. 
Your goal is to fix the provided code so it runs without the specified error.

RECOVERY RULES:
1. If the error is a 'ModuleNotFoundError' or 'ImportError', prepend a '!pip install <package>' line at the very top of the code to fix the environment.
2. Maintain the original logic as much as possible.
3. Return ONLY the fixed python code (including any !pip commands). No markdown, no explanations.
            `},
            { role: 'user', content: `Original Code:\n${code}\n\nError Traceback:\n${error}\n\nFix the code. If a library is missing, add the !pip install line.` }
        ]);
        
        fixedCode = fixedCode.replace(/^\`\`\`python\n/, '').replace(/^\`\`\`\n/, '').replace(/\n\`\`\`$/, '');
        return fixedCode;
    } catch (err) {
        console.error("Kimi Auto-fix failed:", err);
        return code;
    }
}

export const generateNotebookStructure = async (prompt: string, mode: ExecutionMode = 'agent'): Promise<NotebookResponse> => {
    try {
        const systemPrompt = `
You are an expert Machine Learning Engineer. 
Your task is to transform a user request into a Jupyter Notebook structure.

CURRENT MODE: ${mode.toUpperCase()}

INSTRUCTIONS FOR AGENT MODE:
- Generate 4-6 functional cells (Markdown + Python Code).
- The first code cell MUST include any necessary '!pip install' commands.
- Python cells MUST contain actual implementation logic (data loading, model def, plotting), not just placeholders.
- Code must be robust and ready to run.

INSTRUCTIONS FOR PLAN MODE:
- Generate 1-2 detailed Markdown cells ONLY.
- Focus on technical architecture, data strategy, and model requirements.
- DO NOT generate code cells in Plan mode.

AMBIGUITY CHECK:
- If the prompt is too vague (e.g. "Brain"), return a JSON with a "clarification" field instead of cells.

KNOWLEDGE SKILLS:
1. MEDICAL: Use MONAI/Nibabel for 3D tasks. Follow HIPAA (no real PHI).
2. PLATFORMS: Aware of Kaggle, Roboflow, HuggingFace integration.
3. COMMANDS: Can use macros like @segmentation to trigger MONAI templates.

Output Format:
{
  "cells": [
    { "type": "markdown", "content": "## Section Title\nDetailed explanation..." },
    { "type": "code", "content": "!pip install ...\nimport ..." }
  ]
}
OR
{
  "clarification": "I need to know which dataset you want to use for ..."
}

STRICT RULE: Return ONLY raw JSON. No markdown backticks. No conversational filler.
`;

        const text = await callKimi([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `User Prompt: "${prompt}"` }
        ]);
        
        try {
            let cleanResponse = text.replace(/```json/g, '').replace(/```/g, '').trim();

            const startObj = cleanResponse.indexOf('{');
            const endObj = cleanResponse.lastIndexOf('}');
            
            if (startObj === -1 || endObj === -1) {
                if (!cleanResponse.includes('{')) return { cells: [], clarification: cleanResponse };
                throw new Error("No JSON response found.");
            }

            const cleanText = cleanResponse.substring(startObj, endObj + 1);
            const data = JSON.parse(cleanText);
            
            if (data.clarification) return { cells: [], clarification: data.clarification };
            return { cells: data.cells || [] };
        } catch (parseError: any) {
            if (!text.includes('{')) return { cells: [], clarification: text };
            return { cells: [], error: "Format error. Raw: " + text };
        }
    } catch (error: any) {
        return { cells: [], error: error.message };
    }
}