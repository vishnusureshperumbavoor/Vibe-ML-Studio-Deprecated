import React from 'react';
import { AlertCircle, Wand2 } from 'lucide-react';
import { ExecutionStatus } from '../types';

interface CellOutputProps {
  output?: string;
  status: ExecutionStatus;
  executionCount?: number;
  type: 'code' | 'markdown';
}

export const CellOutput: React.FC<CellOutputProps> = ({ output, status, type }) => {
  if (type === 'markdown') return null; 

  // If there's no output and we're not in a special state (fixing/error), don't render anything
  if (!output && status !== 'error' && status !== 'fixing') return null;

  return (
    <div className="mt-2 w-full animate-fadeIn">
      {/* Auto-Fixing Banner */}
      {status === 'fixing' && (
          <div className="mb-2 bg-purple-900/20 border-l-2 border-purple-500 p-2 text-purple-200 text-sm font-mono flex items-center gap-2 rounded-r-sm animate-pulse">
              <Wand2 size={14} />
              <span>Auto-Fixing detected error...</span>
          </div>
      )}

      {/* Error Output */}
      {status === 'error' || (status === 'fixing' && output) ? (
         <div className="bg-red-900/20 border-l-2 border-red-500 p-3 text-red-200 font-mono text-xs md:text-sm whitespace-pre-wrap overflow-x-auto rounded-r-sm">
            <div className="flex items-center gap-2 mb-1 text-red-400 font-bold uppercase tracking-wider text-[10px]">
                <AlertCircle size={12} />
                <span>Traceback</span>
            </div>
            {output}
         </div>
      ) : output ? (
        // Standard Output
        <div className="pt-2 border-t border-notebook-cellBorder/50">
            <div className="font-mono text-sm text-notebook-text whitespace-pre-wrap overflow-x-auto max-h-96 custom-scrollbar opacity-90">
                {output}
            </div>
        </div>
      ) : null}
    </div>
  );
};