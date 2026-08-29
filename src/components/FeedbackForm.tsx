import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { BadgeCheck, Star } from "lucide-react";
import { useToast } from "../components/Toast";
import { Button } from "./ui";

const LABELS = ["", "Poor", "Theek", "Good", "Badhiya", "Outstanding"];

export function FeedbackForm({ callId }: { callId: string }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [note, setNote] = useState("");
  const [attach, setAttach] = useState(true);
  const [saved, setSaved] = useState(false);
  const { push } = useToast();
  const reduce = useReducedMotion();

  const submit = () => {
    if (rating === 0) {
      push({ title: "Rating select karo", desc: "Kam se kam 1 star.", tone: "warn" });
      return;
    }
    try {
      const raw = localStorage.getItem("ss.feedback");
      const list = raw ? (JSON.parse(raw) as unknown[]) : [];
      list.push({ callId, rating, note: note.trim(), attachToPassport: attach, ts: Date.now() });
      localStorage.setItem("ss.feedback", JSON.stringify(list));
    } catch {
      /* non-fatal */
    }
    setSaved(true);
    push({
      title: "Feedback saved",
      desc: attach ? "Skill Passport se attach ho gaya." : "Sirf session log mein save hua.",
      tone: "ok",
    });
  };

  if (saved) {
    return (
      <div className="rounded-2xl border border-ok/30 bg-ok/8 p-6 text-center">
        <BadgeCheck size={26} className="text-ok mx-auto" />
        <p className="mt-2 font-display text-lg font-bold text-ink">Shukriya! Feedback saved.</p>
        <p className="mt-1 text-xs text-muted">
          {rating}/5 · {LABELS[rating]}
          {attach && " · Skill Passport attached"}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-faint">
        Session feedback
      </p>
      <p className="mt-1.5 text-sm font-bold text-ink">Yeh session kaisa raha?</p>

      <div className="mt-3 flex gap-1.5" role="radiogroup" aria-label="Star rating">
        {[1, 2, 3, 4, 5].map((n) => {
          const active = (hover || rating) >= n;
          return (
            <motion.button
              key={n}
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} star — ${LABELS[n]}`}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(n)}
              whileHover={reduce ? undefined : { scale: 1.12 }}
              whileTap={reduce ? undefined : { scale: 0.92 }}
              className={`grid place-items-center h-10 w-10 rounded-lg border transition-colors cursor-pointer ${
                active
                  ? "border-accent2/50 bg-accent2-soft text-accent2"
                  : "border-line bg-surface-2 text-faint"
              }`}
            >
              <Star size={18} fill={active ? "currentColor" : "none"} />
            </motion.button>
          );
        })}
      </div>
      <p className="mt-1.5 h-4 font-mono text-[10px] uppercase tracking-[0.18em] text-accent2-ink">
        {LABELS[hover || rating] ?? ""}
      </p>

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        placeholder="Note likho — kya seekha, kya improve ho sakta hai…"
        aria-label="Feedback note"
        className="mt-2 w-full rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-[13px] font-semibold text-ink placeholder:text-faint outline-none focus:border-accent transition-colors resize-none"
      />

      <label className="mt-3 flex items-start gap-2.5 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={attach}
          onChange={(e) => setAttach(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-[var(--accent2)] cursor-pointer"
        />
        <span className="text-xs font-semibold text-muted leading-snug">
          Skill Passport se attach karo — verification history mein dikhega
        </span>
      </label>

      <Button variant="lime" className="mt-4 w-full" onClick={submit}>
        Save feedback
      </Button>
    </div>
  );
}
