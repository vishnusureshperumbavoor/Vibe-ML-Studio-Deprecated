import React, { useState, useEffect } from 'react';
import { Zap, Sparkles, Brain, Activity, Loader2, Gauge } from 'lucide-react';
import { SmartSelector } from './SmartSelector';
import { callKimi } from '../services/aiService';

interface FineTuningPanelProps {
  onStart: (modelId: string, datasetId: string, hardware: string) => void;
  isExecuting: boolean;
}

export const FineTuningPanel: React.FC<FineTuningPanelProps> = ({ onStart, isExecuting }) => {
  const [modelId, setModelId] = useState('');
  const [datasetId, setDatasetId] = useState('');
  const [hardware, setHardware] = useState('CPU');
  const [forecast, setForecast] = useState<string | null>(null);
  const [isForecasting, setIsForecasting] = useState(false);

  useEffect(() => {
    if (modelId && datasetId) {
      handleGetForecast();
    } else {
      setForecast(null);
    }
  }, [modelId, datasetId]);

  const handleGetForecast = async () => {
    setIsForecasting(true);
    setForecast(null);
    try {
      const prompt = [
        { role: 'system', content: `You are a Senior ML Engineer. Provide a predictive "Forecast" for this SFT run. 
        
        CRITICAL FEASIBILITY CHECK:
        1. Assess if the Model (Text-only vs Vision/Audio) matches the Dataset capabilities.
        2. Assess if the Model size is realistic for the target Hardware.
        
        If there is a fatal mismatch (e.g. Text-only model on Image dataset), START your response with the exact phrase "⚠️ [COMPATIBILITY ALERT]". Then describe WHY it won't work.
        
        If it IS compatible, provide exactly two paragraphs:
        Paragraph 1: The narrative transformation and intuition gains.
        Paragraph 2: 2-3 specific prompts to test the model AFTER training.` },
        { role: 'user', content: `Base Model: ${modelId}\nKnowledge Dataset: ${datasetId}\nHardware Target: ${hardware}` }
      ];
      const result = await callKimi(prompt);
      setForecast(result);
    } catch (e) {
      console.error("Forecast failed:", e);
    } finally {
      setIsForecasting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest pl-1">Base Model</label>
          <SmartSelector 
            type="model" 
            placeholder="Select model to train..." 
            onSelect={setModelId} 
          />
          <p className="text-[10px] text-white/30 px-1">Tip: Tiny models like Qwen-0.5B are best for CPU.</p>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest pl-1">Knowledge Dataset</label>
          <SmartSelector 
            type="dataset" 
            placeholder="Select instruction dataset..." 
            onSelect={setDatasetId} 
          />
          <p className="text-[10px] text-white/30 px-1">Try: 'yahma/alpaca-cleaned' for general instructions.</p>
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest pl-1">Execution Hardware</label>
        <div className="flex gap-2">
          {['CPU', 'GPU'].map((hw) => (
            <button
              key={hw}
              onClick={() => setHardware(hw)}
              className={`flex-1 p-3 rounded-xl border text-xs font-bold transition-all
                ${hardware === hw 
                  ? 'bg-amber-500/10 border-amber-500/50 text-amber-400' 
                  : 'bg-white/5 border-white/5 text-white/40 hover:text-white/60'}
              `}
            >
              {hw} {hw === 'CPU' ? '🐌' : '🔥'}
            </button>
          ))}
        </div>
      </div>

      {(isForecasting || forecast) && (
        <div className={`relative group animate-in zoom-in-95 fade-in duration-500`}>
          <div className={`absolute -inset-0.5 rounded-[28px] blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200
            ${forecast?.startsWith('⚠️') ? 'bg-red-500/40' : 'bg-gradient-to-r from-amber-500/20 to-purple-600/20'}
          `}></div>
          <div className={`relative p-6 rounded-[24px] border space-y-4
            ${forecast?.startsWith('⚠️') ? 'bg-[#150505] border-red-500/30' : 'bg-[#1A1621] border-white/10'}
          `}>
            <div className="flex items-center justify-between">
              <div className={`flex items-center gap-2 ${forecast?.startsWith('⚠️') ? 'text-red-400' : 'text-amber-400'}`}>
                <Gauge size={14} className={isForecasting ? "animate-spin" : ""} />
                <span className="text-[10px] font-black uppercase tracking-widest">
                  {forecast?.startsWith('⚠️') ? 'Safety & Compatibility Alert' : 'VML Training Forecast'}
                </span>
              </div>
              {isForecasting && <span className="text-[8px] text-white/20 animate-pulse italic">Validating Architecture...</span>}
            </div>
            
            {isForecasting ? (
              <div className="space-y-2 py-2">
                <div className="h-2 w-3/4 bg-white/5 rounded-full animate-pulse" />
                <div className="h-2 w-1/2 bg-white/5 rounded-full animate-pulse" />
                <div className="h-2 w-2/3 bg-white/5 rounded-full animate-pulse" />
              </div>
            ) : (
              <div className={`text-[11px] leading-relaxed font-medium whitespace-pre-line prose prose-invert
                ${forecast?.startsWith('⚠️') ? 'text-red-200' : 'text-white/70'}
              `}>
                {forecast}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl bg-[#0B090F] border border-white/5 space-y-2">
          <div className="flex items-center gap-2 text-amber-500">
            <Sparkles size={14} />
            <span className="text-[10px] font-bold">LORA ADAPTERS</span>
          </div>
          <p className="text-[10px] text-white/40 leading-relaxed italic">
            "Enabled by default to preserve your system's RAM."
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-[#0B090F] border border-white/5 space-y-2">
          <div className="flex items-center gap-2 text-emerald-500">
            <Brain size={14} />
            <span className="text-[10px] font-bold">SFT ENGINE</span>
          </div>
          <p className="text-[10px] text-white/40 leading-relaxed italic">
            "Auto-maps your dataset columns for zero-config training."
          </p>
        </div>
      </div>

      <button
        disabled={!modelId || !datasetId || isExecuting}
        onClick={() => onStart(modelId, datasetId, hardware)}
        className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-bold text-sm transition-all shadow-2xl scale-100 active:scale-95
          ${!modelId || !datasetId || isExecuting 
            ? 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5' 
            : 'bg-amber-500 text-black hover:bg-amber-400 hover:shadow-amber-500/20'}
        `}
      >
        {isExecuting ? (
          <>
            <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
            <span>TRAINING IN PROGRESS...</span>
          </>
        ) : (
          <>
            <Zap size={18} fill="currentColor" />
            <span>START SUPERVISED FINE-TUNING</span>
          </>
        )}
      </button>
      
      <div className="flex items-center justify-center gap-2 text-[10px] text-white/20 pt-2">
        <Activity size={10} />
        <span>Output will stream below in a new Notebook cell.</span>
      </div>
    </div>
  );
};
