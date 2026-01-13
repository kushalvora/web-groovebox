/**
 * StepSequencer Component - The classic 16-step drum grid
 *
 * This is the heart of the drum machine. Click cells to program beats.
 * Each row is a different drum sound, each column is a step in time.
 */

import { useCallback, useState } from 'react';
import { useGrooveboxStore, getPatternPresets } from '../../store/useGrooveboxStore';
import { DRUM_NAMES } from '../../audio/DrumSampler';
import type { DrumType } from '../../audio/DrumSampler';

const DRUM_ORDER: DrumType[] = ['kick', 'snare', 'hihat', 'openhat'];

// Colors for each drum type
const DRUM_COLORS: Record<DrumType, { active: string; hover: string }> = {
  kick: { active: 'bg-orange-500', hover: 'hover:bg-orange-900' },
  snare: { active: 'bg-yellow-500', hover: 'hover:bg-yellow-900' },
  hihat: { active: 'bg-cyan-500', hover: 'hover:bg-cyan-900' },
  openhat: { active: 'bg-teal-500', hover: 'hover:bg-teal-900' },
};

export function StepSequencer() {
  const {
    patterns,
    toggleStep,
    currentStep,
    isPlaying,
    patternLength,
    loadPreset,
    clearPattern,
    userPatterns,
    savePattern,
    deleteUserPattern,
  } = useGrooveboxStore();

  const [patternName, setPatternName] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);

  const allPresets = getPatternPresets(userPatterns);

  const handleStepClick = useCallback(
    (drum: DrumType, step: number) => {
      toggleStep(drum, step);
    },
    [toggleStep]
  );

  const handlePresetChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const preset = allPresets.find((p) => p.name === e.target.value);
      if (preset) {
        loadPreset(preset);
      }
    },
    [allPresets, loadPreset]
  );

  const handleSave = useCallback(() => {
    if (patternName.trim()) {
      savePattern(patternName.trim());
      setPatternName('');
      setShowSaveInput(false);
    }
  }, [patternName, savePattern]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSave();
      } else if (e.key === 'Escape') {
        setShowSaveInput(false);
        setPatternName('');
      }
    },
    [handleSave]
  );

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 w-full">
      {/* Header with presets and save */}
      <div className="flex items-center justify-between mb-4 gap-2">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">
          Step Sequencer
        </h2>
        <div className="flex items-center gap-2">
          {/* Preset dropdown */}
          <select
            onChange={handlePresetChange}
            className="bg-zinc-800 text-white text-sm rounded px-2 py-1 border border-zinc-700"
            defaultValue=""
          >
            <option value="" disabled>
              Load Pattern
            </option>
            <optgroup label="Built-in">
              {allPresets
                .filter((p) => !p.isUserPattern)
                .map((preset) => (
                  <option key={preset.name} value={preset.name}>
                    {preset.name}
                  </option>
                ))}
            </optgroup>
            {userPatterns.length > 0 && (
              <optgroup label="My Patterns">
                {userPatterns.map((preset) => (
                  <option key={preset.name} value={preset.name}>
                    {preset.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>

          {/* Save button / input */}
          {showSaveInput ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={patternName}
                onChange={(e) => setPatternName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pattern name"
                className="bg-zinc-800 text-white text-sm rounded px-2 py-1 border border-zinc-700 w-32"
                autoFocus
              />
              <button
                onClick={handleSave}
                className="bg-green-600 hover:bg-green-500 text-white text-sm rounded px-2 py-1"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setShowSaveInput(false);
                  setPatternName('');
                }}
                className="bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-sm rounded px-2 py-1"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSaveInput(true)}
              className="bg-zinc-800 hover:bg-zinc-700 text-white text-sm rounded px-2 py-1 border border-zinc-700"
            >
              Save
            </button>
          )}

          <button
            onClick={clearPattern}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-sm rounded px-2 py-1 border border-zinc-700"
          >
            Clear
          </button>
        </div>
      </div>

      {/* User patterns quick delete (if any) */}
      {userPatterns.length > 0 && (
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-xs text-zinc-500">My patterns:</span>
          {userPatterns.map((preset) => (
            <div
              key={preset.name}
              className="flex items-center gap-1 bg-zinc-800 rounded px-2 py-0.5 text-xs"
            >
              <button
                onClick={() => loadPreset(preset)}
                className="text-zinc-300 hover:text-white"
              >
                {preset.name}
              </button>
              <button
                onClick={() => deleteUserPattern(preset.name)}
                className="text-zinc-500 hover:text-red-400 ml-1"
                title="Delete pattern"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Beat markers */}
      <div className="flex mb-1 ml-20">
        {Array.from({ length: patternLength }, (_, i) => (
          <div
            key={i}
            className={`w-8 h-4 flex items-center justify-center text-xs ${
              i % 4 === 0 ? 'text-zinc-400' : 'text-zinc-600'
            }`}
          >
            {i % 4 === 0 ? Math.floor(i / 4) + 1 : ''}
          </div>
        ))}
      </div>

      {/* Sequencer grid */}
      <div className="space-y-1">
        {DRUM_ORDER.map((drum) => (
          <div key={drum} className="flex items-center gap-2">
            {/* Drum label */}
            <div className="w-16 text-right text-sm text-zinc-400 pr-2">
              {DRUM_NAMES[drum]}
            </div>

            {/* Steps */}
            <div className="flex gap-0.5">
              {patterns[drum].slice(0, patternLength).map((step, i) => {
                const isCurrentStep = isPlaying && i === currentStep;
                const colors = DRUM_COLORS[drum];

                return (
                  <button
                    key={i}
                    onClick={() => handleStepClick(drum, i)}
                    className={`
                      w-8 h-8 rounded-sm transition-all duration-75
                      ${step.active ? colors.active : `bg-zinc-800 ${colors.hover}`}
                      ${isCurrentStep ? 'ring-2 ring-white ring-opacity-50' : ''}
                      ${i % 4 === 0 ? 'ml-0.5' : ''}
                    `}
                    style={{
                      opacity: step.active ? 0.4 + step.velocity * 0.6 : 1,
                    }}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-4 text-xs text-zinc-500">
        <span>Click steps to toggle</span>
        <span className="text-zinc-600">|</span>
        <span>Brightness = velocity</span>
      </div>
    </div>
  );
}
