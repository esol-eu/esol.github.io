import React, { useState, useEffect } from 'react';
import { GameConfig } from '../types';
import { Settings, Copy, Check, X, ShieldAlert } from 'lucide-react';
import { generateShareUrl } from '../utils/permalink';

interface SetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: GameConfig;
  onSaveConfig: (newConfig: GameConfig) => void;
  onShowToast: (msg: string) => void;
}

export const SetupModal: React.FC<SetupModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  onShowToast,
}) => {
  const [challengesCount, setChallengesCount] = useState<number>(config.challengesCount || 3);
  const [attempts, setAttempts] = useState<number>(config.attempts || 1);
  const [secretCodesText, setSecretCodesText] = useState<string>(
    config.secrets.length > 0 ? config.secrets.join(', ') : 'OMEGA PROTOCOL, ALPHA SECRET'
  );
  const [accent, setAccent] = useState<string>(config.accent || 'en-US');
  const [previewEnabled, setPreviewEnabled] = useState<boolean>(config.previewEnabled);
  const [phrases, setPhrases] = useState<string[]>(config.phrases);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setChallengesCount(config.challengesCount || 3);
      setAttempts(config.attempts || 1);
      setSecretCodesText(config.secrets.length > 0 ? config.secrets.join(', ') : 'OMEGA PROTOCOL, ALPHA SECRET');
      setAccent(config.accent || 'en-US');
      setPreviewEnabled(config.previewEnabled);
      setPhrases(config.phrases);
    }
  }, [isOpen, config]);

  // Handle dynamic challenge count change
  const handleCountChange = (newCount: number) => {
    const clamped = Math.max(1, Math.min(10, newCount));
    setChallengesCount(clamped);

    setPhrases((prev) => {
      const next = [...prev];
      while (next.length < clamped) {
        next.push(`CHALLENGE PHRASE ${next.length + 1}`);
      }
      return next.slice(0, clamped);
    });
  };

  const handlePhraseChange = (idx: number, val: string) => {
    setPhrases((prev) => {
      const updated = [...prev];
      updated[idx] = val;
      return updated;
    });
  };

  const handleCopyLink = () => {
    const parsedSecrets = secretCodesText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const tempConfig: GameConfig = {
      challengesCount,
      attempts,
      secrets: parsedSecrets.length > 0 ? parsedSecrets : ['VICTORY SECRET'],
      secretIndex: 0,
      accent,
      previewEnabled,
      phrases: phrases.map((p, i) => p.trim() || `PASSCODE ${i + 1}`),
    };

    const url = generateShareUrl(tempConfig);
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      onShowToast('Permalink copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const parsedSecrets = secretCodesText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (parsedSecrets.length === 0) {
      onShowToast('Please provide at least one secret code.');
      return;
    }

    const cleanPhrases = phrases.slice(0, challengesCount).map((p, i) => p.trim() || `PASSCODE ${i + 1}`);

    const newConfig: GameConfig = {
      challengesCount,
      attempts: Math.max(1, attempts),
      secrets: parsedSecrets,
      secretIndex: 0,
      accent,
      previewEnabled,
      phrases: cleanPhrases,
    };

    onSaveConfig(newConfig);
    onClose();
    onShowToast('Room configured & started!');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-cinzel">Configure Escape Room</h2>
              <p className="text-xs text-slate-400">Set challenge passcodes, cycles, and voice parameters</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="py-4 space-y-4 overflow-y-auto pr-1 flex-1">
          {/* Top row: challenges & attempts */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Number of Padlocks (1-10)
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={challengesCount}
                onChange={(e) => handleCountChange(parseInt(e.target.value, 10) || 1)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-amber-500 transition"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Attempts per Padlock
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={attempts}
                onChange={(e) => setAttempts(parseInt(e.target.value, 10) || 1)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-amber-500 transition"
                required
              />
            </div>
          </div>

          {/* Secret codes for cycling */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Secret Code(s) (comma-separated for cycling)
            </label>
            <input
              type="text"
              value={secretCodesText}
              onChange={(e) => setSecretCodesText(e.target.value)}
              placeholder="e.g. OMEGA PROTOCOL, ALPHA SECRET, CIPHER DELTA"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-amber-500 transition"
              required
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Revealed to players upon escaping. If multiple codes are provided, each playthrough cycles to the next secret!
            </p>
          </div>

          {/* Custom vocal phrases list */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Custom Vocal Passcodes ({challengesCount})
              </label>
              <span className="text-[10px] text-slate-500">Players say these phrases aloud to unlock</span>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {Array.from({ length: challengesCount }).map((_, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-xs font-mono text-slate-500 w-7 shrink-0">#{idx + 1}</span>
                  <input
                    type="text"
                    value={phrases[idx] || ''}
                    onChange={(e) => handlePhraseChange(idx, e.target.value)}
                    placeholder={`e.g. Open Sesame or Alpha Beta ${idx + 1}`}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 transition"
                    required
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Accent & Preview settings */}
          <div className="grid grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Accent / Language
              </label>
              <select
                value={accent}
                onChange={(e) => setAccent(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 transition"
              >
                <option value="en-US">American English (en-US)</option>
                <option value="en-GB">British English (en-GB)</option>
                <option value="en-AU">Australian English (en-AU)</option>
                <option value="en-CA">Canadian English (en-CA)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Audio Preview Feature (TTS)
              </label>
              <select
                value={previewEnabled ? 'true' : 'false'}
                onChange={(e) => setPreviewEnabled(e.target.value === 'true')}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 transition"
              >
                <option value="true">Enabled (Hear Pronunciation)</option>
                <option value="false">Disabled (Hardcore Mode)</option>
              </select>
            </div>
          </div>

          {/* Permalink copy bar */}
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between">
            <div className="text-xs text-slate-400">
              <span className="font-semibold text-slate-300">Shareable Room Link</span>
              <p className="text-[11px] text-slate-500">Save or send this exact setup with a permalink</p>
            </div>
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 rounded-xl text-xs font-medium transition flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy Permalink'}
            </button>
          </div>

          {/* Footer Submit */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold rounded-xl text-xs transition shadow-lg shadow-amber-950/30"
            >
              Save & Launch Escape Room
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
