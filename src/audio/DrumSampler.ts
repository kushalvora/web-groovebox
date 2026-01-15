/**
 * DrumSampler - Hybrid drum sounds (samples + synthesis)
 *
 * Can play either:
 * 1. User-loaded audio samples (WAV/MP3)
 * 2. Classic 808/909-style synthesized drums (fallback)
 *
 * This teaches you how electronic drums are actually made - oscillators,
 * noise, and envelopes, plus how samplers work with audio files.
 */

import { audioEngine } from './AudioEngine';

export type DrumType = 'kick' | 'snare' | 'hihat' | 'openhat';

export const DRUM_NAMES: Record<DrumType, string> = {
  kick: 'Kick',
  snare: 'Snare',
  hihat: 'Hi-Hat',
  openhat: 'Open Hat',
};

class DrumSampler {
  // Loaded audio samples per drum type
  private samples: Map<DrumType, AudioBuffer> = new Map();

  /**
   * Load an audio sample for a drum type
   */
  setSample(type: DrumType, buffer: AudioBuffer): void {
    this.samples.set(type, buffer);
  }

  /**
   * Clear a loaded sample (revert to synthesis)
   */
  clearSample(type: DrumType): void {
    this.samples.delete(type);
  }

  /**
   * Check if a sample is loaded for a drum type
   */
  hasSample(type: DrumType): boolean {
    return this.samples.has(type);
  }

  /**
   * Get all loaded samples info
   */
  getLoadedSamples(): DrumType[] {
    return Array.from(this.samples.keys());
  }
  /**
   * Play a drum sound at a specific time
   * Uses loaded sample if available, otherwise falls back to synthesis
   * @param type - Which drum to play
   * @param time - When to play (Web Audio time)
   * @param velocity - How loud (0-1)
   * @param destination - Optional output node (defaults to master gain)
   */
  play(
    type: DrumType,
    time: number,
    velocity: number = 1,
    destination?: AudioNode
  ): void {
    const ctx = audioEngine.getContext();
    const output = destination ?? audioEngine.getMasterGain();
    const vel = Math.max(0, Math.min(1, velocity));

    // Check if we have a sample loaded for this drum
    const sample = this.samples.get(type);
    if (sample) {
      this.playSample(ctx, output, time, vel, sample);
      return;
    }

    // Fall back to synthesis
    switch (type) {
      case 'kick':
        this.playKick(ctx, output, time, vel);
        break;
      case 'snare':
        this.playSnare(ctx, output, time, vel);
        break;
      case 'hihat':
        this.playHihat(ctx, output, time, vel, false);
        break;
      case 'openhat':
        this.playHihat(ctx, output, time, vel, true);
        break;
    }
  }

  /**
   * Play an audio buffer sample
   */
  private playSample(
    ctx: AudioContext,
    destination: AudioNode,
    time: number,
    velocity: number,
    buffer: AudioBuffer
  ): void {
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(velocity, time);

    source.connect(gain);
    gain.connect(destination);

    source.start(time);
  }

  /**
   * 808-style kick drum
   * - Sine wave oscillator
   * - Pitch envelope (starts high, drops low)
   * - Amplitude envelope (quick attack, medium decay)
   */
  private playKick(
    ctx: AudioContext,
    destination: AudioNode,
    time: number,
    velocity: number
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';

    // Pitch envelope: 150Hz -> 50Hz (the "thump")
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(50, time + 0.05);

    // Amplitude envelope
    gain.gain.setValueAtTime(velocity, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4);

    osc.connect(gain);
    gain.connect(destination);

    osc.start(time);
    osc.stop(time + 0.4);
  }

  /**
   * 808-style snare drum
   * - Oscillator for the "body" (tone)
   * - Noise for the "snap" (snares)
   */
  private playSnare(
    ctx: AudioContext,
    destination: AudioNode,
    time: number,
    velocity: number
  ): void {
    // Tone component
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, time);
    osc.frequency.exponentialRampToValueAtTime(100, time + 0.05);

    oscGain.gain.setValueAtTime(velocity * 0.7, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

    osc.connect(oscGain);
    oscGain.connect(destination);

    osc.start(time);
    osc.stop(time + 0.1);

    // Noise component (the "snap")
    const noiseBuffer = this.createNoiseBuffer(ctx, 0.2);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 1000;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(velocity * 0.5, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(destination);

    noise.start(time);
    noise.stop(time + 0.2);
  }

  /**
   * Hi-hat (closed or open)
   * - Filtered noise
   * - Short decay for closed, longer for open
   */
  private playHihat(
    ctx: AudioContext,
    destination: AudioNode,
    time: number,
    velocity: number,
    open: boolean
  ): void {
    const duration = open ? 0.3 : 0.08;

    const noiseBuffer = this.createNoiseBuffer(ctx, duration);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    // Bandpass filter for metallic sound
    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 10000;
    bandpass.Q.value = 1;

    // Highpass to remove low frequencies
    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 7000;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(velocity * 0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    noise.connect(bandpass);
    bandpass.connect(highpass);
    highpass.connect(gain);
    gain.connect(destination);

    noise.start(time);
    noise.stop(time + duration);
  }

  /**
   * Create a buffer of white noise
   */
  private createNoiseBuffer(ctx: AudioContext, duration: number): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    return buffer;
  }
}

export const drumSampler = new DrumSampler();
