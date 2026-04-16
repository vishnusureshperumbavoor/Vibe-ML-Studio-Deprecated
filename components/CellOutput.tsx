import React, { useState } from 'react';
import { AlertCircle, Wand2, CheckCircle2, Copy } from 'lucide-react';
import { ExecutionStatus } from '../types';
import { RenderedImage } from './RenderedImage';
import { ProgressBar } from './ProgressBar';
import { HuggingFaceAuth } from './HuggingFaceAuth';

interface CellOutputProps {
  output?: string;
  status: ExecutionStatus;
  executionCount?: number;
  type: 'code' | 'markdown';
}

export const CellOutput: React.FC<CellOutputProps> = ({ output, status, type }) => {
  const [wasCopied, setWasCopied] = useState(false);

  if (type === 'markdown') return null; 

  const handleCopy = () => {
      if (output) {
          navigator.clipboard.writeText(output);
          setWasCopied(true);
          setTimeout(() => setWasCopied(false), 2000);
      }
  };

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
         <div className="bg-red-900/20 border-l-2 border-red-500 p-3 text-red-200 font-mono text-xs md:text-sm whitespace-pre-wrap overflow-x-auto rounded-r-sm group/output relative">
            <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 text-red-400 font-bold uppercase tracking-wider text-[10px]">
                    <AlertCircle size={12} />
                    <span>Traceback</span>
                </div>
                {output && (
                    <button 
                        onClick={handleCopy}
                        className={`transition-all duration-200 text-[10px] px-2 py-0.5 rounded border flex items-center gap-1 font-sans font-bold
                            ${wasCopied ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-red-500/30 hover:bg-red-500/50 border-red-500/50 text-white'}
                        `}
                    >
                        {wasCopied ? (
                            <>
                                <CheckCircle2 size={10} />
                                <span>COPIED!</span>
                            </>
                        ) : (
                            <>
                                <Copy size={10} />
                                <span>COPY FULL ERROR LOG</span>
                            </>
                        )}
                    </button>
                )}
            </div>
            {output}
         </div>
      ) : output ? (
          // Standard Output
          <div className="pt-2 border-t border-[#352554]/50 mt-2">
             <div className="font-mono text-sm text-gray-300 whitespace-pre-wrap overflow-x-auto max-h-[500px] custom-scrollbar px-2 opacity-90">
                 {output.split('\n').map((line, i) => {
                     // 1. Detect Image Tags
                     const imgMatch = line.match(/\[IMAGE:\s*(.*?)\]/);
                     if (imgMatch) {
                         return <RenderedImage key={i} source={imgMatch[1].trim()} />;
                     }

                     // 2. Detect tqdm Progress Bars
                     const progressMatch = line.match(/^\s*(.*?):\s*(\d+)%\|.*?\|\s*(\d+)\/(\d+)\s*\[(.*?)\]/);
                     if (progressMatch) {
                         const [_, label, percentage, current, total, stats] = progressMatch;
                         return (
                             <ProgressBar 
                                key={i}
                                label={label}
                                percentage={percentage}
                                current={current}
                                total={total}
                                stats={stats}
                             />
                         );
                     }

                     // 3. Detect Hugging Face Authentication Warning
                     if (line.includes("Warning: You are sending unauthenticated requests to the HF Hub")) {
                        return (
                            <HuggingFaceAuth 
                                key={i}
                                envKey="HF_TOKEN"
                                placeholder="hf_..."
                            />
                        );
                    }

                     return <div key={i} className={line.includes('Loading weights') ? 'hidden' : ''}>{line}</div>;
                 })}
             </div>
          </div>
      ) : null}
    </div>
  );
};