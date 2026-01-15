/**
 * SynthControls Component - UI for adjusting synthesizer parameters
 *
 * Displays controls for:
 * - Preset selection (bass, lead, pad, stab)
 * - Oscillator type (sine, square, sawtooth, triangle)
 * - Filter (cutoff, resonance)
 * - Envelope (attack, release)
 *
 * Only renders when a synth (tone) track is selected.
 */

import { useCallback } from 'react';
import { useGrooveboxStore } from '../../store/useGrooveboxStore';
import type { SynthPreset, OscillatorType } from '../../store/useGrooveboxStore';

const PRESET_OPTIONS: { value: SynthPreset; label: string }[] = [
  { value: 'bass', label: 'Bass' },
  { value: 'sub-bass', label: 'Sub' },
  { value: 'acid', label: 'Acid' },
  { value: 'lead', label: 'Lead' },
  { value: 'pluck', label: 'Pluck' },
  { value: 'pad', label: 'Pad' },
  { value: 'stab', label: 'Stab' },
  { value: 'organ', label: 'Organ' },
  { value: 'bells', label: 'Bells' },
];

const OSCILLATOR_OPTIONS: { value: OscillatorType; label: string; icon: string }[] = [
  { value: 'sine', label: 'Sine', icon: '~' },
  { value: 'square', label: 'Sqr', icon: '□' },
  { value: 'sawtooth', label: 'Saw', icon: '/' },
  { value: 'triangle', label: 'Tri', icon: '△' },
];

// Format filter cutoff (0-1 maps to 100-10000 Hz exponentially)
const formatCutoff = (value: number): string => {
  const hz = 100 * Math.pow(100, value);
  return hz >= 1000 ? `${(hz / 1000).toFixed(1)}k` : `${Math.round(hz)}`;
};

// Format attack time (0-1 maps to ~1ms-2s)
const formatAttack = (value: number): string => {
  const seconds = 0.001 + value * 1.999;
  return seconds >= 1 ? `${seconds.toFixed(1)}s` : `${Math.round(seconds * 1000)}ms`;
};

// Format release time (0-1 maps to ~10ms-3s)
const formatRelease = (value: number): string => {
  const seconds = 0.01 + value * 2.99;
  return seconds >= 1 ? `${seconds.toFixed(1)}s` : `${Math.round(seconds * 1000)}ms`;
};

export function SynthControls() {
  const {
    tracks,
    selectedTrackId,
    setSynthPreset,
    setOscillatorType,
    setFilterCutoff,
    setFilterResonance,
    setAttack,
    setRelease,
    setOsc2Enabled,
    setOsc2Type,
    setOsc2Detune,
    setOsc2Volume,
    setLegato,
  } = useGrooveboxStore();

  const selectedTrack = tracks.find((t) => t.id === selectedTrackId);

  // All hooks must be called before any conditional returns (React Rules of Hooks)
  const handleCutoffChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFilterCutoff(parseFloat(e.target.value));
    },
    [setFilterCutoff]
  );

  const handleResonanceChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFilterResonance(parseFloat(e.target.value));
    },
    [setFilterResonance]
  );

  const handleAttackChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setAttack(parseFloat(e.target.value));
    },
    [setAttack]
  );

  const handleReleaseChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setRelease(parseFloat(e.target.value));
    },
    [setRelease]
  );

  const handleOsc2DetuneChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setOsc2Detune(parseInt(e.target.value, 10));
    },
    [setOsc2Detune]
  );

  const handleOsc2VolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setOsc2Volume(parseFloat(e.target.value));
    },
    [setOsc2Volume]
  );

  // Don't render if no track selected or not a tone track
  if (!selectedTrack || selectedTrack.type !== 'tone') {
    return null;
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-zinc-400 text-sm font-medium">SYNTH CONTROLS</h3>
        <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded border border-purple-500/30">
          Editing: {selectedTrack.name}
        </span>
      </div>

      {/* Preset + Play Mode Row */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Preset Selector */}
        <div>
          <label className="text-xs text-zinc-500 mb-2 block">PRESET</label>
          <div className="flex flex-wrap gap-1">
            {PRESET_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSynthPreset(opt.value)}
                className={`px-2 py-1.5 text-xs font-medium rounded transition-colors ${
                  selectedTrack.synthPreset === opt.value
                    ? 'bg-amber-500 text-black'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Play Mode Toggle */}
        <div>
          <label className="text-xs text-zinc-500 mb-2 block">PLAY MODE</label>
          <div className="flex gap-2">
            <button
              onClick={() => setLegato(false)}
              className={`flex-1 px-3 py-2 text-xs font-medium rounded transition-colors ${
                !selectedTrack.legato
                  ? 'bg-green-500 text-black'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              TRIGGER
            </button>
            <button
              onClick={() => setLegato(true)}
              className={`flex-1 px-3 py-2 text-xs font-medium rounded transition-colors ${
                selectedTrack.legato
                  ? 'bg-green-500 text-black'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              LEGATO
            </button>
          </div>
        </div>
      </div>

      {/* Oscillators Row */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Oscillator 1 */}
        <div>
          <label className="text-xs text-zinc-500 mb-2 block">OSCILLATOR 1</label>
          <div className="flex gap-1">
            {OSCILLATOR_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setOscillatorType(opt.value)}
                className={`flex-1 flex flex-col items-center py-2 rounded transition-colors ${
                  selectedTrack.oscillatorType === opt.value
                    ? 'bg-purple-500 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
                title={opt.label}
              >
                <span className="text-lg leading-none">{opt.icon}</span>
                <span className="text-[10px] mt-1">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Oscillator 2 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-zinc-500">OSCILLATOR 2</label>
            <button
              onClick={() => setOsc2Enabled(!selectedTrack.osc2Enabled)}
              className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors ${
                selectedTrack.osc2Enabled
                  ? 'bg-purple-500 text-white'
                  : 'bg-zinc-700 text-zinc-500 hover:bg-zinc-600'
              }`}
            >
              {selectedTrack.osc2Enabled ? 'ON' : 'OFF'}
            </button>
          </div>
          <div className={`${selectedTrack.osc2Enabled ? '' : 'opacity-40 pointer-events-none'}`}>
            <div className="flex gap-1 mb-2">
              {OSCILLATOR_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setOsc2Type(opt.value)}
                  className={`flex-1 flex flex-col items-center py-1.5 rounded transition-colors ${
                    selectedTrack.osc2Type === opt.value
                      ? 'bg-purple-500 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                  title={opt.label}
                >
                  <span className="text-sm leading-none">{opt.icon}</span>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="flex justify-between text-[10px] mb-0.5">
                  <span className="text-zinc-500">Detune</span>
                  <span className="text-purple-400 font-mono">{selectedTrack.osc2Detune}ct</span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  step="1"
                  value={selectedTrack.osc2Detune}
                  onChange={handleOsc2DetuneChange}
                  className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
              </div>
              <div>
                <div className="flex justify-between text-[10px] mb-0.5">
                  <span className="text-zinc-500">Volume</span>
                  <span className="text-purple-400 font-mono">{Math.round(selectedTrack.osc2Volume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={selectedTrack.osc2Volume}
                  onChange={handleOsc2VolumeChange}
                  className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Row */}
      <div className="mb-4">
        <label className="text-xs text-zinc-500 mb-2 block">FILTER</label>
        <div className="grid grid-cols-2 gap-4">
          {/* Cutoff */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-zinc-500">Cutoff</span>
              <span className="text-cyan-400 font-mono">
                {formatCutoff(selectedTrack.filterCutoff)} Hz
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={selectedTrack.filterCutoff}
              onChange={handleCutoffChange}
              className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
          </div>
          {/* Resonance */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-zinc-500">Resonance</span>
              <span className="text-cyan-400 font-mono">
                {Math.round(selectedTrack.filterResonance * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={selectedTrack.filterResonance}
              onChange={handleResonanceChange}
              className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
          </div>
        </div>
      </div>

      {/* Envelope Row */}
      <div>
        <label className="text-xs text-zinc-500 mb-2 block">ENVELOPE</label>
        <div className="grid grid-cols-2 gap-4">
          {/* Attack */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-zinc-500">Attack</span>
              <span className="text-green-400 font-mono">
                {formatAttack(selectedTrack.attack)}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={selectedTrack.attack}
              onChange={handleAttackChange}
              className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-green-500"
            />
          </div>
          {/* Release */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-zinc-500">Release</span>
              <span className="text-green-400 font-mono">
                {formatRelease(selectedTrack.release)}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={selectedTrack.release}
              onChange={handleReleaseChange}
              className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-green-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
