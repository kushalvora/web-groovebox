/**
 * Groovebox Store - Central state management using Zustand
 *
 * Manages transport state (play/stop, BPM), patterns, tracks, and all groovebox state.
 * User patterns are persisted to localStorage.
 */

import { create } from 'zustand';
import type { DrumType } from '../audio/DrumSampler';

// Step data for a single step in the drum pattern
export interface StepData {
  active: boolean;
  velocity: number; // 0-1
}

// Synth step data includes note information
export interface SynthStepData {
  active: boolean;
  velocity: number; // 0-1
  note: number; // MIDI note number (60 = C4)
}

// Pattern for one drum track (16/32 steps)
export type DrumPattern = StepData[];

// Pattern for synth track
export type SynthPattern = SynthStepData[];

// All drum patterns (4 drum sounds)
export type DrumPatterns = Record<DrumType, DrumPattern>;

// Track type - 'drum' or 'tone' (synth)
export type TrackType = 'drum' | 'tone';

// Clock divider options (relative to master BPM)
export type ClockDivider = 0.25 | 0.5 | 1 | 2;

// Synth oscillator types
export type OscillatorType = 'sine' | 'square' | 'sawtooth' | 'triangle';

// Synth preset types
export type SynthPreset = 'bass' | 'sub-bass' | 'acid' | 'lead' | 'pluck' | 'pad' | 'stab' | 'organ' | 'bells';

// Valid pattern lengths
export type PatternLength = 8 | 16 | 32 | 64;

// Track definition for multi-track mixer
export interface Track {
  id: string;
  name: string;
  type: TrackType;
  patterns: DrumPatterns; // For drum tracks
  synthPattern: SynthPattern; // For synth tracks
  mute: boolean;
  solo: boolean;
  volume: number; // 0-1
  pan: number; // -1 (left) to 1 (right)
  clockDivider: ClockDivider; // 0.25 = quarter speed, 0.5 = half, 1 = normal, 2 = double
  patternLength: PatternLength; // Steps in this track's pattern (8, 16, 32, 64)
  // Synth-specific settings
  synthPreset: SynthPreset;
  oscillatorType: OscillatorType;
  filterCutoff: number; // 0-1 (maps to 100-10000 Hz)
  filterResonance: number; // 0-1
  attack: number; // 0-1 (maps to 0.001-2 seconds)
  release: number; // 0-1 (maps to 0.01-3 seconds)
  // Second oscillator (for thicker sound)
  osc2Enabled: boolean;
  osc2Type: OscillatorType;
  osc2Detune: number; // -100 to +100 cents
  osc2Volume: number; // 0-1 mix level
  // Legato mode (tie consecutive notes)
  legato: boolean;
}

// Preset pattern definition
export interface PatternPreset {
  name: string;
  patterns: DrumPatterns;
  isUserPattern?: boolean;
}

// Create an empty pattern for a single drum sound
const createEmptyPattern = (length: number = 16): DrumPattern =>
  Array.from({ length }, () => ({ active: false, velocity: 0.8 }));

// Create empty patterns for all drums
const createEmptyPatterns = (length: number = 16): DrumPatterns => ({
  kick: createEmptyPattern(length),
  snare: createEmptyPattern(length),
  hihat: createEmptyPattern(length),
  openhat: createEmptyPattern(length),
});

// Create empty synth pattern (default to C3 = 48 for bass, C4 = 60 for lead)
const createEmptySynthPattern = (length: number = 16, defaultNote: number = 48): SynthPattern =>
  Array.from({ length }, () => ({ active: false, velocity: 0.8, note: defaultNote }));

// Built-in preset patterns
const BUILTIN_PRESETS: PatternPreset[] = [
  {
    name: 'Empty',
    patterns: createEmptyPatterns(),
  },
  {
    name: 'Four on the Floor',
    patterns: {
      kick: Array.from({ length: 16 }, (_, i) => ({
        active: i % 4 === 0,
        velocity: 1,
      })),
      snare: Array.from({ length: 16 }, (_, i) => ({
        active: i === 4 || i === 12,
        velocity: 0.9,
      })),
      hihat: Array.from({ length: 16 }, (_, i) => ({
        active: i % 2 === 0,
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
        active: true,
        velocity: i % 2 === 0 ? 0.7 : 0.4,
      })),
      openhat: Array.from({ length: 16 }, (_, i) => ({
        active: i === 2 || i === 6 || i === 10 || i === 14,
        velocity: 0.5,
      })),
    },
  },
  {
    name: 'Driving Techno',
    patterns: {
      kick: Array.from({ length: 16 }, (_, i) => ({
        active: i % 4 === 0 || i === 14,
        velocity: i === 14 ? 0.7 : 1,
      })),
      snare: Array.from({ length: 16 }, (_, i) => ({
        active: i === 4 || i === 12,
        velocity: 0.8,
      })),
      hihat: Array.from({ length: 16 }, (_, i) => ({
        active: i % 2 === 1,
        velocity: 0.6,
      })),
      openhat: createEmptyPattern(),
    },
  },
];

// localStorage keys
const STORAGE_KEY = 'groovebox-user-patterns';
const TRACKS_STORAGE_KEY = 'groovebox-tracks';

// Generate unique ID for tracks
const generateTrackId = (): string =>
  `track-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

// Create a new track with default settings
const createTrack = (name: string, type: TrackType = 'drum', synthPreset: SynthPreset = 'bass'): Track => ({
  id: generateTrackId(),
  name,
  type,
  patterns: createEmptyPatterns(),
  synthPattern: createEmptySynthPattern(16, synthPreset === 'bass' ? 36 : 60), // C2 for bass, C4 for others
  mute: false,
  solo: false,
  volume: 0.8,
  pan: 0,
  clockDivider: 1,
  patternLength: 16,
  // Synth settings
  synthPreset,
  oscillatorType: synthPreset === 'bass' ? 'sawtooth' : 'square',
  filterCutoff: synthPreset === 'bass' ? 0.3 : 0.7,
  filterResonance: 0.2,
  attack: synthPreset === 'pad' ? 0.4 : 0.01,
  release: synthPreset === 'pad' ? 0.6 : 0.3,
  // Second oscillator (off by default)
  osc2Enabled: false,
  osc2Type: 'sine',
  osc2Detune: 7, // Slight detune for chorus effect
  osc2Volume: 0.5,
  // Legato (off by default - trigger mode)
  legato: false,
});

// Create default 4 tracks (like MC-101) - 2 drums, 2 synths
const createDefaultTracks = (): Track[] => [
  { ...createTrack('Drums 1', 'drum'), id: 'track-1' },
  { ...createTrack('Drums 2', 'drum'), id: 'track-2' },
  { ...createTrack('Bass', 'tone', 'bass'), id: 'track-3' },
  { ...createTrack('Lead', 'tone', 'lead'), id: 'track-4' },
];

// Load user patterns from localStorage
const loadUserPatterns = (): PatternPreset[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const patterns = JSON.parse(stored) as PatternPreset[];
      return patterns.map((p) => ({ ...p, isUserPattern: true }));
    }
  } catch (e) {
    console.warn('Failed to load user patterns:', e);
  }
  return [];
};

// Save user patterns to localStorage
const saveUserPatterns = (patterns: PatternPreset[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(patterns));
  } catch (e) {
    console.warn('Failed to save user patterns:', e);
  }
};

// Migrate old track format to new format (add missing properties)
const migrateTrack = (track: Partial<Track>): Track => ({
  id: track.id ?? generateTrackId(),
  name: track.name ?? 'Track',
  type: track.type ?? 'drum',
  patterns: track.patterns ?? createEmptyPatterns(),
  synthPattern: track.synthPattern ?? createEmptySynthPattern(16, 48),
  mute: track.mute ?? false,
  solo: track.solo ?? false,
  volume: track.volume ?? 0.8,
  pan: track.pan ?? 0,
  clockDivider: track.clockDivider ?? 1,
  patternLength: track.patternLength ?? 16,
  synthPreset: track.synthPreset ?? 'bass',
  oscillatorType: track.oscillatorType ?? 'sawtooth',
  filterCutoff: track.filterCutoff ?? 0.5,
  filterResonance: track.filterResonance ?? 0.2,
  attack: track.attack ?? 0.01,
  release: track.release ?? 0.3,
  // New properties - add defaults for existing tracks
  osc2Enabled: track.osc2Enabled ?? false,
  osc2Type: track.osc2Type ?? 'sine',
  osc2Detune: track.osc2Detune ?? 7,
  osc2Volume: track.osc2Volume ?? 0.5,
  legato: track.legato ?? false,
});

// Load tracks from localStorage
const loadTracks = (): Track[] => {
  try {
    const stored = localStorage.getItem(TRACKS_STORAGE_KEY);
    if (stored) {
      const tracks = JSON.parse(stored) as Partial<Track>[];
      // Migrate old tracks to new format
      return tracks.map(migrateTrack);
    }
  } catch (e) {
    console.warn('Failed to load tracks:', e);
  }
  return createDefaultTracks();
};

// Save tracks to localStorage
const saveTracks = (tracks: Track[]): void => {
  try {
    localStorage.setItem(TRACKS_STORAGE_KEY, JSON.stringify(tracks));
  } catch (e) {
    console.warn('Failed to save tracks:', e);
  }
};

// Get all presets (built-in + user)
export const getPatternPresets = (userPatterns: PatternPreset[]): PatternPreset[] => {
  return [...BUILTIN_PRESETS, ...userPatterns];
};

interface GrooveboxState {
  // Audio initialization
  isAudioInitialized: boolean;
  setAudioInitialized: (initialized: boolean) => void;

  // Transport
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;

  bpm: number;
  setBpm: (bpm: number) => void;

  swing: number;
  setSwing: (swing: number) => void;

  currentStep: number;
  setCurrentStep: (step: number) => void;

  // Tracks (multi-track support)
  tracks: Track[];
  selectedTrackId: string;
  selectTrack: (id: string) => void;
  setTrackMute: (id: string, mute: boolean) => void;
  setTrackSolo: (id: string, solo: boolean) => void;
  setTrackVolume: (id: string, volume: number) => void;
  setTrackPan: (id: string, pan: number) => void;
  setTrackName: (id: string, name: string) => void;
  setTrackClockDivider: (id: string, divider: ClockDivider) => void;
  setTrackPatternLength: (id: string, length: PatternLength) => void;
  setTrackType: (id: string, type: TrackType) => void;
  getSelectedTrack: () => Track | undefined;

  // Pattern (operates on selected track)
  patternLength: number;
  setPatternLength: (length: number) => void;

  patterns: DrumPatterns; // Convenience getter for selected track's patterns
  toggleStep: (drum: DrumType, step: number) => void;
  setStepVelocity: (drum: DrumType, step: number, velocity: number) => void;
  loadPreset: (preset: PatternPreset) => void;
  clearPattern: () => void;

  // Synth pattern (for tone tracks)
  toggleSynthStep: (step: number) => void;
  setSynthStepNote: (step: number, note: number) => void;
  setSynthStepVelocity: (step: number, velocity: number) => void;

  // Synth settings (for selected track)
  setSynthPreset: (preset: SynthPreset) => void;
  setOscillatorType: (type: OscillatorType) => void;
  setFilterCutoff: (cutoff: number) => void;
  setFilterResonance: (resonance: number) => void;
  setAttack: (attack: number) => void;
  setRelease: (release: number) => void;
  // Second oscillator
  setOsc2Enabled: (enabled: boolean) => void;
  setOsc2Type: (type: OscillatorType) => void;
  setOsc2Detune: (detune: number) => void;
  setOsc2Volume: (volume: number) => void;
  // Legato mode
  setLegato: (legato: boolean) => void;

  // User patterns
  userPatterns: PatternPreset[];
  savePattern: (name: string) => void;
  deleteUserPattern: (name: string) => void;

  // Metronome
  metronomeEnabled: boolean;
  setMetronomeEnabled: (enabled: boolean) => void;

  // Tap tempo
  tapTimes: number[];
  addTapTime: (time: number) => void;
  clearTapTimes: () => void;
}

// Initialize tracks from storage or defaults
const initialTracks = loadTracks();

export const useGrooveboxStore = create<GrooveboxState>((set, get) => ({
  // Audio initialization
  isAudioInitialized: false,
  setAudioInitialized: (initialized) => set({ isAudioInitialized: initialized }),

  // Transport
  isPlaying: false,
  setIsPlaying: (playing) => set({ isPlaying: playing }),

  bpm: 120,
  setBpm: (bpm) => set({ bpm: Math.max(20, Math.min(300, bpm)) }),

  swing: 0,
  setSwing: (swing) => set({ swing: Math.max(0, Math.min(100, swing)) }),

  currentStep: 0,
  setCurrentStep: (step) => set({ currentStep: step }),

  // Tracks (multi-track support)
  tracks: initialTracks,
  selectedTrackId: initialTracks[0]?.id || 'track-1',

  selectTrack: (id) => set({ selectedTrackId: id }),

  setTrackMute: (id, mute) =>
    set((state) => {
      const tracks = state.tracks.map((t) =>
        t.id === id ? { ...t, mute } : t
      );
      saveTracks(tracks);
      return { tracks };
    }),

  setTrackSolo: (id, solo) =>
    set((state) => {
      const tracks = state.tracks.map((t) =>
        t.id === id ? { ...t, solo } : t
      );
      saveTracks(tracks);
      return { tracks };
    }),

  setTrackVolume: (id, volume) =>
    set((state) => {
      const tracks = state.tracks.map((t) =>
        t.id === id ? { ...t, volume: Math.max(0, Math.min(1, volume)) } : t
      );
      saveTracks(tracks);
      return { tracks };
    }),

  setTrackPan: (id, pan) =>
    set((state) => {
      const tracks = state.tracks.map((t) =>
        t.id === id ? { ...t, pan: Math.max(-1, Math.min(1, pan)) } : t
      );
      saveTracks(tracks);
      return { tracks };
    }),

  setTrackName: (id, name) =>
    set((state) => {
      const tracks = state.tracks.map((t) =>
        t.id === id ? { ...t, name } : t
      );
      saveTracks(tracks);
      return { tracks };
    }),

  setTrackClockDivider: (id, divider) =>
    set((state) => {
      const tracks = state.tracks.map((t) =>
        t.id === id ? { ...t, clockDivider: divider } : t
      );
      saveTracks(tracks);
      return { tracks };
    }),

  setTrackPatternLength: (id, length) =>
    set((state) => {
      const tracks = state.tracks.map((t) => {
        if (t.id !== id) return t;
        // Resize patterns if needed
        const currentLength = t.patternLength;
        if (length === currentLength) return t;

        // Resize drum patterns
        const resizedPatterns: DrumPatterns = {} as DrumPatterns;
        for (const drum of Object.keys(t.patterns) as DrumType[]) {
          const oldPattern = t.patterns[drum];
          if (length > currentLength) {
            // Extend: pad with empty steps
            resizedPatterns[drum] = [
              ...oldPattern,
              ...Array.from({ length: length - currentLength }, () => ({ active: false, velocity: 0.8 })),
            ];
          } else {
            // Truncate
            resizedPatterns[drum] = oldPattern.slice(0, length);
          }
        }

        // Resize synth pattern
        let resizedSynthPattern: SynthPattern;
        if (length > currentLength) {
          resizedSynthPattern = [
            ...t.synthPattern,
            ...Array.from({ length: length - currentLength }, () => ({
              active: false,
              velocity: 0.8,
              note: t.synthPattern[0]?.note ?? 48,
            })),
          ];
        } else {
          resizedSynthPattern = t.synthPattern.slice(0, length);
        }

        return {
          ...t,
          patternLength: length,
          patterns: resizedPatterns,
          synthPattern: resizedSynthPattern,
        };
      });
      saveTracks(tracks);
      return { tracks };
    }),

  setTrackType: (id, type) =>
    set((state) => {
      const tracks = state.tracks.map((t) =>
        t.id === id ? { ...t, type } : t
      );
      saveTracks(tracks);
      return { tracks };
    }),

  getSelectedTrack: () => {
    const { tracks, selectedTrackId } = get();
    return tracks.find((t) => t.id === selectedTrackId);
  },

  // Pattern (operates on selected track)
  patternLength: 16,
  setPatternLength: (length) => set({ patternLength: length }),

  // Note: patterns is derived from selected track in components using getSelectedTrack()
  // This is kept for backward compatibility but components should use tracks[selectedTrackId].patterns
  patterns: createEmptyPatterns(),

  toggleStep: (drum, step) =>
    set((state) => {
      const tracks = state.tracks.map((t) => {
        if (t.id !== state.selectedTrackId) return t;
        return {
          ...t,
          patterns: {
            ...t.patterns,
            [drum]: t.patterns[drum].map((s, i) =>
              i === step ? { ...s, active: !s.active } : s
            ),
          },
        };
      });
      saveTracks(tracks);
      return { tracks };
    }),

  setStepVelocity: (drum, step, velocity) =>
    set((state) => {
      const tracks = state.tracks.map((t) => {
        if (t.id !== state.selectedTrackId) return t;
        return {
          ...t,
          patterns: {
            ...t.patterns,
            [drum]: t.patterns[drum].map((s, i) =>
              i === step ? { ...s, velocity: Math.max(0, Math.min(1, velocity)) } : s
            ),
          },
        };
      });
      saveTracks(tracks);
      return { tracks };
    }),

  loadPreset: (preset) =>
    set((state) => {
      const tracks = state.tracks.map((t) => {
        if (t.id !== state.selectedTrackId) return t;
        return {
          ...t,
          patterns: JSON.parse(JSON.stringify(preset.patterns)),
        };
      });
      saveTracks(tracks);
      return { tracks };
    }),

  clearPattern: () =>
    set((state) => {
      const tracks = state.tracks.map((t) => {
        if (t.id !== state.selectedTrackId) return t;
        return {
          ...t,
          patterns: createEmptyPatterns(),
          synthPattern: createEmptySynthPattern(16, t.synthPreset === 'bass' ? 36 : 60),
        };
      });
      saveTracks(tracks);
      return { tracks };
    }),

  // Synth pattern actions (for tone tracks)
  toggleSynthStep: (step) =>
    set((state) => {
      const tracks = state.tracks.map((t) => {
        if (t.id !== state.selectedTrackId) return t;
        return {
          ...t,
          synthPattern: t.synthPattern.map((s, i) =>
            i === step ? { ...s, active: !s.active } : s
          ),
        };
      });
      saveTracks(tracks);
      return { tracks };
    }),

  setSynthStepNote: (step, note) =>
    set((state) => {
      const tracks = state.tracks.map((t) => {
        if (t.id !== state.selectedTrackId) return t;
        return {
          ...t,
          synthPattern: t.synthPattern.map((s, i) =>
            i === step ? { ...s, note: Math.max(24, Math.min(96, note)) } : s
          ),
        };
      });
      saveTracks(tracks);
      return { tracks };
    }),

  setSynthStepVelocity: (step, velocity) =>
    set((state) => {
      const tracks = state.tracks.map((t) => {
        if (t.id !== state.selectedTrackId) return t;
        return {
          ...t,
          synthPattern: t.synthPattern.map((s, i) =>
            i === step ? { ...s, velocity: Math.max(0, Math.min(1, velocity)) } : s
          ),
        };
      });
      saveTracks(tracks);
      return { tracks };
    }),

  // Synth settings actions
  setSynthPreset: (preset) =>
    set((state) => {
      const tracks = state.tracks.map((t) => {
        if (t.id !== state.selectedTrackId) return t;
        // Apply preset defaults
        const defaults: Record<SynthPreset, Partial<Track>> = {
          bass: { oscillatorType: 'sawtooth' as const, filterCutoff: 0.3, filterResonance: 0.3, attack: 0.01, release: 0.3 },
          'sub-bass': { oscillatorType: 'sine' as const, filterCutoff: 0.15, filterResonance: 0.1, attack: 0.05, release: 0.4 },
          acid: { oscillatorType: 'sawtooth' as const, filterCutoff: 0.4, filterResonance: 0.7, attack: 0.001, release: 0.1 },
          lead: { oscillatorType: 'square' as const, filterCutoff: 0.7, filterResonance: 0.2, attack: 0.01, release: 0.2 },
          pluck: { oscillatorType: 'triangle' as const, filterCutoff: 0.9, filterResonance: 0.2, attack: 0.001, release: 0.15 },
          pad: { oscillatorType: 'sawtooth' as const, filterCutoff: 0.5, filterResonance: 0.1, attack: 0.4, release: 0.6 },
          stab: { oscillatorType: 'square' as const, filterCutoff: 0.8, filterResonance: 0.4, attack: 0.001, release: 0.15 },
          organ: { oscillatorType: 'sine' as const, filterCutoff: 0.6, filterResonance: 0.1, attack: 0.01, release: 0.1, osc2Enabled: true, osc2Type: 'sine' as const, osc2Detune: 0, osc2Volume: 0.8 },
          bells: { oscillatorType: 'sine' as const, filterCutoff: 0.95, filterResonance: 0.3, attack: 0.001, release: 0.8 },
        };
        return { ...t, synthPreset: preset, ...defaults[preset] };
      });
      saveTracks(tracks);
      return { tracks };
    }),

  setOscillatorType: (type) =>
    set((state) => {
      const tracks = state.tracks.map((t) =>
        t.id === state.selectedTrackId ? { ...t, oscillatorType: type } : t
      );
      saveTracks(tracks);
      return { tracks };
    }),

  setFilterCutoff: (cutoff) =>
    set((state) => {
      const tracks = state.tracks.map((t) =>
        t.id === state.selectedTrackId ? { ...t, filterCutoff: Math.max(0, Math.min(1, cutoff)) } : t
      );
      saveTracks(tracks);
      return { tracks };
    }),

  setFilterResonance: (resonance) =>
    set((state) => {
      const tracks = state.tracks.map((t) =>
        t.id === state.selectedTrackId ? { ...t, filterResonance: Math.max(0, Math.min(1, resonance)) } : t
      );
      saveTracks(tracks);
      return { tracks };
    }),

  setAttack: (attack) =>
    set((state) => {
      const tracks = state.tracks.map((t) =>
        t.id === state.selectedTrackId ? { ...t, attack: Math.max(0, Math.min(1, attack)) } : t
      );
      saveTracks(tracks);
      return { tracks };
    }),

  setRelease: (release) =>
    set((state) => {
      const tracks = state.tracks.map((t) =>
        t.id === state.selectedTrackId ? { ...t, release: Math.max(0, Math.min(1, release)) } : t
      );
      saveTracks(tracks);
      return { tracks };
    }),

  // Second oscillator actions
  setOsc2Enabled: (enabled) =>
    set((state) => {
      const tracks = state.tracks.map((t) =>
        t.id === state.selectedTrackId ? { ...t, osc2Enabled: enabled } : t
      );
      saveTracks(tracks);
      return { tracks };
    }),

  setOsc2Type: (type) =>
    set((state) => {
      const tracks = state.tracks.map((t) =>
        t.id === state.selectedTrackId ? { ...t, osc2Type: type } : t
      );
      saveTracks(tracks);
      return { tracks };
    }),

  setOsc2Detune: (detune) =>
    set((state) => {
      const tracks = state.tracks.map((t) =>
        t.id === state.selectedTrackId ? { ...t, osc2Detune: Math.max(-100, Math.min(100, detune)) } : t
      );
      saveTracks(tracks);
      return { tracks };
    }),

  setOsc2Volume: (volume) =>
    set((state) => {
      const tracks = state.tracks.map((t) =>
        t.id === state.selectedTrackId ? { ...t, osc2Volume: Math.max(0, Math.min(1, volume)) } : t
      );
      saveTracks(tracks);
      return { tracks };
    }),

  // Legato mode
  setLegato: (legato) =>
    set((state) => {
      const tracks = state.tracks.map((t) =>
        t.id === state.selectedTrackId ? { ...t, legato } : t
      );
      saveTracks(tracks);
      return { tracks };
    }),

  // User patterns
  userPatterns: loadUserPatterns(),

  savePattern: (name) => {
    const { tracks, selectedTrackId, userPatterns } = get();
    const selectedTrack = tracks.find((t) => t.id === selectedTrackId);
    if (!selectedTrack) return;

    const trimmedName = name.trim();
    if (!trimmedName) return;

    // Check if name already exists
    const existingIndex = userPatterns.findIndex((p) => p.name === trimmedName);
    const newPattern: PatternPreset = {
      name: trimmedName,
      patterns: JSON.parse(JSON.stringify(selectedTrack.patterns)),
      isUserPattern: true,
    };

    let newUserPatterns: PatternPreset[];
    if (existingIndex >= 0) {
      // Update existing
      newUserPatterns = [...userPatterns];
      newUserPatterns[existingIndex] = newPattern;
    } else {
      // Add new
      newUserPatterns = [...userPatterns, newPattern];
    }

    saveUserPatterns(newUserPatterns);
    set({ userPatterns: newUserPatterns });
  },

  deleteUserPattern: (name) => {
    const { userPatterns } = get();
    const newUserPatterns = userPatterns.filter((p) => p.name !== name);
    saveUserPatterns(newUserPatterns);
    set({ userPatterns: newUserPatterns });
  },

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
