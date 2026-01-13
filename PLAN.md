# Web Groovebox Implementation Plan

A learning-focused web groovebox inspired by the Roland MC-101, built incrementally to teach music production fundamentals with emphasis on rhythm & timing.

## Tech Stack

- **Framework**: React 18 with TypeScript
- **Audio**: Web Audio API
- **Styling**: Tailwind CSS
- **State**: Zustand (lightweight, perfect for audio state)
- **Build**: Vite (fast, modern)
- **Hosting**: Vercel

**Why React?** Good ecosystem, hooks work well for managing audio context and transport state, component-based approach maps naturally to groovebox modules (sequencer, mixer, synth).

---

## Phase 1: Foundation - Transport & Clock

**Goal**: Build the beating heart of any groovebox - precise timing.

### Build Steps
1. Set up React + Vite + TypeScript project
2. Create audio context initialization (user gesture required)
3. Build a precise scheduler using Web Audio API's `currentTime`
   - Implement "look-ahead" scheduling pattern for sample-accurate timing
4. Create transport controls: Play, Stop, BPM slider (80-160 range)
5. Visual BPM display with tap tempo button
6. Simple metronome click to verify timing accuracy

### Music Concepts Learned
- **BPM (Beats Per Minute)**: The pulse of electronic music. House typically 120-130 BPM, Techno 125-150 BPM
- **Audio Scheduling**: Why web audio needs look-ahead scheduling for tight timing
- **Transport**: The play/stop/pause system that controls playback

### Deliverable
A web page with play/stop, BPM control, and audible metronome click.

---

## Phase 2: Step Sequencer - Drum Track

**Goal**: Create the classic 16-step drum sequencer grid.

### Build Steps
1. Create a 16-step grid component (4 bars of 4 steps = 1 bar in 4/4)
2. Load drum samples: Kick, Snare, Closed Hi-hat, Open Hi-hat
   - Use royalty-free 808/909 samples (house/techno staples)
3. Connect grid to the clock - trigger samples on active steps
4. Add per-step velocity control (how hard each hit plays)
5. Implement pattern length selector (8, 16, 32 steps)
6. Create visual playhead showing current step

### Music Concepts Learned
- **Step Sequencing**: Programming beats in discrete steps vs real-time recording
- **4/4 Time Signature**: Why house/techno uses 4 beats per bar
- **The Four-on-the-Floor**: Kick on every beat (1, 2, 3, 4) - foundation of house
- **Velocity**: Dynamics - not every hit needs to be the same volume
- **Quantization**: Why steps lock to the grid

### Preset Patterns to Include
- Basic House Beat (kick on 1,5,9,13 / snare on 5,13 / hats on every step)
- Techno Drive (kick on every beat, offbeat hats)
- Breakbeat pattern

### Deliverable
Working drum machine with 4 sounds, 16-step grid, preset patterns.

---

## Phase 3: Swing & Groove

**Goal**: Make beats feel less robotic.

### Build Steps
1. Add swing control (0-100%) to the transport
2. Implement swing by delaying even-numbered steps
3. Add per-track groove templates
4. Create A/B comparison (swing on/off) for learning

### Music Concepts Learned
- **Swing/Shuffle**: Why shifting timing makes beats feel human
- **Groove**: The overall "feel" created by subtle timing variations
- **Straight vs Swung**: When to use each (techno often straighter, house often swung)

### Deliverable
Swing knob that audibly transforms the feel of patterns.

---

## Phase 4: Multi-Track (4 Tracks)

**Goal**: Expand to MC-101's 4-track architecture.

### Build Steps
1. Create track management system (add/remove/select tracks)
2. Implement per-track mute/solo controls
3. Add simple mixer with volume faders for each track
4. Create track types: Drum Kit, Tone (synth - placeholder for now)
5. Implement basic panning (left/right positioning)

### Music Concepts Learned
- **Mixing**: Balancing multiple elements in volume and stereo space
- **Mute/Solo**: Essential workflow for focusing on parts
- **Panning**: Creating width in a mix (hats slightly left/right, kick centered)
- **Arrangement Foundation**: How multiple parts create a full track

### Deliverable
4-track mixer with drum sequencer on each track (synth comes next).

---

## Phase 5: Basic Synthesizer

**Goal**: Create sounds from scratch, not just play samples.

### Build Steps
1. Create oscillator component (Sine, Square, Sawtooth, Triangle waves)
2. Build simple ADSR envelope (Attack, Decay, Sustain, Release)
3. Add low-pass filter with cutoff and resonance
4. Create a keyboard/pad interface for playing notes
5. Connect synth to step sequencer (note per step)
6. Add pitch control per step

### Music Concepts Learned
- **Oscillators**: The raw sound sources - each waveform has character
- **Subtractive Synthesis**: Starting with harmonics, filtering them away
- **ADSR Envelope**: How sounds evolve over time (pluck vs pad)
- **Filters**: Why the low-pass filter is the most important effect in electronic music
- **Resonance**: That squelchy peak at the cutoff frequency

### Preset Sounds
- Classic acid bass (saw + filter sweep)
- House organ stab
- Simple pad

### Deliverable
Playable synthesizer integrated with the step sequencer.

---

## Phase 6: Sampling & Audio Import

**Goal**: Use your own sounds.

### Build Steps
1. Implement audio file upload (WAV, MP3)
2. Create waveform display component
3. Add sample start/end point selection
4. Implement sample playback modes (one-shot, loop)
5. Add basic sample chopping (divide into 4/8/16 slices)
6. Map slices to sequencer steps

### Music Concepts Learned
- **Sampling**: Using recordings as instruments
- **Chopping**: Breaking loops into pieces for rearrangement
- **One-shot vs Loop**: When sounds play once vs repeat
- **Sample Rate**: Why audio quality matters

### Deliverable
Working sampler that can import, chop, and sequence audio files.

---

## Phase 7: Effects

**Goal**: Shape and color the sound.

### Build Steps
1. Add reverb (convolution reverb for realistic spaces)
2. Add delay (tempo-synced for rhythmic echoes)
3. Add filter effect (different from synth filter - for all audio)
4. Add distortion/saturation
5. Create effects chain UI (drag to reorder)
6. Implement wet/dry mix controls

### Music Concepts Learned
- **Reverb**: Creating space - from small room to vast hall
- **Delay**: Rhythmic echoes, creating groove with feedback
- **Tempo Sync**: Why effects should lock to the beat
- **Effect Chains**: Order matters (filter before reverb vs after)

### Deliverable
Per-track effects with reverb, delay, filter, and distortion.

---

## Phase 8: Scene/Pattern Management

**Goal**: Arrange patterns into a full track.

### Build Steps
1. Create pattern slots (like MC-101's clips)
2. Implement pattern copy/paste/clear
3. Build scene system (trigger multiple patterns together)
4. Add simple song arrangement view (timeline)
5. Export functionality (render to WAV)

### Music Concepts Learned
- **Patterns vs Arrangement**: Building blocks vs final structure
- **Scenes**: How DJs and live performers trigger groups
- **Song Structure**: Intro → Build → Drop → Breakdown → Drop → Outro
- **Exporting**: Rendering your creation to share

### Deliverable
Full arrangement capability with export to audio file.

---

## Phase 9: Polish & Learning Section

**Goal**: Complete the learning experience.

### Build Steps
1. Create "Learn" documentation section with concept explanations
2. Add interactive tutorials for each phase's concepts
3. Implement preset management (save/load user patterns)
4. Add MIDI clock output (sync with other apps)
5. Mobile-responsive layout
6. Performance optimization

### Deliverable
Polished, educational groovebox ready to share.

---

## Project Structure

```
src/
├── components/
│   ├── Transport/        # Play, stop, BPM, swing
│   ├── Sequencer/        # Step grid, playhead
│   ├── Mixer/            # Track volumes, pan, mute/solo
│   ├── Synth/            # Oscillators, envelope, filter
│   ├── Sampler/          # Audio import, waveform, slicing
│   ├── Effects/          # Reverb, delay, filter, distortion
│   └── Arrangement/      # Patterns, scenes, timeline
├── audio/
│   ├── AudioEngine.ts    # Web Audio context management
│   ├── Scheduler.ts      # Precise timing/clock
│   ├── DrumSampler.ts    # Sample playback
│   ├── Synthesizer.ts    # Oscillator + filter + envelope
│   └── Effects.ts        # Effect nodes
├── store/
│   └── useGrooveboxStore.ts  # Zustand state
├── samples/              # Default drum samples
├── presets/              # Pattern presets
└── learn/                # Educational content
```

---

## Verification Plan

After each phase:
1. **Manual Testing**: Play patterns, verify timing accuracy, test all controls
2. **Audio Check**: Listen for clicks, pops, or timing drift
3. **Browser Testing**: Chrome, Firefox, Safari (Web Audio differences)
4. **Deploy Preview**: Push to Vercel, test on different devices

---

## Starting Point: Phase 1

We'll begin with Phase 1 (Transport & Clock) which creates:
- Project setup with React + Vite + TypeScript
- Audio context initialization
- Precise clock/scheduler
- Play/Stop controls
- BPM slider (80-160)
- Tap tempo
- Metronome click

This foundation is critical - every other feature depends on accurate timing.
