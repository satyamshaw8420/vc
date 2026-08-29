import { useEffect, useRef, useState } from "react";
import { Eye, Loader2, ShieldCheck, Square } from "lucide-react";
import { createFaceMonitor } from "../services/proctorService";
import type { FaceMonitor, FocusSignals, MonitorStatus } from "../services/proctorService";
import { Button, ProgressBar } from "./ui";

/**
 * Proctoring hook — on-device face analysis via MediaPipe.
 * Frames never leave the browser; only scalar signals are shown.
 */
export function FocusMonitor() {
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<MonitorStatus | "idle">("idle");
  const [error, setError] = useState<string | null>(null);
  const [signals, setSignals] = useState<FocusSignals>({
    presence: 0,
    gazeStability: 0,
    headMovement: 0,
    fps: 0,
  });
  const videoRef = useRef<HTMLVideoElement>(null);
  const monitorRef = useRef<FaceMonitor | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopAll = () => {
    monitorRef.current?.stop();
    monitorRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus("idle");
  };

  useEffect(() => () => stopAll(), []);

  const start = async () => {
    setError(null);
    setStatus("loading");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 480, height: 360 },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play().catch(() => undefined);
      const monitor = createFaceMonitor(
        video,
        setSignals,
        (s, msg) => {
          setStatus(s);
          if (s === "error") setError(msg ?? "Model load failed");
        },
      );
      monitorRef.current = monitor;
      await monitor.start();
    } catch {
      setStatus("idle");
      setError("Camera access nahi mila — permission check karo.");
    }
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
      <div className="flex items-center gap-2">
        <span className="grid place-items-center h-8 w-8 rounded-lg border border-accent/30 bg-accent-soft text-accent-ink">
          <Eye size={15} />
        </span>
        <div>
          <p className="text-[13px] font-bold text-ink leading-none">Focus monitor</p>
          <p className="mt-1 text-[10.5px] text-faint">Proctoring hook · on-device only</p>
        </div>
      </div>

      {!consent ? (
        <div className="rounded-xl border border-line bg-surface-2 p-4">
          <p className="text-xs text-muted leading-relaxed">
            Focus monitor camera se <span className="font-bold text-ink">sirf aapke device par</span>{" "}
            face landmarks analyze karta hai — presence, gaze stability aur head movement.
            Video frames kabhi store ya upload <span className="font-bold text-ink">nahi</span> hote.
          </p>
          <label className="mt-3.5 flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[var(--accent)] cursor-pointer"
            />
            <span className="text-xs font-semibold text-ink leading-snug">
              Mujhe samajh aa gaya — mera video on-device hi rahega
            </span>
          </label>
          <Button variant="primary" size="sm" className="mt-3.5 w-full" disabled={!consent} onClick={start}>
            <ShieldCheck size={14} />
            Consent hai — monitor start karo
          </Button>
        </div>
      ) : (
        <>
          {/* on-device preview */}
          <div className="relative rounded-xl overflow-hidden border border-line bg-surface-2">
            <video ref={videoRef} muted playsInline className="w-full aspect-[4/3] object-cover" />
            <span className="absolute top-2 left-2 rounded bg-black/55 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-white backdrop-blur-sm">
              {status === "running" ? `analyzing · ${signals.fps} fps` : status === "loading" ? "loading model…" : "preview"}
            </span>
          </div>

          {status === "loading" && (
            <p className="flex items-center gap-2 text-xs font-semibold text-muted">
              <Loader2 size={13} className="animate-spin text-accent" />
              FaceLandmarker model CDN se load ho raha hai…
            </p>
          )}
          {status === "error" && (
            <div className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2.5 text-[11px] font-semibold text-danger leading-relaxed">
              {error ?? "Model load nahi hua"}
            </div>
          )}

          {status === "running" && (
            <div className="space-y-3">
              <SignalBar label="Presence" hint="face in frame" value={signals.presence} tone="cyan" />
              <SignalBar label="Gaze stability" hint="screen-facing proxy" value={signals.gazeStability} tone="lime" />
              <SignalBar label="Head movement" hint="restlessness" value={signals.headMovement} tone="warn" />
            </div>
          )}

          <Button variant="secondary" size="sm" className="w-full" onClick={stopAll}>
            <Square size={13} />
            Stop monitor
          </Button>
          <p className="text-[10.5px] text-faint leading-relaxed">
            Signals placeholder heuristics hain — production mein yahan trained attention model
            plug hoga (same interface, <span className="font-mono">createFaceMonitor()</span>).
          </p>
        </>
      )}
    </div>
  );
}

function SignalBar({
  label,
  hint,
  value,
  tone,
}: {
  label: string;
  hint: string;
  value: number;
  tone: "cyan" | "lime" | "warn";
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-[11px] font-bold text-ink">
          {label} <span className="text-faint font-semibold">· {hint}</span>
        </span>
        <span className="font-mono text-xs font-bold text-ink tabular-nums">{value}%</span>
      </div>
      <ProgressBar value={value} tone={tone} label={`${label}: ${value}%`} />
    </div>
  );
}
