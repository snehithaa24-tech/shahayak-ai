export type SessionState =
  | 'Ready'
  | 'Connecting'
  | 'RequestingPermission'
  | 'Connected'
  | 'Listening'
  | 'Responding'
  | 'Speaking'
  | 'Muted'
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

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface SavedConversation {
  id: string;
  title: string;
  language: 'en' | 'hi';
  createdAt: string;
  turns?: TranscriptTurn[];
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
  retryable: boolean;
}

export function getErrorMessageAndHint(
  type: ErrorType,
  rawMessage?: string,
  language: 'en' | 'hi' = 'en'
): { message: string; actionHint: string; retryable: boolean } {
  if (language === 'hi') {
    switch (type) {
      case 'permission_denied':
        return {
          message: 'माइक्रोफ़ोन की अनुमति नहीं मिली।',
          actionHint:
            'अपने ब्राउज़र के एड्रेस बार में माइक्रोफ़ोन या लॉक आइकन पर क्लिक करके अनुमति दें, फिर दोबारा कोशिश करें।',
          retryable: true,
        };
      case 'device_not_found':
        return {
          message: 'इस डिवाइस पर कोई माइक्रोफ़ोन नहीं मिला।',
          actionHint: 'कृपया माइक्रोफ़ोन या हेडसेट जोड़ें और फिर से प्रयास करें।',
          retryable: true,
        };
      case 'expired_credential':
        return {
          message: 'इस वॉइस सत्र का अस्थायी पास समाप्त हो गया है।',
          actionHint: 'नई बातचीत शुरू करने के लिए नीचे पुनः प्रयास करें।',
          retryable: true,
        };
      case 'quota_exhausted':
        return {
          message: 'Gemini Live का मुफ़्त कोटा अभी पूरा हो गया है।',
          actionHint: 'स्वचालित पुनः प्रयास रोक दिए गए हैं। कोटा रीसेट होने के बाद कृपया फिर प्रयास करें।',
          retryable: false,
        };
      case 'network_loss':
        return {
          message: 'Gemini Live से वॉइस कनेक्शन टूट गया।',
          actionHint: 'अपना इंटरनेट कनेक्शन जांचें और फिर से जुड़ें।',
          retryable: true,
        };
      case 'rate_limit_exceeded':
        return {
          message: 'प्रति घंटे सत्र सीमा पूरी हो गई है।',
          actionHint: 'नई बातचीत शुरू करने से पहले कृपया थोड़ी देर प्रतीक्षा करें।',
          retryable: false,
        };
      case 'unauthorized':
        return {
          message: 'सहायक का उपयोग करने के लिए साइन इन आवश्यक है।',
          actionHint: 'जारी रखने के लिए अपने Google खाते से साइन इन करें।',
          retryable: false,
        };
      default:
        return {
          message: rawMessage || 'वॉइस सत्र के दौरान एक अप्रत्याशित त्रुटि हुई।',
          actionHint: 'कृपया कॉल समाप्त करके नई बातचीत शुरू करें।',
          retryable: true,
        };
    }
  }

  switch (type) {
    case 'permission_denied':
      return {
        message: 'Microphone permission was denied.',
        actionHint: 'Allow microphone access from your browser’s address bar, then try starting again.',
        retryable: true,
      };
    case 'device_not_found':
      return {
        message: 'No microphone was found on this device.',
        actionHint: 'Connect a microphone or headset, or switch to typed input instead.',
        retryable: true,
      };
    case 'expired_credential':
      return {
        message: 'Your temporary voice session credential has expired.',
        actionHint: 'Start a fresh session to receive a new credential.',
        retryable: true,
      };
    case 'quota_exhausted':
      return {
        message: 'The Gemini Live free-tier quota is currently exhausted.',
        actionHint: 'Automatic retries have stopped. Please wait for the quota to reset before trying again.',
        retryable: false,
      };
    case 'network_loss':
      return {
        message: 'The connection to Gemini Live was interrupted.',
        actionHint: 'Check your internet connection and start a new session when ready.',
        retryable: true,
      };
    case 'rate_limit_exceeded':
      return {
        message: 'Hourly session limit reached.',
        actionHint: 'Please wait a short while before starting another voice conversation.',
        retryable: false,
      };
    case 'unauthorized':
      return {
        message: 'Sign in required to start a voice session.',
        actionHint: 'Continue with your Google account to access Sahayak.',
        retryable: false,
      };
    default:
      return {
        message: rawMessage || 'An unexpected error occurred during the voice session.',
        actionHint: 'You can try starting a fresh conversation.',
        retryable: true,
      };
  }
}
