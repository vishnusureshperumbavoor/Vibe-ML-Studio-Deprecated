import React, { useState, useRef, useCallback } from 'react';
import { Plus, Play, Save, Settings, Github, Bot, Sparkles, MessageSquare } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Cell } from './components/Cell';
import { Button } from './components/Button';
import { CellData, CellType } from './types';
import { simulateCodeExecution, generateNoteContent } from './services/geminiService';

const INITIAL_CELLS: CellData[] = [
  {
    id: '1',
    type: 'markdown',
    content: '# Welcome to Gemini Notebook\nThis is a React-based interactive notebook environment powered by **Google Gemini**.\n\n- Write **Markdown** for text.\n- Write **Python** code and click *Play* to simulate execution.\n- Use the **AI Assistant** to generate content.',
    status: 'idle',
  },
  {
    id: '2',
    type: 'code',
    content: 'print("Hello, Gemini!")\n\n# Calculate something simple\nx = [1, 2, 3, 4, 5]\ny = [val * 2 for val in x]\nprint(f"Original: {x}")\nprint(f"Doubled: {y}")',
    status: 'idle',
  }
];

export default function App() {
  const [cells, setCells] = useState<CellData[]>(INITIAL_CELLS);
  const [activeCellId, setActiveCellId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [showAiModal, setShowAiModal] = useState(false);

  // Focus management
  const handleCellFocus = (id: string) => {
    setActiveCellId(id);
  };

  const addCell = (type: CellType, index?: number) => {
    const newCell: CellData = {
      id: uuidv4(),
      type,
      content: '',
      status: 'idle',
    };
    
    setCells(prev => {
      const newCells = [...prev];
      const insertAt = index !== undefined ? index : prev.length;
      newCells.splice(insertAt, 0, newCell);
      return newCells;
    });
    setActiveCellId(newCell.id);
  };

  const updateCellContent = (id: string, content: string) => {
    setCells(prev => prev.map(c => c.id === id ? { ...c, content } : c));
  };

  const updateCellType = (id: string, type: CellType) => {
    setCells(prev => prev.map(c => c.id === id ? { ...c, type, output: undefined, status: 'idle' } : c));
  };

  const deleteCell = (id: string) => {
    setCells(prev => prev.filter(c => c.id !== id));
    if (activeCellId === id) setActiveCellId(null);
  };

  const moveCell = (id: string, direction: 'up' | 'down') => {
    const index = cells.findIndex(c => c.id === id);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === cells.length - 1) return;

    const newCells = [...cells];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newCells[index], newCells[targetIndex]] = [newCells[targetIndex], newCells[index]];
    setCells(newCells);
  };

  const runCell = async (id: string) => {
    const cell = cells.find(c => c.id === id);
    if (!cell || cell.type !== 'code') return;

    // Set status to running
    setCells(prev => prev.map(c => c.id === id ? { ...c, status: 'running', output: undefined } : c));

    // Simulate execution with Gemini
    const result = await simulateCodeExecution(cell.content);

    setCells(prev => prev.map(c => c.id === id ? { 
        ...c, 
        status: result.error ? 'error' : 'success', 
        output: result.error || result.text,
        executionCount: (c.executionCount || 0) + 1,
        lastRun: Date.now()
    } : c));
  };

  const runAll = async () => {
      for (const cell of cells) {
          if (cell.type === 'code') {
              await runCell(cell.id);
          }
      }
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    
    // Ask Gemini to generate content
    // We expect the user might want code or text.
    // For simplicity, we'll append a markdown cell with the response.
    // If we wanted to be fancy, we could parse the response for code blocks and split them into cells.
    const result = await generateNoteContent(aiPrompt);
    
    setIsGenerating(false);
    setShowAiModal(false);
    setAiPrompt('');

    if (result.text) {
        // Simple logic: If response contains ```python, split it? 
        // For now, let's just dump it into a Markdown cell and let the user convert if they want, 
        // OR we can just try to detect code blocks.
        
        const newCell: CellData = {
            id: uuidv4(),
            type: 'markdown', // Default to markdown as it handles mixed content well
            content: result.text,
            status: 'success'
        };
        setCells(prev => [...prev, newCell]);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white text-gray-900 font-sans">
      
      {/* Top Header */}
      <header className="flex-none h-14 border-b border-gray-200 bg-white flex items-center px-4 justify-between z-10 sticky top-0">
        <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-orange-500 rounded-md flex items-center justify-center text-white font-bold text-lg shadow-sm">
                <Sparkles size={18} />
            </div>
            <div>
                <h1 className="text-sm font-semibold text-gray-900">Untitled Notebook.ipynb</h1>
                <div className="text-xs text-gray-500 flex gap-2">
                    <span>File</span>
                    <span>Edit</span>
                    <span>View</span>
                </div>
            </div>
        </div>

        <div className="flex items-center gap-2">
             <Button size="sm" variant="ghost" onClick={() => setShowAiModal(true)}>
                <Bot size={16} className="mr-2 text-blue-600" />
                Ask AI
             </Button>
             <div className="h-4 w-px bg-gray-300 mx-2"></div>
             <Button size="sm" variant="secondary" onClick={runAll}>
                <Play size={14} className="mr-2" />
                Run All
             </Button>
             <Button size="sm" variant="primary">
                Connect
             </Button>
             <div className="h-8 w-8 rounded-full bg-purple-600 text-white flex items-center justify-center ml-2 text-xs font-bold">
                J
             </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-grow flex overflow-hidden">
        
        {/* Sidebar (Visual Only) */}
        <div className="flex-none w-16 border-r border-gray-200 bg-[#f8f9fa] flex flex-col items-center py-4 gap-4 hidden md:flex">
            <div className="p-2 rounded-md bg-gray-200 text-gray-700 cursor-pointer" title="Table of Contents">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7"></path></svg>
            </div>
            <div className="p-2 rounded-md hover:bg-gray-200 text-gray-500 cursor-pointer" title="Find and Replace">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>
            <div className="p-2 rounded-md hover:bg-gray-200 text-gray-500 cursor-pointer" title="Files">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path></svg>
            </div>
            <div className="mt-auto p-2 text-gray-400">
                <Settings size={20} />
            </div>
        </div>

        {/* Notebook Area */}
        <main className="flex-grow overflow-y-auto bg-white p-4 md:p-8 scroll-smooth">
            <div className="max-w-4xl mx-auto pb-40">
                
                {cells.map((cell) => (
                    <Cell
                        key={cell.id}
                        cell={cell}
                        isActive={activeCellId === cell.id}
                        onFocus={() => handleCellFocus(cell.id)}
                        onChange={updateCellContent}
                        onRun={runCell}
                        onDelete={deleteCell}
                        onMoveUp={(id) => moveCell(id, 'up')}
                        onMoveDown={(id) => moveCell(id, 'down')}
                        onTypeChange={updateCellType}
                    />
                ))}

                {/* Add Cell Controls */}
                <div className="group flex justify-center items-center gap-4 py-4 opacity-100 transition-opacity">
                    <div className="h-px bg-gray-200 flex-grow group-hover:bg-blue-200 transition-colors"></div>
                    <div className="flex gap-2">
                        <Button size="sm" variant="secondary" className="shadow-sm hover:shadow-md transition-shadow" onClick={() => addCell('code')}>
                            <Plus size={14} className="mr-1" /> Code
                        </Button>
                        <Button size="sm" variant="secondary" className="shadow-sm hover:shadow-md transition-shadow" onClick={() => addCell('markdown')}>
                            <Plus size={14} className="mr-1" /> Text
                        </Button>
                    </div>
                    <div className="h-px bg-gray-200 flex-grow group-hover:bg-blue-200 transition-colors"></div>
                </div>

            </div>
        </main>
      </div>

      {/* AI Assistant Modal */}
      {showAiModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-fadeIn scale-100">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <div className="flex items-center gap-2 text-blue-600 font-medium">
                        <Bot size={20} />
                        <span>AI Assistant</span>
                    </div>
                    <button onClick={() => setShowAiModal(false)} className="text-gray-400 hover:text-gray-600">
                        <Plus size={20} className="rotate-45" />
                    </button>
                </div>
                <div className="p-6">
                    <p className="text-sm text-gray-600 mb-4">
                        Describe what you want to create (e.g., "Write a Python script to calculate Fibonacci numbers" or "Explain Linear Regression").
                    </p>
                    <textarea 
                        className="w-full border border-gray-300 rounded-md p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none h-32"
                        placeholder="How can I help you today?"
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        autoFocus
                    />
                    <div className="flex justify-end mt-4 gap-2">
                        <Button variant="ghost" onClick={() => setShowAiModal(false)}>Cancel</Button>
                        <Button variant="primary" onClick={handleAiGenerate} isLoading={isGenerating}>
                            <Sparkles size={16} className="mr-2" />
                            Generate
                        </Button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}