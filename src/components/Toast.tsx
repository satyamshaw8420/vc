import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";

export type ToastTone = "ok" | "danger" | "info" | "warn";

interface ToastItem {
  id: number;
  title: string;
  desc?: string;
  tone: ToastTone;
}

interface ToastCtx {
  push: (t: { title: string; desc?: string; tone?: ToastTone }) => void;
}

const Ctx = createContext<ToastCtx | null>(null);

const toneIcon: Record<ToastTone, ReactNode> = {
  ok: <CheckCircle2 size={16} className="text-ok" />,
  danger: <XCircle size={16} className="text-danger" />,
  info: <Info size={16} className="text-accent" />,
  warn: <AlertTriangle size={16} className="text-warn" />,
};

const toneBorder: Record<ToastTone, string> = {
  ok: "border-l-ok",
  danger: "border-l-danger",
  info: "border-l-accent",
  warn: "border-l-warn",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);
  const reduce = useReducedMotion();

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback<ToastCtx["push"]>(
    ({ title, desc, tone = "info" }) => {
      const id = ++idRef.current;
      setItems((prev) => [...prev.slice(-3), { id, title, desc, tone }]);
      window.setTimeout(() => dismiss(id), 3800);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ push }), [push]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div
        className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 w-[min(340px,calc(100vw-2.5rem))]"
        role="status"
        aria-live="polite"
      >
        <AnimatePresence>
          {items.map((t) => (
            <motion.div
              key={t.id}
              layout={!reduce}
              initial={{ opacity: 0, x: reduce ? 0 : 40, scale: reduce ? 1 : 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: reduce ? 0 : 40, scale: reduce ? 1 : 0.96 }}
              transition={{ duration: reduce ? 0 : 0.22, ease: "easeOut" }}
              className={`flex items-start gap-2.5 rounded-xl border border-line border-l-[3px] ${toneBorder[t.tone]} bg-surface-2/95 backdrop-blur px-3.5 py-3 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.6)]`}
            >
              <span className="mt-0.5 shrink-0">{toneIcon[t.tone]}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold text-ink leading-tight">{t.title}</p>
                {t.desc && <p className="text-xs text-muted mt-0.5 leading-snug">{t.desc}</p>}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
                className="shrink-0 text-faint hover:text-ink transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): ToastCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
