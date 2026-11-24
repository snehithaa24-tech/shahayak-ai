'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useVoiceSession } from '@/hooks/use-voice-session';
import { createClient } from '@/lib/supabase/client';
import {
  Mic,
  PhoneOff,
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
  VolumeX,
  CheckCircle2,
  MessageSquare,
  Sparkles,
} from 'lucide-react';

export default function HomePage() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [typedMessage, setTypedMessage] = useState('');
  const [showTypedInput, setShowTypedInput] = useState(false);
  const [showTranscriptDrawer, setShowTranscriptDrawer] = useState(false);
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
    micVolume,
    isMuted,
    toggleMute,
    triggerTurnComplete,
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
    setShowTypedInput(false);
  };

  const isCallActive =
    sessionState === 'Listening' ||
    sessionState === 'Speaking' ||
    sessionState === 'Responding' ||
    sessionState === 'Connecting';

  // Get current active caption to display on the call stage
  const latestTurn = transcripts.length > 0 ? transcripts[transcripts.length - 1] : null;
  const currentSubtitle = interimAssistantText
    ? interimAssistantText
    : interimUserText
    ? interimUserText
    : sessionState === 'Speaking' && latestTurn && latestTurn.role === 'assistant'
    ? latestTurn.content
    : null;

  return (
    <div className="flex flex-1 flex-col justify-between max-w-5xl w-full mx-auto px-4 py-4 sm:px-6 sm:py-6">
      {/* Polite ARIA live region for state changes */}
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
      <header className="flex items-center justify-between pb-4 border-b border-slate-800 gap-3">
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
                Live Voice Call
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Bilingual Hindi & English Voice Assistant
            </p>
          </div>
        </div>

        {/* User Identity & Auth Controls */}
        <div className="flex items-center gap-2">
          {userEmail ? (
            <div className="flex items-center gap-2 rounded-lg bg-slate-900 border border-slate-800 px-3 py-1.5 text-xs text-slate-300">
              <User className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              <span className="max-w-[130px] sm:max-w-[200px] truncate">{userEmail}</span>
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

      {/* Error & Recovery Banner (if any error occurred) */}
      {errorInfo && (
        <div
          role="alert"
          className="my-4 flex items-start gap-3 rounded-xl border border-red-500/40 bg-red-950/40 p-4 text-xs sm:text-sm text-red-200"
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

      {/* ================================================================ */}
      {/* ACTIVE CALL STAGE: IMMERSIVE 1-ON-1 VOICE CONVERSATION MODE     */}
      {/* ================================================================ */}
      {isCallActive ? (
        <main className="flex-1 flex flex-col justify-between items-center my-4 sm:my-6 rounded-3xl border border-blue-500/30 bg-gradient-to-b from-slate-900/95 via-slate-950 to-slate-900/95 p-6 sm:p-10 shadow-2xl relative overflow-hidden min-h-[520px]">
          {/* Subtle Ambient Background Glow */}
          <div
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl pointer-events-none transition-all duration-700 opacity-20 ${
              sessionState === 'Speaking'
                ? 'bg-blue-500 scale-125 opacity-30'
                : sessionState === 'Listening'
                ? 'bg-emerald-500 scale-110 opacity-25'
                : 'bg-amber-500 scale-90'
            }`}
            aria-hidden="true"
          />

          {/* Call Top Bar: Language & Transcript Toggle */}
          <div className="w-full flex items-center justify-between z-10">
            {/* Language Switcher Pill */}
            <div className="inline-flex items-center gap-1 bg-slate-900/80 border border-slate-800 rounded-full p-1 text-xs">
              <button
                type="button"
                onClick={() => handleLanguageChange('en')}
                className={`px-3 py-1 rounded-full font-medium transition-colors ${
                  language === 'en'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => handleLanguageChange('hi')}
                className={`px-3 py-1 rounded-full font-medium transition-colors ${
                  language === 'hi'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                हिन्दी
              </button>
            </div>

            {/* Transcript Drawer Toggle */}
            <button
              type="button"
              onClick={() => setShowTranscriptDrawer(!showTranscriptDrawer)}
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-900/80 border border-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
            >
              <MessageSquare className="h-3.5 w-3.5 text-blue-400" aria-hidden="true" />
              <span>{showTranscriptDrawer ? 'Hide Transcript' : 'View Transcript'}</span>
            </button>
          </div>

          {/* Central Call Experience: Interactive Pulsating Voice Orb */}
          <div className="flex flex-col items-center justify-center my-auto text-center z-10 w-full max-w-xl">
            {/* The Live Voice Sphere */}
            <div className="relative flex items-center justify-center mb-6">
              {/* Outer Pulsing Glow Rings */}
              <div
                className={`absolute rounded-full transition-all duration-300 pointer-events-none ${
                  sessionState === 'Speaking'
                    ? 'w-48 h-48 sm:w-56 sm:h-56 bg-blue-500/20 animate-ping'
                    : sessionState === 'Listening'
                    ? `w-44 h-44 sm:w-52 sm:h-52 bg-emerald-500/20 ${
                        micVolume > 0.05 ? 'scale-125 opacity-60' : 'opacity-30'
                      }`
                    : 'w-40 h-40 bg-amber-500/10'
                }`}
                style={{
                  transform:
                    sessionState === 'Listening'
                      ? `scale(${1 + micVolume * 0.8})`
                      : undefined,
                }}
              />

              {/* Middle Aura Ring */}
              <div
                className={`absolute rounded-full transition-all duration-500 ${
                  sessionState === 'Speaking'
                    ? 'w-40 h-40 sm:w-48 sm:h-48 bg-gradient-to-tr from-blue-600/30 to-indigo-500/40 animate-pulse'
                    : sessionState === 'Listening'
                    ? 'w-36 h-36 sm:w-44 sm:h-44 bg-gradient-to-tr from-emerald-600/30 to-teal-500/30'
                    : 'w-32 h-32 bg-slate-800/40'
                }`}
              />

              {/* Core Orb */}
              <div
                className={`relative flex items-center justify-center w-28 h-28 sm:w-36 sm:h-36 rounded-full shadow-2xl transition-all duration-300 ${
                  sessionState === 'Speaking'
                    ? 'bg-gradient-to-br from-blue-500 to-indigo-700 text-white shadow-blue-500/50 scale-105'
                    : sessionState === 'Listening'
                    ? 'bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-emerald-500/40'
                    : sessionState === 'Responding'
                    ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-amber-500/40 animate-pulse'
                    : 'bg-slate-800 text-slate-300'
                }`}
                style={{
                  transform:
                    sessionState === 'Listening'
                      ? `scale(${1 + micVolume * 0.4})`
                      : undefined,
                }}
              >
                {sessionState === 'Speaking' ? (
                  <Volume2 className="h-12 w-12 sm:h-14 sm:w-14 animate-bounce" aria-hidden="true" />
                ) : sessionState === 'Listening' ? (
                  <Mic className="h-12 w-12 sm:h-14 sm:w-14" aria-hidden="true" />
                ) : sessionState === 'Responding' ? (
                  <Sparkles className="h-12 w-12 sm:h-14 sm:w-14 animate-spin" aria-hidden="true" />
                ) : (
                  <Radio className="h-10 w-10 animate-spin" aria-hidden="true" />
                )}
              </div>
            </div>

            {/* Status Title */}
            <div className="space-y-1 mb-4">
              <div className="inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-xs font-semibold tracking-wide ${
                sessionState === 'Listening'
                  ? 'border-emerald-500/40 bg-emerald-950/60 text-emerald-300'
                  : sessionState === 'Speaking'
                  ? 'border-blue-500/40 bg-blue-950/60 text-blue-300'
                  : sessionState === 'Responding'
                  ? 'border-amber-500/40 bg-amber-950/60 text-amber-300'
                  : 'border-slate-700 bg-slate-800 text-slate-300'
              }">
                <span
                  className={`w-2 h-2 rounded-full ${
                    sessionState === 'Listening'
                      ? 'bg-emerald-400 animate-ping'
                      : sessionState === 'Speaking'
                      ? 'bg-blue-400 animate-pulse'
                      : 'bg-amber-400'
                  }`}
                />
                <span>
                  {sessionState === 'Listening' &&
                    (language === 'hi' ? 'आपकी बात सुन रहे हैं...' : 'Listening to you... Speak naturally')}
                  {sessionState === 'Speaking' &&
                    (language === 'hi' ? 'सहायक बोल रहे हैं...' : 'Sahayak is speaking...')}
                  {sessionState === 'Responding' &&
                    (language === 'hi' ? 'सोच रहे हैं...' : 'Thinking...')}
                  {sessionState === 'Connecting' &&
                    (language === 'hi' ? 'जुड़ रहे हैं...' : 'Connecting...')}
                </span>
              </div>
            </div>

            {/* Live Spoken Captions Card */}
            <div className="w-full min-h-[70px] flex items-center justify-center p-3 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-sm">
              {currentSubtitle ? (
                <p className="text-base sm:text-lg font-medium text-slate-100 leading-relaxed max-w-lg">
                  {currentSubtitle}
                </p>
              ) : (
                <p className="text-sm text-slate-400 italic">
                  {language === 'hi'
                    ? 'बोलना शुरू करें, जैसे: "मेरा नाम रवि है।"'
                    : 'Start speaking, for example: "My name is Maya."'}
                </p>
              )}
            </div>
          </div>

          {/* Bottom Action Controls: End Call, Mute, Interrupt, Tap When Done */}
          <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-4 z-10 pt-4 border-t border-slate-800/80">
            {/* Quick Actions (Mute & Done Speaking) */}
            <div className="flex items-center gap-3">
              {/* Mute / Unmute Button */}
              <button
                type="button"
                onClick={toggleMute}
                className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-semibold border transition-all ${
                  isMuted
                    ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                    : 'border-slate-700 bg-slate-900/90 text-slate-300 hover:bg-slate-800'
                }`}
                title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                <span>{isMuted ? 'Unmute' : 'Mute'}</span>
              </button>

              {/* Interrupt Button (When Sahayak is speaking) */}
              {sessionState === 'Speaking' && (
                <button
                  type="button"
                  onClick={handleInterruption}
                  className="flex items-center gap-2 rounded-full border border-amber-500/50 bg-amber-950/60 px-4 py-2.5 text-xs font-semibold text-amber-300 hover:bg-amber-900/60 transition-colors shadow-lg"
                >
                  <Square className="h-3.5 w-3.5 fill-amber-300" aria-hidden="true" />
                  <span>Interrupt (रोकें)</span>
                </button>
              )}

              {/* "Done Speaking" Button (Forces immediate response) */}
              {sessionState === 'Listening' && (
                <button
                  type="button"
                  onClick={triggerTurnComplete}
                  className="flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-950/60 px-4 py-2.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-900/60 transition-colors"
                  title="Signal you finished speaking to get immediate answer"
                >
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  <span>Done Speaking (हो गया)</span>
                </button>
              )}

              {/* Type Message Toggle */}
              <button
                type="button"
                onClick={() => setShowTypedInput(!showTypedInput)}
                className="flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900/90 px-3.5 py-2.5 text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
                title="Type a question"
              >
                <Send className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Type</span>
              </button>
            </div>

            {/* Primary Big Red "End Call" Button */}
            <button
              type="button"
              onClick={endSession}
              className="group flex items-center justify-center gap-2 rounded-full bg-red-600 hover:bg-red-500 active:scale-95 px-8 py-3.5 text-sm font-bold uppercase tracking-wider text-white shadow-xl shadow-red-600/40 transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-400"
              aria-label="End voice call (कॉल समाप्त करें)"
            >
              <PhoneOff className="h-5 w-5" aria-hidden="true" />
              <span>End Call (समाप्त)</span>
            </button>
          </div>

          {/* Collapsible Typed Input in Call Mode */}
          {showTypedInput && (
            <form
              onSubmit={handleSendTyped}
              className="w-full mt-4 flex items-center gap-2 z-20 bg-slate-900 border border-slate-700 rounded-2xl p-2"
            >
              <label htmlFor="call-typed-message-input" className="sr-only">
                Type message
              </label>
              <input
                id="call-typed-message-input"
                type="text"
                value={typedMessage}
                onChange={(e) => setTypedMessage(e.target.value)}
                placeholder={
                  language === 'hi'
                    ? 'यहाँ लिखें (जैसे: "नमस्ते")...'
                    : 'Type a message here...'
                }
                autoFocus
                className="flex-1 rounded-xl bg-slate-950 px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!typedMessage.trim()}
                className="rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 p-2 text-white transition-colors"
              >
                <Send className="h-4 w-4" aria-hidden="true" />
              </button>
            </form>
          )}

          {/* Slide-in / Collapsible Transcript Drawer */}
          {showTranscriptDrawer && (
            <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md z-30 flex flex-col p-6 rounded-3xl overflow-hidden">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-blue-400" />
                  <span className="font-semibold text-sm text-slate-100">Live Call Transcript</span>
                  <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                    {transcripts.length} turns
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTranscriptDrawer(false)}
                  className="rounded-lg bg-slate-850 hover:bg-slate-800 px-3 py-1 text-xs text-slate-300"
                >
                  Close
                </button>
              </div>

              <div className="flex-1 overflow-y-auto my-4 space-y-3 pr-2">
                {transcripts.length === 0 ? (
                  <p className="text-center text-sm text-slate-500 mt-10">No turns recorded yet. Speak into your mic!</p>
                ) : (
                  transcripts.map((turn) => (
                    <div
                      key={turn.id}
                      className={`flex flex-col ${turn.role === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      <span className="text-[10px] text-slate-500 mb-0.5">
                        {turn.role === 'user' ? 'You' : 'Sahayak'}
                      </span>
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${
                          turn.role === 'user'
                            ? 'bg-blue-600 text-white rounded-tr-sm'
                            : 'bg-slate-800 text-slate-100 rounded-tl-sm border border-slate-700'
                        }`}
                      >
                        {turn.content}
                      </div>
                    </div>
                  ))
                )}
                <div ref={transcriptBottomRef} />
              </div>
            </div>
          )}
        </main>
      ) : (
        /* ================================================================ */
        /* IDLE / READY STAGE: CLEAN DASHBOARD & START CALL INTERFACE        */
        /* ================================================================ */
        <main className="flex-1 flex flex-col md:grid md:grid-cols-12 gap-6 my-6">
          {/* Left Hero Card: Language Choice & Big Start Button */}
          <div className="md:col-span-5 lg:col-span-5 flex flex-col gap-5">
            {/* Language Selection Card */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
              <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                <Globe className="h-4 w-4 text-blue-400" aria-hidden="true" />
                Select Language (भाषा चुनें)
              </label>
              <div className="grid grid-cols-2 gap-2.5" role="radiogroup" aria-label="Choose Language">
                <button
                  type="button"
                  role="radio"
                  aria-checked={language === 'en'}
                  onClick={() => handleLanguageChange('en')}
                  className={`flex flex-col items-center justify-center rounded-xl p-3.5 text-sm font-semibold transition-all border ${
                    language === 'en'
                      ? 'border-blue-500 bg-blue-600/20 text-white shadow-sm ring-1 ring-blue-500'
                      : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span className="text-base font-bold">English</span>
                  <span className="text-xs text-slate-400">Direct & Natural</span>
                </button>

                <button
                  type="button"
                  role="radio"
                  aria-checked={language === 'hi'}
                  onClick={() => handleLanguageChange('hi')}
                  className={`flex flex-col items-center justify-center rounded-xl p-3.5 text-sm font-semibold transition-all border ${
                    language === 'hi'
                      ? 'border-blue-500 bg-blue-600/20 text-white shadow-sm ring-1 ring-blue-500'
                      : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span className="text-base font-bold">हिन्दी</span>
                  <span className="text-xs text-slate-400">सहज बातचीत</span>
                </button>
              </div>
            </div>

            {/* Call Action Card */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg flex flex-col items-center text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/80 px-3 py-1 text-xs font-semibold text-slate-300">
                <Radio className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                <span>Ready for Voice Call (बातचीत के लिए तैयार)</span>
              </div>

              {/* Big Glowing Start Button */}
              <div className="relative my-4 flex items-center justify-center">
                <div className="absolute w-32 h-32 rounded-full bg-blue-500/20 animate-ping pointer-events-none" />
                <button
                  type="button"
                  onClick={() => startSession({ enableMic: true })}
                  className="group relative flex h-28 w-28 sm:h-32 sm:w-32 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-2xl shadow-blue-600/40 transition-all hover:scale-105 hover:from-blue-500 hover:to-indigo-500 active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-400"
                  aria-label="Start one-on-one voice call (बातचीत शुरू करें)"
                >
                  <div className="flex flex-col items-center">
                    <Mic className="h-10 w-10 sm:h-12 sm:w-12" aria-hidden="true" />
                    <span className="mt-1 text-xs font-bold uppercase tracking-wider">Start Call</span>
                  </div>
                </button>
              </div>

              <p className="mt-3 text-xs text-slate-400 max-w-xs">
                {language === 'hi'
                  ? 'स्टार्ट बटन दबाएं और माइक से सहज बातचीत शुरू करें।'
                  : 'Press Start Call for a hands-free, two-way voice conversation.'}
              </p>
            </div>

            {/* Privacy & Transcript Options Card */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-xs text-slate-400 space-y-3">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="save-transcripts-toggle"
                  className="flex items-center gap-2 cursor-pointer font-medium text-slate-300"
                >
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

          {/* Right Side: Conversation History & Typed Option */}
          <div className="md:col-span-7 lg:col-span-7 flex flex-col rounded-2xl border border-slate-800 bg-slate-900/80 shadow-lg overflow-hidden min-h-[420px]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/60 px-4 py-3 sm:px-5">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-blue-400" />
                <span className="font-semibold text-sm text-slate-200">Conversation History</span>
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

            {/* Transcript Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 max-h-[500px]">
              {transcripts.length === 0 ? (
                <div className="flex h-full min-h-[260px] flex-col items-center justify-center text-center text-slate-500 space-y-3 px-4">
                  <Volume2 className="h-10 w-10 text-slate-600 stroke-[1.5]" aria-hidden="true" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-400">
                      {language === 'hi' ? 'बातचीत अभी शुरू नहीं हुई है' : 'No conversation yet'}
                    </p>
                    <p className="text-xs text-slate-500 max-w-sm">
                      {language === 'hi'
                        ? 'स्टार्ट कॉल दबाएं और सीधे बोलकर बात करें।'
                        : 'Press Start Call above to begin a live speaking conversation.'}
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
                          {new Date(turn.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
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
                  <div ref={transcriptBottomRef} />
                </>
              )}
            </div>

            {/* Typed Fallback Input */}
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
                  disabled={!typedMessage.trim()}
                  className="inline-flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed p-2.5 text-white transition-colors"
                  title="Send text to assistant"
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                </button>
              </form>
            )}
          </div>
        </main>
      )}

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