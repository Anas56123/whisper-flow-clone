import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export interface Settings {
  deviceId: string;
  language: string;
  prompt: string;
}

export const LANGUAGES = [
  { value: "en-US", label: "English (US)" },
  { value: "en-GB", label: "English (UK)" },
  { value: "de-DE", label: "Deutsch" },
  { value: "es-ES", label: "Español" },
  { value: "ar-SA", label: "العربية (السعودية)" },
  { value: "ar-EG", label: "العربية (مصر)" },
  { value: "ar-MA", label: "العربية (المغرب)" },
  { value: "ja-JP", label: "日本語" },
];

export const PROMPTS = [
  { value: "none", label: "None" },
  { value: "email", label: "✉️ Draft email" },
  { value: "notes", label: "📝 Meeting notes" },
  { value: "todo", label: "☑︎ To-do list" },
];

function GearIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-medium uppercase tracking-[0.14em] text-[#71717A]">
        {label}
      </span>
      {children}
    </label>
  );
}

const selectClass =
  "flow-select w-full rounded-lg border border-neutral-800 bg-[#0e0e10] px-2.5 py-1.5 pr-7 text-[12px] text-neutral-100 outline-none transition-colors hover:border-neutral-700 focus:border-neutral-600";

/**
 * Gear trigger + glassmorphic dropdown. The panel floats over the widget
 * (backdrop-blur over a translucent card) and springs from the trigger corner.
 */
export function SettingsPanel({
  settings,
  onChange,
}: {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  // Enumerate mics when opened (labels populate after mic permission is granted)
  useEffect(() => {
    if (!open) return;
    navigator.mediaDevices
      .enumerateDevices()
      .then((all) => setDevices(all.filter((d) => d.kind === "audioinput")))
      .catch(() => {});
  }, [open]);

  // Dismiss on outside click
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [open]);

  return (
    <div className="relative" ref={panelRef}>
      <motion.button
        onClick={() => setOpen((v) => !v)}
        aria-label="Settings"
        aria-expanded={open}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-[#71717A] transition-colors hover:bg-neutral-800/60 hover:text-neutral-200"
        animate={{ rotate: open ? 40 : 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <GearIcon />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            style={{ transformOrigin: "top right" }}
            className="absolute right-0 top-9 z-50 w-60 rounded-xl border border-neutral-800 bg-[#121214]/80 p-3 shadow-2xl shadow-black/60 backdrop-blur-xl"
          >
            <div className="space-y-3">
              <Field label="Input device">
                <select
                  className={selectClass}
                  value={settings.deviceId}
                  onChange={(e) => onChange({ deviceId: e.target.value })}
                >
                  <option value="">System default</option>
                  {devices.map((d, i) => (
                    <option key={d.deviceId || i} value={d.deviceId}>
                      {d.label || `Microphone ${i + 1}`}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Language">
                <select
                  className={selectClass}
                  value={settings.language}
                  onChange={(e) => onChange({ language: e.target.value })}
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Prompt shortcut">
                <select
                  className={selectClass}
                  value={settings.prompt}
                  onChange={(e) => onChange({ prompt: e.target.value })}
                >
                  {PROMPTS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
