import React from 'react';
import { Lock, Unlock } from 'lucide-react';

interface PadlockProps {
  isOpen: boolean;
  isUnlockedTemp?: boolean;
  challengeIndex: number;
  totalChallenges: number;
}

export const Padlock: React.FC<PadlockProps> = ({
  isOpen,
  isUnlockedTemp,
  challengeIndex,
  totalChallenges,
}) => {
  const isCurrentlyOpen = isOpen || isUnlockedTemp;

  return (
    <div className="relative group select-none flex flex-col items-center">
      {/* Background radial glow */}
      <div
        className={`absolute inset-0 rounded-full blur-2xl transition-all duration-700 pointer-events-none ${
          isCurrentlyOpen
            ? 'bg-emerald-500/20 scale-110'
            : 'bg-amber-500/10 group-hover:bg-amber-500/20 scale-95'
        }`}
      />

      <div className="relative bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-2xl flex flex-col items-center w-48 sm:w-52 backdrop-blur-md transition-transform duration-300">
        {/* Padlock Shackle */}
        <div
          className={`w-20 h-22 border-[6px] rounded-t-full transition-all duration-700 transform origin-bottom-right relative -mb-4 z-0 ${
            isCurrentlyOpen
              ? 'border-emerald-400 -translate-y-4 rotate-[-18deg] shadow-md shadow-emerald-500/30'
              : 'border-slate-400 translate-y-0 rotate-0'
          }`}
          style={{
            borderBottomColor: 'transparent',
          }}
        >
          {/* Shackle metallic shine */}
          <div className="absolute top-1.5 left-1.5 right-1.5 h-1.5 rounded-t-full bg-white/20 blur-[1px]" />
        </div>

        {/* Padlock Main Body */}
        <div
          className={`relative z-10 w-32 h-28 rounded-xl flex flex-col items-center justify-center shadow-2xl transition-all duration-500 border-2 ${
            isCurrentlyOpen
              ? 'bg-gradient-to-b from-slate-800 via-emerald-950/40 to-slate-900 border-emerald-500/60 shadow-emerald-900/40'
              : 'bg-gradient-to-b from-slate-800 via-slate-850 to-slate-900 border-slate-700 shadow-amber-950/20'
          }`}
        >
          {/* Subtle screw details in corners */}
          <div className="absolute top-2 left-2 w-1.5 h-1.5 rounded-full bg-slate-600/50 shadow-inner" />
          <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-slate-600/50 shadow-inner" />
          <div className="absolute bottom-2 left-2 w-1.5 h-1.5 rounded-full bg-slate-600/50 shadow-inner" />
          <div className="absolute bottom-2 right-2 w-1.5 h-1.5 rounded-full bg-slate-600/50 shadow-inner" />

          {/* Keyhole / Lock Status Center */}
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center shadow-inner transition-colors duration-500 mb-1.5 border ${
              isCurrentlyOpen
                ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-400 shadow-emerald-500/30'
                : 'bg-slate-950 border-slate-700 text-amber-400 shadow-slate-950'
            }`}
          >
            {isCurrentlyOpen ? (
              <Unlock className="w-5 h-5 text-emerald-400 animate-pulse" />
            ) : (
              <Lock className="w-5 h-5 text-amber-400" />
            )}
          </div>

          <div className="text-center">
            <span className="text-[10px] tracking-wider uppercase font-semibold text-slate-300">
              Padlock #{challengeIndex + 1}
            </span>
            <div className="text-[9px] text-slate-500 font-mono">
              {challengeIndex + 1} of {totalChallenges}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
