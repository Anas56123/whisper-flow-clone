import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

function CopyIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="9" width="12" height="12" rx="2.5" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function TranscriptView({
  transcript,
  interim,
  recording,
  onClear,
}: {
  transcript: string;
  interim: string;
  recording: boolean;
  onClear: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const empty = !transcript && !interim;

  // Follow the tail as new text streams in
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [transcript, interim]);

  const copy = async () => {
    await navigator.clipboard.writeText(transcript.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="rounded-xl border border-neutral-800 bg-[#0e0e10]">
      <div className="flex items-center justify-between border-b border-neutral-800/70 px-3 py-1.5">
        <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#71717A]">
          Transcript
        </span>
        <div className="flex items-center gap-1">
          <AnimatePresence>
            {!empty && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={onClear}
                className="rounded-md px-1.5 py-1 text-[10px] text-[#71717A] transition-colors hover:bg-neutral-800/60 hover:text-neutral-300"
              >
                Clear
              </motion.button>
            )}
          </AnimatePresence>
          <button
            onClick={copy}
            disabled={empty}
            aria-label="Copy to clipboard"
            className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] text-[#71717A] transition-colors enabled:hover:bg-neutral-800/60 enabled:hover:text-neutral-100 disabled:opacity-40"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={copied ? "check" : "copy"}
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
                transition={{ duration: 0.12 }}
                className={copied ? "text-emerald-400" : undefined}
              >
                {copied ? <CheckIcon /> : <CopyIcon />}
              </motion.span>
            </AnimatePresence>
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="scroll-slim h-[104px] overflow-y-auto px-3 py-2.5 text-[13px] leading-relaxed"
      >
        {empty ? (
          <p className="text-[#71717A]">
            {recording ? "Listening…" : "Your words will appear here."}
          </p>
        ) : (
          // dir="auto" flips to RTL from the first strong character (Arabic, Hebrew…)
          <p dir="auto" className="whitespace-pre-wrap text-neutral-100">
            {transcript}
            {interim && <span className="text-[#71717A]"> {interim}</span>}
            {recording && (
              <motion.span
                className="ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 rounded-full bg-neutral-100"
                animate={{ opacity: [1, 0.15, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            )}
          </p>
        )}
      </div>
    </div>
  );
}
