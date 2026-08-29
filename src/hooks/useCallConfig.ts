import { useCallback, useEffect, useRef, useState } from "react";
import { StreamVideoClient } from "@stream-io/video-react-sdk";
import type { Call } from "@stream-io/video-react-sdk";
import { getStreamToken } from "../services/callService";

export type CallConfigStatus = "fetching" | "ready" | "error";

export interface CallConfig {
  status: CallConfigStatus;
  client: StreamVideoClient | null;
  call: Call | null;
  userId: string;
  error: { message: string; hint: string } | null;
  retry: () => void;
}

/**
 * Fetches a user token from the token server, boots a StreamVideoClient and
 * prepares the `default` call object. Joining happens later (Room page).
 */
export function useCallConfig(displayName: string, callId: string): CallConfig {
  const [status, setStatus] = useState<CallConfigStatus>("fetching");
  const [client, setClient] = useState<StreamVideoClient | null>(null);
  const [call, setCall] = useState<Call | null>(null);
  const [userId, setUserId] = useState("");
  const [error, setError] = useState<{ message: string; hint: string } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const clientRef = useRef<StreamVideoClient | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus("fetching");
    setError(null);

    (async () => {
      try {
        const { token, apiKey, userId: uid } = await getStreamToken(displayName);
        if (cancelled) return;
        const c = new StreamVideoClient({
          apiKey,
          user: { id: uid, name: displayName.trim() || "Guest" },
          token,
        });
        clientRef.current = c;
        setClient(c);
        setUserId(uid);
        setCall(c.call("default", callId));
        setStatus("ready");
      } catch (e) {
        if (cancelled) return;
        const err = e as { message?: string; hint?: string };
        setError({
          message: err.message || "Could not obtain a Stream token",
          hint: err.hint || "Verify the token server is running and reachable.",
        });
        setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      // Drop the previous client when identity/callId change or on unmount
      const prev = clientRef.current;
      clientRef.current = null;
      if (prev) {
        prev.disconnectUser().catch(() => undefined);
      }
    };
  }, [displayName, callId, attempt]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);

  return { status, client, call, userId, error, retry };
}
