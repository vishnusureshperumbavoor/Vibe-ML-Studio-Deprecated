import React, { useState } from 'react';
import { AlertCircle, Wand2, CheckCircle2, Copy } from 'lucide-react';
import { ExecutionStatus } from '../types';

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
                         const source = imgMatch[1].trim();
                         const isUrl = source.startsWith('http://') || source.startsWith('https://');
                         const imgSrc = isUrl ? source : `http://127.0.0.1:2000/images/${source}?t=${Date.now()}`;
 
                         return (
                             <div key={i} className="my-4 bg-[#140F1D] rounded-xl overflow-hidden border border-[#352554] shadow-2xl max-w-2xl mx-auto">
                                 <div className="p-2 border-b border-[#352554] bg-[#0B090F] flex items-center justify-between text-[10px] text-gray-500 uppercase tracking-tighter">
                                     <span className="flex items-center gap-1.5 font-bold text-purple-400">
                                         <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                                         {isUrl ? 'EXTERNAL_IMAGE' : `RENDERED_OUTPUT: ${source}`}
                                     </span>
                                     <a 
                                         href={imgSrc} 
                                         target="_blank" 
                                         rel="noreferrer"
                                         className="hover:text-white transition-colors"
                                     >
                                         OPEN_ORIGINAL
                                     </a>
                                 </div>
                                 <img 
                                     src={imgSrc} 
                                     alt={source}
                                     className="w-full h-auto object-contain bg-black min-h-[100px]"
                                     onError={(e) => {
                                         (e.target as any).src = `https://via.placeholder.com/600x400?text=Error_Loading_Image_${encodeURIComponent(source)}`;
                                     }}
                                 />
                             </div>
                         );
                     }

                     // 2. Detect tqdm Progress Bars (e.g., 97%|#########7| 282/290 [00:14<00:00...])
                     const progressMatch = line.match(/^\s*(.*?):\s*(\d+)%\|.*?\|\s*(\d+)\/(\d+)\s*\[(.*?)\]/);
                     if (progressMatch) {
                         const [_, label, percentage, current, total, stats] = progressMatch;
                         return (
                             <div key={i} className="my-3 max-w-xl bg-[#140F1D] border border-purple-500/30 p-4 rounded-xl shadow-lg animate-in zoom-in-95 duration-300">
                                 <div className="flex items-center justify-between mb-2">
                                     <span className="text-xs font-bold text-purple-300 uppercase tracking-widest">{label || 'Optimizing'}</span>
                                     <span className="text-xs font-mono text-purple-400">{percentage}%</span>
                                 </div>
                                 <div className="h-2 w-full bg-[#0B090F] rounded-full overflow-hidden border border-purple-500/20">
                                     <div 
                                         className="h-full bg-gradient-to-r from-purple-600 via-indigo-500 to-emerald-400 transition-all duration-500" 
                                         style={{ width: `${percentage}%` }}
                                     />
                                 </div>
                                 <div className="flex items-center justify-between mt-2 text-[10px] font-mono text-gray-500">
                                     <span>{current} / {total} units</span>
                                     <span>{stats}</span>
                                 </div>
                             </div>
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