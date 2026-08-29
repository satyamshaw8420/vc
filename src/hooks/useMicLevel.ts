import { useEffect, useState } from "react";

/** Live microphone level (0..1) from a MediaStream via AnalyserNode. */
export function useMicLevel(stream: MediaStream | null, enabled = true): number {
  const [level, setLevel] = useState(0);

  useEffect(() => {
    if (!stream || !enabled) {
      setLevel(0);
      return;
    }
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      setLevel(0);
      return;
    }
    let ctx: AudioContext | null = null;
    let raf = 0;
    try {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.7;
      src.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / data.length);
        setLevel((prev) => Math.min(1, prev * 0.55 + Math.min(1, rms * 3.2) * 0.45));
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    } catch {
      setLevel(0);
    }
    return () => {
      cancelAnimationFrame(raf);
      ctx?.close().catch(() => undefined);
    };
  }, [stream, enabled]);

  return level;
}
