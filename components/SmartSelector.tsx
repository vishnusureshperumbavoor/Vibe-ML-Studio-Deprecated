import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Check, Loader2, Cpu, Lock, Star, Download } from 'lucide-react';

interface ModelResult {
  id: string;
  downloads: number;
  likes: number;
  gated: boolean;
  is_cpu_ready: boolean;
}

interface SmartSelectorProps {
  type: 'model' | 'dataset';
  onSelect: (id: string) => void;
  placeholder: string;
  defaultValue?: string;
}

export const SmartSelector: React.FC<SmartSelectorProps> = ({ type, onSelect, placeholder, defaultValue }) => {
  const [query, setQuery] = useState(defaultValue || '');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const skipSearchRef = useRef(false);

  const search = async (q: string) => {
    if (!q || q.length < 2) return;
    setIsLoading(true);
    // Removed setIsOpen(true) from here to prevent auto-reopening on selection
    try {
      const toolName = type === 'model' ? 'model_search' : 'dataset_search';
      const mcpUrl = "http://127.0.0.1:1001/mcp/call"; 
      
      const resp = await fetch(mcpUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: toolName,
          arguments: { query: q, limit: 10 }
        })
      });
      
      const payload = await resp.json();
      const content = payload.result || payload; 
      
      if (content && content[0] && content[0].text) {
        let text = content[0].text;
        
        if (text.includes("[JSON_RESULTS]")) {
          const jsonStr = text.split("[JSON_RESULTS]")[1].trim();
          const parsed = JSON.parse(jsonStr);
          setResults(parsed);
        } else {
          const regex = /-\s+\*\*(.*?)\*\*\s+\(Downloads:\s+(.*?)\)/g;
          const parsed: any[] = [];
          let m;
          while ((m = regex.exec(text)) !== null) {
            parsed.push({
              id: m[1],
              downloads: parseInt(m[2].replace(/,/g, '')),
              likes: 0,
              gated: false,
              is_cpu_ready: m[1].toLowerCase().includes('0.5b') || m[1].toLowerCase().includes('360m')
            });
          }
          setResults(parsed);
        }
      }
    } catch (e) {
      console.error("Search failed:", e);
    } finally {
      setIsLoading(false);
    }
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (skipSearchRef.current) {
        skipSearchRef.current = false;
        return;
      }
      if (query && query !== defaultValue) search(query);
    }, 500);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white/40 group-focus-within:text-amber-500 transition-colors">
          <Search size={16} />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (query.length >= 2) setIsOpen(true);
          }}
          placeholder={placeholder}
          className="w-full bg-[#0B090F] border border-white/10 rounded-2xl pl-10 pr-10 py-3.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-amber-500/50 focus:ring-4 focus:ring-amber-500/5 transition-all shadow-inner"
        />
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-white/20">
          {isLoading ? <Loader2 size={16} className="animate-spin text-amber-500" /> : <ChevronDown size={16} />}
        </div>
      </div>

      {isOpen && (results.length > 0 || isLoading) && (
        <div className="absolute z-50 w-full mt-2 bg-[#121016] border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl max-h-80 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-2 space-y-1">
            {results.map((res) => (
              <button
                key={res.id}
                onClick={() => {
                  skipSearchRef.current = true;
                  setQuery(res.id);
                  onSelect(res.id);
                  setIsOpen(false);
                  setResults([]);
                }}
                className="w-full flex flex-col items-start p-3 rounded-xl hover:bg-white/5 transition-all text-left group border border-transparent hover:border-white/10"
              >
                <div className="flex items-center justify-between w-full gap-2">
                  <span className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors truncate">
                    {res.id}
                  </span>
                  <div className="flex items-center gap-1.5 flex-none text-[10px] font-bold">
                    {res.is_cpu_ready && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <Cpu size={10} /> CPU READY
                      </span>
                    )}
                    {res.gated && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <Lock size={10} /> GATED
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-4 mt-2 text-[10px] text-white/40">
                  <span className="flex items-center gap-1">
                    <Download size={10} /> {res.downloads.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Star size={10} /> {res.likes.toLocaleString()}
                  </span>
                </div>
              </button>
            ))}
            {!isLoading && results.length === 0 && (
              <div className="p-4 text-center text-xs text-white/20 italic">
                No matching {type}s found.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
