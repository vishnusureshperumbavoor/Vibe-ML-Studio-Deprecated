import React, { useMemo } from 'react';

interface PlotPoint {
  vml_step: number;
  loss?: number;
  grad_norm?: number;
  learning_rate?: number;
  [key: string]: any;
}

interface PlotViewProps {
  data: PlotPoint[];
}

export const PlotView: React.FC<PlotViewProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border border-white/5 bg-black/20 rounded-2xl animate-pulse">
        <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Awaiting Telemetry Stream...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-500">
      <ChartPane 
        title="Training Loss" 
        data={data} 
        dataKey="loss" 
        color="#F59E0B" 
        suggestedMin={0}
      />
      <ChartPane 
        title="Learning Rate" 
        data={data} 
        dataKey="learning_rate" 
        color="#8B5CF6" 
      />
      <ChartPane 
        title="Gradient Norm" 
        data={data} 
        dataKey="grad_norm" 
        color="#10B981" 
      />
      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col justify-center">
        <h3 className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mb-3">Live Metrics</h3>
        <div className="grid grid-cols-2 gap-4">
          <MetricStat label="Current Step" value={data[data.length-1].vml_step} />
          <MetricStat label="Current Loss" value={data[data.length-1].loss?.toFixed(4) || 'N/A'} />
          <MetricStat label="Grad Norm" value={data[data.length-1].grad_norm?.toFixed(2) || 'N/A'} />
          <MetricStat label="Epoch" value={data[data.length-1].vml_epoch?.toFixed(2) || 'N/A'} />
        </div>
      </div>
    </div>
  );
};

const MetricStat = ({ label, value }: { label: string, value: any }) => (
  <div className="space-y-1">
    <p className="text-[8px] font-bold text-white/20 uppercase tracking-tighter">{label}</p>
    <p className="text-xs font-black text-white/70 tabular-nums">{value}</p>
  </div>
);

const ChartPane = ({ title, data, dataKey, color, suggestedMin }: { title: string, data: any[], dataKey: string, color: string, suggestedMin?: number }) => {
  const points = useMemo(() => {
    const validPoints = data.filter(p => p[dataKey] !== undefined);
    if (validPoints.length === 0) return [];
    
    const minX = validPoints[0].vml_step;
    const maxX = validPoints[validPoints.length - 1].vml_step || minX + 1;
    const values = validPoints.map(p => p[dataKey]);
    const minY = suggestedMin !== undefined ? Math.min(suggestedMin, ...values) : Math.min(...values);
    const maxY = Math.max(...values);
    const rangeY = maxY - minY || 1;
    const rangeX = maxX - minX || 1;

    return validPoints.map(p => ({
      x: ((p.vml_step - minX) / rangeX) * 100,
      y: 100 - (((p[dataKey] - minY) / rangeY) * 100)
    }));
  }, [data, dataKey]);

  return (
    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">{title}</h3>
        <span className="text-[10px] font-bold tabular-nums" style={{ color }}>
          {data[data.length-1][dataKey]?.toExponential ? data[data.length-1][dataKey].toExponential(2) : data[data.length-1][dataKey]}
        </span>
      </div>
      
      <div className="h-32 w-full relative overflow-hidden rounded-lg bg-black/20">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
          {/* Grid lines */}
          <line x1="0" y1="25" x2="100" y2="25" stroke="white" strokeWidth="0.1" strokeOpacity="0.05" />
          <line x1="0" y1="50" x2="100" y2="50" stroke="white" strokeWidth="0.1" strokeOpacity="0.05" />
          <line x1="0" y1="75" x2="100" y2="75" stroke="white" strokeWidth="0.1" strokeOpacity="0.05" />
          
          {/* Path */}
          <polyline
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={points.map(p => `${p.x},${p.y}`).join(' ')}
            className="drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]"
          />
          
          {/* Animated Point */}
          {points.length > 0 && (
            <circle
              cx={points[points.length-1].x}
              cy={points[points.length-1].y}
              r="2"
              fill={color}
              className="animate-pulse"
            />
          )}
        </svg>
      </div>
    </div>
  );
};
