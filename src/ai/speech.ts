// Voice briefs: HR records a message, an open-source speech model (Whisper tiny, English, about 40 MB)
// turns it into text in the browser, then the brief reader reads the text. No server, no API key.
export const SPEECH_MODEL_ID = 'Xenova/whisper-tiny.en';
export const SPEECH_MODEL_LABEL = 'Whisper (tiny, English), open source, in the browser';

type Asr = (audio: Float32Array) => Promise<string>;
let cached: Promise<Asr> | null = null;

export function loadSpeechModel(onProgress?: (ratio: number) => void): Promise<Asr> {
  cached ??= (async () => {
    const { pipeline, env } = await import('@huggingface/transformers');
    env.useBrowserCache = true;
    env.allowLocalModels = false;
    const asr = await pipeline('automatic-speech-recognition', SPEECH_MODEL_ID, {
      dtype: 'q8',
      progress_callback: (e: { status?: string; file?: string; progress?: number }) => {
        if (e.status === 'progress' && e.file?.endsWith('.onnx') && typeof e.progress === 'number') onProgress?.(e.progress / 100);
      },
    });
    return async (audio: Float32Array) => {
      const r = await asr(audio, { chunk_length_s: 30, stride_length_s: 5 });
      const one = Array.isArray(r) ? r[0] : r;
      return String((one as { text: string }).text ?? '').trim();
    };
  })();
  cached.catch(() => (cached = null));
  return cached;
}

/** Decodes a recording (webm/ogg/mp4) to 16 kHz mono samples, the input Whisper expects. */
export async function toMono16k(blob: Blob): Promise<Float32Array> {
  const buf = await blob.arrayBuffer();
  const ctx = new AudioContext();
  const decoded = await ctx.decodeAudioData(buf);
  await ctx.close();
  const off = new OfflineAudioContext(1, Math.ceil(decoded.duration * 16000), 16000);
  const src = off.createBufferSource();
  src.buffer = decoded;
  src.connect(off.destination);
  src.start();
  const out = await off.startRendering();
  return out.getChannelData(0);
}

/** Starts recording from the microphone; call stop() to get the audio. */
export async function startRecording(): Promise<{ stop: () => Promise<Blob> }> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const rec = new MediaRecorder(stream);
  const parts: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && parts.push(e.data);
  rec.start();
  return {
    stop: () =>
      new Promise<Blob>((resolve) => {
        rec.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          resolve(new Blob(parts, { type: rec.mimeType }));
        };
        rec.stop();
      }),
  };
}
