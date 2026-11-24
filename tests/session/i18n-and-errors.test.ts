import { describe, it, expect } from 'vitest';
import { getAppStrings } from '@/lib/i18n';
import {
  getErrorMessageAndHint,
  type ErrorType,
  type SessionState,
} from '@/lib/session/transcript-types';

const ALL_SESSION_STATES: SessionState[] = [
  'Ready',
  'Connecting',
  'RequestingPermission',
  'Connected',
  'Listening',
  'Responding',
  'Speaking',
  'Muted',
  'Ended',
  'Error',
];

const ALL_ERROR_TYPES: ErrorType[] = [
  'permission_denied',
  'device_not_found',
  'expired_credential',
  'quota_exhausted',
  'network_loss',
  'rate_limit_exceeded',
  'unauthorized',
  'unknown',
];

describe('Bilingual Localization and State Mapping', () => {
  it('provides localized status and ARIA labels for every session state in English and Hindi', () => {
    const en = getAppStrings('en');
    const hi = getAppStrings('hi');

    for (const state of ALL_SESSION_STATES) {
      expect(en.call.status[state].trim().length).toBeGreaterThan(0);
      expect(en.call.ariaStatus[state].trim().length).toBeGreaterThan(0);
      expect(hi.call.status[state].trim().length).toBeGreaterThan(0);
      expect(hi.call.ariaStatus[state].trim().length).toBeGreaterThan(0);
      expect(hi.call.status[state]).not.toBe(en.call.status[state]);
    }
  });

  it('never uses Listening wording for muted or mic-off connected states', () => {
    const en = getAppStrings('en');
    const hi = getAppStrings('hi');

    expect(en.call.status.Muted.toLowerCase()).not.toContain('listening');
    expect(en.call.status.Connected.toLowerCase()).not.toContain('listening');
    expect(hi.call.status.Muted).not.toContain('सुन रहे');
    expect(hi.call.status.Connected).not.toContain('सुन रहे');
  });

  it('provides distinct bilingual error recovery guidance and strict retry eligibility', () => {
    for (const type of ALL_ERROR_TYPES) {
      const enErr = getErrorMessageAndHint(type, undefined, 'en');
      const hiErr = getErrorMessageAndHint(type, undefined, 'hi');

      expect(enErr.message.length).toBeGreaterThan(0);
      expect(enErr.actionHint.length).toBeGreaterThan(0);
      expect(hiErr.message.length).toBeGreaterThan(0);
      expect(hiErr.actionHint.length).toBeGreaterThan(0);
      expect(hiErr.message).not.toBe(enErr.message);

      if (type === 'quota_exhausted' || type === 'rate_limit_exceeded' || type === 'unauthorized') {
        expect(enErr.retryable).toBe(false);
        expect(hiErr.retryable).toBe(false);
      } else {
        expect(enErr.retryable).toBe(true);
        expect(hiErr.retryable).toBe(true);
      }
    }
  });
});
