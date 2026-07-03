import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRecorder } from "./hooks/useRecorder";
import { useHotkey } from "./hooks/useHotkey";
import { RecordButton } from "./components/RecordButton";
import { Waveform } from "./components/Waveform";
import { TranscriptView } from "./components/TranscriptView";
import { SettingsPanel, type Settings } from "./components/SettingsPanel";

function formatTime(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function App() {
  const [settings, setSettings] = useState<Settings>({
    deviceId: "",
    language: "en-US",
    prompt: "none",
  });
  const rec = useRecorder(settings.deviceId, settings.language);
  const recording = rec.state === "recording";

  useHotkey(rec.toggle, rec.stop);

  return (
    <div className="flex h-full items-center justify-center bg-[#0b0b0c]">
      {/* Floating widget — fixed compact footprint */}
      <motion.main
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
        className="w-[340px] rounded-2xl border border-neutral-800 bg-[#121214] p-4 shadow-[0_24px_64px_-16px_rgba(0,0,0,0.9)]"
      >
        {/* Header */}
        <header className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`h-1.5 w-1.5 rounded-full transition-colors duration-300 ${
                recording ? "bg-red-500" : "bg-neutral-600"
              }`}
            />
            <h1 className="text-[13px] font-semibold tracking-tight">
              Whisper Flow
            </h1>
          </div>
          <SettingsPanel
            settings={settings}
            onChange={(patch) => setSettings((s) => ({ ...s, ...patch }))}
          />
        </header>

        {/* Stage: waveform while recording, hint while idle */}
        <div className="mb-3 flex h-[44px] items-center justify-center overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            {recording && rec.analyser ? (
              <motion.div
                key="wave"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-3"
              >
                <Waveform analyser={rec.analyser} />
                <span className="text-[11px] tabular-nums text-[#71717A]">
                  {formatTime(rec.elapsed)}
                </span>
              </motion.div>
            ) : (
              <motion.span
                key="hint"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="text-[12px] text-[#71717A]"
              >
                {rec.state === "denied"
                  ? "Microphone access denied — check permissions."
                  : "Click to record"}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Record toggle */}
        <div className="mb-4 flex justify-center">
          <RecordButton recording={recording} onClick={rec.toggle} />
        </div>

        <TranscriptView
          transcript={rec.transcript}
          interim={rec.interim}
          recording={recording}
          onClear={rec.clear}
        />

        {/* Footer hint */}
        <footer className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-[#71717A]">
          <kbd className="rounded-md border border-neutral-800 bg-[#0e0e10] px-1.5 py-0.5 font-sans">
            ⌥
          </kbd>
          <kbd className="rounded-md border border-neutral-800 bg-[#0e0e10] px-1.5 py-0.5 font-sans">
            Space
          </kbd>
          <span>to toggle · Esc to stop</span>
        </footer>
      </motion.main>
    </div>
  );
}
