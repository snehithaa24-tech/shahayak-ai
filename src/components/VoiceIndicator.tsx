'use client';

import { useEffect, useRef } from 'react';
import { Mic, MicOff, MessageSquare, Radio, Volume2 } from 'lucide-react';
import { type SessionState } from '@/lib/session/transcript-types';
import { type AudioLevels } from '@/hooks/use-voice-session';
import { useMediaQuery } from '@/hooks/use-media-query';

interface VoiceIndicatorProps {
  state: SessionState;
  getAudioLevels: () => AudioLevels;
}

const BAR_WEIGHTS = [0.48, 0.82, 1.0, 0.78, 0.52];

export function VoiceIndicator({ state, getAudioLevels }: VoiceIndicatorProps) {
  const outerRingRef = useRef<HTMLDivElement>(null);
  const barRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  useEffect(() => {
    const isReactive = state === 'Listening' || state === 'Speaking';

    const resetVisuals = () => {
      if (outerRingRef.current) {
        outerRingRef.current.style.transform = 'scale(1)';
        outerRingRef.current.style.opacity = '0.45';
      }
      barRefs.current.forEach((bar) => {
        if (bar) {
          bar.style.transform = 'scaleY(0.25)';
        }
      });
    };

    if (!isReactive || reducedMotion) {
      resetVisuals();
      return;
    }

    let rafId = 0;
    let smoothed = 0;

    const tick = () => {
      const levels = getAudioLevels();
      const target = state === 'Speaking' ? levels.assistant : levels.mic;
      // Fast attack, gentle decay so waveform feels responsive yet calm
      smoothed = target > smoothed ? smoothed * 0.45 + target * 0.55 : smoothed * 0.82 + target * 0.18;

      if (outerRingRef.current) {
        const ringScale = 1 + Math.min(0.16, smoothed * 0.16);
        const ringOpacity = 0.4 + Math.min(0.5, smoothed * 0.5);
        outerRingRef.current.style.transform = `scale(${ringScale.toFixed(3)})`;
        outerRingRef.current.style.opacity = ringOpacity.toFixed(3);
      }

      barRefs.current.forEach((bar, index) => {
        if (!bar) return;
        const weight = BAR_WEIGHTS[index] ?? 0.6;
        const scaleY = 0.22 + smoothed * weight * 0.78;
        bar.style.transform = `scaleY(${Math.min(1, scaleY).toFixed(3)})`;
      });

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);

    return () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
      resetVisuals();
    };
  }, [state, getAudioLevels, reducedMotion]);

  const isNegotiating = state === 'Connecting' || state === 'RequestingPermission';
  const showBars = state === 'Listening' || state === 'Speaking';

  const ringBorderClass =
    state === 'Listening'
      ? 'border-[var(--accent-primary)]'
      : state === 'Speaking'
      ? 'border-[var(--speaking-primary)]'
      : state === 'Muted' || state === 'Responding'
      ? 'border-[var(--warning-border)]'
      : 'border-[var(--border-strong)]';

  const barColorClass =
    state === 'Speaking'
      ? 'bg-[var(--speaking-primary)]'
      : 'bg-[var(--accent-primary)]';

  const innerSurfaceClass =
    state === 'Listening'
      ? 'border-[var(--accent-border)] bg-[var(--bg-surface)] text-[var(--accent-primary)]'
      : state === 'Speaking'
      ? 'border-[var(--speaking-border)] bg-[var(--bg-surface)] text-[var(--speaking-primary)]'
      : state === 'Muted' || state === 'Responding'
      ? 'border-[var(--warning-border)] bg-[var(--warning-tint)] text-[var(--warning-ink)]'
      : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--ink-secondary)]';

  return (
    <div className="relative flex h-40 w-40 sm:h-44 sm:w-44 items-center justify-center select-none" aria-hidden="true">
      {/* Outer delicate acoustic circle */}
      <div
        ref={outerRingRef}
        className={`absolute inset-0 rounded-full border transition-colors duration-200 ${ringBorderClass} ${
          isNegotiating && !reducedMotion ? 'animate-calm-breathe' : ''
        }`}
        style={{ opacity: 0.45 }}
      />

      {/* Secondary hairline guide circle */}
      <div className="absolute inset-3 rounded-full border border-[var(--border-subtle)] opacity-70" />

      {/* Core Dial */}
      <div
        className={`relative flex h-28 w-28 sm:h-32 sm:w-32 flex-col items-center justify-center rounded-full border shadow-[var(--shadow-card)] transition-colors duration-200 ${innerSurfaceClass}`}
      >
        {showBars ? (
          <div className="flex flex-col items-center gap-2.5">
            {state === 'Speaking' ? (
              <Volume2 className="h-5 w-5 opacity-80" strokeWidth={1.75} />
            ) : (
              <Mic className="h-5 w-5 opacity-80" strokeWidth={1.75} />
            )}
            <div className="flex h-7 items-center justify-center gap-1.5">
              {BAR_WEIGHTS.map((_, index) => (
                <span
                  key={index}
                  ref={(el) => {
                    barRefs.current[index] = el;
                  }}
                  className={`h-7 w-[3px] origin-center rounded-full transition-colors ${barColorClass}`}
                  style={{ transform: 'scaleY(0.25)' }}
                />
              ))}
            </div>
          </div>
        ) : state === 'Muted' ? (
          <MicOff className="h-8 w-8" strokeWidth={1.6} />
        ) : state === 'Connected' ? (
          <MessageSquare className="h-8 w-8" strokeWidth={1.6} />
        ) : state === 'Responding' ? (
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[var(--warning-ink)] opacity-45" />
            <span className="h-2 w-2 rounded-full bg-[var(--warning-ink)] opacity-75" />
            <span className="h-2 w-2 rounded-full bg-[var(--warning-ink)] opacity-45" />
          </div>
        ) : (
          <Radio className="h-7 w-7" strokeWidth={1.6} />
        )}
      </div>
    </div>
  );
}
