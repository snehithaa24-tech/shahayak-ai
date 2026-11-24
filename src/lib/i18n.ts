import { type SupportedLanguage } from './prompt';
import { type SessionState } from './session/transcript-types';

export interface AppStrings {
  brandLatin: string;
  brandDevanagari: string;
  brandSubtitle: string;
  header: {
    signIn: string;
    signOut: string;
    signOutAria: string;
    authenticatedUser: string;
  };
  ready: {
    headline: string;
    supporting: string;
    languageLabel: string;
    englishName: string;
    englishHint: string;
    hindiName: string;
    hindiHint: string;
    startButton: string;
    startButtonAria: string;
    typeInsteadButton: string;
    micDisclosure: string;
    signInRequiredHint: string;
  };
  privacy: {
    heading: string;
    saveToggleLabel: string;
    saveToggleDescription: string;
    googlePrivacy: string;
    geminiTerms: string;
    subjectTo: string;
    and: string;
    savingPending: string;
    savedConfirmed: string;
    saveFailed: string;
    unsavedSessionBadge: string;
  };
  call: {
    languageLockedNote: string;
    viewTranscripts: string;
    hideTranscripts: string;
    mute: string;
    unmute: string;
    enableMic: string;
    interrupt: string;
    doneSpeaking: string;
    doneSpeakingHint: string;
    typeMessage: string;
    hideTypeInput: string;
    typePlaceholder: string;
    send: string;
    endCall: string;
    endCallAria: string;
    subtitlePromptSpeaking: string;
    subtitlePromptTyped: string;
    subtitlePromptMuted: string;
    speakerYou: string;
    speakerAssistant: string;
    status: Record<SessionState, string>;
    ariaStatus: Record<SessionState, string>;
  };
  ended: {
    heading: string;
    summary: (turns: number) => string;
    micReleasedNote: string;
    startAnother: string;
    viewLastTranscript: string;
  };
  transcripts: {
    panelTitle: string;
    closePanel: string;
    turnCount: (count: number) => string;
    clearSession: string;
    clearSessionAria: string;
    emptyLive: string;
    jumpToLatest: string;
    historyTitle: string;
    historyEmptySignedOut: string;
    historyEmptySignedIn: string;
    historyLoading: string;
    historyLoadError: string;
    currentSessionHeading: string;
    savedConversationsHeading: string;
    deleteSaved: string;
    deletingSaved: string;
    loadingTurns: string;
    noSavedTurns: string;
    showTurns: string;
    hideTurns: string;
  };
  errors: {
    tryAgain: string;
    goToSignIn: string;
    dismiss: string;
  };
  login: {
    tagline: string;
    continueWithGoogle: string;
    connecting: string;
    errorHeading: string;
    errorMissingCode: string;
    errorDenied: string;
    errorGeneric: string;
    privacyHeading: string;
    privacyBody: string;
    loading: string;
  };
}

const EN_STRINGS: AppStrings = {
  brandLatin: 'SAHAYAK',
  brandDevanagari: 'सहायक',
  brandSubtitle: 'Bilingual voice assistant',
  header: {
    signIn: 'Sign in with Google',
    signOut: 'Sign out',
    signOutAria: 'Sign out of your account',
    authenticatedUser: 'Signed in',
  },
  ready: {
    headline: 'A little help, a natural conversation.',
    supporting: 'Speak in English or Hindi. Take your time.',
    languageLabel: 'Conversation language',
    englishName: 'English',
    englishHint: 'Clear & conversational',
    hindiName: 'हिन्दी',
    hindiHint: 'सहज बातचीत',
    startButton: 'Start conversation',
    startButtonAria: 'Start voice conversation',
    typeInsteadButton: 'Prefer to type a message?',
    micDisclosure:
      'Microphone access is requested only after you press Start. Audio streams directly from your browser to Google Gemini to generate spoken replies and is not stored by Sahayak.',
    signInRequiredHint: 'Sign in with Google above before starting a live session.',
  },
  privacy: {
    heading: 'Transcript preference',
    saveToggleLabel: 'Save future transcripts',
    saveToggleDescription:
      'Off by default. When enabled, text transcripts of new conversations are saved to your account. Turning this off does not delete previously saved conversations.',
    googlePrivacy: 'Google Privacy Policy',
    geminiTerms: 'Gemini API Terms',
    subjectTo: 'Voice processing follows',
    and: 'and',
    savingPending: 'Saving transcript…',
    savedConfirmed: 'Saved to your account',
    saveFailed: 'Could not save transcript turn to your account.',
    unsavedSessionBadge: 'Live session · not saved',
  },
  call: {
    languageLockedNote: 'Language stays fixed during an active session.',
    viewTranscripts: 'Transcripts',
    hideTranscripts: 'Hide transcripts',
    mute: 'Mute mic',
    unmute: 'Unmute mic',
    enableMic: 'Turn on mic',
    interrupt: 'Interrupt',
    doneSpeaking: 'Done speaking',
    doneSpeakingHint: 'Flush your spoken words and mute the microphone until you unmute.',
    typeMessage: 'Type',
    hideTypeInput: 'Close typing',
    typePlaceholder: 'Write a message to Sahayak…',
    send: 'Send',
    endCall: 'End call',
    endCallAria: 'End voice conversation and release microphone',
    subtitlePromptSpeaking: 'Speak naturally whenever you are ready…',
    subtitlePromptTyped: 'Microphone is off. Type below or turn on your microphone.',
    subtitlePromptMuted: 'Microphone is muted. Unmute when you want to speak.',
    speakerYou: 'You',
    speakerAssistant: 'Sahayak',
    status: {
      Ready: 'Ready',
      Connecting: 'Connecting to Gemini Live…',
      RequestingPermission: 'Requesting microphone permission…',
      Connected: 'Connected · microphone off',
      Listening: 'Listening',
      Responding: 'Processing…',
      Speaking: 'Sahayak is speaking',
      Muted: 'Microphone muted',
      Ended: 'Conversation ended',
      Error: 'Session attention needed',
    },
    ariaStatus: {
      Ready: 'Sahayak is ready.',
      Connecting: 'Connecting to Gemini Live.',
      RequestingPermission: 'Waiting for microphone permission.',
      Connected: 'Connected in text mode with microphone off.',
      Listening: 'Sahayak is listening. You can speak now.',
      Responding: 'Sahayak is processing your turn.',
      Speaking: 'Sahayak is speaking.',
      Muted: 'Microphone is muted.',
      Ended: 'Conversation ended and microphone released.',
      Error: 'An error occurred in the voice session.',
    },
  },
  ended: {
    heading: 'Conversation ended',
    summary: (turns: number) =>
      turns === 0
        ? 'No messages were exchanged during this session.'
        : `${turns} ${turns === 1 ? 'turn' : 'turns'} recorded in this session.`,
    micReleasedNote: 'Your microphone has been released.',
    startAnother: 'Start another conversation',
    viewLastTranscript: 'Review transcript',
  },
  transcripts: {
    panelTitle: 'Transcripts',
    closePanel: 'Close',
    turnCount: (count: number) => `${count} ${count === 1 ? 'turn' : 'turns'}`,
    clearSession: 'Clear session',
    clearSessionAria: 'Clear current session transcript',
    emptyLive: 'Spoken and typed messages in this conversation will appear here.',
    jumpToLatest: 'Jump to latest',
    historyTitle: 'Conversation history',
    historyEmptySignedOut: 'Sign in with Google to view or save conversation history across visits.',
    historyEmptySignedIn: 'Your saved conversations will appear here when "Save future transcripts" is turned on.',
    historyLoading: 'Loading saved conversations…',
    historyLoadError: 'Could not load saved conversation history.',
    currentSessionHeading: 'Current session',
    savedConversationsHeading: 'Saved conversations',
    deleteSaved: 'Delete',
    deletingSaved: 'Deleting…',
    loadingTurns: 'Loading transcript…',
    noSavedTurns: 'No turns were saved for this conversation.',
    showTurns: 'View',
    hideTurns: 'Hide',
  },
  errors: {
    tryAgain: 'Try again',
    goToSignIn: 'Go to sign in',
    dismiss: 'Dismiss',
  },
  login: {
    tagline: 'Speak naturally in English or Hindi with a calm, attentive voice assistant.',
    continueWithGoogle: 'Continue with Google',
    connecting: 'Connecting to Google…',
    errorHeading: 'Unable to sign in',
    errorMissingCode: 'Your sign-in link expired or did not include an authorization code. Please try again.',
    errorDenied: 'Google sign-in was canceled before completing. You can try again whenever ready.',
    errorGeneric: 'Something went wrong while signing in. Please try again.',
    privacyHeading: 'Audio & transcript privacy',
    privacyBody:
      'Voice audio streams directly to Google Gemini Live to answer your questions. Text transcripts are saved to your account only if you opt in after signing in.',
    loading: 'Loading sign-in…',
  },
};

const HI_STRINGS: AppStrings = {
  brandLatin: 'SAHAYAK',
  brandDevanagari: 'सहायक',
  brandSubtitle: 'द्विभाषी वॉइस सहायक',
  header: {
    signIn: 'Google से साइन इन करें',
    signOut: 'साइन आउट',
    signOutAria: 'खाते से साइन आउट करें',
    authenticatedUser: 'साइन इन',
  },
  ready: {
    headline: 'थोड़ी सी मदद, एक सहज बातचीत।',
    supporting: 'हिंदी, इंग्लिश या हिंग्लिश में आराम से बात करें।',
    languageLabel: 'बातचीत की भाषा',
    englishName: 'English',
    englishHint: 'स्पष्ट व सहज अंग्रेजी',
    hindiName: 'हिन्दी',
    hindiHint: 'सहज बातचीत',
    startButton: 'बातचीत शुरू करें',
    startButtonAria: 'आवाज़ में बातचीत शुरू करें',
    typeInsteadButton: 'क्या आप लिखकर बात करना चाहते हैं?',
    micDisclosure:
      'माइक्रोफ़ोन की अनुमति शुरू करने के बाद ही माँगी जाएगी। जवाब देने के लिए आपकी आवाज़ सीधे ब्राउज़र से Google Gemini तक भेजी जाती है; सहायक ऑडियो रिकॉर्डिंग सुरक्षित नहीं रखता।',
    signInRequiredHint: 'लाइव बातचीत शुरू करने के लिए ऊपर Google से साइन इन करें।',
  },
  privacy: {
    heading: 'ट्रांसक्रिप्ट प्राथमिकता',
    saveToggleLabel: 'आगे की बातचीत सहेजें',
    saveToggleDescription:
      'यह डिफ़ॉल्ट रूप से बंद रहता है। चालू करने पर नई बातचीत का टेक्स्ट आपके खाते में सहेजा जाएगा। इसे बंद करने से पहले से सहेजी गई बातचीत नहीं हटती।',
    googlePrivacy: 'Google गोपनीयता नीति',
    geminiTerms: 'Gemini API शर्तें',
    subjectTo: 'वॉइस प्रोसेसिंग पर लागू:',
    and: 'और',
    savingPending: 'सहेजा जा रहा है…',
    savedConfirmed: 'आपके खाते में सहेजा गया',
    saveFailed: 'बातचीत का यह हिस्सा खाते में सहेजा नहीं जा सका।',
    unsavedSessionBadge: 'लाइव सत्र · सहेजा नहीं गया',
  },
  call: {
    languageLockedNote: 'चलती बातचीत के दौरान भाषा निश्चित रहती है।',
    viewTranscripts: 'बातचीत देखें',
    hideTranscripts: 'बातचीत छिपाएं',
    mute: 'माइक म्यूट करें',
    unmute: 'माइक चालू करें',
    enableMic: 'माइक ऑन करें',
    interrupt: 'रोकें',
    doneSpeaking: 'बात पूरी हुई',
    doneSpeakingHint: 'आपका बोला गया संदेश भेजें और जब तक आप अनम्यूट न करें, माइक म्यूट रखें।',
    typeMessage: 'लिखें',
    hideTypeInput: 'लिखना बंद करें',
    typePlaceholder: 'सहायक के लिए यहाँ संदेश लिखें…',
    send: 'भेजें',
    endCall: 'कॉल समाप्त करें',
    endCallAria: 'बातचीत समाप्त करें और माइक्रोफ़ोन बंद करें',
    subtitlePromptSpeaking: 'जब तैयार हों, सहजता से बोलना शुरू करें…',
    subtitlePromptTyped: 'माइक्रोफ़ोन बंद है। नीचे टाइप करें या माइक चालू करें।',
    subtitlePromptMuted: 'माइक्रोफ़ोन म्यूट है। बोलने के लिए अनम्यूट करें।',
    speakerYou: 'आप',
    speakerAssistant: 'सहायक',
    status: {
      Ready: 'तैयार',
      Connecting: 'Gemini Live से जुड़ रहे हैं…',
      RequestingPermission: 'माइक्रोफ़ोन की अनुमति ली जा रही है…',
      Connected: 'जुड़ा हुआ · माइक्रोफ़ोन बंद',
      Listening: 'सुन रहे हैं',
      Responding: 'विचार कर रहे हैं…',
      Speaking: 'सहायक बोल रहे हैं',
      Muted: 'माइक्रोफ़ोन म्यूट है',
      Ended: 'बातचीत समाप्त हुई',
      Error: 'सत्र पर ध्यान दें',
    },
    ariaStatus: {
      Ready: 'सहायक तैयार है।',
      Connecting: 'Gemini Live से जोड़ा जा रहा है।',
      RequestingPermission: 'माइक्रोफ़ोन अनुमति की प्रतीक्षा है।',
      Connected: 'टेक्स्ट मोड में जुड़ा हुआ है, माइक्रोफ़ोन बंद है।',
      Listening: 'सहायक सुन रहे हैं। अब आप बोल सकते हैं।',
      Responding: 'सहायक आपके प्रश्न पर विचार कर रहे हैं।',
      Speaking: 'सहायक बोल रहे हैं।',
      Muted: 'माइक्रोफ़ोन म्यूट है।',
      Ended: 'बातचीत समाप्त हो गई और माइक्रोफ़ोन बंद कर दिया गया।',
      Error: 'वॉइस सत्र में त्रुटि आई है।',
    },
  },
  ended: {
    heading: 'बातचीत समाप्त हुई',
    summary: (turns: number) =>
      turns === 0
        ? 'इस सत्र में कोई संवाद दर्ज नहीं हुआ।'
        : `इस सत्र में ${turns} संवाद दर्ज हुए।`,
    micReleasedNote: 'आपका माइक्रोफ़ोन बंद कर दिया गया है।',
    startAnother: 'नई बातचीत शुरू करें',
    viewLastTranscript: 'बातचीत देखें',
  },
  transcripts: {
    panelTitle: 'बातचीत का विवरण',
    closePanel: 'बंद करें',
    turnCount: (count: number) => `${count} संवाद`,
    clearSession: 'सत्र साफ़ करें',
    clearSessionAria: 'मौजूदा सत्र का टेक्स्ट हटाएं',
    emptyLive: 'इस बातचीत के बोले और लिखे गए संदेश यहाँ दिखाई देंगे।',
    jumpToLatest: 'नवीनतम पर जाएं',
    historyTitle: 'पुरानी बातचीत',
    historyEmptySignedOut: 'बातचीत सहेजने और पुरानी बातचीत देखने के लिए Google से साइन इन करें।',
    historyEmptySignedIn: 'जब "आगे की बातचीत सहेजें" चालू होगा, तो सहेजी गई बातचीत यहाँ दिखाई देगी।',
    historyLoading: 'सहेजी गई बातचीत लोड हो रही है…',
    historyLoadError: 'सहेजी गई बातचीत लोड नहीं हो सकी।',
    currentSessionHeading: 'मौजूदा सत्र',
    savedConversationsHeading: 'सहेजी गई बातचीत',
    deleteSaved: 'हटाएं',
    deletingSaved: 'हटाया जा रहा है…',
    loadingTurns: 'विवरण लोड हो रहा है…',
    noSavedTurns: 'इस बातचीत का कोई संदेश सहेजा नहीं गया।',
    showTurns: 'देखें',
    hideTurns: 'छिपाएं',
  },
  errors: {
    tryAgain: 'पुनः प्रयास करें',
    goToSignIn: 'साइन इन पेज पर जाएं',
    dismiss: 'बंद करें',
  },
  login: {
    tagline: 'हिंदी और इंग्लिश में एक शांत, धैर्यवान वॉइस सहायक से सहज बातचीत करें।',
    continueWithGoogle: 'Google के साथ जारी रखें',
    connecting: 'Google से जुड़ रहे हैं…',
    errorHeading: 'साइन इन नहीं हो सका',
    errorMissingCode: 'साइन-इन सत्र समाप्त हो गया या ऑथराइज़ेशन कोड नहीं मिला। कृपया पुनः प्रयास करें।',
    errorDenied: 'Google साइन-इन पूरा होने से पहले रद्द कर दिया गया। तैयार होने पर फिर प्रयास करें।',
    errorGeneric: 'साइन इन करते समय समस्या आई। कृपया पुनः प्रयास करें।',
    privacyHeading: 'ऑडियो और डेटा गोपनीयता',
    privacyBody:
      'आपके सवालों के जवाब देने के लिए आवाज़ सीधे Google Gemini Live तक जाती है। बातचीत का टेक्स्ट केवल आपकी अनुमति होने पर ही खाते में सहेजा जाता है।',
    loading: 'साइन-इन पृष्ठ लोड हो रहा है…',
  },
};

export function getAppStrings(language: SupportedLanguage): AppStrings {
  return language === 'hi' ? HI_STRINGS : EN_STRINGS;
}
