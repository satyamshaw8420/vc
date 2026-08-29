import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Focus as FocusIcon,
  Hand,
  MessageSquare,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  Users,
  Video,
  VideoOff,
} from "lucide-react";
import { useCallCtx } from "../context/CallContext";
import { Kbd, Modal, Tooltip } from "./ui";

export function ControlBar() {
  const ctx = useCallCtx();
  const reduce = useReducedMotion();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const {
    micOn,
    camOn,
    sharing,
    handRaised,
    unread,
    drawerOpen,
    drawerTab,
    openDrawer,
    setDrawerOpen,
    toggleMic,
    toggleCam,
    toggleShare,
    toggleHand,
    isMentor,
    leave,
    endForAll,
  } = ctx;

  /* keyboard shortcuts */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      )
        return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === "m") toggleMic();
      else if (k === "c") toggleCam();
      else if (k === "r") toggleHand();
      else if (e.key === "/") {
        e.preventDefault();
        openDrawer("chat");
        window.setTimeout(() => document.getElementById("ss-chat-input")?.focus(), 80);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleMic, toggleCam, toggleHand, openDrawer]);

  return (
    <>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 sm:gap-1.5 rounded-2xl border border-line bg-surface/95 backdrop-blur px-2 py-2 shadow-[0_24px_70px_-18px_rgba(0,0,0,0.85)]">
        <ControlBtn
          label={micOn ? "Mute mic" : "Unmute mic"}
          kbd="M"
          onClick={toggleMic}
          tone={micOn ? "default" : "danger"}
          pulse={!micOn}
          aria-pressed={!micOn}
        >
          {micOn ? <Mic size={18} /> : <MicOff size={18} />}
        </ControlBtn>
        <ControlBtn
          label={camOn ? "Turn camera off" : "Turn camera on"}
          kbd="C"
          onClick={toggleCam}
          tone={camOn ? "default" : "danger"}
          aria-pressed={!camOn}
        >
          {camOn ? <Video size={18} /> : <VideoOff size={18} />}
        </ControlBtn>
        <ControlBtn
          label={sharing ? "Stop screen share" : "Share screen"}
          onClick={toggleShare}
          tone={sharing ? "accent" : "default"}
          aria-pressed={sharing}
        >
          <MonitorUp size={18} />
        </ControlBtn>
        <ControlBtn
          label={handRaised ? "Lower hand" : "Raise hand"}
          kbd="R"
          onClick={toggleHand}
          tone={handRaised ? "lime" : "default"}
          bounce={handRaised}
          aria-pressed={handRaised}
        >
          <Hand size={18} />
        </ControlBtn>

        <span className="mx-1 h-7 w-px bg-line" aria-hidden="true" />

        <ControlBtn
          label="Participants"
          onClick={() => (drawerOpen && drawerTab === "people" ? setDrawerOpen(false) : openDrawer("people"))}
          tone={drawerOpen && drawerTab === "people" ? "accent" : "default"}
          aria-pressed={drawerOpen && drawerTab === "people"}
        >
          <Users size={18} />
        </ControlBtn>
        <ControlBtn
          label="Chat"
          kbd="/"
          onClick={() => (drawerOpen && drawerTab === "chat" ? setDrawerOpen(false) : openDrawer("chat"))}
          tone={drawerOpen && drawerTab === "chat" ? "accent" : "default"}
          aria-pressed={drawerOpen && drawerTab === "chat"}
        >
          <MessageSquare size={18} />
          {unread > 0 && (
            <motion.span
              key={unread}
              initial={{ scale: reduce ? 1 : 0.4 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 18 }}
              className="absolute -top-1.5 -right-1.5 grid place-items-center min-w-[18px] h-[18px] px-1 rounded-full bg-accent2 text-[#1b2a04] font-mono text-[10px] font-bold"
            >
              {unread > 9 ? "9+" : unread}
            </motion.span>
          )}
        </ControlBtn>
        <ControlBtn
          label="Focus monitor"
          onClick={() => (drawerOpen && drawerTab === "focus" ? setDrawerOpen(false) : openDrawer("focus"))}
          tone={drawerOpen && drawerTab === "focus" ? "accent" : "default"}
          aria-pressed={drawerOpen && drawerTab === "focus"}
        >
          <FocusIcon size={18} />
        </ControlBtn>

        <span className="mx-1 h-7 w-px bg-line" aria-hidden="true" />

        <Tooltip label="End call" side="top">
          <button
            onClick={() => setConfirmOpen(true)}
            className="flex items-center gap-2 h-11 sm:h-12 px-4 rounded-xl bg-danger text-[#2a060a] font-bold text-sm transition-all hover:brightness-110 hover:-translate-y-0.5 active:scale-95 cursor-pointer"
          >
            <PhoneOff size={17} />
            <span className="hidden sm:inline">End</span>
          </button>
        </Tooltip>
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="End this session?"
        kicker="Confirm"
      >
        <p className="text-sm text-muted leading-relaxed">
          Session ka summary + transcript download tumhe end screen par milega.
          {isMentor && " Mentor hone ke naate tum poore room ko bhi band kar sakte ho."}
        </p>
        <div className="mt-5 grid gap-2">
          <button
            onClick={() => {
              setConfirmOpen(false);
              leave();
            }}
            className="h-11 rounded-xl bg-danger text-[#2a060a] font-bold text-sm hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
          >
            Leave room
          </button>
          {isMentor && (
            <button
              onClick={() => {
                setConfirmOpen(false);
                endForAll();
              }}
              className="h-11 rounded-xl border border-danger/40 bg-danger-soft text-danger font-bold text-sm hover:bg-danger hover:text-[#2a060a] active:scale-[0.98] transition-all cursor-pointer"
            >
              End for everyone
            </button>
          )}
          <button
            onClick={() => setConfirmOpen(false)}
            className="h-11 rounded-xl border border-line bg-surface-2 text-muted font-bold text-sm hover:text-ink active:scale-[0.98] transition-all cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </Modal>
    </>
  );
}

function ControlBtn({
  label,
  kbd,
  onClick,
  tone = "default",
  children,
  pulse = false,
  bounce = false,
  ...rest
}: {
  label: string;
  kbd?: string;
  onClick: () => void;
  tone?: "default" | "danger" | "accent" | "lime";
  children: ReactNode;
  pulse?: boolean;
  bounce?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const reduce = useReducedMotion();
  const toneCls = {
    default: "border-line bg-surface-2 text-ink hover:border-line-strong hover:bg-surface-3",
    danger: "border-danger/40 bg-danger-soft text-danger",
    accent: "border-accent/45 bg-accent-soft text-accent",
    lime: "border-accent2/45 bg-accent2-soft text-accent2",
  }[tone];

  return (
    <Tooltip
      label={
        <span className="flex items-center gap-1.5">
          {label}
          {kbd && <Kbd>{kbd}</Kbd>}
        </span>
      }
      side="top"
    >
      <button
        aria-label={label}
        onClick={onClick}
        className={`relative h-11 w-11 sm:h-12 sm:w-12 grid place-items-center rounded-xl border transition-all duration-150 hover:-translate-y-0.5 active:scale-90 cursor-pointer ${toneCls} ${
          pulse ? "mic-pulse" : ""
        }`}
        {...rest}
      >
        <motion.span
          animate={bounce && !reduce ? { y: [0, -4, 0] } : undefined}
          transition={bounce && !reduce ? { duration: 0.7, repeat: Infinity, ease: "easeInOut" } : undefined}
          className="grid place-items-center"
        >
          {children}
        </motion.span>
      </button>
    </Tooltip>
  );
}
