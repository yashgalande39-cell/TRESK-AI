/**
 * TRESK AI — Audio Recorder & 16kHz WAV Encoder
 * 
 * Captures microphone audio and formats it as standard 16-bit 16kHz mono WAV
 * specifically optimized for Sarvam AI Saaras:v3 speech-to-text API.
 */

export class AudioRecorder {
  constructor() {
    this.audioCtx = null;
    this.mediaStream = null;
    this.sourceNode = null;
    this.processorNode = null;
    this.analyserNode = null;
    this.pcmChunks = [];
    this.totalSamples = 0;
    this.isRecording = false;
    this.targetSampleRate = 16000;
  }

  /**
   * Start recording from the microphone
   * @param {Object} [options]
   * @param {MediaStream} [options.stream] - Existing media stream (optional)
   * @param {Function} [options.onVolume] - Callback for audio volume meter (0-100)
   */
  async start({ stream = null, onVolume = null } = {}) {
    if (this.isRecording) return;

    this.pcmChunks = [];
    this.totalSamples = 0;

    // Get microphone stream if not provided
    if (stream) {
      this.mediaStream = stream;
    } else {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.audioCtx = new AudioContextClass();
    
    // Resume context if suspended (browser autoplay policy)
    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }

    this.sourceNode = this.audioCtx.createMediaStreamSource(this.mediaStream);

    // Setup Analyser for live volume metering
    this.analyserNode = this.audioCtx.createAnalyser();
    this.analyserNode.fftSize = 256;
    this.sourceNode.connect(this.analyserNode);

    // Buffer size: 4096 gives ~0.09s chunks at 44.1k/48k
    const bufferSize = 4096;
    this.processorNode = this.audioCtx.createScriptProcessor(bufferSize, 1, 1);

    const inputSampleRate = this.audioCtx.sampleRate;

    this.processorNode.onaudioprocess = (e) => {
      if (!this.isRecording) return;

      const inputData = e.inputBuffer.getChannelData(0);
      
      // Resample down to 16,000 Hz if input sample rate is higher (e.g. 44100 or 48000)
      const resampled = this._resample(inputData, inputSampleRate, this.targetSampleRate);
      this.pcmChunks.push(resampled);
      this.totalSamples += resampled.length;

      // Calculate volume level for UI
      if (onVolume) {
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);
        const volume = Math.min(100, Math.round(rms * 250));
        onVolume(volume);
      }
    };

    this.sourceNode.connect(this.processorNode);
    
    // Connect through a muted gain node to destination so audio processor stays active without speaker feedback
    this.muteGainNode = this.audioCtx.createGain();
    this.muteGainNode.gain.value = 0;
    this.processorNode.connect(this.muteGainNode);
    this.muteGainNode.connect(this.audioCtx.destination);

    this.isRecording = true;
  }

  /**
   * Resample Float32Array from input rate to target rate
   */
  _resample(inputData, fromRate, toRate) {
    if (fromRate === toRate) {
      return new Float32Array(inputData);
    }
    const ratio = fromRate / toRate;
    const newLength = Math.round(inputData.length / ratio);
    const result = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
      const srcIndex = i * ratio;
      const indexFloor = Math.floor(srcIndex);
      const indexCeil = Math.min(inputData.length - 1, indexFloor + 1);
      const frac = srcIndex - indexFloor;
      // Linear interpolation
      result[i] = inputData[indexFloor] * (1 - frac) + inputData[indexCeil] * frac;
    }
    return result;
  }

  /**
   * Encode the recorded Float32 PCM samples into a 16-bit mono 16kHz WAV Blob
   * @param {boolean} [clearBuffer=false] - Whether to clear the buffer after getting the blob
   */
  getWavBlob(clearBuffer = false) {
    if (this.totalSamples === 0) {
      return null;
    }

    // Merge chunks into a single Float32Array
    const merged = new Float32Array(this.totalSamples);
    let offset = 0;
    for (const chunk of this.pcmChunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }

    if (clearBuffer) {
      this.pcmChunks = [];
      this.totalSamples = 0;
    }

    return this._encodeWAV(merged, this.targetSampleRate);
  }

  /**
   * Build standard RIFF / WAVE 16-bit PCM Blob
   */
  _encodeWAV(samples, sampleRate) {
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    const dataSize = samples.length * (bitsPerSample / 8);
    const headerSize = 44;

    const buffer = new ArrayBuffer(headerSize + dataSize);
    const view = new DataView(buffer);

    const writeString = (offset, str) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    // RIFF Chunk Descriptor
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, 'WAVE');

    // "fmt " sub-chunk
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);             // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true);              // AudioFormat (1 for PCM)
    view.setUint16(22, numChannels, true);    // NumChannels
    view.setUint32(24, sampleRate, true);     // SampleRate
    view.setUint32(28, byteRate, true);       // ByteRate
    view.setUint16(32, blockAlign, true);     // BlockAlign
    view.setUint16(34, bitsPerSample, true);  // BitsPerSample

    // "data" sub-chunk
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    // Write 16-bit PCM audio samples with clipping protection
    let byteOffset = 44;
    for (let i = 0; i < samples.length; i++, byteOffset += 2) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(byteOffset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }

    return new Blob([view], { type: 'audio/wav' });
  }

  /**
   * Stop recording and release resources
   * @param {boolean} [stopStream=false] - Whether to stop the getUserMedia tracks
   * @returns {Blob|null} The final WAV Blob
   */
  stop(stopStream = false) {
    if (!this.isRecording) return this.getWavBlob();

    this.isRecording = false;

    if (this.processorNode) {
      try {
        this.processorNode.disconnect();
      } catch (_) {}
      this.processorNode = null;
    }

    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch (_) {}
      this.sourceNode = null;
    }

    if (this.analyserNode) {
      try {
        this.analyserNode.disconnect();
      } catch (_) {}
      this.analyserNode = null;
    }

    if (this.audioCtx) {
      try {
        this.audioCtx.close();
      } catch (_) {}
      this.audioCtx = null;
    }

    if (stopStream && this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    return this.getWavBlob();
  }

  /**
   * Clear recorded audio buffers
   */
  reset() {
    this.pcmChunks = [];
    this.totalSamples = 0;
  }
}
