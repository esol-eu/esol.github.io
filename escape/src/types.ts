export interface GameConfig {
  challengesCount: number;
  attempts: number;
  secrets: string[];
  secretIndex: number;
  accent: string;
  previewEnabled: boolean;
  phrases: string[];
}

export type ListeningState = 'idle' | 'listening' | 'evaluating' | 'unlocked' | 'failed' | 'error';

export interface MicDiagnostics {
  hasMediaDevices: boolean;
  hasSpeechRecognition: boolean;
  hasSpeechSynthesis: boolean;
  permissionState: 'prompt' | 'granted' | 'denied' | 'unknown';
  activeAudioLevel: number; // 0 - 100
  lastError: string | null;
}
