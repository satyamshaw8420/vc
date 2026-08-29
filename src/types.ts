export type Role = "mentor" | "student";

export type Page = "lobby" | "prejoin" | "room" | "ended";

export interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  role: Role;
  ts: number;
  own: boolean;
}

export interface RecentCall {
  callId: string;
  name: string;
  role: Role;
  ts: number;
}

export interface SessionSummary {
  callId: string;
  startedAt: number | null;
  endedAt: number;
  participantNames: string[];
  messagesCount: number;
  raisedCount: number;
}

export interface JoinPrefs {
  micOn: boolean;
  camOn: boolean;
}
