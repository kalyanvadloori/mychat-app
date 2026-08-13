import type { Attachment, CallLog, Conversation, Message, User } from '../types';

export type Unsubscribe = () => void;

/**
 * The single seam between the UI and the backend.
 *
 * Everything above this interface is backend-agnostic: `mockChatService` and
 * `firebaseChatService` both satisfy it, and `getChatService()` picks one at
 * startup based on whether Firebase env keys are present.
 */
export interface ChatService {
  /** The signed-in user. Available synchronously — the service is created after auth resolves. */
  currentUser(): User;

  /** Every user the current user can start a conversation with (including themselves). */
  subscribeUsers(cb: (users: User[]) => void): Unsubscribe;
  subscribeConversations(cb: (conversations: Conversation[]) => void): Unsubscribe;
  subscribeMessages(conversationId: string, cb: (messages: Message[]) => void): Unsubscribe;
  /** Fires with true while the *other* participant is typing. */
  subscribeTyping(conversationId: string, cb: (isTyping: boolean) => void): Unsubscribe;

  sendMessage(conversationId: string, text: string, attachments?: Attachment[]): Promise<void>;
  /** Appends a call record to the thread. Written by whoever placed the call. */
  logCall(conversationId: string, call: CallLog): Promise<void>;
  markRead(conversationId: string): void;
  setTyping(conversationId: string, typing: boolean): void;
  setMuted(conversationId: string, muted: boolean): void;

  /** Returns the id of the 1:1 conversation with `peerId`, creating it if needed. */
  openConversationWith(peerId: string): Promise<string>;

  /**
   * Vanish mode: permanently deletes every message and call record that BOTH
   * participants have already seen, and clears the conversation preview when
   * nothing is left. Called when the user leaves an open thread.
   */
  purgeSeen(conversationId: string): Promise<void>;

  /** True when file attachments can actually be uploaded by this backend. */
  supportsAttachments: boolean;

  /** Stop timers/listeners. Called on sign-out. */
  dispose(): void;
}
