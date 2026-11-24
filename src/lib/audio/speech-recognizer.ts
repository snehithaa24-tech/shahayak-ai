/**
 * Browser Speech Recognition helper for real-time user voice transcription.
 * Captures user spoken words in Hindi (hi-IN) or English (en-IN / en-US).
 * Graciously falls back to no-op when Web Speech API is unsupported in the browser.
 */

export interface SpeechRecognizerOptions {
  language: 'en' | 'hi';
  onInterimResult?: (transcript: string) => void;
  onFinalResult?: (transcript: string) => void;
}

export class SpeechRecognizer {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private recognition: any = null;
  private isListening = false;
  private language: 'en' | 'hi';
  private onInterimResult?: (transcript: string) => void;
  private onFinalResult?: (transcript: string) => void;

  constructor(options: SpeechRecognizerOptions) {
    this.language = options.language;
    this.onInterimResult = options.onInterimResult;
    this.onFinalResult = options.onFinalResult;
  }

  public setLanguage(lang: 'en' | 'hi') {
    this.language = lang;
    if (this.recognition) {
      this.recognition.lang = lang === 'hi' ? 'hi-IN' : 'en-US';
    }
  }

  public start(): boolean {
    if (typeof window === 'undefined') return false;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      return false;
    }

    try {
      this.recognition = new SpeechRec();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = this.language === 'hi' ? 'hi-IN' : 'en-US';

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.recognition.onresult = (event: any) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          const text = item[0].transcript;
          if (item.isFinal) {
            if (text.trim()) {
              this.onFinalResult?.(text.trim());
            }
          } else {
            interim += text;
          }
        }
        if (interim.trim()) {
          this.onInterimResult?.(interim.trim());
        }
      };

      this.recognition.onerror = () => {
        // Speech recognition error (e.g. no-speech or network) is non-fatal
      };

      this.recognition.onend = () => {
        // Restart if still in listening state
        if (this.isListening && this.recognition) {
          try {
            this.recognition.start();
          } catch {
            // Ignore start errors
          }
        }
      };

      this.isListening = true;
      this.recognition.start();
      return true;
    } catch {
      return false;
    }
  }

  public stop(): void {
    this.isListening = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
        this.recognition.abort();
      } catch {
        // Ignore stop errors
      }
      this.recognition = null;
    }
  }
}
