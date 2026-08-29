import { Hand, Mic, MicOff, UserX, Video, VideoOff, VolumeX } from "lucide-react";
import { useCallCtx } from "../context/CallContext";
import { isAudioMuted, isVideoMuted } from "../services/participantUtils";
import { Avatar, Badge, Tooltip } from "./ui";

export function ParticipantList() {
  const { participants, local, hands, isMentor, muteAll, muteUser, kickUser, rolesMap } =
    useCallCtx();

  const ordered = [
    ...participants.filter((p) => p.sessionId === local?.sessionId),
    ...participants.filter((p) => p.sessionId !== local?.sessionId),
  ];

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="flex items-center justify-between px-4 py-3 border-b border-line/70">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-faint">
          In this room · {participants.length}
        </p>
        {isMentor && participants.length > 1 && (
          <button
            onClick={muteAll}
            className="flex items-center gap-1.5 rounded-lg border border-warn/35 bg-warn/10 px-2.5 h-7 text-[11px] font-bold text-warn hover:bg-warn/20 transition-colors cursor-pointer"
          >
            <VolumeX size={12} />
            Mute all
          </button>
        )}
      </div>

      <ul className="px-2.5 py-2 space-y-1">
        {ordered.map((p) => {
          const isLocal = p.sessionId === local?.sessionId;
          const nm = (p.name || p.userId || "Participant").trim();
          const hand = hands[p.userId]?.raised;
          const pRole = rolesMap[p.userId];
          const aMuted = isAudioMuted(p);
          const vMuted = isVideoMuted(p);
          return (
            <li
              key={p.sessionId}
              className="group flex items-center gap-2.5 rounded-xl border border-transparent hover:border-line hover:bg-surface-2 px-2.5 py-2 transition-colors"
            >
              <Avatar name={nm} size={34} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[13px] font-bold text-ink truncate">
                    {nm}
                    {isLocal && <span className="text-faint font-semibold"> · you</span>}
                  </span>
                  {pRole === "mentor" && <Badge tone="lime">Mentor</Badge>}
                </span>
                <span className="flex items-center gap-1.5 mt-0.5">
                  <span className={`flex items-center gap-1 text-[10.5px] font-semibold ${aMuted ? "text-danger" : "text-muted"}`}>
                    {aMuted ? <MicOff size={11} /> : <Mic size={11} />}
                    {aMuted ? "muted" : "mic on"}
                  </span>
                  <span className={`flex items-center gap-1 text-[10.5px] font-semibold ${vMuted ? "text-faint" : "text-muted"}`}>
                    {vMuted ? <VideoOff size={11} /> : <Video size={11} />}
                    {vMuted ? "cam off" : "cam on"}
                  </span>
                  {hand && (
                    <span className="flex items-center gap-1 text-[10.5px] font-bold text-accent2-ink">
                      <Hand size={11} />
                      hand up
                    </span>
                  )}
                </span>
              </span>

              {isMentor && !isLocal && (
                <span className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                  <Tooltip label="Mute" side="top">
                    <button
                      onClick={() => muteUser(p.userId, nm)}
                      aria-label={`Mute ${nm}`}
                      className="grid place-items-center h-7 w-7 rounded-lg border border-line bg-surface text-muted hover:text-warn hover:border-warn/40 transition-colors cursor-pointer"
                    >
                      <MicOff size={13} />
                    </button>
                  </Tooltip>
                  <Tooltip label="Remove from session" side="top">
                    <button
                      onClick={() => kickUser(p.userId, nm)}
                      aria-label={`Remove ${nm} from session`}
                      className="grid place-items-center h-7 w-7 rounded-lg border border-line bg-surface text-muted hover:text-danger hover:border-danger/40 transition-colors cursor-pointer"
                    >
                      <UserX size={13} />
                    </button>
                  </Tooltip>
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
