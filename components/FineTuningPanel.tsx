import React, { useState } from 'react';
import { Zap, Sparkles, Brain, Activity } from 'lucide-react';
import { SmartSelector } from './SmartSelector';

interface FineTuningPanelProps {
  onStart: (modelId: string, datasetId: string, hardware: string) => void;
  isExecuting: boolean;
}

export const FineTuningPanel: React.FC<FineTuningPanelProps> = ({ onStart, isExecuting }) => {
  const [modelId, setModelId] = useState('');
  const [datasetId, setDatasetId] = useState('');
  const [hardware, setHardware] = useState('CPU');

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
