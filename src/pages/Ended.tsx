import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Download, FileText, Hand, MessageSquare, RotateCcw, Users } from "lucide-react";
import { useSession } from "../context/SessionContext";
import { useToast } from "../components/Toast";
import { FeedbackForm } from "../components/FeedbackForm";
import { Button } from "../components/ui";
import { formatDuration } from "../hooks/useTimer";
import {
  buildTranscriptText,
  downloadTranscript,
  loadTranscript,
} from "../services/chatService";

export function Ended() {
  const { summary, callId, setCallId, goto } = useSession();
  const { push } = useToast();
  const reduce = useReducedMotion();

  if (!summary) {
    return (
      <div className="min-h-screen grid place-items-center px-5">
        <div className="text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-faint">No session data</p>
          <Button variant="primary" className="mt-4" onClick={() => goto("lobby")}>
            Back to lobby
          </Button>
        </div>
      </div>
    );
  }

  const durationSec = summary.startedAt
    ? Math.max(0, Math.round((summary.endedAt - summary.startedAt) / 1000))
    : 0;
  const transcript = loadTranscript(summary.callId);

  const handleDownload = () => {
    const text = buildTranscriptText(
      {
        callId: summary.callId,
        startedAt: summary.startedAt,
        endedAt: summary.endedAt,
        participants: summary.participantNames,
      },
      transcript,
    );
    downloadTranscript(`skillsignal-${summary.callId}.txt`, text);
    push({ title: "Transcript downloading", desc: ".txt file — chat mirror se bani hai.", tone: "ok" });
  };

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 lg:py-16">
      <motion.div
        initial={{ opacity: 0, y: reduce ? 0 : 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduce ? 0 : 0.35 }}
      >
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.28em] text-danger">
          ● Session ended
        </p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-ink">
              {formatDuration(durationSec)}
            </h1>
            <p className="mt-2 text-sm text-muted">
              on air · <span className="font-mono text-xs text-accent-ink">{summary.callId}</span>
            </p>
          </div>
          <div className="flex gap-2.5">
            <Button
              variant="secondary"
              onClick={() => {
                setCallId(summary.callId);
                goto("prejoin");
              }}
            >
              <RotateCcw size={15} />
              Rejoin
            </Button>
            <Button variant="primary" onClick={() => goto("lobby")}>
              Lobby
              <ArrowRight size={15} />
            </Button>
          </div>
        </div>
      </motion.div>

      <div className="mt-8 grid lg:grid-cols-[1.15fr_1fr] gap-5">
        {/* summary */}
        <motion.section
          initial={{ opacity: 0, y: reduce ? 0 : 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0 : 0.35, delay: reduce ? 0 : 0.08 }}
          className="rounded-2xl border border-line bg-surface p-6"
        >
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-faint mb-5">
            Session summary
          </p>

          <div className="grid grid-cols-3 gap-3">
            <Stat
              icon={<MessageSquare size={15} />}
              value={String(summary.messagesCount)}
              label="messages"
            />
            <Stat icon={<Hand size={15} />} value={String(summary.raisedCount)} label="hands raised" />
            <Stat
              icon={<Users size={15} />}
              value={String(summary.participantNames.length)}
              label="participants"
            />
          </div>

          <div className="mt-6">
            <p className="text-xs font-bold text-muted mb-2.5">On this call</p>
            <div className="flex flex-wrap gap-2">
              {summary.participantNames.length === 0 ? (
                <span className="text-xs text-faint">Solo session — koi aur join nahi hua.</span>
              ) : (
                summary.participantNames.map((n) => (
                  <span
                    key={n}
                    className="rounded-lg border border-line bg-surface-2 px-3 py-1.5 text-xs font-bold text-ink"
                  >
                    {n}
                  </span>
                ))
              )}
            </div>
          </div>

          <button
            onClick={handleDownload}
            className="mt-6 w-full flex items-center gap-3 rounded-xl border border-accent/30 bg-accent-soft px-4 py-3.5 text-left transition-all hover:border-accent/60 hover:-translate-y-0.5 active:scale-[0.99] cursor-pointer"
          >
            <span className="grid place-items-center h-9 w-9 rounded-lg bg-accent text-[#04252a] shrink-0">
              <Download size={16} />
            </span>
            <span className="min-w-0">
              <span className="block text-[13px] font-bold text-ink">Download transcript (.txt)</span>
              <span className="block text-[11px] text-muted truncate flex items-center gap-1">
                <FileText size={11} />
                {transcript.length} messages · timestamps + roles ke saath
              </span>
            </span>
          </button>
        </motion.section>

        {/* feedback */}
        <motion.div
          initial={{ opacity: 0, y: reduce ? 0 : 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0 : 0.35, delay: reduce ? 0 : 0.16 }}
        >
          <FeedbackForm callId={summary.callId} />
          <p className="mt-3 text-[11px] text-faint leading-relaxed px-1">
            Feedback is device par <span className="font-mono">ss.feedback</span> mein save hota hai —
            production mein yeh SkillSignal backend ke Skill Passport API mein jayega.
          </p>
        </motion.div>
      </div>
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface-2 p-3.5">
      <span className="flex items-center gap-1.5 text-accent-ink">{icon}<span className="font-mono text-[9px] uppercase tracking-[0.18em] text-faint">{label}</span></span>
      <p className="mt-2 font-display text-2xl font-bold text-ink tabular-nums">{value}</p>
    </div>
  );
}
