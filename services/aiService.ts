import { NotebookResponse, GeminiResponse, ExecutionMode } from "../types";

// User provided Kimi API Key
const apiKey = 'sk-93KoByBxOfJdwL9tOIGAIASIf9mNIeU93dyG19DCY2uH48Ol';
const API_URL = 'https://api.moonshot.ai/v1/chat/completions';

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
        const text = await callKimi([
            { role: 'system', content: `
You are an expert Machine Learning Engineer and Autonomous Agent Architect.
Your goal is to transform a "vibe" into a high-quality Jupyter notebook or request clarification if the input is too ambiguous.

CURRENT MODE: ${mode.toUpperCase()}
- If Mode is 'AGENT': Generate a full executable notebook with code and markdown.
- If Mode is 'PLAN': Generate a high-level technical strategy and architecture plan (Markdown ONLY). Focus on requirements, data flow, and training strategy. Do not generate full code bodies, just a detailed architectural document.

AMBIGUITY CHECK (AGENTIC CLARIFICATION LOOP):
- If the prompt is critically vague, return { "clarification": "..." }.

KNOWLEDGE SKILLS & CONSTRAINTS:
1. AUTONOMOUS DEPENDENCY MANAGEMENT: Use '!pip install <package_name>' at the top of the FIRST code cell.
2. HEALTHCARE RULES: Follow HIPAA privacy rules. No real PHI. Use de-identified data.
3. MEDICAL EXPERTISE: You are aware of specialized agents (Radiology Scientist) and commands (@segmentation) available in the system. Use MONAI for 3D tasks.

Guidelines:
1. Return a RAW JSON object.
2. If Mode is 'PLAN', provide 1-2 detailed markdown cells with the architecture.
3. If Mode is 'AGENT', provide 4-6 functional code/markdown cells.
4. DO NOT use markdown code blocks in the JSON.
            `},
            { role: 'user', content: `Task: "${prompt}"` }
        ]);
        
        try {
            const startObj = text.indexOf('{');
            const endObj = text.lastIndexOf('}');
            
            if (startObj === -1 || endObj === -1) {
                if (!text.includes('{')) return { cells: [], clarification: text };
                throw new Error("No JSON response found.");
            }

            const cleanText = text.substring(startObj, endObj + 1);
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