import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  CalendarClock,
  Check,
  Copy,
  GraduationCap,
  History,
  LogIn,
  Mic,
  Moon,
  Radio,
  Sun,
  TerminalSquare,
  UserRound,
  Video,
} from "lucide-react";
import { useSession } from "../context/SessionContext";
import { useToast } from "../components/Toast";
import { Badge, Button, StatusDot, Tooltip } from "../components/ui";
import {
  addRecentCall,
  formatClock,
  generateCallId,
  getRecentCalls,
  normalizeCallId,
  pingTokenServer,
} from "../services/callService";
import type { RecentCall, Role } from "../types";
import { useClipboard } from "../hooks/useClipboard";

/* ---------------- logo ---------------- */
function Logo() {
  return (
    <span className="flex items-center gap-3">
      <span className="grid place-items-center h-10 w-10 rounded-xl bg-surface-2 border border-line">
        <svg width="22" height="22" viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <path
            d="M3 16h5.2L11.5 8l4.6 16 3-8H29"
            stroke="var(--accent)"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="27" cy="16" r="2.2" fill="var(--accent2)" />
        </svg>
      </span>
      <span className="leading-none">
        <span className="block font-display font-bold text-lg tracking-tight text-ink">
          SkillSignal
        </span>
        <span className="block font-mono text-[10px] font-semibold uppercase tracking-[0.32em] text-accent-ink mt-1">
          Sessions
        </span>
      </span>
    </span>
  );
}

/* ---------------- static board data ---------------- */
const SAMPLE_SESSIONS = [
  { time: "10:30", title: "Spring Boot Code Review", mentor: "Dr. Kavita Nair", track: "Backend Track", live: true },
  { time: "12:00", title: "System Design Mock — URL Shortener", mentor: "Arjun Mehta", track: "System Design", live: false, seats: 6 },
  { time: "15:30", title: "React Performance Clinic", mentor: "Sana Qureshi", track: "Frontend Track", live: false, seats: 3 },
  { time: "17:00", title: "Model Card Review — ML Practicals", mentor: "Prof. R. Iyer", track: "ML Track", live: false, seats: 9 },
  { time: "19:30", title: "Skill Passport Audit + Resume Desk", mentor: "Neha Kulkarni", track: "Career Lab", live: false, seats: 4 },
];

const TICKER = [
  "BACKEND TRACK",
  "FRONTEND TRACK",
  "SYSTEM DESIGN",
  "ML TRACK",
  "CAREER LAB",
  "SKILL PASSPORT · VERIFIED",
  "PRACTICAL VERIFICATION",
  "MENTOR ON CALL",
];

type PermState = "unknown" | "granted" | "prompt" | "denied";

function usePermissionStates() {
  const [perms, setPerms] = useState<{ camera: PermState; microphone: PermState }>({
    camera: "unknown",
    microphone: "unknown",
  });
  useEffect(() => {
    let cancelled = false;
    const query = async (name: "camera" | "microphone") => {
      try {
        const status = await navigator.permissions.query({ name: name as PermissionName });
        const map = (): PermState =>
          status.state === "granted" ? "granted" : status.state === "denied" ? "denied" : "prompt";
        if (!cancelled) setPerms((p) => ({ ...p, [name]: map() }));
        status.onchange = () => {
          if (!cancelled) setPerms((p) => ({ ...p, [name]: map() }));
        };
      } catch {
        /* Safari etc. — leave as unknown */
      }
    };
    query("camera");
    query("microphone");
    return () => {
      cancelled = true;
    };
  }, []);
  return perms;
}

/* ---------------- page ---------------- */
export function Lobby() {
  const { name, setName, role, setRole, setCallId, goto } = useSession();
  const { push } = useToast();
  const reduce = useReducedMotion();
  const perms = usePermissionStates();

  const [codeInput, setCodeInput] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [nameError, setNameError] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const [tokenOk, setTokenOk] = useState<boolean | null>(null);
  const [recent, setRecent] = useState<RecentCall[]>(() => getRecentCalls());
  const [clock, setClock] = useState(() => new Date());
  const [theme, setTheme] = useState<string>(
    () => localStorage.getItem("ss.theme") ?? "dark",
  );
  const nameRef = useRef<HTMLInputElement>(null);
  const { copied, copy } = useClipboard();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("ss.theme", theme);
  }, [theme]);

  useEffect(() => {
    const id = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const ping = async () => {
      const ok = await pingTokenServer();
      if (!cancelled) setTokenOk(ok);
    };
    ping();
    const id = window.setInterval(ping, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  // Deep link: ?call=SS-XXXX-XXXX pre-fills the join box
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("call");
    if (param) {
      const norm = normalizeCallId(param);
      if (norm) setCodeInput(norm);
    }
  }, []);

  const ensureName = useCallback((): boolean => {
    if (name.trim().length < 2) {
      setNameError(true);
      setShakeKey((k) => k + 1);
      nameRef.current?.focus();
      push({ title: "Apna naam daalo", desc: "Minimum 2 characters — yahi room mein dikhega.", tone: "warn" });
      return false;
    }
    setNameError(false);
    return true;
  }, [name, push]);

  const handleCreate = () => {
    if (!ensureName()) return;
    const id = generateCallId();
    setCallId(id);
    setRecent(addRecentCall({ callId: id, name: name.trim(), role, ts: Date.now() }));
    push({ title: "Session created", desc: `Room code ${id} — device check next.`, tone: "ok" });
    goto("prejoin");
  };

  const handleJoin = () => {
    if (!ensureName()) return;
    const norm = normalizeCallId(codeInput);
    if (!norm) {
      setCodeError("Code format SS-XXXX-XXXX hai — 8 letters/digits.");
      setShakeKey((k) => k + 1);
      return;
    }
    setCodeError(null);
    setCallId(norm);
    setRecent(addRecentCall({ callId: norm, name: name.trim(), role, ts: Date.now() }));
    goto("prejoin");
  };

  const permDot = (s: PermState) =>
    s === "granted" ? "ok" : s === "denied" ? "danger" : s === "prompt" ? "warn" : "muted";
  const permLabel = (s: PermState) =>
    s === "granted" ? "ready" : s === "denied" ? "blocked" : s === "prompt" ? "will ask" : "untested";

  return (
    <div className="flex min-h-screen flex-col">
      {/* ============ top bar ============ */}
      <header className="border-b border-line/70 bg-surface/60 backdrop-blur-sm sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-5 lg:px-8 h-16 flex items-center justify-between gap-4">
          <Logo />
          <div className="flex items-center gap-2.5">
            <span className="hidden sm:flex items-center gap-2 rounded-lg border border-line bg-surface-2 px-3 h-9 font-mono text-[11px] text-muted">
              <StatusDot tone={tokenOk === null ? "muted" : tokenOk ? "ok" : "danger"} pulse={tokenOk === true} />
              token server
              <span className="text-ink">{tokenOk === null ? "…" : tokenOk ? "online" : "offline"}</span>
            </span>
            <span className="hidden md:flex items-center rounded-lg border border-line bg-surface-2 px-3 h-9 font-mono text-[11px] text-muted tabular-nums">
              {clock.toLocaleTimeString("en-IN", { hour12: false })}
            </span>
            <Tooltip label={theme === "dark" ? "Light mode" : "Dark mode"}>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Toggle theme"
                onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
              >
                {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
              </Button>
            </Tooltip>
          </div>
        </div>
      </header>

      {/* ============ board ============ */}
      <div className="mx-auto w-full max-w-7xl flex-1 px-5 lg:px-8 py-8 lg:py-12 grid lg:grid-cols-12 gap-6">
        {/* -------- left: control deck -------- */}
        <section className="lg:col-span-7 flex flex-col gap-6">
          <motion.div
            initial={{ opacity: 0, y: reduce ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduce ? 0 : 0.35 }}
          >
            <p className="flex items-center gap-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.28em] text-accent-ink">
              <Radio size={13} />
              Session board · {clock.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" })}
            </p>
            <h1 className="mt-4 font-display font-bold tracking-tight text-ink text-4xl sm:text-5xl xl:text-[56px] leading-[1.04]">
              Run verified mentorship,
              <br />
              <span className="text-accent-ink">live on air.</span>
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted">
              SkillSignal Sessions — mentorship aur practical-verification rooms real video +
              real-time chat ke saath, GetStream video fabric par. Room banao, code share karo,
              session record-ready transcript ke saath khatam karo.
            </p>
          </motion.div>

          {/* identity strip */}
          <motion.div
            initial={{ opacity: 0, y: reduce ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduce ? 0 : 0.35, delay: reduce ? 0 : 0.06 }}
            className="rounded-xl border border-line bg-surface p-5"
          >
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-faint mb-4">
              Operator identity
            </p>
            <div className="grid sm:grid-cols-[1fr_auto] gap-4 items-end">
              <div key={`name-${shakeKey}`} className={nameError ? "shake" : ""}>
                <label htmlFor="op-name" className="block text-xs font-bold text-muted mb-1.5">
                  Display name
                </label>
                <input
                  id="op-name"
                  ref={nameRef}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (nameError && e.target.value.trim().length >= 2) setNameError(false);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  placeholder="e.g. Rahul Sharma"
                  className={`h-11 w-full rounded-lg border bg-surface-2 px-3.5 text-sm font-semibold text-ink placeholder:text-faint outline-none transition-colors focus:border-accent ${
                    nameError ? "border-danger" : "border-line"
                  }`}
                />
                {nameError && (
                  <p className="mt-1.5 text-xs font-semibold text-danger">Naam required hai (min 2 chars).</p>
                )}
              </div>
              <div>
                <span className="block text-xs font-bold text-muted mb-1.5">Role</span>
                <div className="flex rounded-lg border border-line bg-surface-2 p-1" role="radiogroup" aria-label="Session role">
                  {(
                    [
                      { id: "mentor", label: "Mentor", icon: <GraduationCap size={14} /> },
                      { id: "student", label: "Student", icon: <UserRound size={14} /> },
                    ] as { id: Role; label: string; icon: React.ReactNode }[]
                  ).map((r) => (
                    <button
                      key={r.id}
                      role="radio"
                      aria-checked={role === r.id}
                      onClick={() => setRole(r.id)}
                      className={`flex items-center gap-1.5 h-9 px-4 rounded-md text-xs font-bold transition-all cursor-pointer ${
                        role === r.id
                          ? r.id === "mentor"
                            ? "bg-accent2 text-[#1b2a04] shadow-sm"
                            : "bg-accent text-[#04252a] shadow-sm"
                          : "text-muted hover:text-ink"
                      }`}
                    >
                      {r.icon}
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* create / join panels */}
          <motion.div
            initial={{ opacity: 0, y: reduce ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduce ? 0 : 0.35, delay: reduce ? 0 : 0.12 }}
            className="grid md:grid-cols-5 gap-4"
          >
            {/* CREATE */}
            <div className="md:col-span-3 rounded-xl border border-accent/30 bg-surface p-6 relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-[2px] bg-accent/70" />
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-accent-ink">
                01 / Create
              </p>
              <h2 className="mt-2 font-display text-2xl font-bold text-ink leading-tight">
                Start a fresh session room
              </h2>
              <p className="mt-2 text-sm text-muted leading-relaxed">
                Instant <span className="font-mono text-accent-ink">SS-XXXX-XXXX</span> code milega —
                student ko bhejo, verify karo, transcript download karo.
              </p>
              <Button variant="primary" size="lg" className="mt-5 w-full sm:w-auto" onClick={handleCreate}>
                <Video size={17} />
                Create session
                <ArrowRight size={15} />
              </Button>
            </div>

            {/* JOIN */}
            <div key={`join-${shakeKey}`} className={`md:col-span-2 rounded-xl border border-line bg-surface p-6 ${codeError ? "shake" : ""}`}>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-faint">
                02 / Join with code
              </p>
              <label htmlFor="join-code" className="sr-only">
                Session code
              </label>
              <input
                id="join-code"
                value={codeInput}
                onChange={(e) => {
                  setCodeInput(e.target.value.toUpperCase());
                  if (codeError) setCodeError(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                placeholder="SS-ABCD-2345"
                spellCheck={false}
                className={`mt-4 h-12 w-full rounded-lg border bg-surface-2 px-3.5 font-mono text-sm font-semibold tracking-[0.08em] text-ink placeholder:text-faint outline-none transition-colors focus:border-accent ${
                  codeError ? "border-danger" : "border-line"
                }`}
              />
              {codeError && <p className="mt-1.5 text-xs font-semibold text-danger">{codeError}</p>}
              <Button variant="secondary" size="lg" className="mt-3 w-full" onClick={handleJoin}>
                <LogIn size={16} />
                Join room
              </Button>
              {recent.length > 0 && (
                <button
                  onClick={() => setCodeInput(recent[0].callId)}
                  className="mt-3 w-full text-left text-xs text-muted hover:text-accent-ink transition-colors font-semibold cursor-pointer"
                >
                  ↩ Last: <span className="font-mono">{recent[0].callId}</span>
                </button>
              )}
            </div>
          </motion.div>

          {/* device strip */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: reduce ? 0 : 0.4, delay: reduce ? 0 : 0.2 }}
            className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-line bg-surface px-5 py-3.5"
          >
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-faint">
              Devices
            </span>
            <span className="flex items-center gap-2 text-xs font-semibold text-muted">
              <StatusDot tone={permDot(perms.camera)} /> Camera · {permLabel(perms.camera)}
            </span>
            <span className="flex items-center gap-2 text-xs font-semibold text-muted">
              <StatusDot tone={permDot(perms.microphone)} /> Mic · {permLabel(perms.microphone)}
            </span>
            <span className="text-[11px] text-faint ml-auto hidden sm:block">
              Full device check pre-join screen par hota hai
            </span>
          </motion.div>
        </section>

        {/* -------- right: live board -------- */}
        <aside className="lg:col-span-5 flex flex-col gap-4">
          {/* today's sessions */}
          <motion.section
            initial={{ opacity: 0, x: reduce ? 0 : 14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: reduce ? 0 : 0.35, delay: reduce ? 0 : 0.08 }}
            className="rounded-xl border border-line bg-surface overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 h-12 border-b border-line">
              <span className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-muted">
                <CalendarClock size={13} className="text-accent-ink" />
                Today on SkillSignal
              </span>
              <Badge tone="lime">5 scheduled</Badge>
            </div>
            <ul>
              {SAMPLE_SESSIONS.map((s, i) => (
                <li
                  key={s.title}
                  className={`group flex items-center gap-3.5 px-5 py-3.5 transition-colors hover:bg-surface-2 ${
                    i > 0 ? "border-t border-line/60" : ""
                  }`}
                >
                  <span className="font-mono text-xs font-semibold text-faint w-11 shrink-0 tabular-nums">
                    {s.time}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-bold text-ink truncate group-hover:text-accent-ink transition-colors">
                      {s.title}
                    </span>
                    <span className="block text-[11px] text-muted truncate">
                      {s.mentor} · {s.track}
                    </span>
                  </span>
                  {s.live ? (
                    <Badge tone="danger">
                      <span className="h-1.5 w-1.5 rounded-full bg-danger live-dot" />
                      Live
                    </Badge>
                  ) : (
                    <span className="font-mono text-[10px] text-faint">{s.seats} seats</span>
                  )}
                </li>
              ))}
            </ul>
          </motion.section>

          {/* recent calls */}
          <motion.section
            initial={{ opacity: 0, x: reduce ? 0 : 14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: reduce ? 0 : 0.35, delay: reduce ? 0 : 0.16 }}
            className="rounded-xl border border-line bg-surface p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-muted">
                <History size={13} />
                Recent calls
              </span>
              {recent.length > 0 && (
                <button
                  onClick={() => {
                    localStorage.removeItem("ss.recentCalls");
                    setRecent([]);
                  }}
                  className="text-[11px] font-semibold text-faint hover:text-danger transition-colors cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
            {recent.length === 0 ? (
              <p className="text-xs text-faint leading-relaxed">
                Abhi koi call nahi. Create ya join karo — codes yahan save honge (is device par).
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {recent.slice(0, 6).map((c) => (
                  <RecentChip key={c.callId} entry={c} onPick={() => setCodeInput(c.callId)} copied={copied} onCopy={() => copy(c.callId)} />
                ))}
              </div>
            )}
          </motion.section>

          {/* system status */}
          <motion.section
            initial={{ opacity: 0, x: reduce ? 0 : 14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: reduce ? 0 : 0.35, delay: reduce ? 0 : 0.24 }}
            className="rounded-xl border border-line bg-surface p-5"
          >
            <p className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-muted mb-4">
              <TerminalSquare size={13} />
              System status
            </p>
            <ul className="space-y-3">
              <li className="flex items-center justify-between text-xs font-semibold">
                <span className="text-muted">Token server · :8002</span>
                <span className="flex items-center gap-2">
                  <StatusDot tone={tokenOk === null ? "muted" : tokenOk ? "ok" : "warn"} pulse={tokenOk === true} />
                  <span className={tokenOk ? "text-ok" : tokenOk === false ? "text-warn" : "text-faint"}>
                    {tokenOk === null ? "pinging…" : tokenOk ? "operational" : "down · devToken fallback on"}
                  </span>
                </span>
              </li>
              <li className="flex items-center justify-between text-xs font-semibold">
                <span className="text-muted">Stream video fabric</span>
                <span className="flex items-center gap-2">
                  <StatusDot tone="ok" />
                  <span className="text-ok">getstream.io</span>
                </span>
              </li>
              <li className="flex items-center justify-between text-xs font-semibold">
                <span className="text-muted">Call type · default</span>
                <span className="font-mono text-[11px] text-muted">ringing off</span>
              </li>
            </ul>
            {tokenOk === false && (
              <div className="mt-4 rounded-lg border border-danger/30 bg-danger-soft px-3.5 py-3">
                <p className="text-[11px] font-bold text-danger">Token server offline</p>
                <p className="mt-1 font-mono text-[11px] text-muted leading-relaxed">
                  node token-server.mjs
                  <br />
                  <span className="text-faint"># .env mein STREAM_API_KEY + STREAM_SECRET_KEY</span>
                </p>
              </div>
            )}
          </motion.section>
        </aside>
      </div>

      {/* ============ ticker ============ */}
      <footer className="border-t border-line/70 bg-surface/60 overflow-hidden py-3">
        <div className="marquee-track flex w-max items-center gap-8 whitespace-nowrap">
          {[0, 1].map((dup) => (
            <div key={dup} className="flex items-center gap-8" aria-hidden={dup === 1}>
              {TICKER.map((t) => (
                <span key={`${dup}-${t}`} className="flex items-center gap-8 font-mono text-[11px] font-semibold uppercase tracking-[0.3em] text-faint">
                  {t}
                  <span className="text-accent/60">◆</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </footer>
    </div>
  );
}

function RecentChip({
  entry,
  onPick,
  onCopy,
  copied,
}: {
  entry: RecentCall;
  onPick: () => void;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <span className="group inline-flex items-stretch overflow-hidden rounded-lg border border-line bg-surface-2 text-xs">
      <button
        onClick={onPick}
        className="flex items-center gap-2 pl-3 pr-2 py-2 font-semibold text-muted hover:text-ink transition-colors cursor-pointer"
        title={`Join ${entry.callId}`}
      >
        <span className="font-mono font-semibold text-ink">{entry.callId}</span>
        <span className="text-faint">· {entry.name.split(" ")[0]} · {formatClock(entry.ts)}</span>
      </button>
      <button
        onClick={onCopy}
        aria-label={`Copy code ${entry.callId}`}
        className="grid place-items-center px-2.5 border-l border-line text-faint hover:text-accent-ink transition-colors cursor-pointer"
      >
        {copied ? <Check size={13} className="text-ok" /> : <Copy size={13} />}
      </button>
    </span>
  );
}
