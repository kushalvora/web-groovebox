import { Transport } from './components/Transport';
import { StepSequencer } from './components/Sequencer';

function App() {
  return (
    <div className="min-h-screen bg-zinc-950 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <header className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white">Web Groovebox</h1>
          <p className="text-zinc-500 text-sm">Phase 2: Step Sequencer</p>
        </header>

        {/* Transport */}
        <Transport />

        {/* Step Sequencer */}
        <StepSequencer />

        {/* Learning Note */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 text-sm text-zinc-400">
          <h3 className="font-semibold text-zinc-300 mb-2">Music Concept: Four-on-the-Floor</h3>
          <p>
            The foundation of house and techno is the "four-on-the-floor" beat: kick drum on every
            beat (steps 1, 5, 9, 13). Try the "Four on the Floor" preset, then experiment by adding
            hi-hats on the offbeats (steps 3, 7, 11, 15) for that driving dance feel.
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
