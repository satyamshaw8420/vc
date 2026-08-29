import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Camera, CameraOff, CheckCircle2, Loader2, Mic, RefreshCw, VideoOff } from "lucide-react";
import { useMicLevel } from "../hooks/useMicLevel";
import { StatusDot } from "./ui";

export type DeviceState = "requesting" | "ready" | "ready-no-cam" | "denied" | "unavailable";

export interface DeviceReport {
  state: DeviceState;
  camDenied: boolean;
  micDenied: boolean;
}

/**
 * Pre-join hardware check: local camera preview + live mic level + retryable
 * permission checklist. Streams are released before the room joins.
 */
export function DevicePreview({
  displayName,
  onReport,
  retrySignal,
}: {
  displayName: string;
  onReport: (r: DeviceReport) => void;
  retrySignal: number;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [state, setState] = useState<DeviceState>("requesting");
  const [camDenied, setCamDenied] = useState(false);
  const [micDenied, setMicDenied] = useState(false);
  const reduce = useReducedMotion();
  const level = useMicLevel(stream, state === "ready");

  useEffect(() => {
    let cancelled = false;
    let acquired: MediaStream | null = null;
    setState("requesting");

    const acquire = async () => {
      try {
        acquired = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (cancelled) {
          acquired.getTracks().forEach((t) => t.stop());
          return;
        }
        setStream(acquired);
        setState("ready");
        setCamDenied(false);
        setMicDenied(false);
      } catch (err) {
        const name = (err as DOMException)?.name;
        if (name === "NotAllowedError" || name === "SecurityError") {
          // Retry audio-only so the mic checklist can still pass
          try {
            acquired = await navigator.mediaDevices.getUserMedia({ audio: true });
            if (cancelled) {
              acquired.getTracks().forEach((t) => t.stop());
              return;
            }
            setStream(acquired);
            setState("ready-no-cam");
            setCamDenied(true);
            setMicDenied(false);
          } catch {
            if (!cancelled) {
              setStream(null);
              setState("denied");
              setCamDenied(true);
              setMicDenied(true);
            }
          }
        } else if (name === "NotFoundError" || name === "OverconstrainedError") {
          if (!cancelled) {
            setStream(null);
            setState("unavailable");
          }
        } else {
          if (!cancelled) {
            setStream(null);
            setState("denied");
            setCamDenied(true);
            setMicDenied(true);
          }
        }
      }
    };

    acquire();
    return () => {
      cancelled = true;
      acquired?.getTracks().forEach((t) => t.stop());
    };
  }, [retrySignal]);

  useEffect(() => {
    const video = videoRef.current;
    if (video && stream) {
      video.srcObject = stream;
      video.play().catch(() => undefined);
    }
  }, [stream]);

  useEffect(() => {
    onReport({ state, camDenied, micDenied });
  }, [state, camDenied, micDenied, onReport]);

  const camState =
    state === "ready" ? "ok" : state === "ready-no-cam" || state === "unavailable" ? "danger" : camDenied ? "danger" : "muted";
  const micState = state === "denied" || micDenied ? "danger" : stream?.getAudioTracks().length ? "ok" : "muted";

  return (
    <div className="grid gap-5">
      {/* preview tile */}
      <div className="relative aspect-video overflow-hidden rounded-xl border border-line bg-surface-2">
        <video
          ref={videoRef}
          muted
          playsInline
          autoPlay
          className="h-full w-full object-cover [transform:scaleX(-1)]"
        />
        {state !== "ready" && (
          <div className="absolute inset-0 grid place-items-center bg-surface-2">
            <div className="text-center">
              {state === "requesting" ? (
                <>
                  <Loader2 size={26} className="animate-spin text-accent mx-auto" />
                  <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
                    Requesting devices…
                  </p>
                </>
              ) : camDenied || state === "unavailable" ? (
                <>
                  <VideoOff size={26} className="text-danger mx-auto" />
                  <p className="mt-3 text-sm font-bold text-ink">Camera {state === "unavailable" ? "not found" : "blocked"}</p>
                  <p className="mt-1 text-xs text-muted max-w-[260px] mx-auto leading-relaxed">
                    {state === "unavailable"
                      ? "Koi camera device nahi mila — audio-only join kar sakte ho."
                      : "Browser ke address-bar camera icon se permission allow karo, phir Retry dabao."}
                  </p>
                </>
              ) : null}
            </div>
          </div>
        )}
        {/* overlays */}
        <div className="absolute left-3 top-3 flex items-center gap-2">
          <span className="rounded-md bg-black/55 px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-sm">
            Preview · mirror
          </span>
        </div>
        <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-md bg-black/55 px-2.5 py-1.5 backdrop-blur-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-accent2" />
          <span className="text-xs font-bold text-white">{displayName || "You"}</span>
        </div>
        {/* mic meter */}
        <div className="absolute bottom-3 right-3 flex items-center gap-2 rounded-md bg-black/55 px-2.5 py-1.5 backdrop-blur-sm">
          <Mic size={13} className={level > 0.06 ? "text-accent2" : "text-white/60"} />
          <div className="flex items-end gap-[3px] h-4" aria-hidden="true">
            {[0.12, 0.32, 0.55, 0.8, 1].map((th, i) => (
              <motion.span
                key={i}
                animate={{ scaleY: level >= th ? 1 : 0.3, opacity: level >= th ? 1 : 0.4 }}
                transition={{ duration: reduce ? 0 : 0.12 }}
                className="w-[3px] h-4 rounded-sm bg-accent2 origin-bottom"
              />
            ))}
          </div>
        </div>
      </div>

      {/* checklist */}
      <ul className="space-y-2.5">
        <CheckRow
          icon={camDenied || state === "unavailable" ? <CameraOff size={15} /> : <Camera size={15} />}
          label="Camera"
          state={camState}
          stateLabel={
            state === "requesting" ? "asking…" : camState === "ok" ? "live preview" : camDenied ? "permission denied" : state === "unavailable" ? "no device" : "idle"
          }
        />
        <CheckRow
          icon={<Mic size={15} />}
          label="Microphone"
          state={micState}
          stateLabel={state === "requesting" ? "asking…" : micState === "ok" ? (level > 0.05 ? "level good" : "live — bolo kuch") : micDenied ? "permission denied" : "idle"}
        />
        <CheckRow
          icon={<CheckCircle2 size={15} />}
          label="Identity"
          state={displayName.trim().length >= 2 ? "ok" : "warn"}
          stateLabel={displayName.trim() || "name missing"}
        />
      </ul>
    </div>
  );
}

function CheckRow({
  icon,
  label,
  state,
  stateLabel,
}: {
  icon: React.ReactNode;
  label: string;
  state: "ok" | "danger" | "warn" | "muted";
  stateLabel: string;
}) {
  return (
    <li className="flex items-center justify-between rounded-lg border border-line bg-surface px-3.5 py-2.5">
      <span className="flex items-center gap-2.5 text-[13px] font-bold text-ink">
        <span className={`h-7 w-7 grid place-items-center rounded-lg border ${
          state === "ok" ? "border-ok/30 bg-ok/10 text-ok" : state === "danger" ? "border-danger/30 bg-danger-soft text-danger" : state === "warn" ? "border-warn/30 bg-warn/10 text-warn" : "border-line bg-surface-2 text-muted"
        }`}>
          {icon}
        </span>
        {label}
      </span>
      <span className="flex items-center gap-2 text-xs font-semibold text-muted">
        <StatusDot tone={state === "muted" ? "muted" : state === "warn" ? "warn" : state} />
        {stateLabel}
      </span>
    </li>
  );
}

export function RetryHint({ onRetry }: { onRetry: () => void }) {
  return (
    <button
      onClick={onRetry}
      className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-accent-ink hover:brightness-125 transition-all cursor-pointer"
    >
      <RefreshCw size={12} />
      Retry devices
    </button>
  );
}
