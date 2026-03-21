# NEX TOP 100 Seed Data Population

## What & Why
Populate the NEX platform with 100 high-quality seed tracks spread across 10 genres and 20 creator profiles. The `sampleData` array in `server/seed.ts` is currently empty, leaving the chart and battle system with no content. This task fills it with a realistic, ranked dataset — and also fixes two minor bugs in the seed function: `genre` is hardcoded to `"Electronic"` (should use each track's genre), and `aiPrompt` is never passed during seeding.

## Done looks like
- The NEX TOP 100 chart shows 100 ranked tracks on load
- Each track has a unique title, creator, genre, vote count, and AI DNA tag
- 20 creator profiles are auto-generated (2 per genre)
- Battle Arena has tracks from every genre available for matchmaking
- No CSS, UI logic, or routing is changed

## Out of scope
- Real audio file hosting (placeholder YouTube URLs are used for `audioUrl`)
- Uploading actual cover images
- Any change to components, routes, or schema

## Tasks
1. **Fix seed function genre + aiPrompt passthrough** — Update `server/seed.ts` to read `t.genre` and `t.aiPrompt` from each data entry instead of hardcoding `"Electronic"` and omitting the AI DNA field.
2. **Populate sampleData with 100 tracks** — Replace the empty `sampleData = []` with the full 100-track array below (20 creators × 5 tracks, 10 genres). Clear the database first if it already has stale/empty placeholder rows from earlier runs (use `onConflictDoNothing` already in place for users/profiles).

## Relevant files
- `server/seed.ts`
- `shared/schema.ts`

---

## ✅ DATA ARRAY FOR APPROVAL

Below is the exact `sampleData` array to be applied. Each entry maps to the `seed.ts` structure:
`{ creator, title, audioUrl, mvUrl, tool, votes, genre, aiPrompt }`

The placeholder audio URL used throughout: `https://www.youtube.com/watch?v=dQw4w9WgXcQ`

---

```typescript
const sampleData = [

  // ── SYNTH-POP ──────────────────────────────────────────────── 10 tracks
  { creator: "COBALT",    title: "Neon Heartbeat",       audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", tool: "Suno",          votes: 9421, genre: "Synth-pop",   aiPrompt: "[MODEL: NEX_V3 | SEED: 7721 | STYLE: SYNTH-POP]" },
  { creator: "COBALT",    title: "Electric Daydream",    audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "Suno",          votes: 8803, genre: "Synth-pop",   aiPrompt: "[MODEL: NEX_V3 | SEED: 2234 | STYLE: SYNTH-POP]" },
  { creator: "COBALT",    title: "Glass City Nights",    audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "Udio",          votes: 7560, genre: "Synth-pop",   aiPrompt: "[MODEL: NEX_V3 | SEED: 5518 | STYLE: SYNTH-POP]" },
  { creator: "COBALT",    title: "Chrome Lover",         audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "Suno",          votes: 6211, genre: "Synth-pop",   aiPrompt: "[MODEL: NEX_V3 | SEED: 3390 | STYLE: SYNTH-POP]" },
  { creator: "COBALT",    title: "Satellite Kiss",       audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "Udio",          votes: 5104, genre: "Synth-pop",   aiPrompt: "[MODEL: NEX_V3 | SEED: 8812 | STYLE: SYNTH-POP]" },
  { creator: "SynthLab",  title: "Midnight City Echo",   audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", tool: "MusicGen",      votes: 8990, genre: "Synth-pop",   aiPrompt: "[MODEL: NEX_V3 | SEED: 1145 | STYLE: SYNTH-POP]" },
  { creator: "SynthLab",  title: "Digital Rain",         audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "MusicGen",      votes: 7745, genre: "Synth-pop",   aiPrompt: "[MODEL: NEX_V3 | SEED: 6623 | STYLE: SYNTH-POP]" },
  { creator: "SynthLab",  title: "Voltage Romance",      audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "Suno",          votes: 6880, genre: "Synth-pop",   aiPrompt: "[MODEL: NEX_V3 | SEED: 4401 | STYLE: SYNTH-POP]" },
  { creator: "SynthLab",  title: "Prism Frequency",      audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "Udio",          votes: 5330, genre: "Synth-pop",   aiPrompt: "[MODEL: NEX_V3 | SEED: 9977 | STYLE: SYNTH-POP]" },
  { creator: "SynthLab",  title: "Future Static",        audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "MusicGen",      votes: 4112, genre: "Synth-pop",   aiPrompt: "[MODEL: NEX_V3 | SEED: 2250 | STYLE: SYNTH-POP]" },

  // ── FUNK ───────────────────────────────────────────────────── 10 tracks
  { creator: "PulseAI",   title: "Groove Protocol",      audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", tool: "Suno",          votes: 9120, genre: "Funk",        aiPrompt: "[MODEL: NEX_V3 | SEED: 3317 | STYLE: FUNK]" },
  { creator: "PulseAI",   title: "Bass Frequency One",   audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "Suno",          votes: 8450, genre: "Funk",        aiPrompt: "[MODEL: NEX_V3 | SEED: 7788 | STYLE: FUNK]" },
  { creator: "PulseAI",   title: "Slap Circuit",         audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "AudioCraft",    votes: 7030, genre: "Funk",        aiPrompt: "[MODEL: NEX_V3 | SEED: 5561 | STYLE: FUNK]" },
  { creator: "PulseAI",   title: "Dirty Machine",        audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "Suno",          votes: 5990, genre: "Funk",        aiPrompt: "[MODEL: NEX_V3 | SEED: 1199 | STYLE: FUNK]" },
  { creator: "PulseAI",   title: "Wah Wah Signal",       audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "AudioCraft",    votes: 4850, genre: "Funk",        aiPrompt: "[MODEL: NEX_V3 | SEED: 6634 | STYLE: FUNK]" },
  { creator: "VoltFunk",  title: "Electric Parliament",  audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", tool: "Udio",          votes: 8720, genre: "Funk",        aiPrompt: "[MODEL: NEX_V3 | SEED: 4423 | STYLE: FUNK]" },
  { creator: "VoltFunk",  title: "Pocket Algorithm",     audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "Udio",          votes: 7610, genre: "Funk",        aiPrompt: "[MODEL: NEX_V3 | SEED: 8856 | STYLE: FUNK]" },
  { creator: "VoltFunk",  title: "Super Collider Jam",   audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "Suno",          votes: 6450, genre: "Funk",        aiPrompt: "[MODEL: NEX_V3 | SEED: 2278 | STYLE: FUNK]" },
  { creator: "VoltFunk",  title: "Neon Slap Theory",     audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "MusicGen",      votes: 5130, genre: "Funk",        aiPrompt: "[MODEL: NEX_V3 | SEED: 7092 | STYLE: FUNK]" },
  { creator: "VoltFunk",  title: "Funky Transmission",   audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "AudioCraft",    votes: 3890, genre: "Funk",        aiPrompt: "[MODEL: NEX_V3 | SEED: 3345 | STYLE: FUNK]" },

  // ── ROCK ───────────────────────────────────────────────────── 10 tracks
  { creator: "NeonCore",  title: "Digital Riot",         audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", tool: "Suno",          votes: 9350, genre: "Rock",        aiPrompt: "[MODEL: NEX_V3 | SEED: 5502 | STYLE: ROCK]" },
  { creator: "NeonCore",  title: "Override Sequence",    audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "Suno",          votes: 8210, genre: "Rock",        aiPrompt: "[MODEL: NEX_V3 | SEED: 9913 | STYLE: ROCK]" },
  { creator: "NeonCore",  title: "Voltage Surge",        audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "Udio",          votes: 7040, genre: "Rock",        aiPrompt: "[MODEL: NEX_V3 | SEED: 1167 | STYLE: ROCK]" },
  { creator: "NeonCore",  title: "Signal Breach",        audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "MusicGen",      votes: 5760, genre: "Rock",        aiPrompt: "[MODEL: NEX_V3 | SEED: 4489 | STYLE: ROCK]" },
  { creator: "NeonCore",  title: "System Shock",         audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "Suno",          votes: 4580, genre: "Rock",        aiPrompt: "[MODEL: NEX_V3 | SEED: 6601 | STYLE: ROCK]" },
  { creator: "ChromeRiff",title: "Iron Algorithm",       audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", tool: "AudioCraft",    votes: 8880, genre: "Rock",        aiPrompt: "[MODEL: NEX_V3 | SEED: 7723 | STYLE: ROCK]" },
  { creator: "ChromeRiff",title: "Riff Protocol",        audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "Udio",          votes: 7650, genre: "Rock",        aiPrompt: "[MODEL: NEX_V3 | SEED: 2256 | STYLE: ROCK]" },
  { creator: "ChromeRiff",title: "Static Throne",        audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "Suno",          votes: 6390, genre: "Rock",        aiPrompt: "[MODEL: NEX_V3 | SEED: 5534 | STYLE: ROCK]" },
  { creator: "ChromeRiff",title: "Last Circuit",         audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "MusicGen",      votes: 4990, genre: "Rock",        aiPrompt: "[MODEL: NEX_V3 | SEED: 8878 | STYLE: ROCK]" },
  { creator: "ChromeRiff",title: "Phantom Overdrive",    audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "AudioCraft",    votes: 3740, genre: "Rock",        aiPrompt: "[MODEL: NEX_V3 | SEED: 1190 | STYLE: ROCK]" },

  // ── K-POP ──────────────────────────────────────────────────── 10 tracks
  { creator: "HannaH",    title: "별빛 (Star Signal)",   audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", tool: "Suno",          votes: 9780, genre: "K-pop",       aiPrompt: "[MODEL: NEX_V3 | SEED: 4412 | STYLE: K-POP]" },
  { creator: "HannaH",    title: "Hyper Fantasy",        audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", tool: "Udio",          votes: 9340, genre: "K-pop",       aiPrompt: "[MODEL: NEX_V3 | SEED: 8890 | STYLE: K-POP]" },
  { creator: "HannaH",    title: "Pixel Crush",          audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "MusicGen",      votes: 8120, genre: "K-pop",       aiPrompt: "[MODEL: NEX_V3 | SEED: 3367 | STYLE: K-POP]" },
  { creator: "HannaH",    title: "Neo Bloom",            audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "Suno",          votes: 7230, genre: "K-pop",       aiPrompt: "[MODEL: NEX_V3 | SEED: 6645 | STYLE: K-POP]" },
  { creator: "HannaH",    title: "Rainbow Sequence",     audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "Udio",          votes: 6010, genre: "K-pop",       aiPrompt: "[MODEL: NEX_V3 | SEED: 1178 | STYLE: K-POP]" },
  { creator: "StarForge", title: "이상한 나라 (Wonderland)", audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", tool: "Suno",     votes: 9580, genre: "K-pop",       aiPrompt: "[MODEL: NEX_V3 | SEED: 5523 | STYLE: K-POP]" },
  { creator: "StarForge", title: "Digital Stage",        audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "AudioCraft",    votes: 8450, genre: "K-pop",       aiPrompt: "[MODEL: NEX_V3 | SEED: 9901 | STYLE: K-POP]" },
  { creator: "StarForge", title: "K-Wave Protocol",      audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "MusicGen",      votes: 7110, genre: "K-pop",       aiPrompt: "[MODEL: NEX_V3 | SEED: 2289 | STYLE: K-POP]" },
  { creator: "StarForge", title: "Neon Seoul",           audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "Suno",          votes: 5870, genre: "K-pop",       aiPrompt: "[MODEL: NEX_V3 | SEED: 7734 | STYLE: K-POP]" },
  { creator: "StarForge", title: "Pop Vector",           audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "Udio",          votes: 4620, genre: "K-pop",       aiPrompt: "[MODEL: NEX_V3 | SEED: 3356 | STYLE: K-POP]" },

  // ── ELECTRONIC ─────────────────────────────────────────────── 10 tracks
  { creator: "BeatForge", title: "Quantum Cascade",      audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", tool: "Suno",          votes: 9050, genre: "Electronic",  aiPrompt: "[MODEL: NEX_V3 | SEED: 6612 | STYLE: ELECTRONIC]" },
  { creator: "BeatForge", title: "Resonance Grid",       audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "Stable Audio",  votes: 8300, genre: "Electronic",  aiPrompt: "[MODEL: NEX_V3 | SEED: 1156 | STYLE: ELECTRONIC]" },
  { creator: "BeatForge", title: "Sub Harmonic",         audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "MusicGen",      votes: 7180, genre: "Electronic",  aiPrompt: "[MODEL: NEX_V3 | SEED: 4478 | STYLE: ELECTRONIC]" },
  { creator: "BeatForge", title: "Oscillation Theory",   audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "Udio",          votes: 5950, genre: "Electronic",  aiPrompt: "[MODEL: NEX_V3 | SEED: 8834 | STYLE: ELECTRONIC]" },
  { creator: "BeatForge", title: "Zero Latency",         audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "Suno",          votes: 4800, genre: "Electronic",  aiPrompt: "[MODEL: NEX_V3 | SEED: 2267 | STYLE: ELECTRONIC]" },
  { creator: "DriftCode", title: "Temporal Drift",       audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", tool: "Stable Audio",  votes: 8650, genre: "Electronic",  aiPrompt: "[MODEL: NEX_V3 | SEED: 7745 | STYLE: ELECTRONIC]" },
  { creator: "DriftCode", title: "Phase Lock",           audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "AudioCraft",    votes: 7430, genre: "Electronic",  aiPrompt: "[MODEL: NEX_V3 | SEED: 5589 | STYLE: ELECTRONIC]" },
  { creator: "DriftCode", title: "Carrier Wave",         audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "MusicGen",      votes: 6200, genre: "Electronic",  aiPrompt: "[MODEL: NEX_V3 | SEED: 9923 | STYLE: ELECTRONIC]" },
  { creator: "DriftCode", title: "Grid Collapse",        audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "Udio",          votes: 4970, genre: "Electronic",  aiPrompt: "[MODEL: NEX_V3 | SEED: 3312 | STYLE: ELECTRONIC]" },
  { creator: "DriftCode", title: "Sine Wave Sermon",     audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "Stable Audio",  votes: 3750, genre: "Electronic",  aiPrompt: "[MODEL: NEX_V3 | SEED: 6678 | STYLE: ELECTRONIC]" },

  // ── HIP-HOP ────────────────────────────────────────────────── 10 tracks
  { creator: "UrbanMesh", title: "Neural Bars",          audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", tool: "Suno",          votes: 8940, genre: "Hip-Hop",     aiPrompt: "[MODEL: NEX_V3 | SEED: 1134 | STYLE: HIP-HOP]" },
  { creator: "UrbanMesh", title: "Algorithm Cypher",     audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "Udio",          votes: 8100, genre: "Hip-Hop",     aiPrompt: "[MODEL: NEX_V3 | SEED: 4456 | STYLE: HIP-HOP]" },
  { creator: "UrbanMesh", title: "Data Hustle",          audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "MusicGen",      votes: 6880, genre: "Hip-Hop",     aiPrompt: "[MODEL: NEX_V3 | SEED: 8812 | STYLE: HIP-HOP]" },
  { creator: "UrbanMesh", title: "Block Chain Anthem",   audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "Suno",          votes: 5610, genre: "Hip-Hop",     aiPrompt: "[MODEL: NEX_V3 | SEED: 2290 | STYLE: HIP-HOP]" },
  { creator: "UrbanMesh", title: "Synthetic Grind",      audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "AudioCraft",    votes: 4440, genre: "Hip-Hop",     aiPrompt: "[MODEL: NEX_V3 | SEED: 7756 | STYLE: HIP-HOP]" },
  { creator: "BassPulse", title: "808 Prophecy",         audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", tool: "Suno",          votes: 9200, genre: "Hip-Hop",     aiPrompt: "[MODEL: NEX_V3 | SEED: 5567 | STYLE: HIP-HOP]" },
  { creator: "BassPulse", title: "Low Frequency State",  audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "Udio",          votes: 8350, genre: "Hip-Hop",     aiPrompt: "[MODEL: NEX_V3 | SEED: 9934 | STYLE: HIP-HOP]" },
  { creator: "BassPulse", title: "Trap Matrix",          audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "MusicGen",      votes: 7020, genre: "Hip-Hop",     aiPrompt: "[MODEL: NEX_V3 | SEED: 3378 | STYLE: HIP-HOP]" },
  { creator: "BassPulse", title: "Bounce Code",          audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "Suno",          votes: 5780, genre: "Hip-Hop",     aiPrompt: "[MODEL: NEX_V3 | SEED: 6645 | STYLE: HIP-HOP]" },
  { creator: "BassPulse", title: "Digital Drip",         audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "AudioCraft",    votes: 4510, genre: "Hip-Hop",     aiPrompt: "[MODEL: NEX_V3 | SEED: 1123 | STYLE: HIP-HOP]" },

  // ── JAZZ FUSION ────────────────────────────────────────────── 10 tracks
  { creator: "FreqShift", title: "Modal Construct",      audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", tool: "MusicGen",      votes: 7890, genre: "Jazz Fusion", aiPrompt: "[MODEL: NEX_V3 | SEED: 4489 | STYLE: JAZZ-FUSION]" },
  { creator: "FreqShift", title: "Altered State Theory", audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "Stable Audio",  votes: 7020, genre: "Jazz Fusion", aiPrompt: "[MODEL: NEX_V3 | SEED: 8801 | STYLE: JAZZ-FUSION]" },
  { creator: "FreqShift", title: "Chord Matrix",         audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "MusicGen",      votes: 6110, genre: "Jazz Fusion", aiPrompt: "[MODEL: NEX_V3 | SEED: 2234 | STYLE: JAZZ-FUSION]" },
  { creator: "FreqShift", title: "Harmonic Drift",       audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "AudioCraft",    votes: 5040, genre: "Jazz Fusion", aiPrompt: "[MODEL: NEX_V3 | SEED: 6678 | STYLE: JAZZ-FUSION]" },
  { creator: "FreqShift", title: "Bebop Algorithm",      audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "Stable Audio",  votes: 3950, genre: "Jazz Fusion", aiPrompt: "[MODEL: NEX_V3 | SEED: 9912 | STYLE: JAZZ-FUSION]" },
  { creator: "JazzNode",  title: "Polyrhythm Engine",    audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", tool: "MusicGen",      votes: 7560, genre: "Jazz Fusion", aiPrompt: "[MODEL: NEX_V3 | SEED: 3345 | STYLE: JAZZ-FUSION]" },
  { creator: "JazzNode",  title: "Diminished Protocol",  audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "Stable Audio",  votes: 6430, genre: "Jazz Fusion", aiPrompt: "[MODEL: NEX_V3 | SEED: 7767 | STYLE: JAZZ-FUSION]" },
  { creator: "JazzNode",  title: "Blue Note Circuit",    audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "AudioCraft",    votes: 5280, genre: "Jazz Fusion", aiPrompt: "[MODEL: NEX_V3 | SEED: 1156 | STYLE: JAZZ-FUSION]" },
  { creator: "JazzNode",  title: "Swing Data",           audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "MusicGen",      votes: 4120, genre: "Jazz Fusion", aiPrompt: "[MODEL: NEX_V3 | SEED: 5523 | STYLE: JAZZ-FUSION]" },
  { creator: "JazzNode",  title: "Upright Voltage",      audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "Stable Audio",  votes: 3010, genre: "Jazz Fusion", aiPrompt: "[MODEL: NEX_V3 | SEED: 8889 | STYLE: JAZZ-FUSION]" },

  // ── AMBIENT ────────────────────────────────────────────────── 10 tracks
  { creator: "AuroraAI",  title: "Liminal Space",        audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", tool: "Stable Audio",  votes: 7340, genre: "Ambient",     aiPrompt: "[MODEL: NEX_V3 | SEED: 4412 | STYLE: AMBIENT]" },
  { creator: "AuroraAI",  title: "Float State",          audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "AudioCraft",    votes: 6580, genre: "Ambient",     aiPrompt: "[MODEL: NEX_V3 | SEED: 8890 | STYLE: AMBIENT]" },
  { creator: "AuroraAI",  title: "Deep Texture One",     audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "Stable Audio",  votes: 5670, genre: "Ambient",     aiPrompt: "[MODEL: NEX_V3 | SEED: 2256 | STYLE: AMBIENT]" },
  { creator: "AuroraAI",  title: "Cloud Architecture",   audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "MusicGen",      votes: 4490, genre: "Ambient",     aiPrompt: "[MODEL: NEX_V3 | SEED: 6634 | STYLE: AMBIENT]" },
  { creator: "AuroraAI",  title: "Void Signal",          audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "AudioCraft",    votes: 3330, genre: "Ambient",     aiPrompt: "[MODEL: NEX_V3 | SEED: 9901 | STYLE: AMBIENT]" },
  { creator: "NovaMind",  title: "Event Horizon",        audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", tool: "Stable Audio",  votes: 7010, genre: "Ambient",     aiPrompt: "[MODEL: NEX_V3 | SEED: 3378 | STYLE: AMBIENT]" },
  { creator: "NovaMind",  title: "Slow Dissolve",        audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "AudioCraft",    votes: 6100, genre: "Ambient",     aiPrompt: "[MODEL: NEX_V3 | SEED: 7745 | STYLE: AMBIENT]" },
  { creator: "NovaMind",  title: "Interstellar Pad",     audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "MusicGen",      votes: 5020, genre: "Ambient",     aiPrompt: "[MODEL: NEX_V3 | SEED: 1189 | STYLE: AMBIENT]" },
  { creator: "NovaMind",  title: "Gradient Horizon",     audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "Stable Audio",  votes: 3870, genre: "Ambient",     aiPrompt: "[MODEL: NEX_V3 | SEED: 5512 | STYLE: AMBIENT]" },
  { creator: "NovaMind",  title: "Zero Gravity Loop",    audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "AudioCraft",    votes: 2760, genre: "Ambient",     aiPrompt: "[MODEL: NEX_V3 | SEED: 8867 | STYLE: AMBIENT]" },

  // ── R&B ────────────────────────────────────────────────────── 10 tracks
  { creator: "SoulForge", title: "Synthetic Soul",       audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", tool: "Suno",          votes: 9100, genre: "R&B",         aiPrompt: "[MODEL: NEX_V3 | SEED: 2245 | STYLE: RNB]" },
  { creator: "SoulForge", title: "Late Night Protocol",  audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "Udio",          votes: 8280, genre: "R&B",         aiPrompt: "[MODEL: NEX_V3 | SEED: 6623 | STYLE: RNB]" },
  { creator: "SoulForge", title: "Silk Circuit",         audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "MusicGen",      votes: 7150, genre: "R&B",         aiPrompt: "[MODEL: NEX_V3 | SEED: 1178 | STYLE: RNB]" },
  { creator: "SoulForge", title: "Slow Frequency",       audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "Suno",          votes: 5940, genre: "R&B",         aiPrompt: "[MODEL: NEX_V3 | SEED: 4456 | STYLE: RNB]" },
  { creator: "SoulForge", title: "Velvet Signal",        audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "AudioCraft",    votes: 4730, genre: "R&B",         aiPrompt: "[MODEL: NEX_V3 | SEED: 8812 | STYLE: RNB]" },
  { creator: "VelvetAI",  title: "Neo Soul 2.0",         audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", tool: "Suno",          votes: 8760, genre: "R&B",         aiPrompt: "[MODEL: NEX_V3 | SEED: 9934 | STYLE: RNB]" },
  { creator: "VelvetAI",  title: "Warm Data",            audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "Udio",          votes: 7600, genre: "R&B",         aiPrompt: "[MODEL: NEX_V3 | SEED: 3367 | STYLE: RNB]" },
  { creator: "VelvetAI",  title: "Midnight Algorithm",   audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "MusicGen",      votes: 6350, genre: "R&B",         aiPrompt: "[MODEL: NEX_V3 | SEED: 7789 | STYLE: RNB]" },
  { creator: "VelvetAI",  title: "Featherweight Signal", audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "Suno",          votes: 5110, genre: "R&B",         aiPrompt: "[MODEL: NEX_V3 | SEED: 2201 | STYLE: RNB]" },
  { creator: "VelvetAI",  title: "Satin Wave",           audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "AudioCraft",    votes: 3890, genre: "R&B",         aiPrompt: "[MODEL: NEX_V3 | SEED: 5578 | STYLE: RNB]" },

  // ── DARK WAVE ──────────────────────────────────────────────── 10 tracks
  { creator: "KryoWave",  title: "Cold Signal",          audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", tool: "Udio",          votes: 8550, genre: "Dark Wave",   aiPrompt: "[MODEL: NEX_V3 | SEED: 6690 | STYLE: DARK-WAVE]" },
  { creator: "KryoWave",  title: "Frost Protocol",       audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "Stable Audio",  votes: 7680, genre: "Dark Wave",   aiPrompt: "[MODEL: NEX_V3 | SEED: 1123 | STYLE: DARK-WAVE]" },
  { creator: "KryoWave",  title: "Void Architecture",    audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "AudioCraft",    votes: 6490, genre: "Dark Wave",   aiPrompt: "[MODEL: NEX_V3 | SEED: 4489 | STYLE: DARK-WAVE]" },
  { creator: "KryoWave",  title: "Obsidian Frequency",   audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "Udio",          votes: 5220, genre: "Dark Wave",   aiPrompt: "[MODEL: NEX_V3 | SEED: 8856 | STYLE: DARK-WAVE]" },
  { creator: "KryoWave",  title: "Permafrost",           audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "Stable Audio",  votes: 4010, genre: "Dark Wave",   aiPrompt: "[MODEL: NEX_V3 | SEED: 2267 | STYLE: DARK-WAVE]" },
  { creator: "NightCraft",title: "Shadow Lattice",       audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", tool: "AudioCraft",    votes: 8190, genre: "Dark Wave",   aiPrompt: "[MODEL: NEX_V3 | SEED: 7712 | STYLE: DARK-WAVE]" },
  { creator: "NightCraft",title: "Underneath the Grid",  audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "Udio",          votes: 7040, genre: "Dark Wave",   aiPrompt: "[MODEL: NEX_V3 | SEED: 3334 | STYLE: DARK-WAVE]" },
  { creator: "NightCraft",title: "Black Noise",          audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "Stable Audio",  votes: 5820, genre: "Dark Wave",   aiPrompt: "[MODEL: NEX_V3 | SEED: 9956 | STYLE: DARK-WAVE]" },
  { creator: "NightCraft",title: "Crypt Frequency",      audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "AudioCraft",    votes: 4580, genre: "Dark Wave",   aiPrompt: "[MODEL: NEX_V3 | SEED: 5501 | STYLE: DARK-WAVE]" },
  { creator: "NightCraft",title: "Dusk Oscillator",      audioUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mvUrl: null,                                          tool: "Udio",          votes: 3370, genre: "Dark Wave",   aiPrompt: "[MODEL: NEX_V3 | SEED: 1145 | STYLE: DARK-WAVE]" },

];
```

---

**Summary:**
| Genre | Creator A | Creator B | Tracks |
|---|---|---|---|
| Synth-pop | COBALT | SynthLab | 10 |
| Funk | PulseAI | VoltFunk | 10 |
| Rock | NeonCore | ChromeRiff | 10 |
| K-pop | HannaH | StarForge | 10 |
| Electronic | BeatForge | DriftCode | 10 |
| Hip-Hop | UrbanMesh | BassPulse | 10 |
| Jazz Fusion | FreqShift | JazzNode | 10 |
| Ambient | AuroraAI | NovaMind | 10 |
| R&B | SoulForge | VelvetAI | 10 |
| Dark Wave | KryoWave | NightCraft | 10 |
| **Total** | | | **100** |
