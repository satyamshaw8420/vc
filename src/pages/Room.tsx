import "@stream-io/video-react-sdk/dist/css/styles.css";
import { useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, Loader2, RefreshCw, Unplug } from "lucide-react";
import { StreamCall, StreamVideo, CallingState } from "@stream-io/video-react-sdk";
import { useSession } from "../context/SessionContext";
import { useCallConfig } from "../hooks/useCallConfig";
import { CallProvider, useCallCtx } from "../context/CallContext";
import { useToast } from "../components/Toast";
import { Button } from "../components/ui";
import { TopBar } from "../components/TopBar";
import { VideoGrid } from "../components/VideoGrid";
import { ControlBar } from "../components/ControlBar";
import { ChatDrawer } from "../components/ChatDrawer";
import { TOKEN_URL } from "../services/callService";

export function Room() {
  const { name, role, callId, goto, joinPrefs } = useSession();
  const displayName = name.trim() || "Guest";
  const cfg = useCallConfig(displayName, callId);
  const { push } = useToast();

  useEffect(() => {
    if (!callId) goto("lobby");
  }, [callId, goto]);

  useEffect(() => {
    if (cfg.status === "error") {
      push({ title: "Token fetch failed", desc: cfg.error?.message, tone: "danger" });
    } else if (cfg.status === "ready" && cfg.tokenFallback) {
      push({
        title: "Dev token mode",
        desc: "Token server nahi mila — browser devToken fallback se join ho raha hai (Development env only).",
        tone: "warn",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg.status]);

  if (!callId) return null;

  if (cfg.status === "error" || !cfg.client || !cfg.call) {
    return (
      <div className="room-shell min-h-screen grid place-items-center bg-bg text-ink px-5">
        <div className="w-full max-w-lg rounded-2xl border border-line bg-surface p-8">
          {cfg.status === "error" ? (
            <>
              <span className="grid place-items-center h-12 w-12 rounded-xl border border-danger/30 bg-danger-soft text-danger">
                <Unplug size={22} />
              </span>
              <h1 className="mt-4 font-display text-2xl font-bold">Token server unreachable</h1>
              <p className="mt-2 text-sm text-muted leading-relaxed">
                {cfg.error?.message}. Room join karne se pehle user token chahiye, jo{" "}
                <span className="font-mono text-xs text-accent-ink">{TOKEN_URL}</span> se aata hai.
              </p>
              <div className="mt-4 rounded-xl border border-line bg-surface-2 p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint mb-2">Fix</p>
                <pre className="font-mono text-xs text-ink leading-relaxed whitespace-pre-wrap">
{`# terminal 1 — token server
node token-server.mjs

# .env (gitignored) mein:
STREAM_API_KEY=<api key>
STREAM_SECRET_KEY=<secret>`}
                </pre>
                <p className="mt-3 text-[11px] text-faint leading-relaxed">
                  Note: token server down ho to app automatically browser devToken fallback pe
                  chala jata hai (Stream Development env, auth checks off). Yeh screen tabhi aati
                  hai jab dono paths fail ho jayein.
                </p>
              </div>
              <div className="mt-5 flex gap-2.5">
                <Button variant="primary" onClick={cfg.retry}>
                  <RefreshCw size={15} />
                  Retry token fetch
                </Button>
                <Button variant="ghost" onClick={() => goto("lobby")}>
                  Back to lobby
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center py-6">
              <Loader2 size={28} className="animate-spin text-accent" />
              <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.24em] text-muted">
                Booting Stream client…
              </p>
              <p className="mt-1 font-mono text-xs text-faint">{callId}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <StreamVideo client={cfg.client}>
      <StreamCall call={cfg.call}>
        <CallProvider
          call={cfg.call}
          userId={cfg.userId}
          displayName={displayName}
          role={role}
          callId={callId}
          joinPrefs={joinPrefs}
          tokenFallback={cfg.tokenFallback}
        >
          <RoomShell onRetry={cfg.retry} />
        </CallProvider>
      </StreamCall>
    </StreamVideo>
  );
}

function RoomShell({ onRetry }: { onRetry: () => void }) {
  const { callingState, joinError, callId } = useCallCtx();
  const { goto } = useSession();
  const reduce = useReducedMotion();
  const connecting =
    callingState === CallingState.JOINING || callingState === CallingState.UNKNOWN;
  const reconnecting =
    callingState === CallingState.RECONNECTING || callingState === CallingState.MIGRATING;

  return (
    <div className="room-shell fixed inset-0 z-20 flex flex-col bg-bg text-ink overflow-hidden">
      <TopBar />

      {reconnecting && (
        <div className="relative z-30 flex items-center justify-center gap-2.5 border-b border-warn/25 bg-warn/10 px-4 py-2">
          <Loader2 size={14} className="animate-spin text-warn" />
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-warn">
            Reconnecting to Stream… audio/video wapas aayega
          </p>
        </div>
      )}

      <div className="relative flex flex-1 min-h-0">
        <VideoGrid />
        <ChatDrawer />
      </div>

      <ControlBar />

      {/* joining overlay */}
      {connecting && !joinError && (
        <motion.div
          className="absolute inset-0 z-40 grid place-items-center bg-bg/85 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: reduce ? 0 : 0.2 }}
        >
          <div className="text-center">
            <span className="relative grid place-items-center h-16 w-16 mx-auto">
              <span className="absolute inset-0 rounded-2xl border border-accent/30" />
              <span className="absolute inset-0 rounded-2xl border border-accent/60 animate-ping" />
              <Loader2 size={26} className="animate-spin text-accent" />
            </span>
            <p className="mt-5 font-display text-xl font-bold">Connecting to the room…</p>
            <p className="mt-1.5 font-mono text-xs text-muted">{callId} · getstream.io video fabric</p>
          </div>
        </motion.div>
      )}

      {/* join/connection error overlay */}
      {joinError && (
        <motion.div
          className="absolute inset-0 z-50 grid place-items-center bg-bg/90 backdrop-blur-sm px-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: reduce ? 0 : 0.2 }}
        >
          <div className="w-full max-w-md rounded-2xl border border-danger/30 bg-surface p-7">
            <span className="grid place-items-center h-11 w-11 rounded-xl border border-danger/30 bg-danger-soft text-danger">
              <AlertTriangle size={20} />
            </span>
            <h2 className="mt-3.5 font-display text-xl font-bold">Connection problem</h2>
            <p className="mt-1.5 text-sm text-muted leading-relaxed break-words">{joinError}</p>
            <p className="mt-3 text-[11px] text-faint leading-relaxed">
              Token expire ho gaya ho to fresh token ke saath rejoin karo — ya network check karke
              retry dabao.
            </p>
            <div className="mt-5 flex gap-2.5">
              <Button variant="primary" onClick={onRetry}>
                <RefreshCw size={15} />
                Rejoin with fresh token
              </Button>
              <Button variant="ghost" onClick={() => goto("lobby")}>
                Lobby
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
