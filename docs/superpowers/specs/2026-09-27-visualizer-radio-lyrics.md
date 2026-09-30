# Audio Visualizer, Song Radio & Lyrics Timing Offset Specification

This specification defines the architecture, user experience, and technical requirements for three core features:
1. Real-time Audio Frequency Visualizer in the Expanded Player.
2. Instant Song Radio station generation.
3. Lyrics timing synchronization offset adjustment.

---

## 1. Real-Time Audio Frequency Visualizer

### Objective
Provide an immersive visual spectrum display synchronized with audio playback inside the Expanded Player without degrading performance or causing audio stuttering.

### Architecture
- **Web Audio Node Pipeline**:
  - `AudioContext` singleton initialized in `AudioManager.tsx`.
  - HTMLAudioElement connected via `createMediaElementSource` (strictly executed once).
  - Audio routed through peaking EQ filter chain $\rightarrow$ `AnalyserNode` with `fftSize = 64` and `smoothingTimeConstant = 0.8` $\rightarrow$ `ctx.destination`.
- **CORS Handling**:
  - `<audio>` elements configured with `crossOrigin="anonymous"` to allow reading frequency byte arrays from JioSaavn CDN streams.
- **Rendering & Animation**:
  - `<VisualizerCanvas />` mounted in `ExpandedPlayer.tsx`.
  - Uses `requestAnimationFrame` loop to sample `analyser.getByteFrequencyData()`.
  - Renders 32 vertical bars with rounded top corners and gradient fills (`#ff4e45` to `#ff0000`).
  - Graceful fallback: If Web Audio is suspended or unattached, renders a simulated organic sine wave to maintain an alive UI.
  - Proper unmount cleanup: Cancels animation frames to prevent memory leaks.

---

## 2. Instant Song Radio Generator

### Objective
Allow listeners to immediately spin up an endless, context-aware radio mix seeded from any song in the catalog.

### User Flow
1. User right-clicks any song card/row or clicks the "Start radio" button in the Expanded Player `UpNextPanel`.
2. A status toast confirms: `Starting radio for "[Song Title]"…`.
3. The client queries `/api/search?recommendSongId=${song.id}&artist=${song.artist}&lang=${song.language}`.
4. The seed song is placed at index 0 of the new queue followed by novel recommended songs.
5. The queue is updated via `usePlayerStore.getState().playSong(song, radioQueue, 0)`.
6. Autoplay is automatically enabled in `settings.store.ts` so playback never terminates.
7. Toast confirms: `Radio playing • ${radioQueue.length} tracks queued`.

---

## 3. Lyrics Timing Offset Adjustment

### Objective
Compensate for minor latency or timing discrepancies in community-submitted LRCLIB synced lyrics (.lrc).

### Architecture & Controls
- **State**:
  - `lyricsOffset` (in seconds, default `0.0`) stored in `settings.store.ts` with `setLyricsOffset`.
- **Sync Logic**:
  - `effectiveProgress = Math.max(0, Number((progress + lyricsOffset).toFixed(3)))`.
  - Active line index is evaluated against `effectiveProgress`.
- **User Interface**:
  - Rendered at the top of the synced lyrics view in `LyricsPanel.tsx`.
  - `[-0.5s]` button: Delays active line highlighting by 0.5 seconds.
  - `[+0.5s]` button: Advances active line highlighting by 0.5 seconds.
  - `[Reset]` button: Instantly restores offset to `0.0s`.
  - Feedback toast reports active offset value.
