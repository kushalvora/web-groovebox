/**
 * AudioEngine - Manages the Web Audio API context
 *
 * Web Audio requires a user gesture (click/tap) before audio can play.
 * This class handles context creation, resumption, and per-track audio routing.
 *
 * Audio routing: TrackGain → TrackPan → MasterGain → Destination
 */

interface TrackNodes {
  gain: GainNode;
  pan: StereoPannerNode;
}

class AudioEngine {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private trackNodes: Map<string, TrackNodes> = new Map();

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

  /**
   * Get or create audio nodes for a track
   * Creates GainNode + StereoPannerNode chain connected to master
   */
  getTrackNodes(trackId: string): TrackNodes {
    if (!this.context || !this.masterGain) {
      throw new Error('AudioEngine not initialized. Call init() first.');
    }

    let nodes = this.trackNodes.get(trackId);
    if (!nodes) {
      // Create new nodes for this track
      const gain = this.context.createGain();
      const pan = this.context.createStereoPanner();

      // Connect: gain → pan → masterGain
      gain.connect(pan);
      pan.connect(this.masterGain);

      nodes = { gain, pan };
      this.trackNodes.set(trackId, nodes);
    }

    return nodes;
  }

  /**
   * Get the output node for a track (the gain node)
   * Use this as the destination when playing sounds for a track
   */
  getTrackOutput(trackId: string): GainNode {
    return this.getTrackNodes(trackId).gain;
  }

  /**
   * Set volume for a specific track (0-1)
   */
  setTrackVolume(trackId: string, volume: number): void {
    const nodes = this.trackNodes.get(trackId);
    if (nodes) {
      nodes.gain.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  /**
   * Set pan for a specific track (-1 = left, 0 = center, 1 = right)
   */
  setTrackPan(trackId: string, pan: number): void {
    const nodes = this.trackNodes.get(trackId);
    if (nodes) {
      nodes.pan.pan.value = Math.max(-1, Math.min(1, pan));
    }
  }

  /**
   * Remove track nodes (cleanup when track is deleted)
   */
  removeTrackNodes(trackId: string): void {
    const nodes = this.trackNodes.get(trackId);
    if (nodes) {
      nodes.gain.disconnect();
      nodes.pan.disconnect();
      this.trackNodes.delete(trackId);
    }
  }
}

// Singleton instance
export const audioEngine = new AudioEngine();
