# Whisper Flow (clone)

Ultra-minimal voice-to-text widget. Monochrome dark UI, one-click recording,
live transcription, glassmorphic settings.

## Run

```bash
npm install
npm run dev
```

Open the printed URL in **Chrome/Edge/Safari** (live transcription uses the
Web Speech API; Firefox has no support and falls back to waveform-only).

## Shortcuts

Web app (window-level):

- `⌥ Space` — toggle recording
- `⌥ L` — switch transcription language English ↔ Arabic (works mid-recording)
- `Esc` — stop

Native menu-bar app (OS-global, build with `native/build.sh`):

- `⌃⌥ Space` — start/stop dictation (text lands in the focused field)
- `⌥ L` — switch language English ↔ Arabic (works mid-dictation)
- `Esc` — cancel dictation, discard text (only captured while dictating)

## Architecture

```
src/
├── App.tsx                     # widget layout + state wiring
├── hooks/
│   ├── useRecorder.ts          # getUserMedia + AnalyserNode + SpeechRecognition
│   └── useHotkey.ts            # ⌥Space / Esc bindings
└── components/
    ├── RecordButton.tsx        # circle ↔ squircle morph (framer-motion springs)
    ├── Waveform.tsx            # 60fps canvas bars, dpr-aware, lerped heights
    ├── TranscriptView.tsx      # streamed text + interim ghost + copy button
    └── SettingsPanel.tsx       # glass dropdown: device / language / prompts
```

## Arabic / RTL

Arabic (Saudi, Egyptian, Moroccan locales) is selectable in Settings → Language.
The transcript pane uses `dir="auto"`, so Arabic (and any RTL script) renders
right-to-left automatically. Note: the Web Speech API can't auto-detect the
spoken language mid-stream — pick the language before recording.

## Notes

- Transcription: browser `SpeechRecognition` with `interimResults` for the
  streamed preview; auto-restarts on Chrome's silence timeout. Swap in a
  whisper.cpp/OpenAI-Whisper backend by feeding `MediaRecorder` chunks to a
  server — the UI contract (`transcript` + `interim`) stays the same.
- True OS-global hotkey + always-on-top floating window need a native shell:
  wrap with **Tauri** (`globalShortcut` plugin, `alwaysOnTop: true`,
  `decorations: false`) — the web UI drops in unchanged.
