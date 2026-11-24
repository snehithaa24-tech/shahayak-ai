'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useVoiceSession } from '@/hooks/use-voice-session';
import { createClient } from '@/lib/supabase/client';
import {
  Mic,
  MicOff,
  Square,
  Send,
  Trash2,
  Globe,
  Shield,
  AlertTriangle,
  User,
  LogOut,
  Radio,
  Volume2,
  CheckCircle2,
} from 'lucide-react';

export default function HomePage() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [typedMessage, setTypedMessage] = useState('');
  const [showTypedInput, setShowTypedInput] = useState(false);
  const transcriptBottomRef = useRef<HTMLDivElement>(null);

  const {
    sessionState,
    language,
    setLanguage,
    saveTranscripts,
    setSaveTranscripts,
    transcripts,
    interimUserText,
    interimAssistantText,
    errorInfo,
    startSession,
    endSession,
    handleInterruption,
    sendTypedMessage,
    clearTranscripts,
  } = useVoiceSession();

  // Load user session and preference
  useEffect(() => {
    async function loadUser() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserEmail(user.email || 'Authenticated User');
          // Fetch saved language preference
          const { data: pref } = await supabase
            .from('user_preferences')
            .select('language, save_transcripts')
            .eq('user_id', user.id)
            .single();

          if (pref) {
            if (pref.language === 'en' || pref.language === 'hi') {
              setLanguage(pref.language);
            }
            if (typeof pref.save_transcripts === 'boolean') {
              setSaveTranscripts(pref.save_transcripts);
            }
          }
        }
      } catch (err) {
        console.warn('[Sahayak] User check:', err);
      }
    }
    loadUser();
  }, [setLanguage, setSaveTranscripts]);

  // Auto scroll transcript to bottom when new turns arrive
  useEffect(() => {
    transcriptBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts, interimAssistantText, interimUserText]);

  // Handle language switch and save preference if logged in
  const handleLanguageChange = async (newLang: 'en' | 'hi') => {
    setLanguage(newLang);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('user_preferences').upsert({
          user_id: user.id,
          language: newLang,
          save_transcripts: saveTranscripts,
          updated_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.warn('[Sahayak] Language pref update error:', err);
    }
  };

  // Handle save transcript toggle
  const handleSaveTranscriptToggle = async (enabled: boolean) => {
    setSaveTranscripts(enabled);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('user_preferences').upsert({
          user_id: user.id,
          language,
          save_transcripts: enabled,
          updated_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.warn('[Sahayak] Save transcript pref update error:', err);
    }
  };

  const router = useRouter();

  const handleSignOut = async () => {
    await endSession();
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleSendTyped = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedMessage.trim()) return;
    sendTypedMessage(typedMessage);
    setTypedMessage('');
  };

  const isCallActive =
    sessionState === 'Listening' ||
    sessionState === 'Speaking' ||
    sessionState === 'Responding' ||
    sessionState === 'Connecting';

  return (
    <div className="flex flex-1 flex-col justify-between max-w-5xl w-full mx-auto px-4 py-4 sm:px-6 sm:py-6">
      {/* Polite ARIA live region for state changes (prevents spamming partial tokens) */}
      <div role="status" aria-live="polite" className="sr-only">
        {sessionState === 'Ready' && 'Sahayak is ready. Press Start to talk.'}
        {sessionState === 'Connecting' && 'Connecting to voice session.'}
        {sessionState === 'Listening' && 'Sahayak is listening. You can speak now.'}
        {sessionState === 'Responding' && 'Sahayak is processing your question.'}
        {sessionState === 'Speaking' && 'Sahayak is speaking.'}
        {sessionState === 'Ended' && 'Call ended. Microphone released.'}
        {sessionState === 'Error' && `Error: ${errorInfo?.message || 'Session error'}`}
      </div>

      {/* Top Header & Navigation */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400 ring-1 ring-blue-500/30">
            <Volume2 className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                SAHAYAK AI <span className="text-blue-400 font-normal">(सहायक)</span>
              </h1>
              <span className="inline-flex items-center rounded-md bg-blue-950/60 px-2 py-0.5 text-xs font-medium text-blue-300 ring-1 ring-inset ring-blue-800/40">
                Live Voice
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Bilingual Hindi & English Voice Assistant
            </p>
          </div>
        </div>

        {/* User Identity & Auth Controls */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {userEmail ? (
            <div className="flex items-center gap-2 rounded-lg bg-slate-900 border border-slate-800 px-3 py-1.5 text-xs text-slate-300">
              <User className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              <span className="max-w-[150px] sm:max-w-[200px] truncate">{userEmail}</span>
              <button
                type="button"
                onClick={handleSignOut}
                aria-label="Sign out of account"
                className="ml-2 text-slate-400 hover:text-red-400 transition-colors"
                title="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <a
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors"
            >
              Sign in with Google
            </a>
          )}
        </div>
      </header>

      {/* Main Workspace Grid */}
      <main className="flex-1 flex flex-col md:grid md:grid-cols-12 gap-6 my-6">
        {/* Left / Top Control Panel: Language, Status, Primary Mic Button */}
        <div className="md:col-span-5 lg:col-span-4 flex flex-col gap-5">
          {/* Language Selection Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5 shadow-lg">
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              <Globe className="h-4 w-4 text-blue-400" aria-hidden="true" />
              Conversation Language (भाषा)
            </label>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Choose Language">
              <button
                type="button"
                role="radio"
                aria-checked={language === 'en'}
                onClick={() => handleLanguageChange('en')}
                disabled={isCallActive}
                className={`flex flex-col items-center justify-center rounded-xl p-3 text-sm font-semibold transition-all border ${
                  language === 'en'
                    ? 'border-blue-500 bg-blue-600/20 text-white shadow-sm ring-1 ring-blue-500'
                    : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:bg-slate-800 hover:text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <span className="text-base font-bold">English</span>
                <span className="text-xs text-slate-400">Direct & Natural</span>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={language === 'hi'}
                onClick={() => handleLanguageChange('hi')}
                disabled={isCallActive}
                className={`flex flex-col items-center justify-center rounded-xl p-3 text-sm font-semibold transition-all border ${
                  language === 'hi'
                    ? 'border-blue-500 bg-blue-600/20 text-white shadow-sm ring-1 ring-blue-500'
                    : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:bg-slate-800 hover:text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <span className="text-base font-bold">हिन्दी</span>
                <span className="text-xs text-slate-400">सहज बातचीत</span>
              </button>
            </div>
            {isCallActive && (
              <p className="mt-2 text-[11px] text-slate-500 text-center">
                Language is locked during an active call.
              </p>
            )}
          </div>

          {/* Status & Primary Control Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 sm:p-6 shadow-lg flex flex-col items-center text-center">
            {/* Status Indicator (Accessible without color or sound alone) */}
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold tracking-wide transition-colors ${
              sessionState === 'Listening'
                ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
                : sessionState === 'Speaking' || sessionState === 'Responding'
                ? 'border-blue-500/40 bg-blue-950/40 text-blue-300'
                : sessionState === 'Connecting'
                ? 'border-amber-500/40 bg-amber-950/40 text-amber-300'
                : sessionState === 'Error'
                ? 'border-red-500/40 bg-red-950/40 text-red-300'
                : 'border-slate-700 bg-slate-800/80 text-slate-300'
            }">
              <Radio
                className={`h-3.5 w-3.5 ${
                  sessionState === 'Listening' || sessionState === 'Speaking'
                    ? 'animate-pulse text-emerald-400'
                    : sessionState === 'Connecting'
                    ? 'animate-spin text-amber-400'
                    : 'text-slate-400'
                }`}
                aria-hidden="true"
              />
              <span>
                {sessionState === 'Ready' && 'Ready (तैयार)'}
                {sessionState === 'Connecting' && 'Connecting...'}
                {sessionState === 'Listening' && 'Listening (सुन रहे हैं)'}
                {sessionState === 'Responding' && 'Processing...'}
                {sessionState === 'Speaking' && 'Speaking (बोल रहे हैं)'}
                {sessionState === 'Ended' && 'Call Ended (समाप्त)'}
                {sessionState === 'Error' && 'Error'}
              </span>
            </div>

            {/* Audio Wave Visualizer when Speaking or Listening */}
            <div className="h-10 flex items-center justify-center gap-1.5 my-2" aria-hidden="true">
              {sessionState === 'Speaking' ? (
                <>
                  <span className="w-1.5 bg-blue-400 rounded-full voice-wave-bar" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 bg-blue-400 rounded-full voice-wave-bar" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 bg-blue-300 rounded-full voice-wave-bar" style={{ animationDelay: '300ms' }} />
                  <span className="w-1.5 bg-blue-400 rounded-full voice-wave-bar" style={{ animationDelay: '450ms' }} />
                  <span className="w-1.5 bg-blue-500 rounded-full voice-wave-bar" style={{ animationDelay: '600ms' }} />
                </>
              ) : sessionState === 'Listening' ? (
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span className="text-xs text-emerald-400 font-medium">Speak your question</span>
                </div>
              ) : (
                <span className="text-xs text-slate-500">
                  {language === 'hi' ? 'शुरू करने के लिए नीचे दबाएं' : 'Press below to start speaking'}
                </span>
              )}
            </div>

            {/* Primary Action Button */}
            {!isCallActive ? (
              <button
                type="button"
                onClick={startSession}
                className="group relative mt-2 flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl shadow-blue-600/30 transition-all hover:bg-blue-500 hover:scale-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-400 active:scale-95"
                aria-label="Start voice call (बातचीत शुरू करें)"
              >
                <div className="flex flex-col items-center">
                  <Mic className="h-8 w-8 sm:h-9 sm:w-9" aria-hidden="true" />
                  <span className="mt-1 text-xs font-bold uppercase tracking-wider">Start</span>
                </div>
              </button>
            ) : (
              <div className="flex flex-col items-center gap-3 mt-2">
                <button
                  type="button"
                  onClick={endSession}
                  className="group relative flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center rounded-full bg-red-600 text-white shadow-xl shadow-red-600/30 transition-all hover:bg-red-500 hover:scale-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-400 active:scale-95"
                  aria-label="End voice call (कॉल समाप्त करें)"
                >
                  <div className="flex flex-col items-center">
                    <MicOff className="h-8 w-8 sm:h-9 sm:w-9" aria-hidden="true" />
                    <span className="mt-1 text-xs font-bold uppercase tracking-wider">End</span>
                  </div>
                </button>

                {/* Instant Interruption Button */}
                {sessionState === 'Speaking' && (
                  <button
                    type="button"
                    onClick={handleInterruption}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/50 bg-amber-950/40 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-900/50 transition-colors"
                  >
                    <Square className="h-3 w-3 fill-amber-300" aria-hidden="true" />
                    Interrupt (रोकें)
                  </button>
                )}
              </div>
            )}

            <p className="mt-4 text-xs text-slate-400">
              {isCallActive
                ? 'Speak naturally or interrupt anytime.'
                : 'Microphone permission requested on click.'}
            </p>
          </div>

          {/* Privacy & Transcript Options Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-xs text-slate-400 space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="save-transcripts-toggle" className="flex items-center gap-2 cursor-pointer font-medium text-slate-300">
                <Shield className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                <span>Save transcripts (बातचीत सहेजें)</span>
              </label>
              <input
                id="save-transcripts-toggle"
                type="checkbox"
                checked={saveTranscripts}
                onChange={(e) => handleSaveTranscriptToggle(e.target.checked)}
                className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900"
              />
            </div>
            <p className="text-[11px] leading-relaxed text-slate-400">
              Microphone audio streams directly to Google Gemini Live for real-time speech. No audio is ever stored on servers.
            </p>
          </div>
        </div>

        {/* Right / Bottom Workspace: Transcript & Conversation History */}
        <div className="md:col-span-7 lg:col-span-8 flex flex-col rounded-2xl border border-slate-800 bg-slate-900/80 shadow-lg overflow-hidden min-h-[420px]">
          {/* Transcript Header */}
          <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/60 px-4 py-3 sm:px-5">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-slate-200">Conversation Transcript</span>
              {transcripts.length > 0 && (
                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] text-slate-400 font-mono">
                  {transcripts.length} {transcripts.length === 1 ? 'turn' : 'turns'}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowTypedInput(!showTypedInput)}
                className="rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-700 transition-colors"
              >
                {showTypedInput ? 'Hide Typing' : 'Type Message'}
              </button>

              {transcripts.length > 0 && (
                <button
                  type="button"
                  onClick={clearTranscripts}
                  className="rounded-lg border border-slate-700 bg-slate-800/80 p-1.5 text-slate-400 hover:text-red-400 transition-colors"
                  title="Delete conversation (बातचीत मिटाएं)"
                  aria-label="Delete conversation transcript"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>

          {/* Error & Recovery Banner (if any error occurred) */}
          {errorInfo && (
            <div
              role="alert"
              className="m-4 flex items-start gap-3 rounded-xl border border-red-500/40 bg-red-950/40 p-4 text-xs sm:text-sm text-red-200"
            >
              <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-400 mt-0.5" aria-hidden="true" />
              <div className="flex-1">
                <p className="font-semibold text-red-300">{errorInfo.message}</p>
                <p className="mt-1 text-slate-300">{errorInfo.actionHint}</p>
                {errorInfo.type === 'unauthorized' && (
                  <a
                    href="/login"
                    className="inline-block mt-2 font-semibold text-blue-400 underline hover:text-blue-300"
                  >
                    Go to Sign In
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Transcript Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 max-h-[500px]">
            {transcripts.length === 0 && !interimUserText && !interimAssistantText ? (
              <div className="flex h-full min-h-[260px] flex-col items-center justify-center text-center text-slate-500 space-y-3 px-4">
                <Volume2 className="h-10 w-10 text-slate-600 stroke-[1.5]" aria-hidden="true" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-400">
                    {language === 'hi' ? 'बातचीत अभी शुरू नहीं हुई है' : 'No conversation yet'}
                  </p>
                  <p className="text-xs text-slate-500 max-w-sm">
                    {language === 'hi'
                      ? 'स्टार्ट बटन दबाएं और कुछ भी पूछें, जैसे "मेरा नाम रवि है।"'
                      : 'Press Start and speak naturally, for example "My name is Maya."'}
                  </p>
                </div>
              </div>
            ) : (
              <>
                {transcripts.map((turn) => (
                  <div
                    key={turn.id}
                    className={`flex flex-col ${turn.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 px-1">
                      <span className="text-[11px] font-medium text-slate-400">
                        {turn.role === 'user' ? 'You' : 'Sahayak (सहायक)'}
                      </span>
                      <span className="text-[10px] text-slate-600 font-mono">
                        {new Date(turn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm sm:text-base leading-relaxed ${
                        turn.role === 'user'
                          ? 'bg-blue-600 text-white rounded-tr-sm'
                          : 'bg-slate-800/90 text-slate-100 rounded-tl-sm border border-slate-700/60'
                      }`}
                    >
                      {turn.content}
                    </div>
                  </div>
                ))}

                {/* Interim User Speaking Text */}
                {interimUserText && (
                  <div className="flex flex-col items-end">
                    <span className="text-[11px] font-medium text-slate-400 mb-1 px-1">You (listening...)</span>
                    <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-blue-600/40 text-blue-100 border border-blue-500/30 px-4 py-3 text-sm sm:text-base italic leading-relaxed">
                      {interimUserText}
                    </div>
                  </div>
                )}

                {/* Interim Assistant Speaking Text */}
                {interimAssistantText && (
                  <div className="flex flex-col items-start">
                    <span className="text-[11px] font-medium text-slate-400 mb-1 px-1">Sahayak (speaking...)</span>
                    <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-slate-800/60 text-slate-200 border border-slate-700/40 px-4 py-3 text-sm sm:text-base leading-relaxed animate-pulse">
                      {interimAssistantText}
                    </div>
                  </div>
                )}

                <div ref={transcriptBottomRef} />
              </>
            )}
          </div>

          {/* Typed Input Drawer / Fallback Form (for accessibility and users who cannot speak) */}
          {showTypedInput && (
            <form
              onSubmit={handleSendTyped}
              className="border-t border-slate-800 bg-slate-950/90 p-3 flex items-center gap-2"
            >
              <label htmlFor="typed-message-input" className="sr-only">
                Type a message to Sahayak
              </label>
              <input
                id="typed-message-input"
                type="text"
                value={typedMessage}
                onChange={(e) => setTypedMessage(e.target.value)}
                placeholder={
                  language === 'hi'
                    ? 'यहाँ लिखें (जैसे: "नमस्ते सहायक")...'
                    : 'Type a message here (e.g. "Hello Sahayak")...'
                }
                className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={!typedMessage.trim() || !isCallActive}
                className="inline-flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed p-2.5 text-white transition-colors"
                title="Send text to assistant"
              >
                <Send className="h-4 w-4" aria-hidden="true" />
              </button>
            </form>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="pt-4 border-t border-slate-800 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-blue-400" aria-hidden="true" />
          <span>SAHAYAK AI v1.0 &bull; Powered by Google Gemini Live</span>
        </div>
        <div className="flex items-center gap-4 text-slate-400">
          <a
            href="https://policies.google.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-slate-300 underline"
          >
            Google Privacy Policy
          </a>
          <a
            href="https://ai.google.dev/gemini-api/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-slate-300 underline"
          >
            Gemini Terms
          </a>
        </div>
      </footer>
    </div>
  );
}
