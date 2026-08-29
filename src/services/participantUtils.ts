import type { StreamVideoParticipant } from "@stream-io/video-react-sdk";

/**
 * In this SDK version mute/publish state is reflected via `publishedTracks`
 * (muting unpublishes the track). Helpers normalize access for the UI.
 */
const published = (p: StreamVideoParticipant | undefined, match: (s: string) => boolean) =>
  Boolean(p?.publishedTracks?.some((t) => match(String(t).toLowerCase())));

export function isAudioMuted(p: StreamVideoParticipant | undefined): boolean {
  return !published(p, (s) => s.includes("audio") && !s.includes("screen"));
}

export function isVideoMuted(p: StreamVideoParticipant | undefined): boolean {
  return !published(p, (s) => s === "video");
}

export function isScreenSharing(p: StreamVideoParticipant | undefined): boolean {
  return (
    Boolean(p?.screenShareStream) ||
    published(p, (s) => s.includes("screenshare"))
  );
}
