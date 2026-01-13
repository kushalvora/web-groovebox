/**
 * Groovebox Store - Central state management using Zustand
 *
 * Manages transport state (play/stop, BPM), patterns, and all groovebox state.
 */

import { create } from 'zustand';
import type { DrumType } from '../audio/DrumSampler';

// Step data for a single step in the pattern
export interface StepData {
  active: boolean;
  velocity: number; // 0-1
}

// Pattern for one drum track (16/32 steps)
export type DrumPattern = StepData[];

// All drum patterns (4 tracks)
export type DrumPatterns = Record<DrumType, DrumPattern>;

// Preset pattern definition
export interface PatternPreset {
  name: string;
  patterns: DrumPatterns;
}

// Create an empty pattern for a single track
const createEmptyPattern = (length: number = 16): DrumPattern =>
  Array.from({ length }, () => ({ active: false, velocity: 0.8 }));

// Create empty patterns for all drums
const createEmptyPatterns = (length: number = 16): DrumPatterns => ({
  kick: createEmptyPattern(length),
  snare: createEmptyPattern(length),
  hihat: createEmptyPattern(length),
  openhat: createEmptyPattern(length),
});

// Preset patterns
export const PATTERN_PRESETS: PatternPreset[] = [
  {
    name: 'Empty',
    patterns: createEmptyPatterns(),
  },
  {
    name: 'Four on the Floor',
    patterns: {
      kick: Array.from({ length: 16 }, (_, i) => ({
        active: i % 4 === 0, // Kick on 1, 5, 9, 13
        velocity: 1,
      })),
      snare: Array.from({ length: 16 }, (_, i) => ({
        active: i === 4 || i === 12, // Snare on 5 and 13 (beats 2 and 4)
        velocity: 0.9,
      })),
      hihat: Array.from({ length: 16 }, (_, i) => ({
        active: i % 2 === 0, // Hi-hat on every 8th note
        velocity: i % 4 === 0 ? 0.9 : 0.6,
      })),
      openhat: createEmptyPattern(),
    },
  },
  {
    name: 'Classic House',
    patterns: {
      kick: Array.from({ length: 16 }, (_, i) => ({
        active: i % 4 === 0,
        velocity: 1,
      })),
      snare: Array.from({ length: 16 }, (_, i) => ({
        active: i === 4 || i === 12,
        velocity: 0.85,
      })),
      hihat: Array.from({ length: 16 }, (_, i) => ({
        active: true, // Hi-hat on every 16th
        velocity: i % 2 === 0 ? 0.7 : 0.4,
      })),
      openhat: Array.from({ length: 16 }, (_, i) => ({
        active: i === 2 || i === 6 || i === 10 || i === 14, // Offbeat open hats
        velocity: 0.5,
      })),
    },
  },
  {
    name: 'Driving Techno',
    patterns: {
      kick: Array.from({ length: 16 }, (_, i) => ({
        active: i % 4 === 0 || i === 14, // Four on floor + pickup
        velocity: i === 14 ? 0.7 : 1,
      })),
      snare: Array.from({ length: 16 }, (_, i) => ({
        active: i === 4 || i === 12,
        velocity: 0.8,
      })),
      hihat: Array.from({ length: 16 }, (_, i) => ({
        active: i % 2 === 1, // Offbeat hi-hats
        velocity: 0.6,
      })),
      openhat: createEmptyPattern(),
    },
  },
];

interface GrooveboxState {
  // Audio initialization
  isAudioInitialized: boolean;
  setAudioInitialized: (initialized: boolean) => void;

  // Transport
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;

  bpm: number;
  setBpm: (bpm: number) => void;

  currentStep: number;
  setCurrentStep: (step: number) => void;

  // Pattern
  patternLength: number;
  setPatternLength: (length: number) => void;

  patterns: DrumPatterns;
  toggleStep: (drum: DrumType, step: number) => void;
  setStepVelocity: (drum: DrumType, step: number, velocity: number) => void;
  loadPreset: (preset: PatternPreset) => void;
  clearPattern: () => void;

  // Metronome
  metronomeEnabled: boolean;
  setMetronomeEnabled: (enabled: boolean) => void;

  // Tap tempo
  tapTimes: number[];
  addTapTime: (time: number) => void;
  clearTapTimes: () => void;
}

export const useGrooveboxStore = create<GrooveboxState>((set) => ({
  // Audio initialization
  isAudioInitialized: false,
  setAudioInitialized: (initialized) => set({ isAudioInitialized: initialized }),

  // Transport
  isPlaying: false,
  setIsPlaying: (playing) => set({ isPlaying: playing }),

  bpm: 120,
  setBpm: (bpm) => set({ bpm: Math.max(20, Math.min(300, bpm)) }),

  currentStep: 0,
  setCurrentStep: (step) => set({ currentStep: step }),

  // Pattern
  patternLength: 16,
  setPatternLength: (length) => set({ patternLength: length }),

  patterns: createEmptyPatterns(),

  toggleStep: (drum, step) =>
    set((state) => ({
      patterns: {
        ...state.patterns,
        [drum]: state.patterns[drum].map((s, i) =>
          i === step ? { ...s, active: !s.active } : s
        ),
      },
    })),

  setStepVelocity: (drum, step, velocity) =>
    set((state) => ({
      patterns: {
        ...state.patterns,
        [drum]: state.patterns[drum].map((s, i) =>
          i === step ? { ...s, velocity: Math.max(0, Math.min(1, velocity)) } : s
        ),
      },
    })),

  loadPreset: (preset) =>
    set({
      patterns: JSON.parse(JSON.stringify(preset.patterns)), // Deep clone
    }),

  clearPattern: () => set({ patterns: createEmptyPatterns() }),

  // Metronome
  metronomeEnabled: false,
  setMetronomeEnabled: (enabled) => set({ metronomeEnabled: enabled }),

  // Tap tempo
  tapTimes: [],
  addTapTime: (time) =>
    set((state) => {
      const newTimes = [...state.tapTimes, time];
      if (newTimes.length > 4) {
        newTimes.shift();
      }
      return { tapTimes: newTimes };
    }),
  clearTapTimes: () => set({ tapTimes: [] }),
}));
