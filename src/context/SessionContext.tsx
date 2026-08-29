import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { JoinPrefs, Page, Role, SessionSummary } from "../types";

interface SessionCtx {
  page: Page;
  goto: (p: Page) => void;
  name: string;
  setName: (n: string) => void;
  role: Role;
  setRole: (r: Role) => void;
  callId: string;
  setCallId: (id: string) => void;
  joinPrefs: JoinPrefs;
  setJoinPrefs: (p: JoinPrefs) => void;
  summary: SessionSummary | null;
  setSummary: (s: SessionSummary | null) => void;
}

const Ctx = createContext<SessionCtx | null>(null);

const load = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const save = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full / private mode — non-fatal */
  }
};

export function SessionProvider({ children }: { children: ReactNode }) {
  const [page, setPage] = useState<Page>("lobby");
  const [name, setNameState] = useState<string>(() => load("ss.name", ""));
  const [role, setRoleState] = useState<Role>(() => load("ss.role", "student"));
  const [callId, setCallIdState] = useState("");
  const [joinPrefs, setJoinPrefs] = useState<JoinPrefs>({ micOn: true, camOn: true });
  const [summary, setSummary] = useState<SessionSummary | null>(null);

  const setName = useCallback((n: string) => {
    setNameState(n);
    save("ss.name", n);
  }, []);
  const setRole = useCallback((r: Role) => {
    setRoleState(r);
    save("ss.role", r);
  }, []);
  const setCallId = useCallback((id: string) => setCallIdState(id.trim().toUpperCase()), []);

  const value = useMemo(
    () => ({
      page,
      goto: setPage,
      name,
      setName,
      role,
      setRole,
      callId,
      setCallId,
      joinPrefs,
      setJoinPrefs,
      summary,
      setSummary,
    }),
    [page, name, role, callId, joinPrefs, summary, setName, setRole, setCallId],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): SessionCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSession must be used inside <SessionProvider>");
  return ctx;
}
