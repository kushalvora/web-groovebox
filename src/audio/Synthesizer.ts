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
  // Second oscillator (optional)
  osc2Enabled?: boolean;
  osc2Type?: OscillatorType;
  osc2Detune?: number; // -100 to +100 cents
  osc2Volume?: number; // 0-1 mix level
}

// Voice tracking for legato mode
interface ActiveVoice {
  osc1: OscillatorNode;
  osc2?: OscillatorNode;
  filter: BiquadFilterNode;
  envelope: GainNode;
  note: number;
  releaseTime: number;
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
  'sub-bass': {
    oscillatorType: 'sine',
    filterCutoff: 0.15,
    filterResonance: 0.1,
    attack: 0.05,
    release: 0.4,
  },
  acid: {
    oscillatorType: 'sawtooth',
    filterCutoff: 0.4,
    filterResonance: 0.7, // High resonance for acid squelch
    attack: 0.001,
    release: 0.1,
  },
  lead: {
    oscillatorType: 'square',
    filterCutoff: 0.7,
    filterResonance: 0.2,
    attack: 0.01,
    release: 0.2,
  },
  pluck: {
    oscillatorType: 'triangle',
    filterCutoff: 0.9,
    filterResonance: 0.2,
    attack: 0.001,
    release: 0.15,
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
  organ: {
    oscillatorType: 'sine',
    filterCutoff: 0.6,
    filterResonance: 0.1,
    attack: 0.01,
    release: 0.1,
    osc2Enabled: true,
    osc2Type: 'sine',
    osc2Detune: 0,
    osc2Volume: 0.8,
  },
  bells: {
    oscillatorType: 'sine',
    filterCutoff: 0.95,
    filterResonance: 0.3,
    attack: 0.001,
    release: 0.8,
  },
};

class Synthesizer {
  // Track active voices per track for legato mode
  private activeVoices: Map<string, ActiveVoice> = new Map();

  /**
   * Play a note at a specific time
   * @param note - MIDI note number (60 = C4)
   * @param time - When to play (Web Audio time)
   * @param velocity - How loud (0-1)
   * @param params - Synth parameters
   * @param destination - Optional output node (defaults to master gain)
   * @param trackId - Optional track ID for legato voice tracking
   */
  play(
    note: number,
    time: number,
    velocity: number = 1,
    params: SynthParams,
    destination?: AudioNode,
    trackId?: string
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

    // Create oscillator 1
    const osc1 = ctx.createOscillator();
    osc1.type = params.oscillatorType;
    osc1.frequency.setValueAtTime(frequency, time);

    // Create oscillator 2 if enabled
    let osc2: OscillatorNode | undefined;
    let osc2Gain: GainNode | undefined;
    if (params.osc2Enabled) {
      osc2 = ctx.createOscillator();
      osc2.type = params.osc2Type ?? 'sine';
      osc2.frequency.setValueAtTime(frequency, time);
      // Apply detune in cents
      osc2.detune.setValueAtTime(params.osc2Detune ?? 0, time);

      // Gain node to control osc2 volume
      osc2Gain = ctx.createGain();
      osc2Gain.gain.setValueAtTime(params.osc2Volume ?? 0.5, time);
    }

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

    // Connect: oscillators → filter → envelope → output
    osc1.connect(filter);
    if (osc2 && osc2Gain) {
      osc2.connect(osc2Gain);
      osc2Gain.connect(filter);
    }
    filter.connect(envelope);
    envelope.connect(output);

    // Schedule start and stop
    osc1.start(time);
    osc1.stop(time + duration + 0.1);
    if (osc2) {
      osc2.start(time);
      osc2.stop(time + duration + 0.1);
    }

    // Track voice for legato if trackId provided
    if (trackId) {
      this.activeVoices.set(trackId, {
        osc1,
        osc2,
        filter,
        envelope,
        note,
        releaseTime,
      });
    }
  }

  /**
   * Check if a note is currently playing on a track (for legato)
   */
  isNotePlaying(trackId: string, note: number): boolean {
    const voice = this.activeVoices.get(trackId);
    return voice !== undefined && voice.note === note;
  }

  /**
   * Get the currently playing note for a track
   */
  getCurrentNote(trackId: string): number | null {
    const voice = this.activeVoices.get(trackId);
    return voice?.note ?? null;
  }

  /**
   * Release the current note on a track (for legato mode)
   * Triggers the release phase of the envelope
   */
  releaseNote(trackId: string, time: number): void {
    const voice = this.activeVoices.get(trackId);
    if (!voice) return;

    const ctx = audioEngine.getContext();
    const releaseTime = this.mapRelease(voice.releaseTime);

    // Cancel any scheduled values and start release
    voice.envelope.gain.cancelScheduledValues(time);
    voice.envelope.gain.setValueAtTime(voice.envelope.gain.value, time);
    voice.envelope.gain.exponentialRampToValueAtTime(0.001, time + releaseTime);

    // Stop oscillators after release
    voice.osc1.stop(time + releaseTime + 0.1);
    if (voice.osc2) {
      voice.osc2.stop(time + releaseTime + 0.1);
    }

    // Remove from active voices
    this.activeVoices.delete(trackId);
  }

  /**
   * Play a sustained note for legato mode
   * The note will play until releaseNote() is called
   */
  playLegato(
    note: number,
    time: number,
    velocity: number = 1,
    params: SynthParams,
    destination: AudioNode,
    trackId: string
  ): void {
    const ctx = audioEngine.getContext();
    const vel = Math.max(0, Math.min(1, velocity));

    const frequency = midiToFrequency(note);
    const cutoffHz = this.mapCutoff(params.filterCutoff);
    const resonanceQ = this.mapResonance(params.filterResonance);
    const attackTime = this.mapAttack(params.attack);

    // Create oscillator 1
    const osc1 = ctx.createOscillator();
    osc1.type = params.oscillatorType;
    osc1.frequency.setValueAtTime(frequency, time);

    // Create oscillator 2 if enabled
    let osc2: OscillatorNode | undefined;
    let osc2Gain: GainNode | undefined;
    if (params.osc2Enabled) {
      osc2 = ctx.createOscillator();
      osc2.type = params.osc2Type ?? 'sine';
      osc2.frequency.setValueAtTime(frequency, time);
      osc2.detune.setValueAtTime(params.osc2Detune ?? 0, time);

      osc2Gain = ctx.createGain();
      osc2Gain.gain.setValueAtTime(params.osc2Volume ?? 0.5, time);
    }

    // Create filter
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoffHz, time);
    filter.Q.setValueAtTime(resonanceQ, time);

    // Create envelope - no automatic release
    const envelope = ctx.createGain();
    envelope.gain.setValueAtTime(0.001, time);
    envelope.gain.exponentialRampToValueAtTime(vel * 0.5, time + attackTime);
    // Hold at sustain level (no automatic release)
    envelope.gain.setValueAtTime(vel * 0.4, time + attackTime + 0.01);

    // Connect
    osc1.connect(filter);
    if (osc2 && osc2Gain) {
      osc2.connect(osc2Gain);
      osc2Gain.connect(filter);
    }
    filter.connect(envelope);
    envelope.connect(destination);

    // Start oscillators (no automatic stop - will be stopped by releaseNote)
    osc1.start(time);
    if (osc2) {
      osc2.start(time);
    }

    // Track this voice
    this.activeVoices.set(trackId, {
      osc1,
      osc2,
      filter,
      envelope,
      note,
      releaseTime: params.release,
    });
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
