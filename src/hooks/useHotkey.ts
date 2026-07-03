import { useEffect, useRef } from "react";

/**
 * Window-level shortcuts: ⌥/Alt+Space toggles recording, Escape stops.
 * (True OS-global capture requires a Tauri/Electron shell — see README.)
 */
export function useHotkey(onToggle: () => void, onEscape: () => void) {
  const toggleRef = useRef(onToggle);
  const escapeRef = useRef(onEscape);
  toggleRef.current = onToggle;
  escapeRef.current = onEscape;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.altKey && e.code === "Space") {
        e.preventDefault();
        toggleRef.current();
      } else if (e.code === "Escape") {
        escapeRef.current();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}
