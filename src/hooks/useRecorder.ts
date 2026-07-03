import { useCallback, useEffect, useRef, useState } from "react";

export type RecorderState = "idle" | "recording" | "denied";

/* Minimal Web Speech API typings (not in lib.dom for all TS versions) */
interface SpeechRecognitionResultEvent extends Event {
  resultIndex: number;
  results: {
    length: number;
    [i: number]: { isFinal: boolean; 0: { transcript: string } };
  };
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: SpeechRecognitionResultEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
}
declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

export interface Recorder {
  state: RecorderState;
  /** Finalized transcript segments */
  transcript: string;
  /** Low-latency interim hypothesis, rendered dimmer */
  interim: string;
  /** Live analyser for waveform rendering; null while idle */
  analyser: AnalyserNode | null;
  elapsed: number;
  toggle: () => void;
  stop: () => void;
  clear: () => void;
}

export function useRecorder(deviceId: string, language: string): Recorder {
  const [state, setState] = useState<RecorderState>("idle");
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const timerRef = useRef<number | null>(null);
  const recordingRef = useRef(false);

  const teardown = useCallback(() => {
    recordingRef.current = false;
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.onresult = null;
      try {
        recognitionRef.current.stop();
      } catch {
        /* already stopped */
      }
      recognitionRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    void audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    setAnalyser(null);
    setInterim("");
  }, []);

  const stop = useCallback(() => {
    teardown();
    setState("idle");
  }, [teardown]);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: deviceId ? { deviceId: { exact: deviceId } } : true,
      });
      streamRef.current = stream;
      recordingRef.current = true;

      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const node = ctx.createAnalyser();
      node.fftSize = 256;
      node.smoothingTimeConstant = 0.75;
      source.connect(node);
      setAnalyser(node);

      const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
      if (Ctor) {
        const rec = new Ctor();
        rec.lang = language;
        rec.continuous = true;
        rec.interimResults = true;
        rec.onresult = (e) => {
          let finals = "";
          let hypothesis = "";
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const r = e.results[i];
            if (r.isFinal) finals += r[0].transcript;
            else hypothesis += r[0].transcript;
          }
          if (finals) setTranscript((prev) => (prev + finals).trimStart());
          setInterim(hypothesis);
        };
        // Chrome ends recognition after silence — restart while recording
        rec.onend = () => {
          if (recordingRef.current) {
            try {
              rec.start();
            } catch {
              /* race with teardown */
            }
          }
        };
        rec.onerror = () => {};
        rec.start();
        recognitionRef.current = rec;
      }

      setElapsed(0);
      timerRef.current = window.setInterval(
        () => setElapsed((s) => s + 1),
        1000
      );
      setState("recording");
    } catch {
      teardown();
      setState("denied");
    }
  }, [deviceId, language, teardown]);

  const toggle = useCallback(() => {
    if (recordingRef.current) stop();
    else void start();
  }, [start, stop]);

  const clear = useCallback(() => {
    setTranscript("");
    setInterim("");
  }, []);

  useEffect(() => teardown, [teardown]);

  return { state, transcript, interim, analyser, elapsed, toggle, stop, clear };
}
