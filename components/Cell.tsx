import React, { useState } from 'react';
import { Play, Trash2, ArrowUp, ArrowDown, Type, Code2, MoreHorizontal, Bot } from 'lucide-react';
import { CellData } from '../types';
import { Button } from './Button';
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

  return (
    <div 
      className={`group relative flex flex-col mb-4 p-2 rounded-lg border-2 transition-all duration-200 ${isActive ? 'border-blue-100 shadow-sm bg-white' : 'border-transparent hover:border-gray-100'}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onFocus}
    >
      
      {/* Sidebar Controls (Gutter) */}
      <div className="flex flex-row w-full gap-2">
        
        {/* Play Button Area */}
        <div className="flex-none w-10 pt-1 flex flex-col items-center gap-2">
            <button 
                onClick={(e) => { e.stopPropagation(); handleRun(); }}
                className={`p-1.5 rounded-full transition-colors ${cell.status === 'running' ? 'bg-transparent' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'}`}
                title="Run cell (Cmd/Ctrl + Enter)"
            >
                {cell.status === 'running' ? (
                   // Spinner handled in output usually, but helpful here too
                   <div className="animate-spin h-5 w-5 border-2 border-gray-200 border-t-blue-500 rounded-full" />
                ) : (
                   <Play size={18} fill={cell.type === 'code' ? "currentColor" : "none"} />
                )}
            </button>
        </div>

        {/* Content Area */}
        <div className="flex-grow min-w-0">
            
            {/* Cell Content */}
            {cell.type === 'markdown' && showPreview && cell.content.trim() !== '' ? (
                 <div 
                    className="prose prose-sm max-w-none p-4 cursor-text border border-transparent hover:bg-gray-50 rounded-md"
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
                />
            )}

            {/* Cell Output (For Code) */}
            {cell.type === 'code' && (
                <CellOutput 
                    output={cell.output} 
                    status={cell.status} 
                    executionCount={cell.executionCount}
                    type={cell.type}
                />
            )}
        </div>
      </div>

      {/* Floating Action Menu (Visible on hover or active) */}
      <div className={`absolute top-0 right-2 -translate-y-1/2 flex items-center gap-1 bg-white shadow-md border border-gray-200 rounded-full px-2 py-1 transition-opacity duration-200 ${isActive || isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        
        <button onClick={() => onMoveUp(cell.id)} className="p-1 text-gray-400 hover:text-gray-700" title="Move Up">
            <ArrowUp size={14} />
        </button>
        <button onClick={() => onMoveDown(cell.id)} className="p-1 text-gray-400 hover:text-gray-700" title="Move Down">
            <ArrowDown size={14} />
        </button>
        
        <div className="w-px h-3 bg-gray-300 mx-1" />

        <button 
            onClick={() => onTypeChange(cell.id, 'code')} 
            className={`p-1 hover:text-gray-900 ${cell.type === 'code' ? 'text-blue-600 font-bold' : 'text-gray-400'}`}
            title="Convert to Code"
        >
            <Code2 size={14} />
        </button>
        <button 
            onClick={() => onTypeChange(cell.id, 'markdown')} 
            className={`p-1 hover:text-gray-900 ${cell.type === 'markdown' ? 'text-blue-600 font-bold' : 'text-gray-400'}`}
            title="Convert to Markdown"
        >
            <Type size={14} />
        </button>

        <div className="w-px h-3 bg-gray-300 mx-1" />

        <button onClick={() => onDelete(cell.id)} className="p-1 text-gray-400 hover:text-red-600" title="Delete Cell">
            <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};