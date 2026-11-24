'use client';

import {
  AlertCircle,
  Check,
  Loader2,
  MessageSquare,
  Mic,
  MicOff,
  Radio,
  Volume2,
} from 'lucide-react';
import { type SessionState } from '@/lib/session/transcript-types';
import { type AppStrings } from '@/lib/i18n';

interface StatusPillProps {
  state: SessionState;
  strings: AppStrings;
  isMuted?: boolean;
}

export function StatusPill({ state, strings, isMuted = false }: StatusPillProps) {
  const label = strings.call.status[state];

  const getVisualConfig = () => {
    switch (state) {
      case 'Listening':
        return {
          container:
            'border-[var(--accent-border)] bg-[var(--accent-tint)] text-[var(--accent-primary)]',
          icon: <Mic className="h-3.5 w-3.5 shrink-0" strokeWidth={1.9} aria-hidden="true" />,
        };
      case 'Speaking':
        return {
          container:
            'border-[var(--speaking-border)] bg-[var(--speaking-tint)] text-[var(--speaking-primary)]',
          icon: <Volume2 className="h-3.5 w-3.5 shrink-0" strokeWidth={1.9} aria-hidden="true" />,
        };
      case 'Responding':
        return {
          container:
            'border-[var(--warning-border)] bg-[var(--warning-tint)] text-[var(--warning-ink)]',
          icon: <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" strokeWidth={1.9} aria-hidden="true" />,
        };
      case 'Muted':
        return {
          container:
            'border-[var(--warning-border)] bg-[var(--warning-tint)] text-[var(--warning-ink)]',
          icon: <MicOff className="h-3.5 w-3.5 shrink-0" strokeWidth={1.9} aria-hidden="true" />,
        };
      case 'Connected':
        return {
          container:
            'border-[var(--border-strong)] bg-[var(--bg-subtle)] text-[var(--ink-primary)]',
          icon: <MessageSquare className="h-3.5 w-3.5 shrink-0" strokeWidth={1.9} aria-hidden="true" />,
        };
      case 'Connecting':
      case 'RequestingPermission':
        return {
          container:
            'border-[var(--border-strong)] bg-[var(--bg-subtle)] text-[var(--ink-secondary)]',
          icon: <Radio className="h-3.5 w-3.5 shrink-0" strokeWidth={1.9} aria-hidden="true" />,
        };
      case 'Ended':
        return {
          container:
            'border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--ink-secondary)]',
          icon: <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={1.9} aria-hidden="true" />,
        };
      case 'Error':
        return {
          container:
            'border-[var(--danger-border)] bg-[var(--danger-tint)] text-[var(--danger-ink)]',
          icon: <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.9} aria-hidden="true" />,
        };
      default:
        return {
          container:
            'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--ink-secondary)]',
          icon: <Mic className="h-3.5 w-3.5 shrink-0" strokeWidth={1.9} aria-hidden="true" />,
        };
    }
  };

  const { container, icon } = getVisualConfig();

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <span
        className={`inline-flex items-center gap-2 rounded-[8px] border px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors ${container}`}
      >
        {icon}
        <span>{label}</span>
      </span>

      {/* Explicit secondary mic-muted badge whenever assistant is speaking/processing while muted */}
      {isMuted && (state === 'Speaking' || state === 'Responding') && (
        <span className="inline-flex items-center gap-1.5 rounded-[8px] border border-[var(--warning-border)] bg-[var(--warning-tint)] px-2.5 py-1.5 text-xs font-medium text-[var(--warning-ink)]">
          <MicOff className="h-3.5 w-3.5 shrink-0" strokeWidth={1.9} aria-hidden="true" />
          <span>{strings.call.status.Muted}</span>
        </span>
      )}
    </div>
  );
}
