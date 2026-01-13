/**
 * DrumSampler - Synthesized drum sounds
 *
 * Creates classic 808/909-style drum sounds using Web Audio synthesis.
 * This teaches you how electronic drums are actually made - oscillators,
 * noise, and envelopes, not just playing back recordings.
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
  /**
   * Play a drum sound at a specific time
   * @param type - Which drum to play
   * @param time - When to play (Web Audio time)
   * @param velocity - How loud (0-1)
   */
  play(type: DrumType, time: number, velocity: number = 1): void {
    const ctx = audioEngine.getContext();
    const masterGain = audioEngine.getMasterGain();
    const vel = Math.max(0, Math.min(1, velocity));

    switch (type) {
      case 'kick':
        this.playKick(ctx, masterGain, time, vel);
        break;
      case 'snare':
        this.playSnare(ctx, masterGain, time, vel);
        break;
      case 'hihat':
        this.playHihat(ctx, masterGain, time, vel, false);
        break;
      case 'openhat':
        this.playHihat(ctx, masterGain, time, vel, true);
        break;
    }
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
