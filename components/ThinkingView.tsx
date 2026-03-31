import React, { useState } from 'react';
import { Brain, Sparkles, Copy, Check } from 'lucide-react';

interface ThinkingViewProps {
  content: string | null;
  isVisible: boolean;
  history?: string[];
}

export const ThinkingView: React.FC<ThinkingViewProps> = ({ content, isVisible, history = [] }) => {
  const [copied, setCopied] = useState(false);

  if (!isVisible || !content) return null;

  const handleCopy = () => {
      const fullHistory = history.length > 0 
          ? history.join('\n\n---\n\n') 
          : content;
      navigator.clipboard.writeText(fullHistory);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

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
          <button 
            onClick={handleCopy}
            className="p-1.5 hover:bg-purple-500/20 rounded-md transition-colors text-purple-400"
            title="Copy Thinking History"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
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
