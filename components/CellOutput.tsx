import React from 'react';
import { AlertCircle } from 'lucide-react';
import { ExecutionStatus } from '../types';

interface CellOutputProps {
  output?: string;
  status: ExecutionStatus;
  executionCount?: number;
  type: 'code' | 'markdown';
}

export const CellOutput: React.FC<CellOutputProps> = ({ output, status, executionCount, type }) => {
  if (type === 'markdown') return null; 

  if (status === 'idle' && !output) return null;

  return (
    <div className="mt-2 ml-[0px] md:ml-[3.5rem] relative group">
       {/* Execution Indicator */}
       {status !== 'idle' && (
         <div className="absolute -left-12 top-2 text-xs text-notebook-textMuted font-mono select-none">
            {status === 'running' ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-notebook-cellBorder border-t-blue-500" />
            ) : (
                `[${executionCount || ' '}]`
            )}
         </div>
       )}

      {status === 'error' ? (
         <div className="bg-red-900/20 border-l-4 border-red-500 p-3 text-red-200 font-mono text-sm whitespace-pre-wrap overflow-x-auto rounded-r-sm">
            <div className="flex items-center gap-2 mb-1 text-red-400 font-bold">
                <AlertCircle size={14} />
                <span>Error</span>
            </div>
            {output}
         </div>
      ) : output ? (
        <div className="p-2 animate-fadeIn">
            <div className="font-mono text-sm text-notebook-text whitespace-pre-wrap overflow-x-auto">
                {output}
            </div>
        </div>
      ) : status === 'success' ? (
        <div className="text-gray-600 italic text-xs p-2">No output</div>
      ) : null}
    </div>
  );
};