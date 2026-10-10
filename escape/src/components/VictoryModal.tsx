import React from 'react';
import { Trophy, Clock, Zap, ArrowRight, RotateCcw, Key } from 'lucide-react';

interface VictoryModalProps {
  isOpen: boolean;
  secretCode: string;
  totalTime: string;
  totalAttemptsUsed: number;
  onPlayNextCycle: () => void;
  onRestartSame: () => void;
  hasNextSecret: boolean;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  isOpen,
  secretCode,
  totalTime,
  totalAttemptsUsed,
  onPlayNextCycle,
  onRestartSame,
  hasNextSecret,
}) => {
  if (!isOpen) return null;

  return (
    <div className="w-full max-w-lg bg-slate-900/90 border border-amber-500/40 rounded-3xl p-8 shadow-2xl backdrop-blur-xl text-center animate-in fade-in zoom-in-95 duration-500">
      {/* Animated Lock-Open Icon */}
      <div className="w-20 h-20 bg-amber-500/20 border-2 border-amber-400 rounded-full flex items-center justify-center text-amber-400 text-3xl mx-auto mb-5 shadow-lg shadow-amber-500/20 animate-bounce">
        <Trophy className="w-10 h-10 text-amber-400" />
      </div>

      <h2 className="text-3xl font-cinzel font-bold text-white mb-2">Success!</h2>
      <p className="text-slate-300 text-xs sm:text-sm mb-6 leading-relaxed max-w-md mx-auto">
        Well done you completed the task!
      </p>

      {/* Secret Code Revealed Box */}
      <div className="mb-6 bg-slate-950/90 p-5 rounded-2xl border border-amber-500/50 shadow-inner relative overflow-hidden">
        <div className="absolute top-0 right-0 p-3 opacity-10">
          <Key className="w-20 h-20 text-amber-400" />
        </div>
        <span className="text-[11px] uppercase tracking-widest text-slate-400 font-semibold block mb-2">
          Make a careful note of this code:
        </span>
        <div className="text-2xl sm:text-3xl font-cinzel font-bold text-amber-400 tracking-wider break-words">
          {secretCode || 'VICTORY OMEGA'}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6 bg-slate-950/70 p-4 rounded-2xl border border-slate-800 text-left">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-amber-400 border border-slate-800">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase font-semibold">Total Time</div>
            <div className="text-lg font-mono font-bold text-amber-400">{totalTime}</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-indigo-400 border border-slate-800">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase font-semibold">Attempts Logged</div>
            <div className="text-lg font-mono font-bold text-indigo-400">{totalAttemptsUsed}</div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2.5">
        <button
          type="button"
          onClick={onPlayNextCycle}
          className="w-full py-3.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold rounded-xl transition shadow-lg shadow-amber-950/30 flex items-center justify-center gap-2 text-sm"
        >
          <span>Play Again</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onRestartSame}
          className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl transition text-xs flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Restart Same Code</span>
        </button>
      </div>
    </div>
  );
};
