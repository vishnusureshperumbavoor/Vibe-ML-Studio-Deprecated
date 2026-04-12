import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, User, Bot, ChevronDown, Trash2, Loader2, Sparkles } from 'lucide-react';
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

export const ChatView: React.FC<ChatViewProps> = ({ 
  ollamaModels, 
  isOllamaOnline,
  selectedModel,
  onModelChange
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ollamaModels.length > 0 && !selectedModel) {
      onModelChange(ollamaModels[0].name);
    }
  }, [ollamaModels, selectedModel, onModelChange]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !selectedModel || isSending) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsSending(true);

    try {
      const response = await fetch('http://127.0.0.1:11434/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel,
          messages: [...messages, userMessage],
          stream: true,
        }),
      });

      if (!response.body) return;
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      let buffer = ''; // Buffer for partial JSON chunks
      
      // Add initial empty assistant message
      setMessages(prev => [...prev, { role: 'assistant', content: '', reasoning: '' }]);

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
                  setMessages(prev => {
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
            } catch (e) {
              // Partial line or malformed JSON
            }
          }
          boundary = buffer.indexOf('\n');
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "Error: Failed to reach Ollama. Is the service running?" 
      }]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#0B090F] relative overflow-hidden">
      {/* Dynamic Background Accents */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-900/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Header / Model Selector */}
      <div className="flex-none h-16 border-b border-[#352554]/50 bg-[#140F1D]/50 backdrop-blur-md px-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
            <MessageSquare className="text-purple-400" size={18} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[#E2D8F0]">AI Chat Interface</h2>
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${isOllamaOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span className="text-[10px] text-[#9480B3] uppercase tracking-widest font-bold">
                {isOllamaOnline ? 'Ollama Ready' : 'Ollama Offline'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative group">
            <select
              value={selectedModel}
              onChange={(e) => onModelChange(e.target.value)}
              className="appearance-none bg-[#1D152A] border border-purple-500/30 text-[#E2D8F0] text-xs py-2.5 pl-4 pr-12 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all cursor-pointer hover:bg-[#251B36] font-medium shadow-inner"
              disabled={!isOllamaOnline || ollamaModels.length === 0}
            >
              {ollamaModels.length > 0 ? (
                ollamaModels.map((m) => (
                  <option key={m.name} value={m.name} className="bg-[#1D152A]">
                    {m.name.toUpperCase()} {m.details?.parameter_size ? `• ${m.details.parameter_size}` : ''}
                  </option>
                ))
              ) : (
                <option>No Models Available</option>
              )}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center pr-1 border-l border-[#352554] pl-2">
              <ChevronDown className="text-purple-400" size={14} />
            </div>
          </div>

          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setMessages([])}
            title="Clear Chat"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto w-full scroll-smooth custom-scrollbar relative z-0">
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
                
                // Thought Extraction Logic
                let thought = msg.reasoning || '';
                let finalContent = msg.content;
                
                // Fallback for models that don't use reasoning_content field but use tags
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
                        {/* Thinking UI */}
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
              <div ref={messagesEndRef} className="h-24" />
            </>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="flex-none p-6 bg-gradient-to-t from-[#0B090F] to-transparent z-10">
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
            placeholder={isOllamaOnline ? `Message ${selectedModel}...` : "Waiting for Ollama..."}
            className="w-full bg-[#140F1D]/80 backdrop-blur-xl border border-[#352554] rounded-3xl p-5 pr-16 text-[#E2D8F0] placeholder-[#9480B3] focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all resize-none shadow-2xl h-[72px]"
            rows={1}
            disabled={!isOllamaOnline || isSending}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isSending || !isOllamaOnline}
            className={`absolute right-3 top-1/2 -translate-y-1/2 w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
              input.trim() && !isSending && isOllamaOnline
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/40 hover:scale-105 active:scale-95'
                : 'bg-[#1D152A] text-gray-500 cursor-not-allowed'
            }`}
          >
            {isSending ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
};
