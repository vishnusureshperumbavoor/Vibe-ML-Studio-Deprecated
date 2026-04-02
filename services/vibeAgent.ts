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

export type AgentToolType = 'get_skill' | 'execute_python' | 'list_skills' | 'read_file' | 'add_cell' | 'edit_cell';

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
        const maxTurns = 20;

        while (!isDone && turns < maxTurns) {
            turns++;
            const response = await callKimi(this.messages as any, 0.2); 
            this.messages.push({ role: 'assistant', content: response });

            // 1. Parse Thinking
            const thinking = this.extractTag(response, 'thinking');
            if (thinking) this.onThinking(thinking);

            // 2. Fuzzy Multi-Tool Extraction (Allows direct tags like <add_cell>)
            let toolResults: any[] = [];
            
            // Format A: Standard Wrapper <tool_use><name>X</name><input>Y</input></tool_use>
            const wrappedRegex = /<tool_use>([\s\S]*?)<\/tool_use>/gi;
            let m;
            while ((m = wrappedRegex.exec(response)) !== null) {
                const results = await this.handleWrappedTool(m[1]);
                toolResults.push(results);
            }

            // Format B: Direct Tool Tags like <add_cell>{...}</add_cell>
            const toolNames: AgentToolType[] = ['add_cell', 'edit_cell', 'execute_python', 'get_skill', 'read_file', 'list_skills'];
            for (const tName of toolNames) {
                const tagRegex = new RegExp(`<${tName}>([\\s\\S]*?)<\\/${tName}>`, 'gi');
                let tm;
                while ((tm = tagRegex.exec(response)) !== null) {
                    const inputStr = tm[1].trim();
                    const input = this.parseInput(inputStr);
                    const res = await this.dispatchTool(tName, input);
                    toolResults.push(res);
                }
            }

            if (toolResults.length > 0) {
                this.messages.push({ 
                    role: 'user', 
                    content: `<tool_results>\n${JSON.stringify(toolResults, null, 2)}\n</tool_results>` 
                });
            } else {
                // FALLBACK: Auto-promote reasoning if no cells exist yet
                const chatText = response.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').replace(/<[\s\S]*?>/g, '').trim();
                const thinkingText = thinking ? thinking.replace(/<[\s\S]*?>/g, '').trim() : '';
                const finalCellContent = chatText || (this.currentCells.length === 0 ? thinkingText : '');

                if (finalCellContent) {
                    this.toolAddCell({ type: 'markdown', content: finalCellContent });
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

    private parseInput(text: string): any {
        // Attempt to extract content from internal tags if it's not raw JSON
        if (text.includes('<type>') && text.includes('<content>')) {
            const type = this.extractTag(text, 'type') as any;
            const content = this.extractTag(text, 'content');
            if (type && content) return { type, content };
        }
        try {
            return JSON.parse(text);
        } catch (e) {
            return text; 
        }
    }

    private async handleWrappedTool(xmlFragment: string): Promise<any> {
        const nameMatch = xmlFragment.match(/<name>([\s\S]*?)<\/name>/);
        const inputMatch = xmlFragment.match(/<input>([\s\S]*?)<\/input>/);
        if (!nameMatch || !inputMatch) return { error: 'Invalid tool_use structure.' };
        return await this.dispatchTool(nameMatch[1].trim() as any, this.parseInput(inputMatch[1]));
    }

    private async dispatchTool(name: AgentToolType, input: any): Promise<any> {
        switch (name) {
            case 'get_skill':
                const skillName = typeof input === 'object' ? (input.name || '') : input;
                return await this.toolReadFile(`skills/${skillName}/SKILLS.md`);
            case 'execute_python':
                const codeString = typeof input === 'object' ? (input.code || '') : input;
                return await this.toolExecutePython(codeString);
            case 'read_file':
                const filePath = typeof input === 'object' ? (input.path || input.file || '') : input;
                return await this.toolReadFile(filePath);
            case 'add_cell':
                return this.toolAddCell(input);
            case 'edit_cell':
                return this.toolEditCell(input);
            case 'list_skills':
                return await this.toolListSkills();
            default:
                return { error: `Unknown tool: ${name}` };
        }
    }

    private async toolExecutePython(code: string) {
        if (!code) return { error: 'No code provided.' };
        const cellId = uuidv4();
        const newCell: CellData = { id: cellId, type: 'code', content: code, status: 'running' };
        this.currentCells = [...this.currentCells, newCell];
        this.onUpdateCells(this.currentCells);

        const result = await simulateCodeExecution(code, (partial) => {
            this.currentCells = this.currentCells.map(c => c.id === cellId ? { ...c, output: partial } : c);
            this.onUpdateCells(this.currentCells);
        });

        this.currentCells = this.currentCells.map(c => 
            c.id === cellId ? { ...c, status: result.error ? 'error' : 'success', output: result.error || result.text } : c
        );
        this.onUpdateCells(this.currentCells);
        return result;
    }

    private async toolListSkills() {
        try {
            const resp = await fetch("http://127.0.0.1:2000/list_skills");
            return await resp.json();
        } catch (e: any) { 
            return { error: e.message };
        }
    }

    private async toolReadFile(path: string) {
        if (!path) return { error: 'Empty path.' };
        try {
            const resp = await fetch("http://127.0.0.1:2000/read_file", {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path })
            });
            return await resp.json();
        } catch (e: any) { 
            return { error: e.message };
        }
    }

    private toolAddCell(input: { type: CellType, content: string }) {
        const newCell: CellData = { id: uuidv4(), type: input.type, content: input.content, status: 'idle' };
        this.currentCells = [...this.currentCells, newCell];
        this.onUpdateCells(this.currentCells);
        return { success: true, cellId: newCell.id };
    }

    private toolEditCell(input: { id: string, content: string }) {
        this.currentCells = this.currentCells.map(c => c.id === input.id ? { ...c, content: input.content } : c);
        this.onUpdateCells(this.currentCells);
        return { success: true };
    }
}
