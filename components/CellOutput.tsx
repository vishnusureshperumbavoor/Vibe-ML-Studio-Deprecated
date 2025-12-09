import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Terminal, AlertCircle } from 'lucide-react';
import { ExecutionStatus } from '../types';

interface CellOutputProps {
  output?: string;
  status: ExecutionStatus;
  executionCount?: number;
  type: 'code' | 'markdown';
}

export const CellOutput: React.FC<CellOutputProps> = ({ output, status, executionCount, type }) => {
  if (type === 'markdown') return null; // Markdown cells render in place or preview mode, usually not separate "output" block like code

  if (status === 'idle' && !output) return null;

  return (
    <div className="mt-2 ml-[0px] md:ml-[3.5rem] relative group">
       {/* Execution Indicator */}
       {status !== 'idle' && (
         <div className="absolute -left-12 top-2 text-xs text-gray-400 font-mono select-none">
            {status === 'running' ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-500" />
            ) : (
                `[${executionCount || ' '}]`
            )}
         </div>
       )}

      {status === 'error' ? (
         <div className="bg-red-50 border-l-4 border-red-500 p-3 text-red-700 font-mono text-sm whitespace-pre-wrap overflow-x-auto rounded-r-sm">
            <div className="flex items-center gap-2 mb-1 text-red-800 font-bold">
                <AlertCircle size={14} />
                <span>Error</span>
            </div>
            {output}
         </div>
      ) : output ? (
        <div className="bg-white p-2 animate-fadeIn">
            <div className="font-mono text-sm text-gray-800 whitespace-pre-wrap overflow-x-auto">
                {output}
            </div>
        </div>
      ) : status === 'success' ? (
        <div className="text-gray-400 italic text-xs p-2">No output</div>
      ) : null}
    </div>
  );
};
