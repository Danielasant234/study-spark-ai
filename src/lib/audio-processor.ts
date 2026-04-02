// Utility to process and chunk audio files safely in the browser.
// For long files (1-2h), we slice raw bytes instead of decoding everything into memory.

export interface AudioChunk {
  blob: Blob;
  index: number;
  total: number;
}

/**
 * Estimates the duration of an audio file from its metadata using a temporary Audio element.
 */
function estimateDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const url = URL.createObjectURL(file);
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      // If duration is Infinity (streaming), estimate from file size
      if (!isFinite(audio.duration) || audio.duration === 0) {
        // Rough estimate: ~128kbps for mp3, ~1411kbps for wav
        const isWav = file.type.includes("wav") || file.name.endsWith(".wav");
        const bitrate = isWav ? 1411000 : 128000;
        resolve((file.size * 8) / bitrate);
      } else {
        resolve(audio.duration);
      }
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      // Fallback estimate
      const bitrate = 128000;
      resolve((file.size * 8) / bitrate);
    };
    audio.src = url;
  });
}

/**
 * For small files (< 25MB), decode and re-encode as WAV chunks.
 * For large files, slice raw bytes directly — the AI model handles mp3/wav natively.
 */
export async function splitAudioRobustly(
  file: File,
  chunkDurationSeconds: number = 180, // default 3 mins for smaller chunks
  _overlapSeconds: number = 3,
  onProgress?: (msg: string) => void
): Promise<AudioChunk[]> {
  const MAX_DECODE_SIZE = 25 * 1024 * 1024; // 25MB threshold for in-memory decode

  if (file.size <= MAX_DECODE_SIZE) {
    return splitSmallAudio(file, chunkDurationSeconds, onProgress);
  }

  // For large files, slice by byte ranges based on estimated duration
  return splitLargeAudioByBytes(file, chunkDurationSeconds, onProgress);
}

/**
 * Small file path: decode in memory, split into WAV chunks.
 */
async function splitSmallAudio(
  file: File,
  chunkDurationSeconds: number,
  onProgress?: (msg: string) => void
): Promise<AudioChunk[]> {
  const arrayBuffer = await file.arrayBuffer();
  onProgress?.("Decodificando arquivo...");

  const audioCtx = new AudioContext();
  let audioBuffer: AudioBuffer;
  try {
    audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  } finally {
    await audioCtx.close();
  }

  const sampleRate = audioBuffer.sampleRate;
  const length = audioBuffer.length;

  onProgress?.("Preparando segmentos...");

  // Mix to mono
  let monoData: Float32Array;
  if (audioBuffer.numberOfChannels > 1) {
    monoData = new Float32Array(length);
    const ch0 = audioBuffer.getChannelData(0);
    const ch1 = audioBuffer.getChannelData(1);
    for (let i = 0; i < length; i++) {
      monoData[i] = (ch0[i] + ch1[i]) / 2;
    }
  } else {
    monoData = audioBuffer.getChannelData(0);
  }

  const chunkSamples = chunkDurationSeconds * sampleRate;
  const chunks: AudioChunk[] = [];
  let start = 0;

  while (start < length) {
    const end = Math.min(start + chunkSamples, length);
    const segment = monoData.subarray(start, end);
    const wavBlob = float32ToWavBlob(segment, sampleRate);
    chunks.push({ blob: wavBlob, index: chunks.length, total: 0 });
    start = end;
  }

  chunks.forEach((c) => (c.total = chunks.length));
  return chunks;
}

/**
 * Large file path: slice raw bytes proportionally based on estimated duration.
 * Sends raw file slices (mp3/m4a/wav) — the transcription model handles them natively.
 */
async function splitLargeAudioByBytes(
  file: File,
  chunkDurationSeconds: number,
  onProgress?: (msg: string) => void
): Promise<AudioChunk[]> {
  onProgress?.("Estimando duração do áudio...");
  const duration = await estimateDuration(file);

  const totalChunks = Math.max(1, Math.ceil(duration / chunkDurationSeconds));
  const bytesPerChunk = Math.ceil(file.size / totalChunks);

  onProgress?.(`Dividindo áudio em ${totalChunks} partes...`);

  const chunks: AudioChunk[] = [];
  for (let i = 0; i < totalChunks; i++) {
    const start = i * bytesPerChunk;
    const end = Math.min(start + bytesPerChunk, file.size);
    const slice = file.slice(start, end, file.type || "audio/mpeg");
    chunks.push({
      blob: slice,
      index: i,
      total: totalChunks,
    });
  }

  return chunks;
}

/**
 * Converts mono Float32Array PCM data to a WAV Blob.
 */
function float32ToWavBlob(samples: Float32Array, sampleRate: number): Blob {
  const length = samples.length;
  const buffer = new ArrayBuffer(44 + length * 2);
  const view = new DataView(buffer);

  // RIFF header
  writeStr(view, 0, "RIFF");
  view.setUint32(4, 36 + length * 2, true);
  writeStr(view, 8, "WAVE");

  // fmt chunk
  writeStr(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);

  // data chunk
  writeStr(view, 36, "data");
  view.setUint32(40, length * 2, true);

  let offset = 44;
  for (let i = 0; i < length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: "audio/wav" });
}

function writeStr(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
