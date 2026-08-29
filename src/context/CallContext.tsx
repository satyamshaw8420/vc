import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { CallingState, useCallStateHooks } from "@stream-io/video-react-sdk";
import type { Call, StreamVideoParticipant } from "@stream-io/video-react-sdk";
import type { ChatMessage, JoinPrefs, Role, SessionSummary } from "../types";
import { loadTranscript, saveTranscript } from "../services/chatService";
import { useToast } from "../components/Toast";
import { useSession } from "./SessionContext";

export type DrawerTab = "chat" | "people" | "focus";

interface HandInfo {
  name: string;
  raised: boolean;
}

interface CallCtxValue {
  call: Call;
  userId: string;
  displayName: string;
  role: Role;
  isMentor: boolean;
  callId: string;
  callingState: CallingState;
  joinError: string | null;
  participants: StreamVideoParticipant[];
  local: StreamVideoParticipant | undefined;
  dominant: StreamVideoParticipant | undefined;
  startedAt: number | null;
  latencyMs: number | null;
  messages: ChatMessage[];
  sendMessage: (text: string) => Promise<void>;
  rolesMap: Record<string, Role>;
  hands: Record<string, HandInfo>;
  handRaised: boolean;
  toggleHand: () => void;
  unread: number;
  drawerOpen: boolean;
  setDrawerOpen: (v: boolean) => void;
  drawerTab: DrawerTab;
  openDrawer: (tab: DrawerTab) => void;
  micOn: boolean;
  camOn: boolean;
  sharing: boolean;
  toggleMic: () => void;
  toggleCam: () => void;
  toggleShare: () => void;
  leave: () => void;
  endForAll: () => void;
  muteAll: () => void;
  muteUser: (userId: string, name: string) => void;
  kickUser: (userId: string, name: string) => void;
}

const Ctx = createContext<CallCtxValue | null>(null);

type Off = (() => void) | { unsubscribe: () => void } | undefined;
const unsubscribe = (off: Off) => {
  if (typeof off === "function") off();
  else off?.unsubscribe?.();
};

const joinedAtMs = (p: StreamVideoParticipant): number => {
  const ja = (p as { joinedAt?: unknown }).joinedAt;
  if (!ja) return 0;
  const t = new Date(ja as string | number | Date).getTime();
  return Number.isFinite(t) ? t : 0;
};

export function CallProvider({
  call,
  userId,
  displayName,
  role,
  callId,
  joinPrefs,
  children,
}: {
  call: Call;
  userId: string;
  displayName: string;
  role: Role;
  callId: string;
  joinPrefs: JoinPrefs;
  children: ReactNode;
}) {
  const { push } = useToast();
  const { setSummary, goto } = useSession();

  /* ---------- subscribed call state ---------- */
  const {
    useCallCallingState,
    useRawParticipants,
    useLocalParticipant,
    useDominantSpeaker,
    useCallStartedAt,
    useCallStatsReport,
  } = useCallStateHooks();
  const callingState = useCallCallingState();
  const rawParticipants = useRawParticipants();
  const local = useLocalParticipant();
  const dominant = useDominantSpeaker();
  const startedAtDate = useCallStartedAt();
  const statsReport = useCallStatsReport();

  const startedAt = startedAtDate ? startedAtDate.getTime() : null;

  /* ---------- local ui state ---------- */
  const [joinError, setJoinError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadTranscript(callId));
  const [hands, setHands] = useState<Record<string, HandInfo>>({});
  const [unread, setUnread] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>("chat");
  const [sharing, setSharing] = useState(false);
  const [micOn, setMicOn] = useState(joinPrefs.micOn);
  const [camOn, setCamOn] = useState(joinPrefs.camOn);
  const [rolesMap, setRolesMap] = useState<Record<string, Role>>({ [userId]: role });

  /* ---------- refs ---------- */
  const joinedOnce = useRef(false);
  const leavingRef = useRef(false);
  const sentIds = useRef<Set<string>>(new Set());
  const helloReplied = useRef<Set<string>>(new Set());
  const prevSessions = useRef<Set<string> | null>(null);
  const namesSeen = useRef<Map<string, string>>(new Map());
  const messagesRef = useRef(messages);
  const startedAtRef = useRef(startedAt);
  const raisedCountRef = useRef(0);
  const drawerRef = useRef({ open: drawerOpen, tab: drawerTab });
  messagesRef.current = messages;
  startedAtRef.current = startedAt;
  drawerRef.current = { open: drawerOpen, tab: drawerTab };

  const participants = useMemo(() => {
    const list = [...rawParticipants];
    list.sort((a, b) => joinedAtMs(a) - joinedAtMs(b) || a.name.localeCompare(b.name));
    return list;
  }, [rawParticipants]);

  const latencyMs = useMemo(() => {
    const loose = statsReport as unknown as
      | { participants?: Record<string, { latency?: number }> }
      | undefined;
    const sid = local?.sessionId;
    if (!sid || !loose?.participants) return null;
    const v = loose.participants[sid]?.latency;
    return typeof v === "number" ? v : null;
  }, [statsReport, local?.sessionId]);

  const buildSummary = useCallback((): SessionSummary => {
    return {
      callId,
      startedAt: startedAtRef.current,
      endedAt: Date.now(),
      participantNames: Array.from(new Set(namesSeen.current.values())),
      messagesCount: messagesRef.current.length,
      raisedCount: raisedCountRef.current,
    };
  }, [callId]);

  /* ---------- join ---------- */
  useEffect(() => {
    if (joinedOnce.current) return;
    joinedOnce.current = true;
    (async () => {
      try {
        await call.join({ create: true, ring: false });
        if (!joinPrefs.micOn) {
          await call.microphone.disable().catch(() => undefined);
          setMicOn(false);
        }
        if (!joinPrefs.camOn) {
          await call.camera.disable().catch(() => undefined);
          setCamOn(false);
        }
        // Announce ourselves so others learn our SkillSignal role (mentor/student)
        call
          .sendCustomEvent({ kind: "hello", userId, name: displayName, role })
          .catch(() => undefined);
        push({ title: "Connected", desc: `Room ${callId} is live — code share karo.`, tone: "ok" });
      } catch (e) {
        const msg = (e as Error)?.message || "Unknown error";
        setJoinError(msg);
        push({ title: "Join failed", desc: msg, tone: "danger" });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [call]);

  /* ---------- join / leave toasts ---------- */
  useEffect(() => {
    const current = new Set(rawParticipants.map((p) => p.sessionId));
    for (const p of rawParticipants) {
      if (p.userId) namesSeen.current.set(p.userId, p.name || p.userId);
    }
    if (prevSessions.current === null) {
      prevSessions.current = current;
      return;
    }
    for (const p of rawParticipants) {
      if (!prevSessions.current.has(p.sessionId) && p.sessionId !== local?.sessionId) {
        push({ title: `${p.name || "Participant"} joined`, tone: "info" });
      }
    }
    if (current.size < prevSessions.current.size) {
      push({ title: "A participant left the room", tone: "warn" });
    }
    prevSessions.current = current;
  }, [rawParticipants, local?.sessionId, push]);

  /* ---------- custom events: chat + hand raise ---------- */
  useEffect(() => {
    const off = call.on("custom", (event) => {
      const payload = (event as { custom?: Record<string, unknown> }).custom;
      if (!payload || typeof payload !== "object") return;
      const kind = payload.kind as string | undefined;

      if (kind === "chat") {
        const msg: ChatMessage = {
          id: String(payload.id ?? Math.random()),
          text: String(payload.text ?? ""),
          senderId: String(payload.senderId ?? "unknown"),
          senderName: String(payload.senderName ?? "Participant"),
          role: (payload.role as Role) === "mentor" ? "mentor" : "student",
          ts: Number(payload.ts ?? Date.now()),
          own: false,
        };
        if (sentIds.current.has(msg.id) || !msg.text) return; // echo guard
        sentIds.current.add(msg.id);
        setMessages((prev) =>
          prev.some((m) => m.id === msg.id) ? prev : [...prev, msg].slice(-300),
        );
        if (!(drawerRef.current.open && drawerRef.current.tab === "chat")) {
          setUnread((u) => u + 1);
        }
      }

      if (kind === "hello") {
        const uid = String(payload.userId ?? "");
        const r: Role = (payload.role as Role) === "mentor" ? "mentor" : "student";
        if (uid) setRolesMap((prev) => ({ ...prev, [uid]: r }));
        // Reply once so late-joiners learn our role too
        if (uid && uid !== userId && !helloReplied.current.has(uid)) {
          helloReplied.current.add(uid);
          call
            .sendCustomEvent({ kind: "hello", userId, name: displayName, role })
            .catch(() => undefined);
        }
      }

      if (kind === "hand") {
        const uid = String(payload.userId ?? "");
        const nm = String(payload.name ?? "Participant");
        const raised = Boolean(payload.raised);
        if (!uid) return;
        if (raised) raisedCountRef.current += 1;
        setHands((prev) => ({ ...prev, [uid]: { name: nm, raised } }));
        if (raised && uid !== userId) {
          push({ title: `${nm} ne hand raise kiya`, tone: "info" });
        }
      }
    }) as Off;
    return () => unsubscribe(off);
  }, [call, userId, push]);

  /* ---------- transcript mirror ---------- */
  useEffect(() => {
    saveTranscript(callId, messages);
  }, [callId, messages]);

  /* ---------- session end watcher ---------- */
  useEffect(() => {
    if (leavingRef.current) return;
    if (callingState === CallingState.LEFT) {
      leavingRef.current = true;
      setSummary(buildSummary());
      goto("ended");
      push({ title: "Session ended", desc: "Room band ho gaya.", tone: "warn" });
    }
    if (callingState === CallingState.RECONNECTING_FAILED) {
      setJoinError("Connection lost — Stream se reconnect fail ho gaya.");
    }
  }, [callingState, buildSummary, goto, push, setSummary]);

  /* ---------- actions ---------- */
  const sendMessage = useCallback(
    async (text: string) => {
      const clean = text.trim();
      if (!clean) return;
      const msg: ChatMessage = {
        id: crypto.randomUUID(),
        text: clean,
        senderId: userId,
        senderName: displayName.trim() || "You",
        role,
        ts: Date.now(),
        own: true,
      };
      sentIds.current.add(msg.id);
      setMessages((prev) => [...prev, msg].slice(-300));
      try {
        await call.sendCustomEvent({
          kind: "chat",
          id: msg.id,
          text: msg.text,
          senderId: msg.senderId,
          senderName: msg.senderName,
          role: msg.role,
          ts: msg.ts,
        });
      } catch {
        push({
          title: "Message send nahi hua",
          desc: "Connection check karo — message local transcript mein save hai.",
          tone: "danger",
        });
      }
    },
    [call, userId, displayName, role, push],
  );

  const handRaised = Boolean(hands[userId]?.raised);

  const toggleHand = useCallback(() => {
    const next = !handRaised;
    if (next) raisedCountRef.current += 1;
    setHands((prev) => ({ ...prev, [userId]: { name: displayName, raised: next } }));
    call
      .sendCustomEvent({ kind: "hand", userId, name: displayName, raised: next })
      .catch(() => undefined);
  }, [call, userId, displayName, handRaised]);

  const toggleMic = useCallback(() => {
    call.microphone
      .toggle()
      .then((enabled) => setMicOn(Boolean(enabled)))
      .catch(() => push({ title: "Mic toggle failed", tone: "danger" }));
  }, [call, push]);

  const toggleCam = useCallback(() => {
    call.camera
      .toggle()
      .then((enabled) => setCamOn(Boolean(enabled)))
      .catch(() => push({ title: "Camera toggle failed", tone: "danger" }));
  }, [call, push]);

  const toggleShare = useCallback(async () => {
    try {
      if (sharing) {
        await call.screenShare.disable();
        setSharing(false);
        push({ title: "Screen share stopped", tone: "info" });
      } else {
        await call.screenShare.enable();
        setSharing(true);
        push({ title: "Screen share live", desc: "Participants ko ab tumhari screen dikh rahi hai.", tone: "ok" });
      }
    } catch {
      push({
        title: "Screen share failed",
        desc: "Picker cancel hua ya browser ne block kiya.",
        tone: "danger",
      });
    }
  }, [call, sharing, push]);

  // Sync when the browser's native "Stop sharing" pill fires
  useEffect(() => {
    if (!sharing || !local) return;
    const hasShare = local.publishedTracks?.some((t) => String(t).toLowerCase().includes("screenshare"));
    if (!hasShare) setSharing(false);
  }, [sharing, local, rawParticipants]);

  const leave = useCallback(() => {
    (async () => {
      leavingRef.current = true;
      try {
        await call.leave();
      } catch {
        /* already left */
      }
      setSummary(buildSummary());
      goto("ended");
    })();
  }, [call, buildSummary, goto, setSummary]);

  const endForAll = useCallback(() => {
    (async () => {
      try {
        await call.endCall();
      } catch {
        push({
          title: "End-for-all failed",
          desc: "Sirf call owner / moderator session sabke liye end kar sakta hai.",
          tone: "danger",
        });
        return;
      }
      leavingRef.current = true;
      try {
        await call.leave();
      } catch {
        /* fine */
      }
      setSummary(buildSummary());
      goto("ended");
      push({ title: "Session ended for everyone", tone: "warn" });
    })();
  }, [call, buildSummary, goto, push, setSummary]);

  /* ---------- moderator ---------- */
  const muteAll = useCallback(() => {
    const remoteIds = rawParticipants
      .filter((p) => p.sessionId !== local?.sessionId && p.userId)
      .map((p) => p.userId);
    if (remoteIds.length === 0) {
      push({ title: "Koi dusra participant nahi hai", tone: "info" });
      return;
    }
    call
      .muteUser(remoteIds, "audio")
      .then(() => push({ title: "Sab participants mute ho gaye", tone: "ok" }))
      .catch(() =>
        push({ title: "Mute-all failed", desc: "Call type mein mute permission check karo.", tone: "danger" }),
      );
  }, [call, rawParticipants, local?.sessionId, push]);

  const muteUser = useCallback(
    (uid: string, nm: string) => {
      call
        .muteUser(uid, "audio")
        .then(() => push({ title: `${nm} muted`, tone: "ok" }))
        .catch(() => push({ title: "Mute failed", desc: `${nm} ko mute nahi kar paye.`, tone: "danger" }));
    },
    [call, push],
  );

  const kickUser = useCallback(
    (uid: string, nm: string) => {
      (async () => {
        try {
          await call.updateCallMembers({ remove_members: [uid] });
          await call.blockUser(uid).catch(() => undefined);
          push({ title: `${nm} removed from session`, tone: "warn" });
        } catch {
          push({ title: "Remove failed", desc: `${nm} ko remove nahi kar paye (permissions).`, tone: "danger" });
        }
      })();
    },
    [call, push],
  );

  const openDrawer = useCallback((tab: DrawerTab) => {
    setDrawerTab(tab);
    setDrawerOpen(true);
    if (tab === "chat") setUnread(0);
  }, []);

  useEffect(() => {
    if (drawerOpen && drawerTab === "chat") setUnread(0);
  }, [drawerOpen, drawerTab, messages.length]);

  const value: CallCtxValue = {
    call,
    userId,
    displayName,
    role,
    isMentor: role === "mentor",
    callId,
    callingState,
    joinError,
    participants,
    local,
    dominant,
    startedAt,
    latencyMs,
    messages,
    sendMessage,
    rolesMap,
    hands,
    handRaised,
    toggleHand,
    unread,
    drawerOpen,
    setDrawerOpen,
    drawerTab,
    openDrawer,
    micOn,
    camOn,
    sharing,
    toggleMic,
    toggleCam,
    toggleShare,
    leave,
    endForAll,
    muteAll,
    muteUser,
    kickUser,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCallCtx(): CallCtxValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCallCtx must be used inside <CallProvider>");
  return ctx;
}
