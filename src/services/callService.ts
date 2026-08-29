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
}

export class TokenServerError extends Error {
  hint: string;
  constructor(message: string, hint: string) {
    super(message);
    this.hint = hint;
  }
}

export async function getStreamToken(displayName: string): Promise<TokenResponse> {
  const url = `${TOKEN_URL}/token?name=${encodeURIComponent(displayName || "guest")}`;
  let res: Response;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
  } catch {
    throw new TokenServerError(
      "Token server unreachable",
      "Start it locally:  node token-server.mjs  (expects .env with STREAM_API_KEY + STREAM_SECRET_KEY).",
    );
  }
  if (!res.ok) {
    throw new TokenServerError(
      `Token server replied ${res.status}`,
      "Check token-server.mjs logs — credentials may be missing or the Stream app inactive.",
    );
  }
  const data = (await res.json()) as TokenResponse;
  if (!data.token || !data.apiKey) {
    throw new TokenServerError("Malformed token response", "Expected { token, apiKey } from /token.");
  }
  return data;
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
