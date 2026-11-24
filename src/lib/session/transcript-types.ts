export type SessionState =
  | 'Ready'
  | 'Connecting'
  | 'Listening'
  | 'Responding'
  | 'Speaking'
  | 'Ended'
  | 'Error';

export interface TranscriptTurn {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  language: 'en' | 'hi';
  timestamp: number;
  isFinal: boolean;
}

export type ErrorType =
  | 'permission_denied'
  | 'device_not_found'
  | 'expired_credential'
  | 'quota_exhausted'
  | 'network_loss'
  | 'rate_limit_exceeded'
  | 'unauthorized'
  | 'unknown';

export interface VoiceSessionError {
  type: ErrorType;
  message: string;
  actionHint: string;
}

export function getErrorMessageAndHint(type: ErrorType, rawMessage?: string): { message: string; actionHint: string } {
  switch (type) {
    case 'permission_denied':
      return {
        message: 'Microphone permission was denied.',
        actionHint: 'Click the camera/mic icon in your browser address bar to allow microphone access, then click Start.',
      };
    case 'device_not_found':
      return {
        message: 'No microphone was found on this device.',
        actionHint: 'Connect a physical microphone or headset and try again.',
      };
    case 'expired_credential':
      return {
        message: 'The temporary voice session credential has expired.',
        actionHint: 'Click Start to renew your single-use session.',
      };
    case 'quota_exhausted':
      return {
        message: 'Gemini Live free tier quota exhausted.',
        actionHint: 'Automatic retries have stopped. Please try again after quota resets.',
      };
    case 'network_loss':
      return {
        message: 'Voice connection to Gemini Live was interrupted.',
        actionHint: 'Check your internet connection and click Start to reconnect.',
      };
    case 'rate_limit_exceeded':
      return {
        message: 'Hourly session rate limit reached.',
        actionHint: 'Please wait a short while before launching another voice session.',
      };
    case 'unauthorized':
      return {
        message: 'You must be signed in to use Sahayak.',
        actionHint: 'Sign in with your Google account to continue.',
      };
    default:
      return {
        message: rawMessage || 'An unexpected error occurred during the voice session.',
        actionHint: 'Click End Call and press Start to restart the assistant.',
      };
  }
}
