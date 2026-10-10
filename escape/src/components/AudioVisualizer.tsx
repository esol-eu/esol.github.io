import React from 'react';

interface AudioVisualizerProps {
  level: number; // 0 - 100
  isListening: boolean;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ level, isListening }) => {
  // 9 animated reactive frequency bars
  const bars = [0.4, 0.7, 1.0, 1.4, 1.8, 1.3, 0.9, 0.6, 0.3];

  return (
    <div className="flex items-center justify-center gap-1.5 h-8 px-4 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 shadow-inner">
      <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mr-2 flex items-center gap-1.5">
        <span
          className={`w-2 h-2 rounded-full transition-colors duration-300 ${
            isListening ? (level > 8 ? 'bg-emerald-400 animate-ping' : 'bg-amber-400 animate-pulse') : 'bg-slate-600'
          }`}
        />
        <span>{isListening ? (level > 8 ? 'Voice Detected' : 'Listening...') : 'Mic Inactive'}</span>
      </div>

      <div className="flex items-end gap-1 h-5 w-24">
        {bars.map((weight, i) => {
          const barHeight = isListening ? Math.max(3, Math.min(20, Math.round((level / 100) * 20 * weight))) : 3;
          const isHigh = level > 35;
          return (
            <div
              key={i}
              style={{ height: `${barHeight}px` }}
              className={`w-1.5 rounded-full transition-all duration-75 ${
                isListening
                  ? isHigh
                    ? 'bg-gradient-to-t from-amber-500 to-emerald-400 shadow-sm shadow-emerald-400/50'
                    : 'bg-amber-400'
                  : 'bg-slate-700'
              }`}
            />
          );
        })}
      </div>

      <div className="text-[10px] font-mono text-slate-400 w-8 text-right">
        {isListening ? `${level}%` : '0%'}
      </div>
    </div>
  );
};
