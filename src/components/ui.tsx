import { useEffect, useRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";

/* ================= Button ================= */

type Variant = "primary" | "lime" | "secondary" | "ghost" | "danger" | "danger-solid";
type Size = "sm" | "md" | "lg" | "icon";

const variantCls: Record<Variant, string> = {
  primary:
    "bg-accent text-[#04252a] font-bold hover:brightness-110 shadow-[0_6px_24px_-8px_rgba(53,224,230,0.55)]",
  lime: "bg-accent2 text-[#1b2a04] font-bold hover:brightness-105 shadow-[0_6px_24px_-8px_rgba(184,240,79,0.45)]",
  secondary:
    "bg-surface-2 text-ink border border-line hover:border-line-strong hover:bg-surface-3 font-semibold",
  ghost: "text-muted hover:text-ink hover:bg-surface-2 font-semibold",
  danger:
    "text-danger border border-danger/35 bg-danger-soft hover:bg-danger hover:text-[#2a060a] font-bold",
  "danger-solid": "bg-danger text-[#2a060a] hover:brightness-110 font-bold",
};

const sizeCls: Record<Size, string> = {
  sm: "h-8 px-3 text-xs rounded-lg gap-1.5",
  md: "h-10 px-4 text-sm rounded-lg gap-2",
  lg: "h-12 px-6 text-[15px] rounded-xl gap-2.5",
  icon: "h-10 w-10 rounded-lg grid place-items-center",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({
  variant = "secondary",
  size = "md",
  className = "",
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center select-none transition-all duration-150 active:scale-[0.95] disabled:opacity-45 disabled:pointer-events-none cursor-pointer ${variantCls[variant]} ${sizeCls[size]} ${className}`}
      {...rest}
    />
  );
}

/* ================= Badge ================= */

type Tone = "cyan" | "lime" | "danger" | "warn" | "ok" | "muted";
const toneCls: Record<Tone, string> = {
  cyan: "bg-accent-soft text-accent-ink border-accent/25",
  lime: "bg-accent2-soft text-accent2-ink border-accent2/25",
  danger: "bg-danger-soft text-danger border-danger/25",
  warn: "bg-warn/12 text-warn border-warn/25",
  ok: "bg-ok/12 text-ok border-ok/25",
  muted: "bg-surface-2 text-muted border-line",
};

export function Badge({
  tone = "muted",
  children,
  className = "",
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border font-mono text-[10px] font-semibold uppercase tracking-[0.14em] ${toneCls[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/* ================= StatusDot ================= */

export function StatusDot({
  tone,
  pulse = false,
  className = "",
}: {
  tone: "ok" | "warn" | "danger" | "accent" | "muted";
  pulse?: boolean;
  className?: string;
}) {
  const color = {
    ok: "bg-ok",
    warn: "bg-warn",
    danger: "bg-danger",
    accent: "bg-accent",
    muted: "bg-faint",
  }[tone];
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full shrink-0 ${color} ${
        pulse && tone === "ok" ? "pulse-dot" : ""
      } ${pulse && tone === "danger" ? "live-dot" : ""} ${className}`}
    />
  );
}

/* ================= Avatar (initials) ================= */

const AVATAR_TONES = [
  "bg-accent-soft text-accent-ink border-accent/30",
  "bg-accent2-soft text-accent2-ink border-accent2/30",
  "bg-warn/12 text-warn border-warn/30",
  "bg-ok/12 text-ok border-ok/30",
];

export function Avatar({
  name,
  size = 40,
  className = "",
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "?";
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const tone = AVATAR_TONES[hash % AVATAR_TONES.length];
  return (
    <span
      className={`inline-grid place-items-center rounded-xl border font-display font-semibold shrink-0 ${tone} ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}

/* ================= Kbd ================= */

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-grid place-items-center min-w-[20px] h-5 px-1.5 rounded-md border border-line-strong bg-surface-2 font-mono text-[10px] font-semibold text-muted shadow-[inset_0_-1.5px_0_var(--line-strong)]">
      {children}
    </kbd>
  );
}

/* ================= Tooltip ================= */

export function Tooltip({
  label,
  children,
  side = "top",
}: {
  label: ReactNode;
  children: ReactNode;
  side?: "top" | "bottom";
}) {
  return (
    <span className="relative group/tip inline-flex">
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute left-1/2 -translate-x-1/2 z-50 whitespace-nowrap rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-[11px] font-semibold text-ink opacity-0 translate-y-1 transition-all duration-150 group-hover/tip:opacity-100 group-hover/tip:translate-y-0 shadow-xl ${
          side === "top" ? "bottom-full mb-2" : "top-full mt-2"
        }`}
      >
        {label}
      </span>
    </span>
  );
}

/* ================= ProgressBar ================= */

export function ProgressBar({
  value,
  tone = "cyan",
  className = "",
  label,
}: {
  value: number;
  tone?: "cyan" | "lime" | "danger" | "warn";
  className?: string;
  label?: string;
}) {
  const bar = {
    cyan: "bg-accent",
    lime: "bg-accent2",
    danger: "bg-danger",
    warn: "bg-warn",
  }[tone];
  return (
    <div
      className={`h-1.5 w-full rounded-full bg-surface-3 overflow-hidden ${className}`}
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={`h-full rounded-full ${bar} transition-[width] duration-500 ease-out`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

/* ================= Modal ================= */

export function Modal({
  open,
  onClose,
  title,
  kicker,
  children,
  width = "max-w-md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  kicker?: string;
  children: ReactNode;
  width?: string;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] grid place-items-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.18 }}
        >
          <div className="absolute inset-0 bg-[#04060c]/70 backdrop-blur-[3px]" onClick={onClose} />
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={`relative w-full ${width} rounded-2xl border border-line bg-surface shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)]`}
            initial={{ opacity: 0, y: reduce ? 0 : 16, scale: reduce ? 1 : 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: reduce ? 0 : 10, scale: reduce ? 1 : 0.98 }}
            transition={{ duration: reduce ? 0 : 0.22, ease: "easeOut" }}
          >
            <div className="flex items-start justify-between gap-4 px-6 pt-5">
              <div>
                {kicker && (
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-accent-ink mb-1">
                    {kicker}
                  </p>
                )}
                <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
              </div>
              <button
                onClick={onClose}
                aria-label="Close dialog"
                className="h-8 w-8 grid place-items-center rounded-lg text-muted hover:text-ink hover:bg-surface-2 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <div className="px-6 pb-6 pt-3">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
