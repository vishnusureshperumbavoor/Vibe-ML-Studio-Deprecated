import React from 'react';
import { Brain, Sparkles } from 'lucide-react';

interface ThinkingViewProps {
  content: string | null;
  isVisible: boolean;
}

export const ThinkingView: React.FC<ThinkingViewProps> = ({ content, isVisible }) => {
  if (!isVisible || !content) return null;

  return (
    <div className="fixed top-20 right-8 w-80 max-h-[60vh] z-50 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="bg-[#1D152A]/80 backdrop-blur-xl border border-purple-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-purple-500/10 px-4 py-3 border-b border-purple-500/20 flex items-center gap-3">
          <div className="p-1.5 bg-purple-500/20 rounded-lg">
            <Brain className="text-purple-400" size={16} />
          </div>
          <span className="text-xs font-semibold text-purple-200 tracking-wider uppercase">Agent Reasoning</span>
          <div className="flex-grow"></div>
          <div className="flex gap-1">
             <div className="h-1 w-1 rounded-full bg-purple-400 animate-pulse"></div>
             <div className="h-1 w-1 rounded-full bg-purple-400 animate-pulse delay-75"></div>
             <div className="h-1 w-1 rounded-full bg-purple-400 animate-pulse delay-150"></div>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-4 overflow-y-auto custom-scrollbar">
          <p className="text-sm text-[#E2D8F0]/80 leading-relaxed italic font-light">
            "{content}"
          </p>
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-black/20 flex items-center justify-between">
           <span className="text-[10px] text-purple-400/60 font-mono">VSP Agent Loop</span>
           <Sparkles className="text-purple-500/40" size={10} />
        </div>
      </div>
    </div>
  );
};
