import React, { useState, useRef, useEffect } from 'react';
import { Plus, Play, Sparkles, Send, Trash2, StopCircle, Zap, Map, Rocket } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Cell } from './components/Cell';
import { Button } from './components/Button';
import { CellData, CellType, ExecutionMode } from './types';
import { simulateCodeExecution, generateNotebookStructure, fixCodeError } from './services/aiService';

const INITIAL_CELLS: CellData[] = [];

export default function App() {
  const [cells, setCells] = useState<CellData[]>(INITIAL_CELLS);
  const cellsRef = useRef<CellData[]>(INITIAL_CELLS); // Ref to access latest state in async loop
  
  const [activeCellId, setActiveCellId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAutoRunning, setIsAutoRunning] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [clarification, setClarification] = useState<string | null>(null);
  const [mode, setMode] = useState<ExecutionMode>('agent');
  const bottomRef = useRef<HTMLDivElement>(null);
  const stopExecutionRef = useRef(false);

  // Sync ref with state
  useEffect(() => {
    cellsRef.current = cells;
  }, [cells]);

  // Auto-scroll to bottom when new cells are added
  useEffect(() => {
    if (cells.length > 1 && !activeCellId && isGenerating) {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [cells.length, isGenerating, activeCellId]);

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

  const clearAll = () => {
      setCells([]);
      setActiveCellId(null);
      stopExecutionRef.current = true;
      setIsAutoRunning(false);
  }

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

  /**
   * Executes a single cell. 
   * Returns a promise that resolves to the success status.
   */
  const executeSingleCell = async (id: string): Promise<{ success: boolean; output: string }> => {
    // Optimistic update
    setCells(prev => prev.map(c => c.id === id ? { ...c, status: 'running', output: undefined } : c));

    // Get current content from ref to ensure freshness
    const cell = cellsRef.current.find(c => c.id === id);
    if (!cell) return { success: false, output: 'Cell not found' };

    const result = await simulateCodeExecution(cell.content);

    setCells(prev => prev.map(c => c.id === id ? { 
        ...c, 
        status: result.error ? 'error' : 'success', 
        output: result.error || result.text,
        executionCount: (c.executionCount || 0) + 1,
        lastRun: Date.now()
    } : c));

    return { 
        success: !result.error, 
        output: result.error || result.text 
    };
  };

  /**
   * Main Autonomous Loop
   * Executes cells sequentially. If an error occurs, it attempts to fix it and retry.
   */
  const executeNotebook = async (startIndex: number = 0) => {
    if (isAutoRunning) return;
    setIsAutoRunning(true);
    stopExecutionRef.current = false;

    // Use a local index to iterate through the cells from the ref
    // We re-read cellsRef.current.length every iteration in case cells are added/removed (though unlikely during auto-run)
    for (let i = startIndex; i < cellsRef.current.length; i++) {
        if (stopExecutionRef.current) break;

        const cell = cellsRef.current[i];
        if (cell.type !== 'code') continue; // Skip markdown

        // Scroll current cell into view
        const el = document.getElementById(`cell-${cell.id}`); // Assuming we add ID to Cell component
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });

        let attempts = 0;
        const maxAttempts = 3;
        let success = false;

        while (!success && attempts < maxAttempts && !stopExecutionRef.current) {
            attempts++;
            
            // Run the cell
            const result = await executeSingleCell(cell.id);
            
            if (result.success) {
                success = true;
            } else {
                // Agentic Auto-Recovery Detection
                const isMissingModule = result.output.includes("ModuleNotFoundError") || result.output.includes("ImportError");
                
                if (attempts < maxAttempts) {
                    // Update Status to Recovering/Fixing
                    const statusType = isMissingModule ? 'recovering' : 'fixing';
                    setCells(prev => prev.map(c => c.id === cell.id ? { ...c, status: statusType as any } : c));
                    
                    // Get the fix from the Agent
                    const fixedCode = await fixCodeError(cellsRef.current[i].content, result.output);
                    
                    // Update cell content with fix
                    setCells(prev => prev.map(c => c.id === cell.id ? { ...c, content: fixedCode } : c));
                    
                    // Wait a moment for visual clarity
                    await new Promise(r => setTimeout(r, 1000));
                }
            }
        }

        // If we failed after max attempts, stop the chain
        if (!success) {
            setIsAutoRunning(false);
            return;
        }
        
        // Short pause between cells for visual pacing
        await new Promise(r => setTimeout(r, 500));
    }

    setIsAutoRunning(false);
  };

  // Wrapper for manual single cell run
  const handleManualRun = async (id: string) => {
      await executeSingleCell(id);
  };

  const handleStop = () => {
      stopExecutionRef.current = true;
      setIsAutoRunning(false);
  };

  const handleSubmitPrompt = async () => {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);
    setClarification(null); // Clear any previous clarification
    
    // Pass the mode to the generator
    const result = await generateNotebookStructure(prompt, mode);
    
    if (result.clarification) { // Handle clarification
        setClarification(result.clarification);
        setIsGenerating(false);
        return;
    }

    if (result.cells && result.cells.length > 0) {
        const newCells: CellData[] = result.cells.map(c => ({
            id: uuidv4(),
            type: c.type,
            content: c.content,
            status: 'idle'
        }));
        
        const previousLength = cells.length; // capture current length to know where to start running
        
        // Update state with new cells
        setCells(prev => {
            const updated = [...prev, ...newCells];
            cellsRef.current = updated; // Manually update ref immediately for safe measure
            return updated;
        });
        
        setPrompt('');
        setIsGenerating(false);

        // ONLY START AUTO-PILOT IF IN AGENT MODE
        if (mode === 'agent') {
            setTimeout(() => {
                executeNotebook(previousLength);
            }, 500);
        }

    } else if (result.error) {
         setCells(prev => [...prev, {
            id: uuidv4(),
            type: 'markdown',
            content: `**Error generating plan:** ${result.error}`,
            status: 'error'
        }]);
        setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleSubmitPrompt();
      }
  };

  return (
    <div className="flex flex-col h-screen bg-[#0B090F] text-[#E2D8F0] font-sans selection:bg-purple-500/30">
      
      {/* Top Header - Minimalist */}
      <header className="flex-none h-14 border-b border-[#352554] bg-[#140F1D] flex items-center px-4 justify-between z-10 sticky top-0">
        <div className="flex items-center gap-3">
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-white shadow-lg transition-all duration-500 ${isAutoRunning ? 'bg-gradient-to-br from-green-400 to-emerald-600 shadow-emerald-900/20' : 'bg-gradient-to-br from-indigo-500 to-purple-600 shadow-purple-900/20'}`}>
                {isAutoRunning ? <Zap size={16} className="animate-pulse" /> : <Sparkles size={16} />}
            </div>
            <div>
                <h1 className="text-sm font-semibold text-[#E2D8F0] tracking-wide">VibeML Studio</h1>
                <span className="text-xs text-[#9480B3] flex items-center gap-2">
                    {isAutoRunning ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            Auto-Pilot Active
                        </span>
                    ) : 'Vibe Coding is here. Why not Vibe Train?'}
                </span>
            </div>
        </div>

        <div className="flex items-center gap-2">
             <Button size="sm" variant="ghost" onClick={clearAll} title="Clear Notebook" disabled={isAutoRunning}>
                <Trash2 size={16} />
             </Button>
             {isAutoRunning && (
                 <>
                    <div className="h-4 w-px bg-[#352554] mx-2"></div>
                    <Button size="sm" variant="danger" onClick={handleStop} className="border-red-900/50 bg-red-900/20 text-red-400 hover:bg-red-900/40">
                        <StopCircle size={14} className="mr-2" />
                        Stop Auto-Pilot
                    </Button>
                 </>
             )}
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-grow flex overflow-hidden relative">

        {/* Notebook Area */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden pt-20 pb-40 px-4 md:px-8">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* Clarification Loop UI */}
          {clarification && (
              <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-xl p-6 mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="flex items-start gap-4">
                      <div className="p-2 bg-indigo-500/20 rounded-lg">
                          <Sparkles className="text-indigo-400" size={20} />
                      </div>
                      <div className="flex-1">
                          <h3 className="text-indigo-300 font-semibold mb-2">Agent Clarification Needed</h3>
                          <p className="text-[#E2D8F0]/80 text-sm leading-relaxed mb-4">
                              {clarification}
                          </p>
                          <div className="flex gap-3">
                              <button
                                onClick={() => { setPrompt(''); setClarification(null); }}
                                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                              >
                                Dismiss
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
          )}

          {cells.length === 0 && !isGenerating && !clarification && (
                    <div className="flex flex-col items-center justify-center h-64 text-[#9480B3]">
                        <Sparkles size={48} className="mb-4 text-[#352554]" />
                        <p>Ready for Vibe Training. Type a prompt below.</p>
                    </div>
                )}

                {cells.map((cell) => (
                    <div id={`cell-${cell.id}`} key={cell.id}>
                        <Cell
                            cell={cell}
                            isActive={activeCellId === cell.id}
                            onFocus={() => handleCellFocus(cell.id)}
                            onChange={updateCellContent}
                            onRun={handleManualRun}
                            onDelete={deleteCell}
                            onMoveUp={(id) => moveCell(id, 'up')}
                            onMoveDown={(id) => moveCell(id, 'down')}
                            onTypeChange={updateCellType}
                        />
                    </div>
                ))}

                <div ref={bottomRef} className="h-4" />
                
                {!isAutoRunning && cells.length > 0 && (
                    <div className="group flex justify-center items-center py-8 opacity-20 hover:opacity-100 transition-opacity">
                        <div className="h-px bg-[#352554] flex-grow"></div>
                    </div>
                )}

            </div>
        </main>
      </div>

      {/* Bottom Prompt Bar - Floating */}
      <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-t from-[#0B090F] via-[#0B090F] to-transparent z-20 pointer-events-none">
         <div className="max-w-3xl mx-auto pointer-events-auto">
            <div className={`relative bg-[#1D152A] border transition-colors duration-300 rounded-xl shadow-lg overflow-hidden flex flex-col ${isGenerating || isAutoRunning ? 'border-purple-500 shadow-purple-500/20' : 'border-[#352554] hover:border-gray-500'}`}>
                
                {/* Mode Selector and Input Area */}
                <div className="flex items-end p-2 gap-2">
                    {/* Mode Toggle Button */}
                    <button
                        onClick={() => setMode(prev => prev === 'agent' ? 'plan' : 'agent')}
                        disabled={isGenerating || isAutoRunning}
                        className={`mb-2 ml-2 p-2 rounded-lg transition-all flex items-center gap-2 text-xs font-medium border
                            ${mode === 'agent' 
                                ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20' 
                                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'}
                        `}
                    >
                        {mode === 'agent' ? (
                            <>
                                <Rocket size={14} />
                                <span className="hidden sm:inline">Agent</span>
                            </>
                        ) : (
                            <>
                                <Map size={14} />
                                <span className="hidden sm:inline">Plan</span>
                            </>
                        )}
                    </button>

                    <textarea 
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={mode === 'agent' 
                            ? "Agent: Describe your task and I'll build and run it..." 
                            : "Plan: Describe your task to see the architectural strategy..."}
                        className="w-full bg-transparent text-white placeholder-gray-500 text-base p-3 focus:outline-none resize-none max-h-40"
                        rows={1}
                        style={{ minHeight: '50px' }}
                        disabled={isGenerating || isAutoRunning}
                    />
                    
                    <button 
                        onClick={handleSubmitPrompt}
                        disabled={!prompt.trim() || isGenerating || isAutoRunning}
                        className={`mb-2 mr-2 p-2 rounded-lg transition-all ${
                            prompt.trim() && !isGenerating && !isAutoRunning
                            ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-sm' 
                            : 'bg-[#1a1a1a] text-gray-500 cursor-not-allowed'
                        }`}
                    >
                        {isGenerating ? (
                            <div className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full" />
                        ) : (
                            <Send size={18} />
                        )}
                    </button>
                </div>
                
                {/* Loading Progress Bar */}
                {(isGenerating || isAutoRunning) && (
                    <div className="h-1 w-full bg-[#1a1a1a] overflow-hidden">
                        <div className={`h-full ${isGenerating ? 'bg-purple-500' : 'bg-emerald-500'} animate-progress-indeterminate`}></div>
                    </div>
                )}
            </div>
         </div>
      </div>

    </div>
  );
}