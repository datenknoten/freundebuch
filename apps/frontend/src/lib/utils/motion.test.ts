import { afterEach, describe, expect, it, vi } from 'vitest';
import { motionDuration } from './motion.js';

describe('motionDuration', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('collapses the duration when the OS asks for reduced motion', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));

    expect(motionDuration(200)).toBe(0);
  });

  it('keeps the duration when the OS has no motion preference', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));

    expect(motionDuration(200)).toBe(200);
  });

  it('passes the duration through where matchMedia is unavailable', () => {
    vi.stubGlobal('matchMedia', undefined);

    expect(motionDuration(200)).toBe(200);
  });
});
