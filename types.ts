export type CellType = 'code' | 'markdown';

export type ExecutionStatus = 'idle' | 'running' | 'success' | 'error';

export interface CellData {
  id: string;
  type: CellType;
  content: string;
  output?: string;
  status: ExecutionStatus;
  executionCount?: number;
  lastRun?: number; // Timestamp
}

export interface GeminiResponse {
  text: string;
  error?: string;
}
