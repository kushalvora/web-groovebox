import { Transport } from './components/Transport';
import { Mixer } from './components/Mixer';
import { StepSequencer } from './components/Sequencer';

function App() {
  return (
    <div className="min-h-screen bg-zinc-950 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <header className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white">Web Groovebox</h1>
          <p className="text-zinc-500 text-sm">Phase 4+5: Multi-Track + Synth</p>
        </header>

        {/* Transport */}
        <Transport />

        {/* Mixer */}
        <Mixer />

        {/* Step Sequencer */}
        <StepSequencer />

        {/* Learning Note */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 text-sm text-zinc-400">
          <h3 className="font-semibold text-zinc-300 mb-2">Music Concepts</h3>

          <div className="space-y-3">
            <div>
              <h4 className="text-zinc-300 font-medium">Mixing</h4>
              <ul className="list-disc list-inside space-y-0.5 mt-1">
                <li><strong>Volume</strong> - Balance so nothing drowns out others</li>
                <li><strong>Panning</strong> - Position in stereo (kick centered, synths wide)</li>
                <li><strong>Mute/Solo</strong> - Focus on specific parts</li>
              </ul>
            </div>

            <div>
              <h4 className="text-zinc-300 font-medium">Clock Divider</h4>
              <p className="mt-1">
                Each track can run at different speeds: <strong>1/4x</strong> (quarter speed),
                <strong> 1/2x</strong> (half), <strong>1x</strong> (normal), <strong>2x</strong> (double).
                Try putting drums at 1x and bass at 1/2x for a half-time feel!
              </p>
            </div>

            <div>
              <h4 className="text-zinc-300 font-medium">Synthesis</h4>
              <p className="mt-1">
                Synth tracks create sound from <strong>oscillators</strong> (raw waveforms) shaped by
                <strong> filters</strong> (remove frequencies) and <strong>envelopes</strong> (volume over time).
                Click steps to add notes, use +/- to change pitch.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
