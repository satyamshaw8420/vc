import { Check, Copy, Link2, MessageCircle } from "lucide-react";
import { useCallCtx } from "../context/CallContext";
import { useClipboard } from "../hooks/useClipboard";
import { buildInviteUrl } from "../services/callService";
import { Button } from "./ui";

/** Invite body — used inside the TopBar modal and the solo "waiting" overlay. */
export function InviteCardBody({ compact = false }: { compact?: boolean }) {
  const { callId } = useCallCtx();
  const { copied: linkCopied, copy: copyLink } = useClipboard();
  const { copied: codeCopied, copy: copyCode } = useClipboard();
  const url = buildInviteUrl(callId);

  return (
    <div className={compact ? "" : "space-y-4"}>
      <div className={`rounded-xl border border-accent/30 bg-accent-soft px-4 ${compact ? "py-3" : "py-4"} text-center`}>
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-accent-ink mb-1">
          Session code
        </p>
        <p className="font-display text-2xl font-bold tracking-[0.06em] text-ink break-all">
          {callId}
        </p>
      </div>

      <div className={`${compact ? "mt-3" : ""} grid gap-2`}>
        <Button
          variant={linkCopied ? "lime" : "primary"}
          onClick={() => copyLink(url)}
          aria-label="Copy invite link"
        >
          {linkCopied ? <Check size={15} /> : <Link2 size={15} />}
          {linkCopied ? "Link copied" : "Copy invite link"}
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => copyCode(callId)} aria-label="Copy session code">
            {codeCopied ? <Check size={14} className="text-ok" /> : <Copy size={14} />}
            Code
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              const text = `SkillSignal Sessions — ${callId}\nJoin here: ${url}`;
              window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
            }}
            aria-label="Share on WhatsApp"
          >
            <MessageCircle size={14} className="text-accent2-ink" />
            WhatsApp
          </Button>
        </div>
      </div>

      <p className="text-[11px] text-faint leading-relaxed">
        Student ya co-mentor — koi bhi lobby mein yeh code daal kar join kar sakta hai. Dev
        environment mein auth checks off hain.
      </p>
    </div>
  );
}
