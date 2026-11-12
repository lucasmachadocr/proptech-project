// Background loading of the brief-reader language model, started when the app opens.
// The header shows the state: "AI loading 42%" → "AI ready", or "Rules fallback" if the model cannot load.
// The browser keeps the weights in its Cache Storage, so the second visit loads them from disk.
import { create } from 'zustand';
import { loadBriefModel, type QaFn } from './briefReader';

export type ModelState = 'idle' | 'loading' | 'ready' | 'fallback';

interface ModelStatus {
  state: ModelState;
  /** 0–1 while the weights download. */
  ratio: number;
  setLoading: (ratio: number) => void;
  setReady: () => void;
  setFallback: () => void;
}

export const useModelStatus = create<ModelStatus>()((set) => ({
  state: 'idle',
  ratio: 0,
  setLoading: (ratio) => set({ state: 'loading', ratio }),
  setReady: () => set({ state: 'ready', ratio: 1 }),
  setFallback: () => set({ state: 'fallback' }),
}));

let started: Promise<void> | null = null;

/**
 * Starts loading the model once. Never throws: on failure the status becomes "fallback" and the
 * rule parser reads requests. `load` is injectable for tests.
 */
export function preloadBriefModel(load: (onProgress: (p: { ratio: number }) => void) => Promise<QaFn> = loadBriefModel): Promise<void> {
  started ??= (async () => {
    const s = useModelStatus.getState();
    s.setLoading(0);
    try {
      await load((p) => {
        if (p.ratio < 1) useModelStatus.getState().setLoading(p.ratio);
      });
      useModelStatus.getState().setReady();
    } catch {
      useModelStatus.getState().setFallback();
      started = null; // a later call (e.g. "Read the request") may try again
    }
  })();
  return started;
}

/** Test helper. */
export function resetModelStatus() {
  started = null;
  useModelStatus.setState({ state: 'idle', ratio: 0 });
}

/** Skip the background download when the URL asks for it (?nomodel), e.g. in automated tests. */
export function preloadDisabled(): boolean {
  try {
    return new URLSearchParams(window.location.search).has('nomodel') || localStorage.getItem('settle-in-nomodel') === '1';
  } catch {
    return false;
  }
}
