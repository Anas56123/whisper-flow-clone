import { motion } from "framer-motion";

const spring = { type: "spring", stiffness: 320, damping: 24 } as const;

function MicIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10v1a7 7 0 0 0 14 0v-1" />
      <path d="M12 18v4" />
    </svg>
  );
}

/**
 * Morphing record toggle.
 * Idle: 56px circle with mic glyph.
 * Recording: melts into a 72×44 squircle with a pulsing dot —
 * borderRadius + size are spring-animated so the shape change feels organic.
 */
export function RecordButton({
  recording,
  onClick,
}: {
  recording: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      aria-label={recording ? "Stop recording" : "Start recording"}
      aria-pressed={recording}
      className="relative flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-neutral-500"
      initial={false}
      animate={{
        width: recording ? 72 : 56,
        height: recording ? 44 : 56,
        borderRadius: recording ? 16 : 28,
        backgroundColor: recording ? "#fafafa" : "#1c1c1f",
        border: recording ? "1px solid #fafafa" : "1px solid #27272a",
      }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.92 }}
      transition={spring}
    >
      {/* Ambient glow ring while recording */}
      <motion.span
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        animate={{
          boxShadow: recording
            ? "0 0 0 6px rgba(250,250,250,0.06), 0 0 32px rgba(250,250,250,0.18)"
            : "0 0 0 0px rgba(250,250,250,0), 0 0 0px rgba(250,250,250,0)",
        }}
        transition={{ duration: 0.4 }}
      />
      {recording ? (
        <motion.span
          key="dot"
          className="block h-3 w-3 rounded-[4px] bg-red-500"
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{
            scale: [1, 1.25, 1],
            opacity: [1, 0.7, 1],
          }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
        />
      ) : (
        <motion.span
          key="mic"
          className="text-neutral-50"
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={spring}
        >
          <MicIcon />
        </motion.span>
      )}
    </motion.button>
  );
}
