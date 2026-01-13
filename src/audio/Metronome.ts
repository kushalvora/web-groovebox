/**
 * Metronome - Generates click sounds for timing reference
 *
 * Uses oscillators to create a simple click sound.
 * Higher pitch on beat 1, lower pitch on other beats.
 */

import { audioEngine } from './AudioEngine';

class Metronome {
  private isEnabled = true;

  /**
   * Play a metronome click at the specified time
   * @param time - When to play (Web Audio time)
   * @param isDownbeat - True for beat 1 (accented)
   */
  playClick(time: number, isDownbeat: boolean): void {
    if (!this.isEnabled) return;

    const ctx = audioEngine.getContext();
    const masterGain = audioEngine.getMasterGain();

    // Create oscillator for the click
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    // Higher frequency for downbeat, lower for others
    osc.frequency.value = isDownbeat ? 1000 : 800;
    osc.type = 'sine';

    // Quick attack and decay for a "click" sound
    gainNode.gain.setValueAtTime(0, time);
    gainNode.gain.linearRampToValueAtTime(isDownbeat ? 0.3 : 0.15, time + 0.001);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    // Connect and schedule
    osc.connect(gainNode);
    gainNode.connect(masterGain);

    osc.start(time);
    osc.stop(time + 0.05);
  }

  /**
   * Enable/disable the metronome
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  isMetronomeEnabled(): boolean {
    return this.isEnabled;
  }
}

export const metronome = new Metronome();
