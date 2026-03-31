import { v4 as uuidv4 } from 'uuid';
import { CellData, CellType } from '../types';
import { callKimi, simulateCodeExecution } from './aiService';
import { VIBE_MASTER_AGENT_PROMPT } from './prompts/vibeMasterAgent';

/**
 * VibeAgent handles the dynamic, iterative conversation loop with the LLM.
 * It uses XML tags for tool calling, reasoning, and notebook management.
 */

export interface AgentMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export type AgentToolType = 'execute_python' | 'list_skills' | 'read_file' | 'add_cell' | 'edit_cell';

export interface ToolCall {
    id: string;
    type: AgentToolType;
    input: any;
}

export class VibeAgent {
    private messages: AgentMessage[] = [];
    private onThinking: (text: string) => void;
    private onUpdateCells: (cells: CellData[]) => void;
    private currentCells: CellData[] = [];

    constructor(
        cells: CellData[], 
        onThinking: (text: string) => void, 
        onUpdateCells: (cells: CellData[]) => void
    ) {
        this.currentCells = cells;
        this.onThinking = onThinking;
        this.onUpdateCells = onUpdateCells;
        
        // Initial System Message
        this.messages.push({ role: 'system' as any, content: VIBE_MASTER_AGENT_PROMPT });
    }

    /**
     * The main iterative loop: User Prompt -> [Assistant Thinking -> Tool Call -> Tool Result]* -> Final Answer.
     */
    async process(userPrompt: string) {
        this.messages.push({ role: 'user', content: userPrompt });
        let isDone = false;
        let turns = 0;
        const maxTurns = 15;

        while (!isDone && turns < maxTurns) {
            turns++;
            const response = await callKimi(this.messages as any, 0.2); // Slower temperature for logic
            this.messages.push({ role: 'assistant', content: response });

            // 1. Parse Thinking
            const thinking = this.extractTag(response, 'thinking');
            if (thinking) this.onThinking(thinking);

            // 2. Parse Tool Calls
            const toolUse = this.extractTag(response, 'tool_use');
            if (toolUse) {
                const results = await this.handleToolUse(toolUse);
                this.messages.push({ 
                    role: 'user', 
                    content: `<tool_result>\n${JSON.stringify(results, null, 2)}\n</tool_result>` 
                });
            } else {
                // AUTO-ADD MARKDOWN CELL: If the agent is just talking, sync it to the UI
                const cleanText = response.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').trim();
                if (cleanText) {
                    this.toolAddCell({ type: 'markdown', content: cleanText });
                }
                isDone = true;
            }
        }
    }

    private extractTag(text: string, tag: string): string | null {
        const regex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i');
        const match = text.match(regex);
        return match ? match[1].trim() : null;
    }

    private async handleToolUse(xmlFragment: string): Promise<any> {
        // Very basic XML parser for name and input
        const nameMatch = xmlFragment.match(/<name>([\s\S]*?)<\/name>/);
        const inputMatch = xmlFragment.match(/<input>([\s\S]*?)<\/input>/);

        if (!nameMatch || !inputMatch) {
            return { error: 'Invalid tool use format. Expected <name> and <input> tags.' };
        }

        const name = nameMatch[1].trim() as AgentToolType;
        let input: any;
        try {
            input = JSON.parse(inputMatch[1].trim());
        } catch (e) {
            // Fallback for non-JSON input (e.g. raw code)
            input = inputMatch[1].trim();
        }

        switch (name) {
            case 'execute_python':
                // Extraction: If input is an object, get the 'code' property
                const codeString = typeof input === 'object' ? (input.code || '') : input;
                return await this.toolExecutePython(codeString);
            case 'list_skills':
                return await this.toolListSkills();
            case 'read_file':
                return await this.toolReadFile(input);
            case 'add_cell':
                return this.toolAddCell(input);
            case 'edit_cell':
                return this.toolEditCell(input);
            default:
                return { error: `Unknown tool: ${name}` };
        }
    }

    // --- TOOL IMPLEMENTATIONS ---

    private async toolExecutePython(code: string) {
        if (!code) return { error: 'No code provided to execute.' };
        
        // 1. Create a cell for this execution so the user sees it
        const cellId = uuidv4();
        const newCell: CellData = {
            id: cellId,
            type: 'code',
            content: code,
            status: 'running'
        };
        this.currentCells = [...this.currentCells, newCell];
        this.onUpdateCells(this.currentCells);

        // 2. Proxy to existing execution engine with live updates
        const result = await simulateCodeExecution(code, (partial) => {
            this.currentCells = this.currentCells.map(c => 
                c.id === cellId ? { ...c, output: partial } : c
            );
            this.onUpdateCells(this.currentCells);
        });

        // 3. Update final status
        this.currentCells = this.currentCells.map(c => 
            c.id === cellId ? { 
                ...c, 
                status: result.error ? 'error' : 'success',
                output: result.error || result.text 
            } : c
        );
        this.onUpdateCells(this.currentCells);

        return result;
    }

    private async toolListSkills() {
        try {
            const response = await fetch("http://127.0.0.1:2000/list_skills");
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (e: any) {
            return { error: `Failed to list skills: ${e.message}` };
        }
    }

    private async toolReadFile(path: string) {
        try {
            const response = await fetch("http://127.0.0.1:2000/read_file", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ path })
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (e: any) {
            return { error: `Failed to read file: ${e.message}` };
        }
    }

    private toolAddCell(input: { type: CellType, content: string }) {
        const newCell: CellData = {
            id: uuidv4(),
            type: input.type,
            content: input.content,
            status: 'idle'
        };
        this.currentCells = [...this.currentCells, newCell];
        this.onUpdateCells(this.currentCells);
        return { success: true, cellId: newCell.id };
    }

    private toolEditCell(input: { id: string, content: string }) {
        this.currentCells = this.currentCells.map(c => 
            c.id === input.id ? { ...c, content: input.content } : c
        );
        this.onUpdateCells(this.currentCells);
        return { success: true };
    }
}
