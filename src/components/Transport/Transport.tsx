/**
 * Transport Component - Play/Stop, BPM control, and Tap Tempo
 *
 * The transport is the "master control" of the groovebox.
 * It manages playback state and tempo.
 */

import { useCallback, useEffect, useRef } from 'react';
import { useGrooveboxStore } from '../../store/useGrooveboxStore';
import { audioEngine } from '../../audio/AudioEngine';
import { scheduler } from '../../audio/Scheduler';
import { metronome } from '../../audio/Metronome';
import { drumSampler } from '../../audio/DrumSampler';
import type { DrumType } from '../../audio/DrumSampler';

const DRUMS: DrumType[] = ['kick', 'snare', 'hihat', 'openhat'];

export function Transport() {
  const {
    isAudioInitialized,
    setAudioInitialized,
    isPlaying,
    setIsPlaying,
    bpm,
    setBpm,
    setCurrentStep,
    patterns,
    patternLength,
    metronomeEnabled,
    setMetronomeEnabled,
    tapTimes,
    addTapTime,
    clearTapTimes,
  } = useGrooveboxStore();

  const tapTimeoutRef = useRef<number | null>(null);

  // Store patterns in a ref so the scheduler callback always has the latest
  const patternsRef = useRef(patterns);
  useEffect(() => {
    patternsRef.current = patterns;
  }, [patterns]);

  const patternLengthRef = useRef(patternLength);
  useEffect(() => {
    patternLengthRef.current = patternLength;
  }, [patternLength]);

  const metronomeEnabledRef = useRef(metronomeEnabled);
  useEffect(() => {
    metronomeEnabledRef.current = metronomeEnabled;
  }, [metronomeEnabled]);

  // Initialize audio on first user interaction
  const handleInitAudio = useCallback(async () => {
    if (!isAudioInitialized) {
      await audioEngine.init();
      setAudioInitialized(true);
    }
  }, [isAudioInitialized, setAudioInitialized]);

  // Set up scheduler callbacks
  useEffect(() => {
    scheduler.setOnStep((time, step) => {
      const actualStep = step % patternLengthRef.current;
      setCurrentStep(actualStep);

      // Play drums for this step
      const currentPatterns = patternsRef.current;
      for (const drum of DRUMS) {
        const stepData = currentPatterns[drum][actualStep];
        if (stepData?.active) {
          drumSampler.play(drum, time, stepData.velocity);
        }
      }
    });

    scheduler.setOnBeat((time, beat) => {
      if (metronomeEnabledRef.current) {
        metronome.playClick(time, beat === 0);
      }
    });
  }, [setCurrentStep]);

  // Sync BPM with scheduler
  useEffect(() => {
    scheduler.setBpm(bpm);
  }, [bpm]);

  // Handle play/stop
  const handlePlayStop = useCallback(async () => {
    await handleInitAudio();

    if (isPlaying) {
      scheduler.stop();
      setIsPlaying(false);
      setCurrentStep(0);
    } else {
      scheduler.start();
      setIsPlaying(true);
    }
  }, [isPlaying, setIsPlaying, setCurrentStep, handleInitAudio]);

  // Handle BPM change
  const handleBpmChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setBpm(parseInt(e.target.value, 10));
    },
    [setBpm]
  );

  // Handle tap tempo
  const handleTapTempo = useCallback(async () => {
    await handleInitAudio();

    const now = performance.now();

    if (tapTimeoutRef.current) {
      clearTimeout(tapTimeoutRef.current);
    }
    tapTimeoutRef.current = window.setTimeout(() => {
      clearTapTimes();
    }, 2000);

    addTapTime(now);

    if (tapTimes.length >= 1) {
      const intervals: number[] = [];
      const allTaps = [...tapTimes, now];

      for (let i = 1; i < allTaps.length; i++) {
        intervals.push(allTaps[i] - allTaps[i - 1]);
      }

      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const calculatedBpm = Math.round(60000 / avgInterval);

      if (calculatedBpm >= 20 && calculatedBpm <= 300) {
        setBpm(calculatedBpm);
      }
    }
  }, [tapTimes, addTapTime, clearTapTimes, setBpm, handleInitAudio]);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 w-full">
      {/* Transport Controls */}
      <div className="flex items-center gap-6">
        {/* Play/Stop Button */}
        <button
          onClick={handlePlayStop}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${
            isPlaying ? 'bg-red-600 hover:bg-red-500' : 'bg-green-600 hover:bg-green-500'
          }`}
        >
          {isPlaying ? (
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="6" width="12" height="12" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* BPM Display and Control */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-mono font-bold text-white">{bpm}</span>
            <span className="text-zinc-400 text-sm">BPM</span>
          </div>
          <input
            type="range"
            min="60"
            max="180"
            value={bpm}
            onChange={handleBpmChange}
            className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
        </div>

        {/* Tap Tempo Button */}
        <button
          onClick={handleTapTempo}
          className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium text-white transition-colors flex-shrink-0"
        >
          TAP
        </button>

        {/* Metronome Toggle */}
        <button
          onClick={() => setMetronomeEnabled(!metronomeEnabled)}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex-shrink-0 ${
            metronomeEnabled
              ? 'bg-amber-600 text-white'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
          }`}
        >
          Click
        </button>
      </div>

      {/* Audio Status */}
      {!isAudioInitialized && (
        <p className="text-center text-zinc-500 text-xs mt-3">
          Click Play to initialize audio
        </p>
      )}
    </div>
  );
}
