import React, { useState } from 'react';
import { Play, Trash2, ArrowUp, ArrowDown, Type, Code2, Wand2, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { CellData } from '../types';
import { EditorArea } from './EditorArea';
import { CellOutput } from './CellOutput';
import ReactMarkdown from 'react-markdown';

interface CellProps {
  cell: CellData;
  isActive: boolean;
  onFocus: () => void;
  onChange: (id: string, content: string) => void;
  onRun: (id: string) => void;
  onDelete: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onTypeChange: (id: string, type: 'code' | 'markdown') => void;
}

export const Cell: React.FC<CellProps> = ({
  cell,
  isActive,
  onFocus,
  onChange,
  onRun,
  onDelete,
  onMoveUp,
  onMoveDown,
  onTypeChange
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showPreview, setShowPreview] = useState(true); // For markdown

  const handleRun = () => {
    if (cell.type === 'markdown') {
        setShowPreview(true);
    } else {
        onRun(cell.id);
    }
  };

  const handleDoubleClickMarkdown = () => {
      if (cell.type === 'markdown') {
          setShowPreview(false);
      }
  };

  // Determine container styles based on status
  const getContainerStyles = () => {
      const base = "group relative flex flex-col mb-4 p-2 rounded-lg border-2 transition-all duration-300";
      
      if (cell.status === 'running') {
          return `${base} border-indigo-500/60 bg-[#161618] shadow-[0_0_15px_rgba(99,102,241,0.1)]`;
      }
      if (cell.status === 'fixing') {
          return `${base} border-purple-500/60 bg-[#1a1520] shadow-[0_0_15px_rgba(168,85,247,0.1)]`;
      }
      if (cell.status === 'error') {
          return `${base} border-red-500/40 bg-[#1a1212]`;
      }
      if (cell.status === 'success') {
          return `${base} border-emerald-500/30 bg-[#131313]`;
      }
      if (isActive) {
          return `${base} border-gray-600 bg-[#1e1e1e] shadow-md`;
      }
      return `${base} border-transparent hover:border-notebook-cellBorder hover:bg-[#161616]`;
  };

  return (
    <div 
      className={getContainerStyles()}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onFocus}
    >
      
      {/* Sidebar Controls (Gutter) */}
      <div className="flex flex-row w-full gap-3">
        
        {/* Play/Status Button Area */}
        <div className="flex-none w-8 pt-1.5 flex flex-col items-center">
            <button 
                onClick={(e) => { e.stopPropagation(); handleRun(); }}
                className={`p-1.5 rounded-md transition-all duration-200 flex items-center justify-center relative group/btn
                    ${cell.status === 'running' || cell.status === 'fixing' ? 'cursor-not-allowed opacity-100' : 'hover:bg-notebook-cellBorder cursor-pointer'}
                `}
                title={cell.status === 'success' ? "Run again" : "Run cell"}
                disabled={cell.status === 'running' || cell.status === 'fixing'}
            >
                {/* Status Icons */}
                {cell.status === 'running' ? (
                   <Loader2 size={18} className="animate-spin text-indigo-400" />
                ) : cell.status === 'fixing' ? (
                    <Wand2 size={18} className="animate-pulse text-purple-400" />
                ) : cell.status === 'success' ? (
                    <>
                        <CheckCircle2 size={18} className="text-emerald-500 transition-opacity absolute duration-200 group-hover/btn:opacity-0" />
                        <Play size={18} className="text-notebook-textMuted opacity-0 group-hover/btn:opacity-100 transition-opacity absolute" fill="currentColor" />
                        <div className="w-4 h-4" /> {/* Spacer to keep layout size */}
                    </>
                ) : cell.status === 'error' ? (
                    <>
                        <XCircle size={18} className="text-red-500 transition-opacity absolute duration-200 group-hover/btn:opacity-0" />
                        <Play size={18} className="text-notebook-textMuted opacity-0 group-hover/btn:opacity-100 transition-opacity absolute" fill="currentColor" />
                        <div className="w-4 h-4" />
                    </>
                ) : (
                   <Play size={18} className="text-notebook-textMuted hover:text-white transition-colors" fill={cell.type === 'code' ? "currentColor" : "none"} />
                )}
            </button>

            {/* Execution Order Number */}
            {cell.type === 'code' && (
                <span className="text-[10px] font-mono text-notebook-textMuted mt-1 opacity-50 select-none">
                    {cell.executionCount ? `[${cell.executionCount}]` : ' '}
                </span>
            )}
        </div>

        {/* Content Area */}
        <div className="flex-grow min-w-0">
            
            {/* Cell Content */}
            {cell.type === 'markdown' && showPreview && cell.content.trim() !== '' ? (
                 <div 
                    className="prose prose-sm prose-invert max-w-none p-4 cursor-text border border-transparent hover:bg-[#252526] rounded-md transition-colors"
                    onDoubleClick={handleDoubleClickMarkdown}
                 >
                    <ReactMarkdown>{cell.content}</ReactMarkdown>
                 </div>
            ) : (
                <EditorArea
                    value={cell.content}
                    onChange={(val) => onChange(cell.id, val)}
                    language={cell.type === 'code' ? 'python' : 'markdown'}
                    onRun={handleRun}
                    placeholder={cell.type === 'code' ? 'print("Hello World")' : '## Markdown Title...'}
                    readOnly={cell.status === 'running' || cell.status === 'fixing'}
                />
            )}

            {/* Cell Output (For Code) */}
            {cell.type === 'code' && (
                <CellOutput 
                    output={cell.output} 
                    status={cell.status} 
                    type={cell.type}
                />
            )}
        </div>
      </div>

      {/* Floating Action Menu (Visible on hover or active) */}
      <div className={`absolute -top-3 right-4 flex items-center gap-1 bg-[#252526] shadow-xl border border-notebook-cellBorder rounded-lg px-2 py-1 transition-all duration-200 z-10 ${isActive || isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}`}>
        
        <button onClick={() => onMoveUp(cell.id)} className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded" title="Move Up">
            <ArrowUp size={14} />
        </button>
        <button onClick={() => onMoveDown(cell.id)} className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded" title="Move Down">
            <ArrowDown size={14} />
        </button>
        
        <div className="w-px h-3 bg-gray-600 mx-1" />

        <button 
            onClick={() => onTypeChange(cell.id, 'code')} 
            className={`p-1.5 rounded hover:bg-white/10 ${cell.type === 'code' ? 'text-blue-400 font-bold' : 'text-gray-400'}`}
            title="Convert to Code"
        >
            <Code2 size={14} />
        </button>
        <button 
            onClick={() => onTypeChange(cell.id, 'markdown')} 
            className={`p-1.5 rounded hover:bg-white/10 ${cell.type === 'markdown' ? 'text-blue-400 font-bold' : 'text-gray-400'}`}
            title="Convert to Markdown"
        >
            <Type size={14} />
        </button>

        <div className="w-px h-3 bg-gray-600 mx-1" />

        <button onClick={() => onDelete(cell.id)} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-900/30 rounded" title="Delete Cell">
            <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};