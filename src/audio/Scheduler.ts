/**
 * Scheduler - Precise timing for audio events using look-ahead scheduling
 *
 * Why look-ahead scheduling?
 * JavaScript's setTimeout/setInterval aren't precise enough for music.
 * Instead, we regularly check what needs to play "soon" and schedule it
 * using Web Audio's precise currentTime. This gives us sample-accurate timing.
 *
 * How it works:
 * 1. A timer runs every ~25ms checking what's coming up
 * 2. We schedule any events in the next ~100ms
 * 3. Web Audio plays them at exactly the right time
 *
 * Swing:
 * Swing delays the "offbeat" 16th notes (steps 1, 3, 5, 7, 9, 11, 13, 15).
 * At 0% swing, timing is straight. At 50%, it's a triplet feel.
 * At 67%, it's a heavy shuffle. This is what makes house music "bounce".
 */

import { audioEngine } from './AudioEngine';

export type SchedulerCallback = (beatTime: number, beatNumber: number) => void;

class Scheduler {
  private bpm = 120;
  private swing = 0; // 0-100, where 0 is straight and 50+ adds shuffle
  private isPlaying = false;
  private currentBeat = 0;
  private nextBeatTime = 0;
  private timerID: number | null = null;

  // Look-ahead settings (in seconds)
  private readonly scheduleAheadTime = 0.1; // How far ahead to schedule (100ms)
  private readonly lookAheadInterval = 25; // How often to check (25ms)

  // Callbacks for beat events
  private onBeat: SchedulerCallback | null = null;
  private onStep: SchedulerCallback | null = null;

  // Steps per beat (4 = 16th notes in 4/4)
  private stepsPerBeat = 4;
  private currentStep = 0;

  /**
   * Set the tempo (beats per minute)
   */
  setBpm(bpm: number): void {
    this.bpm = Math.max(20, Math.min(300, bpm));
  }

  getBpm(): number {
    return this.bpm;
  }

  /**
   * Set swing amount (0-100)
   * 0 = straight timing
   * 50 = triplet feel (the "e" of "1 e & a" is delayed to triplet position)
   * 67+ = heavy shuffle
   */
  setSwing(swing: number): void {
    this.swing = Math.max(0, Math.min(100, swing));
  }

  getSwing(): number {
    return this.swing;
  }

  /**
   * Register a callback for each beat (quarter note)
   */
  setOnBeat(callback: SchedulerCallback): void {
    this.onBeat = callback;
  }

  /**
   * Register a callback for each step (16th note)
   */
  setOnStep(callback: SchedulerCallback): void {
    this.onStep = callback;
  }

  /**
   * Calculate seconds per beat from BPM
   */
  private getSecondsPerBeat(): number {
    return 60.0 / this.bpm;
  }

  /**
   * Calculate seconds per step (16th note)
   */
  private getSecondsPerStep(): number {
    return this.getSecondsPerBeat() / this.stepsPerBeat;
  }

  /**
   * Calculate swing delay for a given step
   * Odd steps (1, 3, 5, 7...) get delayed based on swing amount
   *
   * Swing creates a "long-short" pattern instead of equal 16th notes.
   * At 66% swing, you get triplet feel (the classic house bounce).
   */
  private getSwingDelay(step: number): number {
    // Only delay odd steps (the offbeats)
    if (step % 2 === 0) return 0;

    // Convert swing percentage to delay
    // At 66% swing, delay is ~33% of step duration (triplet feel)
    // This makes the offbeat land on the triplet position
    const stepDuration = this.getSecondsPerStep();
    const maxDelay = stepDuration * 0.66; // Up to 66% of step duration
    return (this.swing / 100) * maxDelay;
  }

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.isPlaying) return;

    this.isPlaying = true;
    this.currentBeat = 0;
    this.currentStep = 0;
    this.nextBeatTime = audioEngine.getCurrentTime();

    // Start the scheduling loop
    this.scheduleLoop();
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    this.isPlaying = false;
    if (this.timerID !== null) {
      clearTimeout(this.timerID);
      this.timerID = null;
    }
    this.currentBeat = 0;
    this.currentStep = 0;
  }

  /**
   * Check if currently playing
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Get current step (0-15 for 16 steps)
   */
  getCurrentStep(): number {
    return this.currentStep;
  }

  /**
   * Main scheduling loop
   * Runs regularly to check what needs to be scheduled
   */
  private scheduleLoop = (): void => {
    if (!this.isPlaying) return;

    const currentTime = audioEngine.getCurrentTime();

    // Schedule all steps that fall within our look-ahead window
    while (this.nextBeatTime < currentTime + this.scheduleAheadTime) {
      // Apply swing delay to the scheduled time
      const swingDelay = this.getSwingDelay(this.currentStep);
      const scheduledTime = this.nextBeatTime + swingDelay;

      this.scheduleStep(scheduledTime, this.currentStep);
      this.advanceStep();
    }

    // Schedule next check
    this.timerID = window.setTimeout(this.scheduleLoop, this.lookAheadInterval);
  };

  /**
   * Schedule a single step
   */
  private scheduleStep(time: number, step: number): void {
    // Call step callback
    if (this.onStep) {
      this.onStep(time, step);
    }

    // Call beat callback on quarter notes (every 4th step)
    if (step % this.stepsPerBeat === 0 && this.onBeat) {
      this.onBeat(time, Math.floor(step / this.stepsPerBeat));
    }
  }

  /**
   * Move to the next step
   */
  private advanceStep(): void {
    this.currentStep = (this.currentStep + 1) % 16; // 16-step pattern
    this.nextBeatTime += this.getSecondsPerStep();

    // Track beat number
    if (this.currentStep % this.stepsPerBeat === 0) {
      this.currentBeat = (this.currentBeat + 1) % 4;
    }
  }
}

// Singleton instance
export const scheduler = new Scheduler();
