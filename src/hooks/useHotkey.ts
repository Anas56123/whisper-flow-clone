import { useEffect, useRef } from "react";

/**
 * Window-level shortcuts: ⌥/Alt+Space toggles recording, ⌥/Alt+L switches
 * transcription language, Escape stops.
 * (True OS-global capture requires a Tauri/Electron shell — see README.)
 */
export function useHotkey(
  onToggle: () => void,
  onEscape: () => void,
  onLanguage: () => void
) {
  const toggleRef = useRef(onToggle);
  const escapeRef = useRef(onEscape);
  const languageRef = useRef(onLanguage);
  toggleRef.current = onToggle;
  escapeRef.current = onEscape;
  languageRef.current = onLanguage;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.altKey && e.code === "Space") {
        e.preventDefault();
        toggleRef.current();
      } else if (e.altKey && e.code === "KeyL") {
        e.preventDefault();
        languageRef.current();
      } else if (e.code === "Escape") {
        escapeRef.current();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}
