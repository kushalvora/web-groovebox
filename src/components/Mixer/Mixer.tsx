/**
 * Mixer Component - 4-Track mixer with volume, pan, mute, and solo
 *
 * This teaches mixing concepts:
 * - Volume: Balancing elements in a mix
 * - Panning: Stereo positioning (left/center/right)
 * - Mute: Silencing a track
 * - Solo: Isolating a track to hear it alone
 */

import { useCallback, useEffect } from 'react';
import { useGrooveboxStore } from '../../store/useGrooveboxStore';
import type { ClockDivider } from '../../store/useGrooveboxStore';
import { audioEngine } from '../../audio/AudioEngine';

const CLOCK_DIVIDER_OPTIONS: { value: ClockDivider; label: string }[] = [
  { value: 0.25, label: '1/4x' },
  { value: 0.5, label: '1/2x' },
  { value: 1, label: '1x' },
  { value: 2, label: '2x' },
];

export function Mixer() {
  const {
    tracks,
    selectedTrackId,
    selectTrack,
    setTrackMute,
    setTrackSolo,
    setTrackVolume,
    setTrackPan,
    setTrackClockDivider,
    setTrackType,
    isAudioInitialized,
  } = useGrooveboxStore();

  // Check if any track is soloed
  const hasSolo = tracks.some((t) => t.solo);

  // Sync track volumes and pans with audio engine when they change
  useEffect(() => {
    if (!isAudioInitialized) return;

    tracks.forEach((track) => {
      // Calculate effective volume based on mute/solo state
      const isMuted = track.mute || (hasSolo && !track.solo);
      const effectiveVolume = isMuted ? 0 : track.volume;

      audioEngine.setTrackVolume(track.id, effectiveVolume);
      audioEngine.setTrackPan(track.id, track.pan);
    });
  }, [tracks, hasSolo, isAudioInitialized]);

  const handleVolumeChange = useCallback(
    (trackId: string, e: React.ChangeEvent<HTMLInputElement>) => {
      setTrackVolume(trackId, parseFloat(e.target.value));
    },
    [setTrackVolume]
  );

  const handlePanChange = useCallback(
    (trackId: string, e: React.ChangeEvent<HTMLInputElement>) => {
      setTrackPan(trackId, parseFloat(e.target.value));
    },
    [setTrackPan]
  );

  // Format pan value for display
  const formatPan = (pan: number): string => {
    if (pan === 0) return 'C';
    if (pan < 0) return `L${Math.round(Math.abs(pan) * 100)}`;
    return `R${Math.round(pan * 100)}`;
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 w-full">
      <h3 className="text-zinc-400 text-sm font-medium mb-4">MIXER</h3>

      <div className="flex gap-3">
        {tracks.map((track) => {
          const isSelected = track.id === selectedTrackId;
          const isMuted = track.mute || (hasSolo && !track.solo);

          return (
            <div
              key={track.id}
              onClick={() => selectTrack(track.id)}
              className={`flex-1 flex flex-col items-center p-3 rounded-lg cursor-pointer transition-colors ${
                isSelected
                  ? 'bg-zinc-700 ring-2 ring-amber-500'
                  : 'bg-zinc-800 hover:bg-zinc-750'
              }`}
            >
              {/* Track Type Indicator (clickable to toggle) */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setTrackType(track.id, track.type === 'drum' ? 'tone' : 'drum');
                }}
                className={`text-[10px] px-1.5 py-0.5 rounded mb-1 transition-colors ${
                  track.type === 'drum'
                    ? 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30'
                    : 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'
                }`}
                title="Click to change track type"
              >
                {track.type === 'drum' ? 'DRUM' : 'SYNTH'}
              </button>

              {/* Track Name */}
              <span
                className={`text-xs font-medium mb-2 ${
                  isMuted ? 'text-zinc-600' : 'text-zinc-300'
                }`}
              >
                {track.name}
              </span>

              {/* Clock Divider Selector */}
              <div className="flex gap-0.5 mb-2">
                {CLOCK_DIVIDER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={(e) => {
                      e.stopPropagation();
                      setTrackClockDivider(track.id, opt.value);
                    }}
                    className={`px-1 py-0.5 text-[10px] rounded transition-colors ${
                      track.clockDivider === opt.value
                        ? 'bg-cyan-600 text-white'
                        : 'bg-zinc-700 text-zinc-500 hover:bg-zinc-600'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Volume Fader (vertical) */}
              <div className="flex flex-col items-center mb-3">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={track.volume}
                  onChange={(e) => handleVolumeChange(track.id, e)}
                  onClick={(e) => e.stopPropagation()}
                  className="h-24 w-2 appearance-none bg-zinc-600 rounded-full cursor-pointer accent-green-500"
                  style={{
                    writingMode: 'vertical-lr',
                    direction: 'rtl',
                  }}
                />
                <span className="text-xs text-zinc-500 mt-1">
                  {Math.round(track.volume * 100)}
                </span>
              </div>

              {/* Pan Knob (horizontal slider) */}
              <div className="w-full mb-3">
                <div className="flex justify-between text-xs text-zinc-600 mb-1">
                  <span>L</span>
                  <span className="text-zinc-400">{formatPan(track.pan)}</span>
                  <span>R</span>
                </div>
                <input
                  type="range"
                  min="-1"
                  max="1"
                  step="0.01"
                  value={track.pan}
                  onChange={(e) => handlePanChange(track.id, e)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full h-1.5 bg-zinc-600 rounded-full appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              {/* Mute/Solo Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setTrackMute(track.id, !track.mute);
                  }}
                  className={`px-2 py-1 text-xs font-bold rounded transition-colors ${
                    track.mute
                      ? 'bg-red-600 text-white'
                      : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'
                  }`}
                >
                  M
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setTrackSolo(track.id, !track.solo);
                  }}
                  className={`px-2 py-1 text-xs font-bold rounded transition-colors ${
                    track.solo
                      ? 'bg-yellow-500 text-black'
                      : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'
                  }`}
                >
                  S
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex justify-center gap-6 text-xs text-zinc-500">
        <span>
          <span className="inline-block w-3 h-3 bg-red-600 rounded mr-1"></span>
          Mute
        </span>
        <span>
          <span className="inline-block w-3 h-3 bg-yellow-500 rounded mr-1"></span>
          Solo
        </span>
        <span>
          <span className="inline-block w-3 h-3 ring-2 ring-amber-500 rounded mr-1"></span>
          Selected
        </span>
      </div>
    </div>
  );
}
