import type { RecentCall } from "../types";

/** Public Stream API key — safe for the browser bundle. Overridable via .env */
export const STREAM_API_KEY: string =
  (import.meta.env.VITE_STREAM_API_KEY as string | undefined) ?? "pge5uhef9ux4";

/** Token server base URL. Never embed the secret key anywhere in src/. */
export const TOKEN_URL: string =
  (import.meta.env.VITE_TOKEN_URL as string | undefined)?.replace(/\/$/, "") ??
  "http://localhost:8002";

/* ---------------- call id ---------------- */

// Unambiguous alphabet: no 0/O, no 1/l/I
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

const randomBlock = (len: number) => {
  let out = "";
  const rnd = new Uint32Array(len);
  crypto.getRandomValues(rnd);
  for (let i = 0; i < len; i++) out += ALPHABET[rnd[i] % ALPHABET.length];
  return out;
};

/** SS-XXXX-XXXX — this string is the Stream `default` call type id. */
export function generateCallId(): string {
  return `SS-${randomBlock(4)}-${randomBlock(4)}`;
}

/** Normalize free-form user input → "SS-XXXX-XXXX" or null when invalid. */
export function normalizeCallId(raw: string): string | null {
  const chars = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const core = chars.startsWith("SS") ? chars.slice(2) : chars;
  if (core.length !== 8) return null;
  return `SS-${core.slice(0, 4)}-${core.slice(4)}`;
}

export const isSameCallId = (a: string, b: string) => normalizeCallId(a) === normalizeCallId(b);

/* ---------------- token ---------------- */

export interface TokenResponse {
  token: string;
  apiKey: string;
  userId: string;
  mode: string;
  /** true = token server was unreachable → browser devToken fallback used */
  fallback: boolean;
}

export class TokenServerError extends Error {
  hint: string;
  constructor(message: string, hint: string) {
    super(message);
    this.hint = hint;
  }
}

const sanitizeUserId = (raw: string): string => {
  const base = String(raw || "")
    .trim()
    .slice(0, 48)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || `guest-${Math.random().toString(36).slice(2, 8)}`;
};

/**
 * Browser-side Stream dev token — identical to `client.devToken(userId)` from
 * @stream-io/node-sdk (alg: "none", unsigned, 1-week expiry). Accepted ONLY
 * when the Stream app runs in a Development environment (auth checks off),
 * so no secret key ever touches the frontend.
 */
export function browserDevToken(userId: string): string {
  const b64url = (obj: Record<string, unknown>) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  const iat = Math.floor(Date.now() / 1000) - 60;
  const exp = iat + 60 * 60 * 24 * 7;
  return `${b64url({ typ: "JWT", alg: "none" })}.${b64url({ user_id: userId, iat, exp })}.`;
}

export async function getStreamToken(displayName: string): Promise<TokenResponse> {
  const userId = sanitizeUserId(displayName || "guest");

  // Dev fallback: token server skipped entirely on https pages (mixed content)
  const mixedContent =
    typeof window !== "undefined" &&
    window.location.protocol === "https:" &&
    TOKEN_URL.startsWith("http:");

  if (!mixedContent) {
    const url = `${TOKEN_URL}/token?name=${encodeURIComponent(displayName || "guest")}`;
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 6000);
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(t);
      if (res.ok) {
        const data = (await res.json()) as Omit<TokenResponse, "fallback">;
        if (data.token && data.apiKey) {
          return { ...data, fallback: false };
        }
      }
      // non-ok status → fall through to devToken fallback
    } catch {
      // unreachable / aborted → fall through to devToken fallback
    }
  }

  // Fallback path — works because the Stream app is in Development env
  return {
    token: browserDevToken(userId),
    apiKey: STREAM_API_KEY,
    userId,
    mode: mixedContent ? "dev-fallback (mixed content)" : "dev-fallback",
    fallback: true,
  };
}

export async function pingTokenServer(): Promise<boolean> {
  // Avoid guaranteed mixed-content failures (https page → http token server):
  // the browser would log a blocked request and the answer is already known.
  if (
    typeof window !== "undefined" &&
    window.location.protocol === "https:" &&
    TOKEN_URL.startsWith("http:")
  ) {
    return false;
  }
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(`${TOKEN_URL}/health`, { signal: ctrl.signal });
    clearTimeout(t);
    const data = (await res.json()) as { ok?: boolean };
    return res.ok && data.ok === true;
  } catch {
    return false;
  }
}

/* ---------------- recent calls (localStorage) ---------------- */

const RECENT_KEY = "ss.recentCalls";

export function getRecentCalls(): RecentCall[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as RecentCall[]) : [];
  } catch {
    return [];
  }
}

export function addRecentCall(entry: RecentCall): RecentCall[] {
  const next = [entry, ...getRecentCalls().filter((c) => c.callId !== entry.callId)].slice(0, 8);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* non-fatal */
  }
  return next;
}

/* ---------------- misc ---------------- */

export const formatClock = (ts: number) =>
  new Date(ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

export const buildInviteUrl = (callId: string) =>
  `${window.location.origin}${window.location.pathname}?call=${encodeURIComponent(callId)}`;
