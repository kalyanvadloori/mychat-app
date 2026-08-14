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

  /** Rewrites the text of one of your own messages. */
  editMessage(conversationId: string, messageId: string, text: string): Promise<void>;

  /** Unsends one of your own messages — it disappears for both people. */
  deleteMessage(conversationId: string, messageId: string): Promise<void>;
  markRead(conversationId: string): void;

  /**
   * Announces whether this user currently has the thread open. Vanish mode waits
   * for both people to leave, so each side needs to know if the other is looking.
   */
  setViewing(conversationId: string, viewing: boolean): void;
  setTyping(conversationId: string, typing: boolean): void;
  setMuted(conversationId: string, muted: boolean): void;

  /** Returns the id of the 1:1 conversation with `peerId`, creating it if needed. */
  openConversationWith(peerId: string): Promise<string>;

  /**
   * Vanish mode: permanently deletes the messages and call records the user has
   * seen, and clears the conversation preview when nothing is left. Called when
   * the user leaves an open thread. Deletion is shared — there is one copy.
   */
  purgeSeen(conversationId: string): Promise<void>;

  /** Removes the thread and every message in it. Shared, so it affects both people. */
  deleteConversation(conversationId: string): Promise<void>;

  /** True when file attachments can actually be uploaded by this backend. */
  supportsAttachments: boolean;

  /** Stop timers/listeners. Called on sign-out. */
  dispose(): void;
}
