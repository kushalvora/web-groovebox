import { Transport } from './components/Transport';
import { StepSequencer } from './components/Sequencer';

function App() {
  return (
    <div className="min-h-screen bg-zinc-950 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <header className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white">Web Groovebox</h1>
          <p className="text-zinc-500 text-sm">Phase 3: Swing & Groove</p>
        </header>

        {/* Transport */}
        <Transport />

        {/* Step Sequencer */}
        <StepSequencer />

        {/* Learning Note */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 text-sm text-zinc-400">
          <h3 className="font-semibold text-zinc-300 mb-2">Music Concept: Swing & Groove</h3>
          <p>
            <strong>Swing</strong> delays every other 16th note, creating a "bounce" or "shuffle" feel.
            At 0% swing, timing is perfectly straight (robotic). At ~50%, you get a triplet feel.
            Try loading "Classic House" and adjusting swing from 0% to 50% - hear how the hi-hats
            go from mechanical to groovy. Techno often uses less swing (0-20%), while house uses more (30-50%).
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
