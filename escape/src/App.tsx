import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameConfig } from './types';
import { decodeConfig } from './utils/permalink';
import {
  playUnlockChime,
  playFailBuzz,
  playMechanicalClick,
  playVictoryFanfare,
  speakPhrase,
} from './utils/audio';
import { useSpeechMic } from './hooks/useSpeechMic';
import { Padlock } from './components/Padlock';
import { AudioVisualizer } from './components/AudioVisualizer';
import { SetupModal } from './components/SetupModal';
import { MicDiagnosticModal } from './components/MicDiagnosticModal';
import { VictoryModal } from './components/VictoryModal';
import {
  Mic,
  MicOff,
  Volume2,
  Clock,
  Zap,
  Settings,
  Link as LinkIcon,
  HelpCircle,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ChevronDown,
} from 'lucide-react';
import { generateShareUrl } from './utils/permalink';

const DEFAULT_CONFIG: GameConfig = {
  challengesCount: 3,
  attempts: 2,
  secrets: ['OMEGA PROTOCOL - ESCAPE CIPHER 9', 'ALPHA PHOENIX - 4402', 'TITAN VAULT - KEY 771'],
  secretIndex: 0,
  accent: 'en-US',
  previewEnabled: true,
  phrases: ['OPEN SESAME', 'VOICE CIPHER SEVEN', 'EMERGENCY OVERRIDE'],
};

export default function App() {
  const [config, setConfig] = useState<GameConfig>(DEFAULT_CONFIG);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [remainingAttempts, setRemainingAttempts] = useState(2);
  const [attemptsUsedTotal, setAttemptsUsedTotal] = useState(0);

  // Padlock animation states
  const [isUnlockedTemp, setIsUnlockedTemp] = useState(false);

  // Timer
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Modals & Panels
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [isDiagnosticOpen, setIsDiagnosticOpen] = useState(false);
  const [isVictoryOpen, setIsVictoryOpen] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Auto-hiding top bar state
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const headerTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Status feedback message
  const [feedbackMessage, setFeedbackMessage] = useState<string>('Click microphone and speak');
  const [feedbackType, setFeedbackType] = useState<'neutral' | 'success' | 'error'>('neutral');

  // Preview TTS playing
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  }, []);

  // Header auto-hide mouse listener
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (e.clientY < 75) {
        setIsHeaderVisible(true);
        if (headerTimerRef.current) {
          clearTimeout(headerTimerRef.current);
          headerTimerRef.current = null;
        }
      } else {
        if (isHeaderVisible && !headerTimerRef.current) {
          headerTimerRef.current = setTimeout(() => {
            setIsHeaderVisible(false);
            headerTimerRef.current = null;
          }, 1800);
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Initial timeout to auto-hide after first load
    headerTimerRef.current = setTimeout(() => {
      setIsHeaderVisible(false);
      headerTimerRef.current = null;
    }, 3500);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (headerTimerRef.current) clearTimeout(headerTimerRef.current);
    };
  }, [isHeaderVisible]);

  // Normalize string for fuzzy match
  const normalize = (str: string) => {
    return str
      .toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const isMatch = useCallback((spoken: string, target: string) => {
    const s = normalize(spoken);
    const t = normalize(target);
    if (!s || !t) return false;
    if (s === t) return true;
    if (s.includes(t) || t.includes(s)) return true;

    // Convert common word numbers
    const numMap: Record<string, string> = {
      zero: '0',
      one: '1',
      two: '2',
      three: '3',
      four: '4',
      five: '5',
      six: '6',
      seven: '7',
      eight: '8',
      nine: '9',
      ten: '10',
    };
    let sConv = s;
    let tConv = t;
    Object.entries(numMap).forEach(([word, digit]) => {
      sConv = sConv.replace(new RegExp(`\\b${word}\\b`, 'g'), digit);
      tConv = tConv.replace(new RegExp(`\\b${word}\\b`, 'g'), digit);
    });

    return sConv === tConv || sConv.includes(tConv) || tConv.includes(sConv);
  }, []);

  // Passcode evaluation
  const handlePasscodeAttempt = useCallback(
    (spokenText: string) => {
      const targetPhrase = config.phrases[currentIndex] || '';
      setAttemptsUsedTotal((prev) => prev + 1);

      if (isMatch(spokenText, targetPhrase)) {
        // SUCCESS!
        playUnlockChime();
        setIsUnlockedTemp(true);
        setFeedbackMessage(`Passcode Accepted! "${spokenText}"`);
        setFeedbackType('success');

        setTimeout(() => {
          setIsUnlockedTemp(false);
          const nextIdx = currentIndex + 1;
          if (nextIdx >= config.challengesCount) {
            // ALL SOLVED!
            setIsTimerRunning(false);
            playVictoryFanfare();
            setIsVictoryOpen(true);
            speechHook.stopListening();
          } else {
            setCurrentIndex(nextIdx);
            setRemainingAttempts(config.attempts);
            setFeedbackMessage('Padlock unlocked! Ready for next challenge.');
            setFeedbackType('neutral');
            speechHook.resetTranscript();
          }
        }, 1100);
      } else {
        // FAIL!
        playFailBuzz();
        const nextAttempts = remainingAttempts - 1;
        setRemainingAttempts(nextAttempts);

        if (nextAttempts <= 0) {
          setFeedbackMessage(`Attempts exhausted for Padlock #${currentIndex + 1}. Resetting attempts...`);
          setFeedbackType('error');
          speechHook.stopListening();
          setTimeout(() => {
            setRemainingAttempts(config.attempts);
            setFeedbackMessage('Try again! Click microphone and speak.');
            setFeedbackType('neutral');
          }, 1500);
        } else {
          setFeedbackMessage(`Incorrect phrase ("${spokenText}"). ${nextAttempts} attempt(s) remaining!`);
          setFeedbackType('error');
        }
      }
    },
    [config, currentIndex, remainingAttempts, isMatch]
  );

  // Hook for speech recognition & mic level
  const speechHook = useSpeechMic((finalText) => {
    handlePasscodeAttempt(finalText);
  });

  // URL query parameter parsing on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const data = params.get('data') || params.get('q');
    if (data) {
      const decoded = decodeConfig(data);
      if (decoded && decoded.challengesCount) {
        setConfig((prev) => ({
          ...prev,
          ...decoded,
        } as GameConfig));
        setRemainingAttempts(decoded.attempts || 1);
        setCurrentIndex(0);
        setIsTimerRunning(true);
        return;
      }
    }

    // Default room starts running
    setIsTimerRunning(true);
  }, []);

  // Timer interval
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setSecondsElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning]);

  // Format MM:SS
  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60)
      .toString()
      .padStart(2, '0');
    const secs = (totalSec % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const currentTargetPhrase = config.phrases[currentIndex] || 'CODE';

  // Toggle listening
  const handleToggleListening = async () => {
    playMechanicalClick();

    if (speechHook.isListening) {
      speechHook.stopListening();
      setFeedbackMessage('Microphone paused.');
      setFeedbackType('neutral');
    } else {
      setFeedbackMessage('Listening... Speak the required passcode clearly!');
      setFeedbackType('neutral');
      const started = await speechHook.startListening(config.accent);
      if (!started) {
        setFeedbackMessage('Could not activate mic. Click "Test Mic" in header.');
        setFeedbackType('error');
      }
    }
  };

  // Play pronunciation TTS
  const handlePlayPreview = async () => {
    if (isPlayingPreview) return;
    setIsPlayingPreview(true);
    await speakPhrase(currentTargetPhrase, config.accent);
    setIsPlayingPreview(false);
  };

  // Copy Permalink
  const handleCopyPermalink = () => {
    const url = generateShareUrl(config);
    navigator.clipboard.writeText(url).then(() => {
      showToast('Room permalink copied to clipboard!');
    });
  };

  // Victory handlers
  const handlePlayNextCycle = () => {
    const nextSecretIdx = (config.secretIndex + 1) % config.secrets.length;
    setConfig((prev) => ({
      ...prev,
      secretIndex: nextSecretIdx,
    }));
    restartGame();
  };

  const restartGame = () => {
    setCurrentIndex(0);
    setRemainingAttempts(config.attempts);
    setSecondsElapsed(0);
    setIsTimerRunning(true);
    setIsVictoryOpen(false);
    setIsUnlockedTemp(false);
    speechHook.resetTranscript();
    setFeedbackMessage('New session started. Speak the first passcode!');
    setFeedbackType('neutral');
  };

  const activeSecretCode = config.secrets[config.secretIndex % config.secrets.length];

  return (
    <div className="flex-1 flex flex-col justify-between selection:bg-amber-500 selection:text-slate-950 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-emerald-500/50 text-emerald-300 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Invisible hover trigger strip at top edge */}
      <div
        className="fixed top-0 left-0 right-0 h-4 z-40 pointer-events-auto"
        onMouseEnter={() => {
          setIsHeaderVisible(true);
          if (headerTimerRef.current) {
            clearTimeout(headerTimerRef.current);
            headerTimerRef.current = null;
          }
        }}
      />

      {/* Discreet pull-down tab when header is auto-hidden */}
      {!isHeaderVisible && (
        <button
          type="button"
          onClick={() => {
            setIsHeaderVisible(true);
            if (headerTimerRef.current) {
              clearTimeout(headerTimerRef.current);
              headerTimerRef.current = null;
            }
          }}
          onMouseEnter={() => {
            setIsHeaderVisible(true);
            if (headerTimerRef.current) {
              clearTimeout(headerTimerRef.current);
              headerTimerRef.current = null;
            }
          }}
          className="fixed top-1.5 left-1/2 -translate-x-1/2 z-30 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-[11px] text-slate-400 hover:text-white transition flex items-center gap-1.5 shadow-lg backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-300 group cursor-pointer"
          title="Show menu & settings"
        >
          <Lock className="w-3 h-3 text-amber-400" />
          <span className="text-[10px] uppercase tracking-wider font-semibold">Settings</span>
          <ChevronDown className="w-3 h-3 text-slate-400 group-hover:translate-y-0.5 transition-transform" />
        </button>
      )}

      {/* Top Header Navigation (Auto-hiding) */}
      <header
        onMouseEnter={() => {
          if (headerTimerRef.current) {
            clearTimeout(headerTimerRef.current);
            headerTimerRef.current = null;
          }
          setIsHeaderVisible(true);
        }}
        onMouseLeave={() => {
          headerTimerRef.current = setTimeout(() => {
            setIsHeaderVisible(false);
            headerTimerRef.current = null;
          }, 1800);
        }}
        className={`fixed top-0 left-0 right-0 z-40 border-b border-slate-800/80 bg-slate-900/95 backdrop-blur-md px-4 sm:px-6 py-3.5 flex items-center justify-between transition-all duration-300 ease-in-out ${
          isHeaderVisible
            ? 'translate-y-0 opacity-100 pointer-events-auto shadow-2xl'
            : '-translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-sm">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-cinzel font-bold text-sm sm:text-base tracking-wider text-white">
              Voice Escape Room
            </h1>
            <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
              <span className="px-2 py-0.5 bg-slate-800/90 rounded text-slate-300 font-mono text-[10px]">
                {config.accent}
              </span>
              <span className="px-2 py-0.5 bg-slate-800/90 rounded text-slate-300 text-[10px]">
                Preview: {config.previewEnabled ? 'On' : 'Off'}
              </span>
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Progress Indicator */}
          <div className="text-right hidden sm:block mr-2">
            <div className="text-[10px] text-slate-500 uppercase font-semibold">Padlocks</div>
            <div className="text-xs font-mono font-bold text-amber-400">
              {currentIndex + 1} / {config.challengesCount}
            </div>
          </div>

          {/* Test Mic Diagnostic Button */}
          <button
            type="button"
            onClick={() => setIsDiagnosticOpen(true)}
            className="px-2.5 sm:px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-medium transition flex items-center gap-1.5"
            title="Diagnose & test microphone"
          >
            <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Test Mic</span>
          </button>

          {/* Permalink Button */}
          <button
            type="button"
            onClick={handleCopyPermalink}
            className="px-2.5 sm:px-3 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 rounded-xl text-xs font-medium transition flex items-center gap-1.5"
            title="Copy shareable permalink"
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Permalink</span>
          </button>

          {/* Setup Modal Button */}
          <button
            type="button"
            onClick={() => setIsSetupOpen(true)}
            className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-medium transition"
            title="Room settings"
          >
            <Settings className="w-4 h-4 text-slate-300" />
          </button>
        </div>
      </header>

      {/* Main Escape Arena */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 pt-16 sm:pt-20 flex flex-col justify-center items-center">
        {/* Victory Screen */}
        {isVictoryOpen ? (
          <VictoryModal
            isOpen={isVictoryOpen}
            secretCode={activeSecretCode}
            totalTime={formatTimer(secondsElapsed)}
            totalAttemptsUsed={attemptsUsedTotal}
            onPlayNextCycle={handlePlayNextCycle}
            onRestartSame={restartGame}
            hasNextSecret={config.secrets.length > 1}
          />
        ) : (
          <div className="w-full max-w-xl flex flex-col items-center animate-in fade-in duration-300">
            {/* Timer & Attempts Header Ribbon */}
            <div className="w-full flex items-center justify-between mb-5 px-1">
              <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900/90 border border-slate-800 px-3.5 py-1.5 rounded-full shadow-inner">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-mono font-semibold text-slate-200">{formatTimer(secondsElapsed)}</span>
              </div>

              {/* Real-time audio VU meter */}
              <AudioVisualizer level={speechHook.audioLevel} isListening={speechHook.isListening} />

              <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900/90 border border-slate-800 px-3.5 py-1.5 rounded-full shadow-inner">
                <Zap className="w-3.5 h-3.5 text-indigo-400" />
                <span>
                  Attempts:{' '}
                  <strong className={`font-mono ${remainingAttempts === 1 ? 'text-rose-400' : 'text-slate-100'}`}>
                    {remainingAttempts}
                  </strong>
                </span>
              </div>
            </div>

            {/* Visual Animated Padlock */}
            <div className="mb-4 sm:mb-5">
              <Padlock
                isOpen={false}
                isUnlockedTemp={isUnlockedTemp}
                challengeIndex={currentIndex}
                totalChallenges={config.challengesCount}
              />
            </div>

            {/* Target Phrase Box */}
            <div className="w-full bg-slate-900/70 border border-slate-800 rounded-3xl p-6 text-center backdrop-blur-md mb-6 shadow-xl relative overflow-hidden">
              <span className="text-[11px] uppercase tracking-widest text-slate-400 font-semibold block mb-1">
                Say
              </span>
              <div className="text-xl sm:text-2xl font-cinzel font-bold text-amber-400 tracking-wide mb-3">
                &ldquo;{currentTargetPhrase}&rdquo;
              </div>

              {/* TTS Audio Preview Option */}
              {config.previewEnabled && (
                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={handlePlayPreview}
                    disabled={isPlayingPreview}
                    className="px-4 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 rounded-xl text-xs font-medium transition flex items-center gap-2 disabled:opacity-50"
                  >
                    <Volume2 className={`w-3.5 h-3.5 ${isPlayingPreview ? 'animate-pulse text-amber-400' : ''}`} />
                    <span>{isPlayingPreview ? 'Pronouncing...' : 'Hear Pronunciation (TTS)'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Interactive Microphone Button & Status */}
            <div className="w-full flex flex-col items-center">
              <div className="relative">
                {speechHook.isListening && (
                  <span className="absolute inset-0 rounded-full border-4 border-amber-400 animate-ping opacity-40 pointer-events-none" />
                )}
                <button
                  type="button"
                  onClick={handleToggleListening}
                  className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl shadow-2xl transition-all transform hover:scale-105 active:scale-95 cursor-pointer ${
                    speechHook.isListening
                      ? 'bg-gradient-to-tr from-rose-600 to-rose-500 text-white shadow-rose-900/50'
                      : 'bg-gradient-to-tr from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 shadow-amber-900/40'
                  }`}
                  title={speechHook.isListening ? 'Click to stop listening' : 'Click to start microphone'}
                >
                  {speechHook.isListening ? (
                    <MicOff className="w-8 h-8 animate-pulse" />
                  ) : (
                    <Mic className="w-8 h-8" />
                  )}
                </button>
              </div>

              {/* Action Hint / Status */}
              <div
                className={`mt-4 text-xs sm:text-sm font-medium text-center transition-colors ${
                  feedbackType === 'success'
                    ? 'text-emerald-400'
                    : feedbackType === 'error'
                    ? 'text-rose-400'
                    : 'text-slate-300'
                }`}
              >
                {feedbackMessage}
              </div>

              {/* Live Audio Transcript Feedback */}
              <div className="mt-2 text-xs font-mono text-slate-400 min-h-[24px] text-center px-4 bg-slate-950/60 py-1 rounded-full border border-slate-800/80 max-w-md w-full truncate">
                {speechHook.heardTranscript ? (
                  <span>
                    Heard: <strong className="text-amber-300">&ldquo;{speechHook.heardTranscript}&rdquo;</strong>
                  </span>
                ) : speechHook.interimTranscript ? (
                  <span className="text-slate-400 italic">
                    Hearing: &ldquo;{speechHook.interimTranscript}&rdquo;...
                  </span>
                ) : (
                  <span className="text-slate-500">
                    {speechHook.isListening ? 'Waiting for voice audio...' : 'Microphone idle'}
                  </span>
                )}
              </div>

              {/* Error Callout if permission or device blocked */}
              {speechHook.errorMessage && (
                <div className="mt-3 max-w-md w-full bg-rose-950/50 border border-rose-800/80 p-3 rounded-2xl text-xs text-rose-300 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <div className="flex-1">
                    <p className="font-semibold">{speechHook.errorMessage}</p>
                    <div className="mt-1 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setIsDiagnosticOpen(true)}
                        className="underline text-rose-200 hover:text-white"
                      >
                        Run Mic Diagnostics
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-3 px-4 text-center text-[11px] text-slate-400 border-t border-slate-800/80 bg-slate-950/80 flex items-center justify-between max-w-5xl w-full mx-auto">
        <span>Voice Escape Room &bull; Chrome Web Speech Engine</span>
        <button
          onClick={() => setIsDiagnosticOpen(true)}
          className="hover:text-slate-300 transition underline"
        >
          Mic Troubleshooting &amp; Test
        </button>
      </footer>

      {/* Setup Modal */}
      <SetupModal
        isOpen={isSetupOpen}
        onClose={() => setIsSetupOpen(false)}
        config={config}
        onSaveConfig={(newConfig) => {
          setConfig(newConfig);
          setCurrentIndex(0);
          setRemainingAttempts(newConfig.attempts);
          setSecondsElapsed(0);
          setIsTimerRunning(true);
        }}
        onShowToast={showToast}
      />

      {/* Diagnostic & Mic Fix Modal */}
      <MicDiagnosticModal
        isOpen={isDiagnosticOpen}
        onClose={() => setIsDiagnosticOpen(false)}
        accent={config.accent}
      />
    </div>
  );
}
