import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Hand, MicOff, MonitorUp, Radio } from "lucide-react";
import { ParticipantView } from "@stream-io/video-react-sdk";
import type { StreamVideoParticipant } from "@stream-io/video-react-sdk";
import { useCallCtx } from "../context/CallContext";
import { isAudioMuted } from "../services/participantUtils";
import { InviteCardBody } from "./InviteCard";
import { Badge } from "./ui";

export function VideoGrid() {
  const { participants, local, dominant } = useCallCtx();
  const reduce = useReducedMotion();

  const sharers = participants.filter((p) => Boolean(p.screenShareStream));
  const remotes = participants.filter((p) => p.sessionId !== local?.sessionId);
  const active =
    dominant ?? (remotes.length > 0 ? remotes[remotes.length - 1] : local);
  const solo = participants.length <= 1;

  /* ---------- layout: pinned screen share ---------- */
  if (sharers.length > 0) {
    return (
      <section className="flex-1 min-w-0 flex flex-col lg:flex-row gap-3 p-3 lg:p-4" aria-label="Video grid">
        <div className="flex-1 min-h-0 grid gap-3">
          {sharers.map((p) => (
            <ScreenTile key={`screen-${p.sessionId}`} p={p} />
          ))}
        </div>
        <div className="lg:w-[240px] shrink-0 grid grid-cols-2 lg:grid-cols-1 gap-3 overflow-y-auto min-h-0 max-h-[38vh] lg:max-h-none pr-0.5">
          {participants.map((p) => (
            <div key={p.sessionId} className="aspect-video min-h-0">
              <Tile p={p} active={active?.sessionId === p.sessionId} />
            </div>
          ))}
        </div>
      </section>
    );
  }

  /* ---------- layout: solo (waiting) ---------- */
  if (solo) {
    return (
      <section className="flex-1 min-w-0 p-3 lg:p-4" aria-label="Video grid">
        <div className="relative h-full rounded-2xl overflow-hidden border border-line bg-surface-2">
          {local && (
            <div className="absolute inset-0">
              <Tile p={local} active />
            </div>
          )}
          <motion.div
            className="absolute inset-0 z-10 grid place-items-center bg-[#070b14]/78 backdrop-blur-[3px] p-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: reduce ? 0 : 0.4, delay: reduce ? 0 : 0.25 }}
          >
            <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-6 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)]">
              <p className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-warn">
                <Radio size={12} />
                Waiting for others…
              </p>
              <h2 className="mt-2 font-display text-xl font-bold text-ink leading-tight">
                Room khaali hai — kisi ko bula lo
              </h2>
              <p className="mt-1.5 text-xs text-muted leading-relaxed">
                Code bhejo ya link share karo; join hote hi tile yahan pop ho jayega.
              </p>
              <div className="mt-4">
                <InviteCardBody compact />
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    );
  }

  /* ---------- layout: active speaker + filmstrip ---------- */
  const filmstrip = participants.filter((p) => p.sessionId !== active?.sessionId);
  return (
    <section className="flex-1 min-w-0 flex flex-col lg:flex-row gap-3 p-3 lg:p-4" aria-label="Video grid">
      <div className="flex-1 min-h-0 rounded-2xl overflow-hidden">
        {active && <Tile p={active} active big />}
      </div>
      {filmstrip.length > 0 && (
        <div className="lg:w-[240px] shrink-0 grid grid-cols-2 lg:grid-cols-1 gap-3 overflow-y-auto min-h-0 max-h-[38vh] lg:max-h-none pr-0.5">
          {filmstrip.map((p) => (
            <div key={p.sessionId} className="aspect-video min-h-0">
              <Tile p={p} active={false} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ================= tiles ================= */

function Tile({ p, active, big = false }: { p: StreamVideoParticipant; active: boolean; big?: boolean }) {
  const { local, hands, rolesMap } = useCallCtx();
  const isLocal = p.sessionId === local?.sessionId;
  const audioMuted = isAudioMuted(p);
  const speaking = Boolean(p.isSpeaking) && !audioMuted;
  const hand = hands[p.userId]?.raised;
  const role = rolesMap[p.userId];
  const label = (p.name || p.userId || "Participant").trim();

  return (
    <div
      className={`relative h-full w-full overflow-hidden rounded-xl border bg-surface-2 transition-all duration-300 ${
        speaking ? "border-accent shadow-[var(--shadow-glow)]" : active ? "border-line-strong" : "border-line"
      }`}
    >
      <div className={`absolute inset-0 ${isLocal ? "[transform:scaleX(-1)]" : ""}`}>
        <ParticipantView participant={p} />
      </div>

      {/* bottom scrim + label */}
      <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[#04060c]/85 to-transparent pointer-events-none" />
      <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center gap-1.5 min-w-0">
        {speaking && <EqBars />}
        <span className={`truncate font-bold text-white drop-shadow ${big ? "text-sm" : "text-[11px]"}`}>
          {label}
        </span>
        {isLocal && (
          <span className="shrink-0 rounded bg-accent/25 border border-accent/40 px-1 py-px font-mono text-[9px] font-bold uppercase tracking-widest text-accent">
            You
          </span>
        )}
        {role === "mentor" && (
          <span className="shrink-0 rounded bg-accent2/20 border border-accent2/40 px-1 py-px font-mono text-[9px] font-bold uppercase tracking-widest text-accent2">
            Mentor
          </span>
        )}
      </div>

      {/* top-left: mic off / active */}
      <div className="absolute top-2 left-2.5 flex items-center gap-1.5">
        {active && speaking && big && (
          <span className="rounded-md bg-accent/20 border border-accent/40 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-accent backdrop-blur-sm">
            Active speaker
          </span>
        )}
        {audioMuted && (
          <span className="grid place-items-center h-6 w-6 rounded-md bg-danger/25 border border-danger/40 text-danger backdrop-blur-sm">
            <MicOff size={12} />
          </span>
        )}
      </div>

      {/* top-right: raised hand */}
      {hand && (
        <RaisedHandBadge />
      )}
    </div>
  );
}

function RaisedHandBadge() {
  const reduce = useReducedMotion();
  return (
    <motion.span
      className="absolute top-2 right-2.5 grid place-items-center h-7 w-7 rounded-lg bg-accent2/25 border border-accent2/50 text-accent2 backdrop-blur-sm"
      animate={reduce ? undefined : { y: [0, -5, 0], rotate: [0, -8, 0, 8, 0] }}
      transition={reduce ? undefined : { duration: 1, repeat: Infinity, ease: "easeInOut" }}
      aria-label="Hand raised"
    >
      <Hand size={14} />
    </motion.span>
  );
}

function EqBars() {
  return (
    <span className="flex items-end gap-[2.5px] h-3.5 shrink-0" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="eq-bar w-[3px] h-3.5 rounded-sm bg-accent"
          style={{ animationDelay: `${i * 0.14}s` }}
        />
      ))}
    </span>
  );
}

function ScreenTile({ p }: { p: StreamVideoParticipant }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const stream = p.screenShareStream;
  const audioStream = p.screenShareAudioStream;

  useEffect(() => {
    const el = videoRef.current;
    if (el && stream) {
      el.srcObject = stream;
      el.play().catch(() => undefined);
    }
  }, [stream]);

  useEffect(() => {
    const el = audioRef.current;
    if (el && audioStream) {
      el.srcObject = audioStream;
      el.play().catch(() => undefined);
    }
  }, [audioStream]);

  return (
    <div className="relative h-full min-h-[240px] w-full overflow-hidden rounded-xl border border-accent/35 bg-[#04060c]">
      <video ref={videoRef} autoPlay playsInline className="h-full w-full object-contain" />
      <audio ref={audioRef} autoPlay />
      <div className="absolute top-2.5 left-2.5 flex items-center gap-2">
        <Badge tone="cyan">
          <MonitorUp size={11} />
          Screen
        </Badge>
        <span className="rounded-md bg-black/55 px-2 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
          {(p.name || "Participant").trim()} sharing
        </span>
      </div>
    </div>
  );
}
