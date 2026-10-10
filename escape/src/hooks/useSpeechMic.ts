import { useState, useRef, useEffect, useCallback } from 'react';

// Web Speech API interface definitions
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [index: number]: {
        transcript: string;
        confidence: number;
      };
    };
  };
}

interface SpeechRecognitionErrorEventLike {
  error: string;
  message?: string;
}

interface IWindowWithSpeech extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export interface UseSpeechMicReturn {
  isListening: boolean;
  isSupported: boolean;
  permissionGranted: boolean;
  audioLevel: number; // 0 to 100 for visualizer
  heardTranscript: string;
  interimTranscript: string;
  errorMessage: string | null;
  startListening: (accent?: string) => Promise<boolean>;
  stopListening: () => void;
  resetTranscript: () => void;
}

export function useSpeechMic(
  onMatchEvaluation?: (transcript: string) => void
): UseSpeechMicReturn {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [heardTranscript, setHeardTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const isManuallyStoppedRef = useRef<boolean>(false);
  const onMatchEvaluationRef = useRef(onMatchEvaluation);

  useEffect(() => {
    onMatchEvaluationRef.current = onMatchEvaluation;
  }, [onMatchEvaluation]);

  // Check browser support on mount
  useEffect(() => {
    const win = window as IWindowWithSpeech;
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;
    setIsSupported(Boolean(SpeechRec));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, []);

  // Audio level analyzer loop
  const startAudioMeter = useCallback((stream: MediaStream) => {
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtxClass();
      audioContextRef.current = ctx;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.5;
      analyserRef.current = analyser;

      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        // Calculate average volume level
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(100, Math.round((avg / 128) * 100));
        setAudioLevel(normalized);

        animFrameRef.current = requestAnimationFrame(tick);
      };

      tick();
    } catch (e) {
      console.warn('Audio meter init error (non-fatal):', e);
    }
  }, []);

  const stopAudioMeter = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setAudioLevel(0);

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch {
        // ignore
      }
      audioContextRef.current = null;
    }
    analyserRef.current = null;

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  }, []);

  const stopListening = useCallback(() => {
    isManuallyStoppedRef.current = true;
    setIsListening(false);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }

    stopAudioMeter();
  }, [stopAudioMeter]);

  const resetTranscript = useCallback(() => {
    setHeardTranscript('');
    setInterimTranscript('');
    setErrorMessage(null);
  }, []);

  const startListening = useCallback(
    async (accent = 'en-US'): Promise<boolean> => {
      setErrorMessage(null);
      isManuallyStoppedRef.current = false;

      // 1. Request microphone permission and keep stream for visualizer
      let stream: MediaStream | null = null;
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });
          mediaStreamRef.current = stream;
          setPermissionGranted(true);
          startAudioMeter(stream);
        }
      } catch (err: any) {
        console.warn('getUserMedia error:', err);
        setPermissionGranted(false);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setErrorMessage('Microphone access blocked. Please allow microphone permission in your browser or address bar.');
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setErrorMessage('No microphone device found on your system. Please plug in a microphone.');
        } else {
          setErrorMessage(`Microphone error: ${err.message || 'Could not access microphone'}`);
        }
        return false;
      }

      // 2. Initialize Web Speech Recognition
      const win = window as IWindowWithSpeech;
      const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;

      if (!SpeechRec) {
        setErrorMessage('Web Speech API is not supported in this browser. Please use Google Chrome or Microsoft Edge.');
        return false;
      }

      // Abort previous instance if active
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }

      try {
        const recognition = new SpeechRec();
        recognitionRef.current = recognition;

        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;
        recognition.lang = accent;

        recognition.onstart = () => {
          setIsListening(true);
          setErrorMessage(null);
        };

        recognition.onresult = (event: SpeechRecognitionEventLike) => {
          let interim = '';
          let final = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const item = event.results[i];
            if (item.isFinal) {
              final += item[0].transcript;
            } else {
              interim += item[0].transcript;
            }
          }

          if (interim) {
            setInterimTranscript(interim.trim());
          }

          if (final) {
            const trimmedFinal = final.trim();
            setHeardTranscript(trimmedFinal);
            setInterimTranscript('');

            if (onMatchEvaluationRef.current) {
              onMatchEvaluationRef.current(trimmedFinal);
            }
          }
        };

        recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
          console.warn('SpeechRecognition error:', event.error, event.message);

          if (event.error === 'no-speech') {
            setErrorMessage('No speech detected. Speak louder or closer to the mic.');
          } else if (event.error === 'audio-capture') {
            setErrorMessage('No microphone detected or mic is being captured by another app.');
          } else if (event.error === 'not-allowed') {
            setErrorMessage('Microphone permission denied by browser or system settings.');
          } else if (event.error === 'network') {
            setErrorMessage('Speech recognition network timeout. Check connection or try again.');
          } else if (event.error !== 'aborted') {
            setErrorMessage(`Recognition issue: ${event.error}`);
          }
        };

        recognition.onend = () => {
          // If ended not by user click, but user still expected recording
          if (!isManuallyStoppedRef.current) {
            // Automatically restart if desired or gracefully update state
            setIsListening(false);
            stopAudioMeter();
          } else {
            setIsListening(false);
            stopAudioMeter();
          }
        };

        recognition.start();
        return true;
      } catch (err: any) {
        console.error('Failed to start speech recognition:', err);
        setErrorMessage(`Failed to start recognition: ${err.message || 'Unknown error'}`);
        setIsListening(false);
        stopAudioMeter();
        return false;
      }
    },
    [startAudioMeter, stopAudioMeter]
  );

  return {
    isListening,
    isSupported,
    permissionGranted,
    audioLevel,
    heardTranscript,
    interimTranscript,
    errorMessage,
    startListening,
    stopListening,
    resetTranscript,
  };
}
