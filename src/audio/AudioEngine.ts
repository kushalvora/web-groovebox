/**
 * AudioEngine - Manages the Web Audio API context
 *
 * Web Audio requires a user gesture (click/tap) before audio can play.
 * This class handles context creation and resumption.
 */

class AudioEngine {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  /**
   * Initialize or resume the audio context.
   * Must be called from a user gesture (click handler).
   */
  async init(): Promise<AudioContext> {
    if (!this.context) {
      this.context = new AudioContext();
      this.masterGain = this.context.createGain();
      this.masterGain.connect(this.context.destination);
    }

    // Resume if suspended (browsers suspend until user gesture)
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }

    return this.context;
  }

  /**
   * Get the audio context (must call init first)
   */
  getContext(): AudioContext {
    if (!this.context) {
      throw new Error('AudioEngine not initialized. Call init() first.');
    }
    return this.context;
  }

  /**
   * Get the master gain node for connecting audio sources
   */
  getMasterGain(): GainNode {
    if (!this.masterGain) {
      throw new Error('AudioEngine not initialized. Call init() first.');
    }
    return this.masterGain;
  }

  /**
   * Get current audio time (high-precision)
   */
  getCurrentTime(): number {
    return this.context?.currentTime ?? 0;
  }

  /**
   * Check if the context is running
   */
  isRunning(): boolean {
    return this.context?.state === 'running';
  }

  /**
   * Set master volume (0-1)
   */
  setMasterVolume(volume: number): void {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
    }
  }
}

// Singleton instance
export const audioEngine = new AudioEngine();
