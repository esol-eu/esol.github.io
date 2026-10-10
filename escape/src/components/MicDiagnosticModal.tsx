import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  X,
  Volume2,
  RefreshCw,
  HelpCircle,
} from 'lucide-react';

interface MicDiagnosticModalProps {
  isOpen: boolean;
  onClose: () => void;
  accent: string;
}

export const MicDiagnosticModal: React.FC<MicDiagnosticModalProps> = ({
  isOpen,
  onClose,
  accent,
}) => {
  const [permissionStatus, setPermissionStatus] = useState<'prompt' | 'granted' | 'denied' | 'checking'>('checking');
  const [deviceList, setDeviceList] = useState<MediaDeviceInfo[]>([]);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [isTestingRecognition, setIsTestingRecognition] = useState(false);
  const [testTranscript, setTestTranscript] = useState('');
  const [testError, setTestError] = useState<string | null>(null);

  const testStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const testRecognitionRef = useRef<any>(null);

  const isChromeOrEdge =
    typeof navigator !== 'undefined' &&
    (/Chrome/.test(navigator.userAgent) || /Edg/.test(navigator.userAgent));

  const hasSpeechApi =
    typeof window !== 'undefined' &&
    Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  // Check permissions & devices on open
  useEffect(() => {
    if (!isOpen) {
      stopTestMic();
      return;
    }

    checkPermissionsAndDevices();

    return () => {
      stopTestMic();
    };
  }, [isOpen]);

  const checkPermissionsAndDevices = async () => {
    setPermissionStatus('checking');
    try {
      if (navigator.permissions && navigator.permissions.query) {
        try {
          const status = await navigator.permissions.query({ name: 'microphone' as any });
          setPermissionStatus(status.state as any);
          status.onchange = () => {
            setPermissionStatus(status.state as any);
          };
        } catch {
          setPermissionStatus('prompt');
        }
      } else {
        setPermissionStatus('prompt');
      }

      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter((d) => d.kind === 'audioinput');
        setDeviceList(audioInputs);
      }
    } catch (e) {
      console.warn('Permission query error:', e);
      setPermissionStatus('prompt');
    }
  };

  const startTestMic = async () => {
    setTestError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      testStreamRef.current = stream;
      setPermissionStatus('granted');

      // Update devices after permission granted
      const devices = await navigator.mediaDevices.enumerateDevices();
      setDeviceList(devices.filter((d) => d.kind === 'audioinput'));

      // Audio level analyser
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      const buffer = new Uint8Array(analyser.frequencyBinCount);

      const poll = () => {
        analyser.getByteFrequencyData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) sum += buffer[i];
        const avg = sum / buffer.length;
        setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
        animFrameRef.current = requestAnimationFrame(poll);
      };
      poll();
    } catch (err: any) {
      console.error('Test mic error:', err);
      if (err.name === 'NotAllowedError') {
        setPermissionStatus('denied');
        setTestError('Permission denied. Please click the lock or camera icon in the browser address bar to allow microphone access.');
      } else if (err.name === 'NotFoundError') {
        setTestError('No microphone detected. Please plug in or connect an audio input device.');
      } else {
        setTestError(err.message || 'Could not connect to microphone.');
      }
    }
  };

  const stopTestMic = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (testStreamRef.current) {
      testStreamRef.current.getTracks().forEach((t) => t.stop());
      testStreamRef.current = null;
    }
    if (testRecognitionRef.current) {
      try {
        testRecognitionRef.current.stop();
      } catch {
        // ignore
      }
      testRecognitionRef.current = null;
    }
    setAudioLevel(0);
    setIsTestingRecognition(false);
  };

  const runTestSpeechRecognition = () => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      setTestError('Web Speech API is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    setTestTranscript('Listening... Say "HELLO" or "UNLOCK"...');
    setTestError(null);
    setIsTestingRecognition(true);

    try {
      const rec = new SpeechRec();
      testRecognitionRef.current = rec;
      rec.lang = accent || 'en-US';
      rec.continuous = false;
      rec.interimResults = true;

      rec.onresult = (evt: any) => {
        let text = '';
        for (let i = 0; i < evt.results.length; i++) {
          text += evt.results[i][0].transcript;
        }
        setTestTranscript(`Recognized: "${text}"`);
      };

      rec.onerror = (evt: any) => {
        setTestError(`Recognition error: ${evt.error}`);
        setIsTestingRecognition(false);
      };

      rec.onend = () => {
        setIsTestingRecognition(false);
      };

      rec.start();
    } catch (err: any) {
      setTestError(`Failed to start speech test: ${err.message}`);
      setIsTestingRecognition(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-cinzel">Microphone & Speech Diagnostics</h2>
              <p className="text-xs text-slate-400">Test audio input device and speech recognition</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopTestMic();
              onClose();
            }}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="py-4 space-y-4 overflow-y-auto pr-1">
          {/* Status Cards */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-2xl flex items-center gap-3">
              {permissionStatus === 'granted' ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
              ) : permissionStatus === 'denied' ? (
                <XCircle className="w-6 h-6 text-rose-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0" />
              )}
              <div>
                <div className="font-semibold text-slate-200">Mic Permission</div>
                <div className="text-[11px] text-slate-400 capitalize">
                  {permissionStatus === 'granted'
                    ? 'Granted'
                    : permissionStatus === 'denied'
                    ? 'Blocked / Denied'
                    : 'Prompt / Needed'}
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-2xl flex items-center gap-3">
              {hasSpeechApi ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0" />
              )}
              <div>
                <div className="font-semibold text-slate-200">Speech API Engine</div>
                <div className="text-[11px] text-slate-400">
                  {hasSpeechApi ? (isChromeOrEdge ? 'Chrome/Edge (Optimal)' : 'Supported') : 'Not supported'}
                </div>
              </div>
            </div>
          </div>

          {/* Live Mic Hardware Test */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase tracking-wider font-semibold text-slate-300 flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-indigo-400" />
                Live Audio Input Monitor
              </span>
              {!testStreamRef.current ? (
                <button
                  type="button"
                  onClick={startTestMic}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-medium transition flex items-center gap-1.5 shadow-sm"
                >
                  <Mic className="w-3.5 h-3.5" /> Start Mic Test
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopTestMic}
                  className="px-3 py-1.5 bg-rose-600/30 border border-rose-500/50 hover:bg-rose-600/40 text-rose-300 rounded-xl text-xs font-medium transition flex items-center gap-1.5"
                >
                  <MicOff className="w-3.5 h-3.5" /> Stop Mic Test
                </button>
              )}
            </div>

            {/* Volume meter bar */}
            <div className="w-full bg-slate-900 h-4 rounded-full overflow-hidden border border-slate-800 flex items-center px-1">
              <div
                className={`h-2 rounded-full transition-all duration-75 ${
                  audioLevel > 20
                    ? 'bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-400'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.max(2, audioLevel)}%` }}
              />
            </div>

            <div className="flex justify-between items-center mt-2 text-[11px] text-slate-400">
              <span>Current volume: <strong className="text-slate-200">{audioLevel}%</strong></span>
              <span className="text-slate-500">
                {audioLevel > 5 ? 'Speaking detected!' : testStreamRef.current ? 'Speak to test volume...' : 'Click "Start Mic Test"'}
              </span>
            </div>

            {deviceList.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-900 text-[11px] text-slate-400">
                <span className="text-slate-500">Connected Input:</span>{' '}
                <span className="text-slate-300">{deviceList[0].label || 'Default System Microphone'}</span>
              </div>
            )}
          </div>

          {/* Test Speech Recognition */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase tracking-wider font-semibold text-slate-300">
                Test Speech-to-Text Recognition
              </span>
              <button
                type="button"
                onClick={runTestSpeechRecognition}
                disabled={isTestingRecognition}
                className="px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-medium transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTestingRecognition ? 'animate-spin' : ''}`} />
                {isTestingRecognition ? 'Listening...' : 'Test Speech'}
              </button>
            </div>

            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-xs font-mono min-h-[44px] flex items-center justify-center text-center">
              {testTranscript ? (
                <span className="text-amber-300">{testTranscript}</span>
              ) : (
                <span className="text-slate-500">Click &quot;Test Speech&quot; and speak aloud to verify recognition.</span>
              )}
            </div>

            {testError && (
              <div className="mt-2 text-xs text-rose-400 bg-rose-950/40 border border-rose-800/60 p-2.5 rounded-xl flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{testError}</span>
              </div>
            )}
          </div>

          {/* Troubleshooting Tips */}
          <div className="p-4 bg-indigo-950/20 border border-indigo-900/40 rounded-2xl text-xs text-indigo-200 space-y-2">
            <div className="font-semibold flex items-center gap-1.5 text-indigo-300">
              <HelpCircle className="w-4 h-4" /> Quick Mic Troubleshooting Steps:
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px] leading-relaxed">
              <li>
                <strong>Browser Permission:</strong> Look at your browser address bar. If there is a crossed-out camera or microphone icon, click it and select &quot;Always allow&quot;.
              </li>
              <li>
                <strong>Browser Engine:</strong> Google Chrome or Microsoft Edge natively supports the Web Speech API.
              </li>
              <li>
                <strong>Audio Lock:</strong> If another program (Zoom, Teams, Discord) has exclusive control of your microphone, close it or restart the browser.
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={() => {
              stopTestMic();
              onClose();
            }}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
