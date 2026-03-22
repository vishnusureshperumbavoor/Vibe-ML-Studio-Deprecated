export type ExecutionMode = 'agent' | 'plan';

export type CellType = 'code' | 'markdown';

export type ExecutionStatus = 'idle' | 'running' | 'success' | 'error' | 'fixing' | 'recovering';

export interface CellData {
  id: string;
  type: CellType;
  content: string;
  output?: string;
  status: ExecutionStatus;
  executionCount?: number;
  lastRun?: number; // Timestamp
}

export interface NotebookResponse {
  cells: CellData[];
  error?: string;
  clarification?: string;
}

export interface GeminiResponse {
  text: string;
  error?: string;
}