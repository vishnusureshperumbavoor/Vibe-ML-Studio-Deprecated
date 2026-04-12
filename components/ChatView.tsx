import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, User, Bot, ChevronDown, Trash2, Loader2, Sparkles, Square, Columns, Maximize2 } from 'lucide-react';
import { Button } from './Button';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  reasoning?: string;
}

interface OllamaModel {
  name: string;
  details?: {
    parameter_size: string;
    family: string;
  };
}

interface ChatViewProps {
  ollamaModels: OllamaModel[];
  isOllamaOnline: boolean;
  selectedModel: string;
  onModelChange: (model: string) => void;
}

const renderMessageList = (messages: Message[], isSending: boolean, scrollRef: any, onScroll: any, stopStream: () => void) => {
  return (
    <div 
      className={`flex-1 flex flex-col relative w-full h-full overflow-hidden`}
    >
      <div 
        ref={scrollRef}
        onScroll={onScroll}
        className={`flex-1 overflow-y-auto w-full scroll-smooth custom-scrollbar relative z-0`}
      >
        <div className={`max-w-3xl mx-auto px-6 space-y-10 ${messages.length === 0 ? 'h-full flex items-center justify-center' : 'py-12'}`}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center space-y-8 opacity-60 animate-in fade-in zoom-in duration-700">
            <div className="p-8 bg-purple-500/5 border border-purple-500/10 rounded-[2.5rem] shadow-2xl shadow-purple-500/5">
              <Sparkles size={64} className="text-purple-400/50" />
            </div>
            <p className="text-[#E2D8F0] text-2xl font-light tracking-tight italic">
              "What shall we create today?"
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => {
              const isAssistant = msg.role === 'assistant';
              const isLast = idx === messages.length - 1;
              
              let thought = msg.reasoning || '';
              let finalContent = msg.content;
              
              if (!thought) {
                const thoughtStartMatch = msg.content.match(/<(thought|thinking)>|\[THOUGHT\]|\bthought:/i);
                if (thoughtStartMatch) {
                  const startTag = thoughtStartMatch[0];
                  const startIndex = thoughtStartMatch.index! + startTag.length;
                  const endMatch = msg.content.match(/<\/(thought|thinking)>|\[\/THOUGHT\]|\n\n/i);
                  
                  if (endMatch) {
                    thought = msg.content.slice(startIndex, endMatch.index!).trim();
                    finalContent = msg.content.slice(endMatch.index! + endMatch[0].length).trim();
                  } else {
                    thought = msg.content.slice(startIndex).trim();
                    finalContent = '';
                  }
                }
              }

              return (
                <div 
                  key={idx} 
                  className={`flex gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ${isAssistant ? '' : 'flex-row-reverse'}`}
                >
                  <div className={`flex-none w-10 h-10 rounded-2xl flex items-center justify-center border shadow-lg ${
                    isAssistant 
                      ? 'bg-purple-600/10 border-purple-500/30 text-purple-400 shadow-purple-500/5' 
                      : 'bg-indigo-600/10 border-indigo-500/30 text-indigo-400 shadow-indigo-500/5'
                  }`}>
                    {isAssistant ? <Bot size={20} /> : <User size={20} />}
                  </div>
                  <div className={`flex-1 space-y-2 ${isAssistant ? '' : 'text-right'}`}>
                    <div className={`inline-block text-[15px] p-5 rounded-[1.5rem] shadow-xl ${
                      isAssistant 
                        ? 'bg-[#1D152A] text-[#E2D8F0]/90 rounded-tl-none border border-[#352554]' 
                        : 'bg-purple-600/20 text-white rounded-tr-none border border-purple-500/40'
                    }`}>
                      {isAssistant && thought && (
                        <div className="mb-4 overflow-hidden rounded-xl border border-purple-500/20 bg-purple-500/5">
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 border-b border-purple-500/10">
                            <Loader2 className={`text-purple-400 ${isSending && isLast && !finalContent ? 'animate-spin' : ''}`} size={10} />
                            <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">
                              {isSending && isLast && !finalContent ? 'Reasoning...' : 'Thought Process'}
                            </span>
                          </div>
                          <div className="p-3 text-xs text-[#9480B3] italic leading-relaxed text-left border-l-2 border-purple-500/30 ml-2 my-2">
                            {thought}
                          </div>
                        </div>
                      )}

                      <div className="leading-relaxed whitespace-pre-wrap text-left relative">
                        {finalContent || (thought ? "" : msg.content)}
                        {isAssistant && isLast && isSending && (
                          <span className="inline-block w-1.5 h-4 ml-1 bg-purple-500/50 animate-pulse rounded-full align-middle" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
      </div>

      {/* Floating Column-Level Stop Button */}
      {isSending && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 animate-in slide-in-from-bottom-4 zoom-in duration-300">
          <button
            onClick={stopStream}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500/20 text-indigo-300 border border-indigo-500/50 hover:bg-indigo-500/30 shadow-lg shadow-indigo-900/40 rounded-full transition-all hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-md"
          >
            <Square size={14} fill="currentColor" />
            <span className="text-xs font-bold uppercase tracking-wider">Stop</span>
          </button>
        </div>
      )}
    </div>
  );
};

export const ChatView: React.FC<ChatViewProps> = ({ 
  ollamaModels, 
  isOllamaOnline,
  selectedModel,
  onModelChange
}) => {
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [selectedModel2, setSelectedModel2] = useState('');

  const [messagesA, setMessagesA] = useState<Message[]>([]);
  const [messagesB, setMessagesB] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  
  const [isSendingA, setIsSendingA] = useState(false);
  const [isSendingB, setIsSendingB] = useState(false);
  const isSending = isSendingA || isSendingB;

  const scrollA = useRef<HTMLDivElement>(null);
  const scrollB = useRef<HTMLDivElement>(null);
  const nearBottomA = useRef(true);
  const nearBottomB = useRef(true);
  
  const abortA = useRef<AbortController | null>(null);
  const abortB = useRef<AbortController | null>(null);

  useEffect(() => {
    if (ollamaModels.length > 0) {
      if (!selectedModel) onModelChange(ollamaModels[0].name);
      if (!selectedModel2) setSelectedModel2(ollamaModels.length > 1 ? ollamaModels[1].name : ollamaModels[0].name);
    }
  }, [ollamaModels, selectedModel, selectedModel2, onModelChange]);

  const handleScrollA = () => {
    if (scrollA.current) {
      nearBottomA.current = scrollA.current.scrollHeight - scrollA.current.scrollTop - scrollA.current.clientHeight < 100;
    }
  };
  const handleScrollB = () => {
    if (scrollB.current) {
      nearBottomB.current = scrollB.current.scrollHeight - scrollB.current.scrollTop - scrollB.current.clientHeight < 100;
    }
  };

  useEffect(() => {
    if (nearBottomA.current && scrollA.current) scrollA.current.scrollTop = scrollA.current.scrollHeight;
  }, [messagesA]);

  useEffect(() => {
    if (nearBottomB.current && scrollB.current) scrollB.current.scrollTop = scrollB.current.scrollHeight;
  }, [messagesB]);

  const handleStop = () => {
    if (abortA.current) { abortA.current.abort(); abortA.current = null; }
    if (abortB.current) { abortB.current.abort(); abortB.current = null; }
  };

  const fetchStream = async (
    modelName: string, 
    history: Message[], 
    setMsg: React.Dispatch<React.SetStateAction<Message[]>>,
    setSending: React.Dispatch<React.SetStateAction<boolean>>,
    abortCtrl: React.MutableRefObject<AbortController | null>
  ) => {
    if (abortCtrl.current) abortCtrl.current.abort();
    abortCtrl.current = new AbortController();
    setSending(true);

    try {
      const response = await fetch('http://127.0.0.1:11434/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelName,
          messages: history,
          stream: true,
        }),
        signal: abortCtrl.current.signal,
      });

      if (!response.body) return;
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      
      setMsg(prev => [...prev, { role: 'assistant', content: '', reasoning: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        let boundary = buffer.indexOf('\n');
        while (boundary !== -1) {
          const line = buffer.slice(0, boundary).trim();
          buffer = buffer.slice(boundary + 1);
          if (line) {
            try {
              const json = JSON.parse(line);
              if (json.message) {
                const newContent = json.message.content || '';
                const newReasoning = json.message.reasoning_content || '';
                if (newContent || newReasoning) {
                  setMsg(prev => {
                    const newMessages = [...prev];
                    const lastMsg = newMessages[newMessages.length - 1];
                    newMessages[newMessages.length - 1] = { 
                      ...lastMsg,
                      content: lastMsg.content + newContent,
                      reasoning: (lastMsg.reasoning || '') + newReasoning
                    };
                    return newMessages;
                  });
                }
              }
            } catch (e) {}
          }
          boundary = buffer.indexOf('\n');
        }
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        setMsg(prev => [...prev, { role: 'assistant', content: "Error: Failed to reach Ollama." }]);
      }
    } finally {
      setSending(false);
      abortCtrl.current = null;
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !selectedModel || isSending) return;
    
    const userMsg: Message = { role: 'user', content: input };
    const newHistoryA = [...messagesA, userMsg];
    setMessagesA(newHistoryA);
    
    let newHistoryB: Message[] = [];
    if (isSplitMode && selectedModel2) {
      newHistoryB = [...messagesB, userMsg];
      setMessagesB(newHistoryB);
    }

    setInput('');
    
    const promises = [fetchStream(selectedModel, newHistoryA, setMessagesA, setIsSendingA, abortA)];
    if (isSplitMode && selectedModel2) {
      promises.push(fetchStream(selectedModel2, newHistoryB, setMessagesB, setIsSendingB, abortB));
    }
    
    await Promise.all(promises);
  };

  const ModelSelector = ({ val, onChange }: { val: string, onChange: (v: string) => void }) => (
    <div className="relative group">
      <select
        value={val}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-[#1D152A] border border-purple-500/30 text-[#E2D8F0] text-xs py-2 pl-3 pr-8 rounded-xl focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all cursor-pointer hover:bg-[#251B36] max-w-[160px] truncate"
        disabled={!isOllamaOnline || ollamaModels.length === 0}
      >
        {ollamaModels.length > 0 ? (
          ollamaModels.map((m) => (
            <option key={m.name} value={m.name}>
              {m.name.toUpperCase()} {m.details?.parameter_size ? `• ${m.details.parameter_size}` : ''}
            </option>
          ))
        ) : (
          <option>No Models Available</option>
        )}
      </select>
      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-purple-400">
        <ChevronDown size={14} />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full w-full bg-[#0B090F] relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-900/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Header */}
      <div className="flex-none shrink-0 h-[64px] border-b border-[#352554]/50 bg-[#140F1D]/50 backdrop-blur-md px-6 flex items-center justify-between z-10 w-full shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
            <MessageSquare className="text-purple-400" size={18} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[#E2D8F0]">VML Arena</h2>
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${isOllamaOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span className="text-[10px] text-[#9480B3] uppercase tracking-widest font-bold">
                {isOllamaOnline ? 'Ready' : 'Offline'}
              </span>
            </div>
          </div>
        </div>

        {/* Central Controls */}
        <div className="flex items-center gap-2">
           <ModelSelector val={selectedModel} onChange={onModelChange} />
           
           <Button 
             variant="ghost" 
             size="sm" 
             onClick={() => setIsSplitMode(!isSplitMode)}
             title={isSplitMode ? "Single View" : "Arena Split View"}
             className={`px-3 transition-colors ${isSplitMode ? "bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30" : "text-gray-400"}`}
           >
             {isSplitMode ? <Maximize2 size={16}/> : <Columns size={16}/>}
           </Button>

           {isSplitMode && (
             <ModelSelector val={selectedModel2} onChange={setSelectedModel2} />
           )}
        </div>

        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => { setMessagesA([]); setMessagesB([]); abortA.current?.abort(); abortB.current?.abort(); }}
            title="Clear Chat"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 flex w-full relative z-0 overflow-hidden">
        {renderMessageList(messagesA, isSendingA, scrollA, handleScrollA, () => {
          if (abortA.current) { abortA.current.abort(); abortA.current = null; }
        })}
        
        {isSplitMode && (
           <>
              <div className="w-[1px] bg-[#352554]/50 z-10 hidden md:block" />
              <div className="bg-[#0B090F]/50 flex-1 h-full w-full max-w-full overflow-hidden flex">
                 {renderMessageList(messagesB, isSendingB, scrollB, handleScrollB, () => {
                    if (abortB.current) { abortB.current.abort(); abortB.current = null; }
                 })}
              </div>
           </>
        )}
      </div>

      {/* Input Area */}
      <div className="flex-none p-6 bg-gradient-to-t from-[#0B090F] to-transparent z-10 w-full">
        <div className="max-w-4xl mx-auto relative group">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={isOllamaOnline ? "Arena Prompt (Enter to broadcast to models)" : "Waiting for Ollama..."}
            className="w-full bg-[#140F1D]/80 backdrop-blur-xl border border-[#352554] rounded-3xl p-5 pr-16 text-[#E2D8F0] placeholder-[#9480B3] focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all resize-none shadow-2xl h-[72px]"
            rows={1}
            disabled={!isOllamaOnline && !isSending}
          />
          <button
            onClick={isSending ? handleStop : handleSend}
            disabled={(!input.trim() && !isSending) || !isOllamaOnline}
            className={`absolute right-3 top-1/2 -translate-y-1/2 w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
              isSending
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/50 hover:bg-indigo-500/30 shadow-lg shadow-indigo-900/40 active:scale-95'
                : input.trim() && isOllamaOnline
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/40 hover:scale-105 active:scale-95'
                : 'bg-[#1D152A] text-gray-500 cursor-not-allowed'
            }`}
          >
            {isSending ? <Square size={18} fill="currentColor" /> : <Send size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
};
