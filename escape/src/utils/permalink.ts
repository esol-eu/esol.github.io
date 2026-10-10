import { GameConfig } from '../types';

export function encodeConfig(config: GameConfig): string {
  try {
    const payload = {
      challenges: config.challengesCount,
      attempts: config.attempts,
      secrets: config.secrets,
      accent: config.accent,
      preview: config.previewEnabled,
      phrases: config.phrases,
    };
    const json = JSON.stringify(payload);
    // Base64 url-safe encode
    return btoa(encodeURIComponent(json))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  } catch (err) {
    console.error('Failed to encode game config:', err);
    return '';
  }
}

export function decodeConfig(encodedStr: string): Partial<GameConfig> | null {
  try {
    let base64 = encodedStr.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const json = decodeURIComponent(atob(base64));
    const parsed = JSON.parse(json);

    if (
      typeof parsed.challenges === 'number' &&
      parsed.challenges > 0 &&
      Array.isArray(parsed.phrases) &&
      parsed.phrases.length === parsed.challenges &&
      Array.isArray(parsed.secrets) &&
      parsed.secrets.length > 0
    ) {
      return {
        challengesCount: parsed.challenges,
        attempts: typeof parsed.attempts === 'number' && parsed.attempts > 0 ? parsed.attempts : 1,
        secrets: parsed.secrets,
        secretIndex: 0,
        accent: parsed.accent || 'en-US',
        previewEnabled: typeof parsed.preview === 'boolean' ? parsed.preview : true,
        phrases: parsed.phrases,
      };
    }
    return null;
  } catch (err) {
    console.error('Failed to decode game config:', err);
    return null;
  }
}

export function generateShareUrl(config: GameConfig): string {
  const token = encodeConfig(config);
  return `${window.location.origin}${window.location.pathname}?data=${token}`;
}
