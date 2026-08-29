import { useState } from "react";
import { Check, Copy, Users, UserPlus, Wifi, WifiOff } from "lucide-react";
import { CallingState } from "@stream-io/video-react-sdk";
import { useCallCtx } from "../context/CallContext";
import { useTimer } from "../hooks/useTimer";
import { useClipboard } from "../hooks/useClipboard";
import { Button, Modal, StatusDot, Tooltip } from "./ui";
import { InviteCardBody } from "./InviteCard";

export function TopBar() {
  const { callId, startedAt, participants, callingState, latencyMs, tokenFallback } = useCallCtx();
  const timer = useTimer(startedAt);
  const { copied, copy } = useClipboard();
  const [inviteOpen, setInviteOpen] = useState(false);

  const reconnecting =
    callingState === CallingState.RECONNECTING || callingState === CallingState.MIGRATING;
  const failed = callingState === CallingState.RECONNECTING_FAILED;

  const qualityTone: "ok" | "warn" | "danger" = failed
    ? "danger"
    : reconnecting
      ? "warn"
      : latencyMs !== null && latencyMs > 400
        ? "warn"
        : "ok";
  const qualityLabel = failed
    ? "failed"
    : reconnecting
      ? "reconnecting"
      : latencyMs !== null
        ? `${Math.round(latencyMs)}ms`
        : "stable";

  return (
    <header className="relative z-30 flex items-center gap-3 border-b border-line bg-surface/85 backdrop-blur px-4 h-14 shrink-0">
      {/* brand + code */}
      <div className="flex items-center gap-2.5 min-w-0">
        <svg width="20" height="20" viewBox="0 0 32 32" fill="none" className="shrink-0" aria-hidden="true">
          <path d="M3 16h5.2L11.5 8l4.6 16 3-8H29" stroke="var(--accent)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="27" cy="16" r="2.2" fill="var(--accent2)" />
        </svg>
        <button
          onClick={() => copy(callId)}
          className="group flex items-center gap-2 rounded-lg border border-line bg-surface-2 pl-2.5 pr-2 h-8 font-mono text-[11px] font-semibold text-ink hover:border-accent/50 transition-colors cursor-pointer min-w-0"
          aria-label={`Copy call code ${callId}`}
        >
          <span className="truncate">{callId}</span>
          {copied ? (
            <Check size={13} className="text-ok shrink-0" />
          ) : (
            <Copy size={13} className="text-faint group-hover:text-accent-ink shrink-0" />
          )}
        </button>
      </div>

      {/* live timer — centre */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3">
        <span className="hidden sm:flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-danger live-dot" />
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-danger">
            Live
          </span>
        </span>
        <span
          className="font-display text-[22px] leading-none font-bold tabular-nums tracking-tight text-ink"
          aria-label={`Session elapsed ${timer.label}`}
        >
          {startedAt ? timer.label : "--:--"}
        </span>
      </div>

      {/* right cluster */}
      <div className="ml-auto flex items-center gap-2">
        {tokenFallback && (
          <Tooltip label="Token server skip — browser devToken (Development env only). Production mein token server hi use hoga." side="top">
            <span className="hidden md:flex items-center gap-1.5 rounded-lg border border-warn/35 bg-warn/10 px-2.5 h-8 font-mono text-[9.5px] font-bold uppercase tracking-[0.14em] text-warn">
              <span className="h-1.5 w-1.5 rounded-full bg-warn" />
              Dev token
            </span>
          </Tooltip>
        )}
        <Tooltip label={`Connection: ${qualityLabel}`}>
          <span className="hidden sm:flex items-center gap-2 rounded-lg border border-line bg-surface-2 px-2.5 h-8">
            {qualityTone === "danger" ? (
              <WifiOff size={13} className="text-danger" />
            ) : (
              <Wifi size={13} className={qualityTone === "warn" ? "text-warn" : "text-ok"} />
            )}
            <StatusDot tone={qualityTone} pulse={qualityTone === "ok"} />
          </span>
        </Tooltip>

        <Tooltip label={`${participants.length} in room`}>
          <span className="flex items-center gap-1.5 rounded-lg border border-line bg-surface-2 px-2.5 h-8 font-mono text-[11px] font-semibold text-muted">
            <Users size={13} />
            {participants.length}
          </span>
        </Tooltip>

        <Button variant="lime" size="sm" onClick={() => setInviteOpen(true)}>
          <UserPlus size={14} />
          <span className="hidden sm:inline">Invite</span>
        </Button>
      </div>

      <Modal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Invite to this session"
        kicker="Share the code"
      >
        <InviteCardBody />
      </Modal>
    </header>
  );
}
