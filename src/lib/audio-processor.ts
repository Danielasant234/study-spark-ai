// Utility to process, downsample, and chunk audio files safely in the browser.

export interface AudioChunk {
  blob: Blob;
  index: number;
  total: number;
}

/**
 * Converts a Mono AudioBuffer to a valid WAV recording Blob.
 */
function bufferToWavBlob(audioBuffer: AudioBuffer, targetSampleRate: number): Blob {
  const channelData = audioBuffer.getChannelData(0); // We assume mono
  const length = channelData.length;
  
  // WAV header occupies 44 bytes
  const buffer = new ArrayBuffer(44 + length * 2);
  const view = new DataView(buffer);
  
  // RIFF identifier
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + length * 2, true);
  writeString(view, 8, 'WAVE');
  
  // Format chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // PCM size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // Mono channel
  view.setUint32(24, targetSampleRate, true); // Sample rate
  view.setUint32(28, targetSampleRate * 2, true); // Byte rate
  view.setUint16(32, 2, true); // Block align
  view.setUint16(34, 16, true); // Bits per sample
  
  // Data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, length * 2, true);
  
  // Write PCM samples
  let offset = 44;
  for (let i = 0; i < length; i++) {
    const s = Math.max(-1, Math.min(1, channelData[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    offset += 2;
  }
  
  return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Splits an audio file into manageable overlapping chunks of WAV audio 
 * to be processed securely by the transcription backend.
 */
export async function splitAudioRobustly(
  file: File,
  chunkDurationSeconds: number = 300, // default 5 mins
  overlapSeconds: number = 3,
  onProgress?: (msg: string) => void
): Promise<AudioChunk[]> {
  const arrayBuffer = await file.arrayBuffer();

  onProgress?.("Decodificando arquivo original...");
  
  // Use OfflineAudioContext for safe, fast background decoding.
  // We use 1 channel and 16000Hz (or 44100Hz if 16kHz fails somehow). 
  // It only dictates the decoding environment. 
  const offlineCtx = new (window.OfflineAudioContext || (window as any).webkitOfflineAudioContext)(1, 16000, 16000);

  // Decode audio data. 
  const audioBuffer = await offlineCtx.decodeAudioData(arrayBuffer);
  
  const sampleRate = audioBuffer.sampleRate;
  const numChannels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;

  onProgress?.("Otimizando áudio longo...");

  // Mixdown to mono if stereo
  let monoBuffer: AudioBuffer;
  if (numChannels > 1) {
    const offlineMixCtx = new (window.OfflineAudioContext || (window as any).webkitOfflineAudioContext)(1, length, sampleRate);
    const source = offlineMixCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineMixCtx.destination);
    source.start(0);
    monoBuffer = await offlineMixCtx.startRendering();
  } else {
    monoBuffer = audioBuffer;
  }

  onProgress?.("Fragmentando áudio em partes seguras...");

  const chunks: AudioChunk[] = [];
  const chunkLengthSamples = chunkDurationSeconds * sampleRate;
  // Make sure overlap applies, and not exceed duration
  const overlapSamples = overlapSeconds * sampleRate;
  
  let startSample = 0;
  
  while (startSample < length) {
    let endSample = startSample + chunkLengthSamples;
    if (endSample >= length) {
      endSample = length;
    }

    const currentChunkSamples = endSample - startSample;
    
    // Create new buffer for this chunk
    const chunkBuffer = offlineCtx.createBuffer(1, currentChunkSamples, sampleRate);
    chunkBuffer.copyToChannel(monoBuffer.getChannelData(0).subarray(startSample, endSample), 0);
    
    // Convert to valid WAV blob
    const wavBlob = bufferToWavBlob(chunkBuffer, sampleRate);
    chunks.push({ blob: wavBlob, index: 0, total: 0 }); // properties assigned below
    
    if (endSample === length) break;
    startSample = endSample - overlapSamples;
  }

  const total = chunks.length;
  chunks.forEach((chunk, i) => {
    chunk.index = i;
    chunk.total = total;
  });

  return chunks;
}
