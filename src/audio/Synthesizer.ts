/**
 * Synthesizer - Basic subtractive synthesizer
 *
 * Creates sounds using oscillators, filters, and envelopes.
 * This teaches the fundamentals of sound synthesis:
 * - Oscillators generate raw waveforms (sine, square, saw, triangle)
 * - Filters shape the harmonic content (lowpass removes highs)
 * - Envelopes control how the sound evolves over time (ADSR)
 */

import { audioEngine } from './AudioEngine';
import type { OscillatorType, SynthPreset } from '../store/useGrooveboxStore';

// Convert MIDI note number to frequency (A4 = 440Hz = MIDI 69)
export const midiToFrequency = (note: number): number => {
  return 440 * Math.pow(2, (note - 69) / 12);
};

// Note names for display
export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const midiToNoteName = (note: number): string => {
  const octave = Math.floor(note / 12) - 1;
  const noteName = NOTE_NAMES[note % 12];
  return `${noteName}${octave}`;
};

interface SynthParams {
  oscillatorType: OscillatorType;
  filterCutoff: number; // 0-1, maps to 100-10000 Hz
  filterResonance: number; // 0-1, maps to 0.5-20 Q
  attack: number; // 0-1, maps to 0.001-2 seconds
  release: number; // 0-1, maps to 0.01-3 seconds
}

// Preset defaults
export const SYNTH_PRESETS: Record<SynthPreset, SynthParams> = {
  bass: {
    oscillatorType: 'sawtooth',
    filterCutoff: 0.3,
    filterResonance: 0.3,
    attack: 0.01,
    release: 0.3,
  },
  lead: {
    oscillatorType: 'square',
    filterCutoff: 0.7,
    filterResonance: 0.2,
    attack: 0.01,
    release: 0.2,
  },
  pad: {
    oscillatorType: 'sawtooth',
    filterCutoff: 0.5,
    filterResonance: 0.1,
    attack: 0.4,
    release: 0.6,
  },
  stab: {
    oscillatorType: 'square',
    filterCutoff: 0.8,
    filterResonance: 0.4,
    attack: 0.001,
    release: 0.15,
  },
};

class Synthesizer {
  /**
   * Play a note at a specific time
   * @param note - MIDI note number (60 = C4)
   * @param time - When to play (Web Audio time)
   * @param velocity - How loud (0-1)
   * @param params - Synth parameters
   * @param destination - Optional output node (defaults to master gain)
   */
  play(
    note: number,
    time: number,
    velocity: number = 1,
    params: SynthParams,
    destination?: AudioNode
  ): void {
    const ctx = audioEngine.getContext();
    const output = destination ?? audioEngine.getMasterGain();
    const vel = Math.max(0, Math.min(1, velocity));

    // Calculate actual values from normalized parameters
    const frequency = midiToFrequency(note);
    const cutoffHz = this.mapCutoff(params.filterCutoff);
    const resonanceQ = this.mapResonance(params.filterResonance);
    const attackTime = this.mapAttack(params.attack);
    const releaseTime = this.mapRelease(params.release);

    // Total duration
    const duration = attackTime + 0.1 + releaseTime; // attack + sustain + release

    // Create oscillator
    const osc = ctx.createOscillator();
    osc.type = params.oscillatorType;
    osc.frequency.setValueAtTime(frequency, time);

    // Create filter (lowpass)
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoffHz, time);
    filter.Q.setValueAtTime(resonanceQ, time);

    // Create envelope (gain node with automation)
    const envelope = ctx.createGain();
    envelope.gain.setValueAtTime(0.001, time);

    // Attack
    envelope.gain.exponentialRampToValueAtTime(vel * 0.5, time + attackTime);

    // Sustain (hold for a bit)
    envelope.gain.setValueAtTime(vel * 0.4, time + attackTime + 0.05);

    // Release
    envelope.gain.exponentialRampToValueAtTime(0.001, time + duration);

    // Connect: oscillator → filter → envelope → output
    osc.connect(filter);
    filter.connect(envelope);
    envelope.connect(output);

    // Schedule start and stop
    osc.start(time);
    osc.stop(time + duration + 0.1);
  }

  /**
   * Play a note with a specific duration (for sustained notes)
   */
  playWithDuration(
    note: number,
    time: number,
    duration: number,
    velocity: number = 1,
    params: SynthParams,
    destination?: AudioNode
  ): void {
    const ctx = audioEngine.getContext();
    const output = destination ?? audioEngine.getMasterGain();
    const vel = Math.max(0, Math.min(1, velocity));

    const frequency = midiToFrequency(note);
    const cutoffHz = this.mapCutoff(params.filterCutoff);
    const resonanceQ = this.mapResonance(params.filterResonance);
    const attackTime = this.mapAttack(params.attack);
    const releaseTime = this.mapRelease(params.release);

    // Create oscillator
    const osc = ctx.createOscillator();
    osc.type = params.oscillatorType;
    osc.frequency.setValueAtTime(frequency, time);

    // Create filter
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoffHz, time);
    filter.Q.setValueAtTime(resonanceQ, time);

    // Create envelope
    const envelope = ctx.createGain();
    envelope.gain.setValueAtTime(0.001, time);

    // Attack
    envelope.gain.exponentialRampToValueAtTime(vel * 0.5, time + Math.min(attackTime, duration * 0.5));

    // Hold until release point
    const releaseStart = time + duration - releaseTime;
    if (releaseStart > time + attackTime) {
      envelope.gain.setValueAtTime(vel * 0.4, releaseStart);
    }

    // Release
    envelope.gain.exponentialRampToValueAtTime(0.001, time + duration);

    // Connect
    osc.connect(filter);
    filter.connect(envelope);
    envelope.connect(output);

    osc.start(time);
    osc.stop(time + duration + 0.1);
  }

  // Map normalized values (0-1) to actual parameter ranges
  private mapCutoff(normalized: number): number {
    // Exponential mapping: 100Hz to 10000Hz
    return 100 * Math.pow(100, normalized);
  }

  private mapResonance(normalized: number): number {
    // 0.5 to 20 Q
    return 0.5 + normalized * 19.5;
  }

  private mapAttack(normalized: number): number {
    // 0.001s to 2s (exponential)
    return 0.001 * Math.pow(2000, normalized);
  }

  private mapRelease(normalized: number): number {
    // 0.01s to 3s (exponential)
    return 0.01 * Math.pow(300, normalized);
  }
}

// Singleton instance
export const synthesizer = new Synthesizer();
