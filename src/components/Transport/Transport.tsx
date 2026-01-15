/**
 * Transport Component - Play/Stop, BPM, Swing, and Tap Tempo
 *
 * The transport is the "master control" of the groovebox.
 * It manages playback state, tempo, and groove feel.
 */

import { useCallback, useEffect, useRef } from 'react';
import { useGrooveboxStore } from '../../store/useGrooveboxStore';
import type { Track } from '../../store/useGrooveboxStore';
import { audioEngine } from '../../audio/AudioEngine';
import { scheduler } from '../../audio/Scheduler';
import { metronome } from '../../audio/Metronome';
import { drumSampler } from '../../audio/DrumSampler';
import { synthesizer } from '../../audio/Synthesizer';
import type { DrumType } from '../../audio/DrumSampler';

const DRUMS: DrumType[] = ['kick', 'snare', 'hihat', 'openhat'];

// Check if a track should play on this global step based on its clock divider
// NOTE: For 0.5x and 0.25x dividers, trackStep is managed via trackStepCountersRef
// in the callback to persist across global pattern cycles
const shouldTrackPlayOnStep = (
  globalStep: number,
  track: Track,
  trackStepCounters: Map<string, number>
): { shouldPlay: boolean; trackStep: number } => {
  const divider = track.clockDivider;
  const trackPatternLength = track.patternLength;

  if (divider === 1) {
    // Normal speed - play every step, wrap to track's pattern length
    return { shouldPlay: true, trackStep: globalStep % trackPatternLength };
  } else if (divider === 0.5) {
    // Half speed - play every 2nd global step
    // Use persistent counter to cycle through all steps over 2 global pattern cycles
    if (globalStep % 2 === 0) {
      const counter = trackStepCounters.get(track.id) ?? 0;
      const trackStep = counter % trackPatternLength;
      trackStepCounters.set(track.id, counter + 1);
      return { shouldPlay: true, trackStep };
    }
    return { shouldPlay: false, trackStep: 0 };
  } else if (divider === 0.25) {
    // Quarter speed - play every 4th global step
    // Use persistent counter to cycle through all steps over 4 global pattern cycles
    if (globalStep % 4 === 0) {
      const counter = trackStepCounters.get(track.id) ?? 0;
      const trackStep = counter % trackPatternLength;
      trackStepCounters.set(track.id, counter + 1);
      return { shouldPlay: true, trackStep };
    }
    return { shouldPlay: false, trackStep: 0 };
  } else if (divider === 2) {
    // Double speed - play twice per global step (handled differently)
    // For double speed, we play the track step and the next one
    return { shouldPlay: true, trackStep: (globalStep * 2) % trackPatternLength };
  }

  return { shouldPlay: true, trackStep: globalStep % trackPatternLength };
};

export function Transport() {
  const {
    isAudioInitialized,
    setAudioInitialized,
    isPlaying,
    setIsPlaying,
    bpm,
    setBpm,
    swing,
    setSwing,
    setCurrentStep,
    tracks,
    patternLength,
    metronomeEnabled,
    setMetronomeEnabled,
    tapTimes,
    addTapTime,
    clearTapTimes,
  } = useGrooveboxStore();

  const tapTimeoutRef = useRef<number | null>(null);

  // Store tracks in a ref so the scheduler callback always has the latest
  const tracksRef = useRef(tracks);
  useEffect(() => {
    tracksRef.current = tracks;
  }, [tracks]);

  // Track previous step state for legato mode (per track)
  const prevStepStateRef = useRef<Map<string, { active: boolean; note: number }>>(new Map());

  // Track step counters for clock-divided tracks (persists across global pattern cycles)
  const trackStepCountersRef = useRef<Map<string, number>>(new Map());

  // Calculate max pattern length from all tracks
  const maxPatternLength = Math.max(...tracks.map((t) => t.patternLength), 16);

  const patternLengthRef = useRef(maxPatternLength);
  useEffect(() => {
    patternLengthRef.current = maxPatternLength;
    // Sync scheduler with max pattern length
    scheduler.setPatternLength(maxPatternLength);
  }, [maxPatternLength]);

  const metronomeEnabledRef = useRef(metronomeEnabled);
  useEffect(() => {
    metronomeEnabledRef.current = metronomeEnabled;
  }, [metronomeEnabled]);

  // Initialize audio on first user interaction
  const handleInitAudio = useCallback(async () => {
    if (!isAudioInitialized) {
      await audioEngine.init();

      // Initialize track audio nodes with their volume/pan settings
      const currentTracks = tracksRef.current;
      const hasSolo = currentTracks.some((t) => t.solo);

      for (const track of currentTracks) {
        // Create the track nodes
        audioEngine.getTrackNodes(track.id);

        // Set initial volume (accounting for mute/solo)
        const isMuted = track.mute || (hasSolo && !track.solo);
        audioEngine.setTrackVolume(track.id, isMuted ? 0 : track.volume);
        audioEngine.setTrackPan(track.id, track.pan);
      }

      setAudioInitialized(true);
    }
  }, [isAudioInitialized, setAudioInitialized]);

  // Set up scheduler callbacks
  useEffect(() => {
    scheduler.setOnStep((time, step) => {
      const globalStep = step % patternLengthRef.current;
      setCurrentStep(globalStep);

      // Get current tracks state
      const currentTracks = tracksRef.current;
      const hasSolo = currentTracks.some((t) => t.solo);

      // Play each track
      for (const track of currentTracks) {
        // Skip muted tracks or non-soloed tracks when solo is active
        const isMuted = track.mute || (hasSolo && !track.solo);
        if (isMuted) continue;

        // Check clock divider to see if this track should play
        const { shouldPlay, trackStep } = shouldTrackPlayOnStep(
          globalStep,
          track,
          trackStepCountersRef.current
        );
        if (!shouldPlay) continue;

        // trackStep is already within bounds from shouldTrackPlayOnStep
        const actualStep = trackStep;

        // Get track's output node for proper routing
        const trackOutput = audioEngine.getTrackOutput(track.id);

        if (track.type === 'drum') {
          // Play drums for this step
          for (const drum of DRUMS) {
            const stepData = track.patterns[drum]?.[actualStep];
            if (stepData?.active) {
              drumSampler.play(drum, time, stepData.velocity, trackOutput);
            }
          }
        } else if (track.type === 'tone') {
          // Play synth for this step
          const stepData = track.synthPattern?.[actualStep];
          const prevState = prevStepStateRef.current.get(track.id);

          // Synth params including osc2
          const synthParams = {
            oscillatorType: track.oscillatorType,
            filterCutoff: track.filterCutoff,
            filterResonance: track.filterResonance,
            attack: track.attack,
            release: track.release,
            osc2Enabled: track.osc2Enabled,
            osc2Type: track.osc2Type,
            osc2Detune: track.osc2Detune,
            osc2Volume: track.osc2Volume,
          };

          if (track.legato) {
            // Legato mode: tie consecutive notes
            const isActive = stepData?.active ?? false;
            const currentNote = stepData?.note ?? 60;
            const wasActive = prevState?.active ?? false;
            const prevNote = prevState?.note ?? 60;

            // Start new note if: step is active AND (previous wasn't active OR note changed)
            if (isActive && (!wasActive || currentNote !== prevNote)) {
              // Release any existing note first
              if (wasActive) {
                synthesizer.releaseNote(track.id, time);
              }
              // Start new legato note
              synthesizer.playLegato(
                currentNote,
                time,
                stepData?.velocity ?? 0.8,
                synthParams,
                trackOutput,
                track.id
              );
            }
            // Release note if: previous was active AND current is not active
            else if (wasActive && !isActive) {
              synthesizer.releaseNote(track.id, time);
            }
            // If both active with same note, do nothing (note continues)

            // Update previous state
            prevStepStateRef.current.set(track.id, { active: isActive, note: currentNote });
          } else {
            // Normal trigger mode: play each active step
            if (stepData?.active) {
              synthesizer.play(
                stepData.note,
                time,
                stepData.velocity,
                synthParams,
                trackOutput,
                track.id
              );
            }
          }
        }

        // For double speed (2x), also play the next step
        if (track.clockDivider === 2) {
          const nextStep = (trackStep + 1) % track.patternLength;
          const halfStepDuration = (60 / scheduler.getBpm()) / 8; // Half a 16th note

          if (track.type === 'drum') {
            for (const drum of DRUMS) {
              const stepData = track.patterns[drum]?.[nextStep];
              if (stepData?.active) {
                drumSampler.play(drum, time + halfStepDuration, stepData.velocity, trackOutput);
              }
            }
          } else if (track.type === 'tone' && !track.legato) {
            // Only do 2x for non-legato synth tracks
            const stepData = track.synthPattern?.[nextStep];
            if (stepData?.active) {
              synthesizer.play(
                stepData.note,
                time + halfStepDuration,
                stepData.velocity,
                {
                  oscillatorType: track.oscillatorType,
                  filterCutoff: track.filterCutoff,
                  filterResonance: track.filterResonance,
                  attack: track.attack,
                  release: track.release,
                  osc2Enabled: track.osc2Enabled,
                  osc2Type: track.osc2Type,
                  osc2Detune: track.osc2Detune,
                  osc2Volume: track.osc2Volume,
                },
                trackOutput,
                track.id
              );
            }
          }
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

  // Sync swing with scheduler
  useEffect(() => {
    scheduler.setSwing(swing);
  }, [swing]);

  // Handle play/stop
  const handlePlayStop = useCallback(async () => {
    await handleInitAudio();

    if (isPlaying) {
      scheduler.stop();
      setIsPlaying(false);
      setCurrentStep(0);
      // Clear legato state
      prevStepStateRef.current.clear();
      // Clear clock divider step counters
      trackStepCountersRef.current.clear();
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

  // Handle swing change
  const handleSwingChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSwing(parseInt(e.target.value, 10));
    },
    [setSwing]
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
      {/* Transport Controls - Row 1 */}
      <div className="flex items-center gap-6 mb-4">
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

        {/* Swing Control */}
        <div className="w-32 flex-shrink-0">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-xl font-mono font-bold text-white">{swing}%</span>
            <span className="text-zinc-400 text-sm">Swing</span>
          </div>
          <input
            type="range"
            min="0"
            max="75"
            value={swing}
            onChange={handleSwingChange}
            className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
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
        <p className="text-center text-zinc-500 text-xs">
          Click Play to initialize audio
        </p>
      )}
    </div>
  );
}
