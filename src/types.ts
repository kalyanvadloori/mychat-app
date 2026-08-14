export type Presence = 'online' | 'away' | 'offline';

export interface User {
  id: string;
  name: string;
  /** Optional photo URL. When absent a gradient initials avatar is rendered. */
  avatar?: string;
  presence: Presence;
  /** Short status line shown in the profile panel. */
  about?: string;
  lastSeen?: number;
}

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read';

export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: 'image' | 'file';
  /** Object URL (mock) or download URL (Firebase Storage later). */
  url?: string;
}

export type CallOutcome = 'completed' | 'missed' | 'declined' | 'cancelled';

/** Call history rendered inline in the thread, the way WhatsApp logs calls. */
export interface CallLog {
  kind: CallKind;
  outcome: CallOutcome;
  /** Seconds connected; 0 for anything that never connected. */
  durationSec: number;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: number;
  status: MessageStatus;
  attachments?: Attachment[];
  /** Present when this entry is a call record rather than a typed message. */
  call?: CallLog;
  /** Set when the sender has changed the text since sending it. */
  editedAt?: number;
}

export interface Conversation {
  id: string;
  /** Ids of every participant, including the current user. */
  participantIds: string[];
  lastMessage?: Message;
  unreadCount: number;
  pinned?: boolean;
  muted?: boolean;
}

export type CallKind = 'video' | 'audio';
export type CallState = 'idle' | 'ringing' | 'incoming' | 'connected' | 'ended';

/**
 * A call invitation, written to the conversation so the other device learns a
 * call is being offered. Agora carries the media but knows nothing about
 * ringing — it only connects people who have already joined the same channel.
 */
export interface CallInvite {
  conversationId: string;
  /** Who placed the call. */
  from: string;
  kind: CallKind;
  createdAt: number;
  status: 'ringing' | 'accepted' | 'declined' | 'ended';
}

export interface Call {
  /** Thread the call belongs to; doubles as the Agora channel name. */
  conversationId: string;
  /** The signed-in user's id, used to derive a stable Agora uid. */
  selfId: string;
  peer: User;
  kind: CallKind;
  state: CallState;
  /** True when we placed the call. Only the caller writes the history record. */
  outgoing?: boolean;
  /** Set the moment the call connects; drives both the timer and the logged duration. */
  startedAt?: number;
}
