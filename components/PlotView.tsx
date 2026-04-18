import React, { useMemo } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { Activity, Zap, Target, Gauge } from 'lucide-react';

interface PlotPoint {
  vml_step: number;
  loss?: number;
  grad_norm?: number;
  learning_rate?: number;
  vml_epoch?: number;
  [key: string]: any;
}

interface PlotViewProps {
  data: PlotPoint[];
}

// Simple Moving Average for smoothing
const smoothData = (data: PlotPoint[], window: number = 5) => {
  return data.map((point, index) => {
    const start = Math.max(0, index - window + 1);
    const subset = data.slice(start, index + 1);
    const sum = subset.reduce((acc, p) => acc + (p.loss || 0), 0);
    return {
      ...point,
      loss_smoothed: sum / subset.length
    };
  });
};

export const PlotView: React.FC<PlotViewProps> = ({ data }) => {
  const processedData = useMemo(() => smoothData(data), [data]);
  
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border border-white/5 bg-black/20 rounded-2xl animate-pulse">
        <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Awaiting Telemetry Stream...</p>
      </div>
    );
  }

  const lastPoint = data[data.length - 1];

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* Top Row: Main Stats View */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard icon={<Target size={14} className="text-amber-500" />} label="Loss" value={lastPoint.loss?.toFixed(4) || 'N/A'} trend={-5} />
        <MetricCard icon={<Zap size={14} className="text-purple-500" />} label="Step" value={lastPoint.vml_step} />
        <MetricCard icon={<Gauge size={14} className="text-emerald-500" />} label="Grad Norm" value={lastPoint.grad_norm?.toFixed(2) || 'N/A'} />
        <MetricCard icon={<Activity size={14} className="text-blue-500" />} label="Epoch" value={lastPoint.vml_epoch?.toFixed(2) || 'N/A'} />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Training Loss - The Master Chart */}
        <ChartContainer title="Training Loss" subtitle="Raw vs Smoothed (EMA)">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={processedData}>
              <defs>
                <linearGradient id="colorLoss" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
              <XAxis dataKey="vml_step" hide />
              <YAxis domain={['auto', 'auto']} hide />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1A1625', border: '1px solid #3F3F46', fontSize: '10px', borderRadius: '8px' }}
                itemStyle={{ color: '#F59E0B' }}
              />
              <Area type="monotone" dataKey="loss_smoothed" stroke="#F59E0B" strokeWidth={2} fillOpacity={1} fill="url(#colorLoss)" />
              <Line type="monotone" dataKey="loss" stroke="#F59E0B" strokeWidth={1} strokeOpacity={0.2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Learning Rate - Scheduled Decay */}
        <ChartContainer title="Learning Rate" subtitle="Scheduled Steps">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
              <XAxis dataKey="vml_step" hide />
              <YAxis hide />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1A1625', border: '1px solid #3F3F46', fontSize: '10px', borderRadius: '8px' }}
                itemStyle={{ color: '#8B5CF6' }}
              />
              <Line type="monotone" dataKey="learning_rate" stroke="#8B5CF6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Gradient Norm - Stability Tracker */}
        <ChartContainer title="Gradient Norm" subtitle="Numerical Stability">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
              <XAxis dataKey="vml_step" hide />
              <YAxis hide />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1A1625', border: '1px solid #3F3F46', fontSize: '10px', borderRadius: '8px' }}
                itemStyle={{ color: '#10B981' }}
              />
              <Line type="monotone" dataKey="grad_norm" stroke="#10B981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Evaluation Holder */}
        <div className="rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col items-center justify-center p-8 text-center space-y-2 opacity-50">
            <Activity size={24} className="text-white/10" />
            <h4 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Evaluation not configured</h4>
            <p className="text-[9px] text-white/20 uppercase tracking-widest max-w-[200px]">Set evaluation_dataset to track validation metrics</p>
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ icon, label, value, trend }: { icon: React.ReactNode, label: string, value: any, trend?: number }) => (
  <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 space-y-1 hover:bg-white/[0.05] transition-colors">
    <div className="flex items-center gap-2 mb-1">
      {icon}
      <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">{label}</span>
    </div>
    <div className="flex items-baseline gap-2">
      <span className="text-lg font-black text-white/80 tabular-nums">{value}</span>
      {trend && (
        <span className={`text-[8px] font-bold ${trend < 0 ? 'text-emerald-500' : 'text-red-500'}`}>
          {trend > 0 ? '+' : ''}{trend}%
        </span>
      )}
    </div>
  </div>
);

const ChartContainer = ({ title, subtitle, children }: { title: string, subtitle: string, children: React.ReactNode }) => (
  <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-5 space-y-4">
    <div className="flex flex-col">
      <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">{title}</h3>
      <p className="text-[9px] text-white/10 uppercase tracking-widest">{subtitle}</p>
    </div>
    <div className="h-40 w-full">
      {children}
    </div>
  </div>
);
