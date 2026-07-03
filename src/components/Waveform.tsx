import { useEffect, useRef } from "react";

const BAR_COUNT = 36;
const BAR_WIDTH = 3;
const GAP = 3;
const MIN_BAR = 3;

/**
 * Canvas waveform — symmetric white bars driven by an AnalyserNode.
 * Renders at devicePixelRatio and animates via rAF for a stable 60fps.
 * Bar heights are lerped toward their targets each frame so the motion
 * reads organic rather than jittery.
 */
export function Waveform({ analyser }: { analyser: AnalyserNode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = BAR_COUNT * (BAR_WIDTH + GAP) - GAP;
    const height = 44;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    const freq = new Uint8Array(analyser.frequencyBinCount);
    const heights = new Float32Array(BAR_COUNT).fill(MIN_BAR);
    let raf = 0;

    const draw = () => {
      analyser.getByteFrequencyData(freq);
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < BAR_COUNT; i++) {
        // Sample lower ~70% of the spectrum where voice energy lives
        const bin = Math.floor((i / BAR_COUNT) * freq.length * 0.7);
        const target = MIN_BAR + (freq[bin] / 255) * (height - MIN_BAR);
        heights[i] += (target - heights[i]) * 0.35;

        const h = heights[i];
        const x = i * (BAR_WIDTH + GAP);
        const y = (height - h) / 2;

        // Center bars glow brighter; edges fall off
        const falloff = 1 - Math.abs(i - BAR_COUNT / 2) / (BAR_COUNT / 2);
        ctx.fillStyle = `rgba(250, 250, 250, ${0.35 + falloff * 0.65})`;
        ctx.beginPath();
        ctx.roundRect(x, y, BAR_WIDTH, h, BAR_WIDTH / 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [analyser]);

  return <canvas ref={canvasRef} aria-hidden />;
}
