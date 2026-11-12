import { beforeEach, describe, expect, it } from 'vitest';
import type { QaFn } from './briefReader';
import { preloadBriefModel, resetModelStatus, useModelStatus } from './modelStatus';

const qa: QaFn = async () => ({ answer: '', score: 0 });

describe('background model preload', () => {
  beforeEach(() => resetModelStatus());

  it('reports progress, then ready', async () => {
    const seen: number[] = [];
    const unsub = useModelStatus.subscribe((s) => s.state === 'loading' && seen.push(s.ratio));
    await preloadBriefModel(async (on) => {
      on({ ratio: 0.4 });
      on({ ratio: 0.9 });
      return qa;
    });
    unsub();
    expect(seen).toContain(0.4);
    expect(useModelStatus.getState().state).toBe('ready');
  });

  it('falls back to rules when the model cannot load, and can retry later', async () => {
    await preloadBriefModel(async () => {
      throw new Error('offline');
    });
    expect(useModelStatus.getState().state).toBe('fallback');
    await preloadBriefModel(async () => qa);
    expect(useModelStatus.getState().state).toBe('ready');
  });

  it('loads only once', async () => {
    let calls = 0;
    const load = async () => {
      calls++;
      return qa;
    };
    await Promise.all([preloadBriefModel(load), preloadBriefModel(load)]);
    expect(calls).toBe(1);
  });
});
