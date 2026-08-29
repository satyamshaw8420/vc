import { useCallback, useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Copy, DoorOpen, Mic, MicOff, Video, VideoOff } from "lucide-react";
import { useSession } from "../context/SessionContext";
import { DevicePreview, RetryHint } from "../components/DevicePreview";
import type { DeviceReport } from "../components/DevicePreview";
import { Badge, Button, StatusDot } from "../components/ui";
import { useClipboard } from "../hooks/useClipboard";

export function Prejoin() {
  const { name, role, callId, goto, joinPrefs, setJoinPrefs } = useSession();
  const [report, setReport] = useState<DeviceReport>({
    state: "requesting",
    camDenied: false,
    micDenied: false,
  });
  const [retrySignal, setRetrySignal] = useState(0);
  const { copied, copy } = useClipboard();
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!callId) goto("lobby");
  }, [callId, goto]);

  const onReport = useCallback((r: DeviceReport) => setReport(r), []);

  const canEnter = report.state === "ready" || report.state === "ready-no-cam";

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 lg:py-12">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={() => goto("lobby")}>
          <ArrowLeft size={14} />
          Lobby
        </Button>
        <div className="flex items-center gap-2.5">
          <Badge tone="cyan">Pre-join check</Badge>
          <button
            onClick={() => copy(callId)}
            className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 h-8 font-mono text-xs font-semibold text-ink hover:border-accent/50 transition-colors cursor-pointer"
            aria-label={`Copy call code ${callId}`}
          >
            {callId}
            {copied ? <Check size={13} className="text-ok" /> : <Copy size={13} className="text-faint" />}
          </button>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: reduce ? 0 : 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduce ? 0 : 0.35 }}
        className="mt-6 grid lg:grid-cols-[1.25fr_1fr] gap-5"
      >
        {/* preview */}
        <section className="rounded-2xl border border-line bg-surface p-5">
          <div className="flex items-center justify-between mb-4">
            <h1 className="font-display text-xl font-bold text-ink">Device check</h1>
            <span className="flex items-center gap-2 text-xs font-semibold text-muted">
              <StatusDot tone={canEnter ? "ok" : report.state === "requesting" ? "warn" : "danger"} />
              {canEnter ? "ready to enter" : report.state === "requesting" ? "checking…" : "attention needed"}
            </span>
          </div>
          <DevicePreview displayName={name} onReport={onReport} retrySignal={retrySignal} />
          {(report.camDenied || report.state === "denied") && (
            <RetryHint onRetry={() => setRetrySignal((n) => n + 1)} />
          )}
        </section>

        {/* settings + enter */}
        <section className="flex flex-col gap-4">
          <div className="rounded-2xl border border-line bg-surface p-5">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-faint mb-4">
              Join settings
            </p>
            <div className="space-y-2.5">
              <PrefToggle
                on={joinPrefs.micOn}
                onChange={(v) => setJoinPrefs({ ...joinPrefs, micOn: v })}
                label="Join with microphone on"
                iconOn={<Mic size={15} />}
                iconOff={<MicOff size={15} />}
              />
              <PrefToggle
                on={joinPrefs.camOn}
                onChange={(v) => setJoinPrefs({ ...joinPrefs, camOn: v })}
                label="Join with camera on"
                iconOn={<Video size={15} />}
                iconOff={<VideoOff size={15} />}
              />
            </div>
            <p className="mt-4 text-[11px] leading-relaxed text-faint">
              Role: <span className="font-bold text-muted">{role === "mentor" ? "Mentor (moderator controls)" : "Student"}</span>
              <br />
              Chat is session-scoped — messages sirf is call ke participants ko jaate hain.
            </p>
          </div>

          <div className="rounded-2xl border border-accent/25 bg-surface p-5 flex-1 flex flex-col">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-accent-ink mb-2">
              Room
            </p>
            <p className="font-display text-2xl font-bold text-ink tracking-tight break-all">{callId}</p>
            <p className="mt-2 text-xs text-muted leading-relaxed">
              Enter dabate hi <span className="font-mono text-accent-ink">call.join(&#123; create: true &#125;)</span> fire
              hota hai — dusra tab ya device isi code se turant jud sakta hai.
            </p>
            <Button
              variant="primary"
              size="lg"
              className="mt-auto pt-1 w-full"
              disabled={!canEnter}
              onClick={() => goto("room")}
            >
              <DoorOpen size={17} />
              Enter room
              <ArrowRight size={15} />
            </Button>
            {!canEnter && report.state !== "requesting" && (
              <p className="mt-2.5 text-[11px] font-semibold text-danger text-center">
                Mic ya camera permission chahiye — checklist dekho aur retry karo.
              </p>
            )}
          </div>
        </section>
      </motion.div>
    </div>
  );
}

function PrefToggle({
  on,
  onChange,
  label,
  iconOn,
  iconOff,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
  iconOn: React.ReactNode;
  iconOff: React.ReactNode;
}) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`w-full flex items-center justify-between rounded-lg border px-3.5 py-3 transition-all cursor-pointer ${
        on ? "border-accent/35 bg-accent-soft" : "border-line bg-surface-2"
      }`}
    >
      <span className={`flex items-center gap-2.5 text-[13px] font-bold ${on ? "text-ink" : "text-muted"}`}>
        <span className={on ? "text-accent-ink" : "text-faint"}>{on ? iconOn : iconOff}</span>
        {label}
      </span>
      <span
        className={`relative h-5 w-9 rounded-full transition-colors ${on ? "bg-accent" : "bg-surface-3 border border-line-strong"}`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${on ? "left-[18px]" : "left-0.5"}`}
        />
      </span>
    </button>
  );
}
