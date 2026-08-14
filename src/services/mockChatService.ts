import type { Attachment, CallLog, Conversation, Message, User } from '../types';
import { callSummary } from '../utils/call';
import type { ChatService, Unsubscribe } from './chatService';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const now = Date.now();

const USERS: User[] = [
  { id: 'me', name: 'You', presence: 'online', about: 'Building things with React + MUI' },
  { id: 'u1', name: 'Aarav Sharma', presence: 'online', about: 'Product designer · Hyderabad' },
  { id: 'u2', name: 'Priya Nair', presence: 'online', about: 'Frontend engineer' },
  { id: 'u3', name: 'Rahul Verma', presence: 'away', about: 'In a meeting', lastSeen: now - 25 * MINUTE },
  { id: 'u4', name: 'Sneha Reddy', presence: 'offline', about: 'Available after 6pm', lastSeen: now - 5 * HOUR },
  { id: 'u5', name: 'Vikram Iyer', presence: 'offline', about: 'QA lead', lastSeen: now - 26 * HOUR },
];

let seq = 0;
const id = () => `m${(seq += 1)}_${Math.random().toString(36).slice(2, 7)}`;

function msg(conversationId: string, senderId: string, text: string, minsAgo: number): Message {
  return {
    id: id(),
    conversationId,
    senderId,
    text,
    createdAt: now - minsAgo * MINUTE,
    status: 'read',
  };
}

const MESSAGES: Message[] = [
  msg('c1', 'u1', 'Hey! Did you get a chance to look at the new chat screens?', 96),
  msg('c1', 'me', 'Yes, just went through them. The layout feels much cleaner now 👌', 94),
  msg('c1', 'u1', 'Glad you think so. I reworked the message bubbles and the sidebar spacing.', 92),
  msg('c1', 'me', 'The bubbles are the biggest win. Much easier to scan a long thread.', 90),
  msg('c1', 'u1', 'Should we jump on a quick video call to go over the call screen?', 6),

  msg('c2', 'u2', 'Deployed the build to staging, can you verify?', 180),
  msg('c2', 'me', 'On it — give me ten minutes.', 176),
  msg('c2', 'me', 'Verified. Login and messaging both look good.', 150),
  msg('c2', 'u2', 'Perfect, thanks! I will tag the release then.', 148),

  msg('c3', 'u3', 'Sending over the API docs shortly.', 400),
  msg('c3', 'me', 'Thanks Rahul.', 395),

  msg('c4', 'u4', 'Are we still on for tomorrow at 11?', 1500),
  msg('c4', 'me', 'Yes, 11 works. I will send the invite.', 1490),
  msg('c4', 'u4', 'Great 🙌', 1488),

  msg('c5', 'u5', 'Filed three bugs on the composer, all minor.', 2900),
];

const CONVERSATIONS: Conversation[] = [
  { id: 'c1', participantIds: ['me', 'u1'], unreadCount: 2, pinned: true },
  { id: 'c2', participantIds: ['me', 'u2'], unreadCount: 0 },
  { id: 'c3', participantIds: ['me', 'u3'], unreadCount: 1 },
  { id: 'c4', participantIds: ['me', 'u4'], unreadCount: 0 },
  { id: 'c5', participantIds: ['me', 'u5'], unreadCount: 0, muted: true },
];

/** Canned replies so the mock feels alive while there is no backend. */
const REPLIES = [
  'Got it, thanks!',
  'That makes sense to me.',
  'Let me check and get back to you.',
  'Sure — want to hop on a quick call?',
  'Nice, that looks much better 👍',
  'Can you share a screenshot?',
];

type Listener<T> = (value: T) => void;

class Emitter<T> {
  private listeners = new Set<Listener<T>>();

  subscribe(cb: Listener<T>): Unsubscribe {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  emit(value: T) {
    this.listeners.forEach((cb) => cb(value));
  }
}

class MockChatService implements ChatService {
  supportsAttachments = true;

  private users = [...USERS];
  private conversations = [...CONVERSATIONS];
  private messages = [...MESSAGES];

  private conversationEmitter = new Emitter<Conversation[]>();
  private userEmitter = new Emitter<User[]>();
  private messageEmitters = new Map<string, Emitter<Message[]>>();
  private typingEmitters = new Map<string, Emitter<boolean>>();
  private timers = new Set<ReturnType<typeof setTimeout>>();

  constructor() {
    this.recomputeLastMessages();
  }

  currentUser() {
    return this.users[0]!;
  }

  subscribeUsers(cb: (users: User[]) => void) {
    cb([...this.users]);
    return this.userEmitter.subscribe(cb);
  }

  subscribeConversations(cb: (conversations: Conversation[]) => void) {
    cb(this.snapshotConversations());
    return this.conversationEmitter.subscribe(cb);
  }

  subscribeMessages(conversationId: string, cb: (messages: Message[]) => void) {
    cb(this.messagesIn(conversationId));
    return this.emitterFor(this.messageEmitters, conversationId).subscribe(cb);
  }

  subscribeTyping(conversationId: string, cb: (isTyping: boolean) => void) {
    cb(false);
    return this.emitterFor(this.typingEmitters, conversationId).subscribe(cb);
  }

  async sendMessage(conversationId: string, text: string, attachments?: Attachment[]) {
    const message: Message = {
      id: id(),
      conversationId,
      senderId: 'me',
      text,
      createdAt: Date.now(),
      status: 'sending',
      attachments,
    };
    this.messages.push(message);
    this.publish(conversationId);

    // Simulate the send → delivered → read lifecycle, then a reply.
    this.later(() => this.setStatus(message.id, 'sent'), 350);
    this.later(() => this.setStatus(message.id, 'delivered'), 900);
    this.later(() => this.setStatus(message.id, 'read'), 1800);
    this.scheduleReply(conversationId);
  }

  async logCall(conversationId: string, call: CallLog) {
    this.messages.push({
      id: id(),
      conversationId,
      senderId: 'me',
      text: callSummary(call),
      createdAt: Date.now(),
      status: 'read',
      call,
    });
    this.publish(conversationId);
  }

  async editMessage(conversationId: string, messageId: string, text: string) {
    const message = this.messages.find((m) => m.id === messageId);
    if (!message) return;
    message.text = text.trim();
    message.editedAt = Date.now();
    this.publish(conversationId);
  }

  async deleteMessage(conversationId: string, messageId: string) {
    this.messages = this.messages.filter((m) => m.id !== messageId);
    this.publish(conversationId);
  }

  markRead(conversationId: string) {
    const conversation = this.conversations.find((c) => c.id === conversationId);
    if (!conversation || conversation.unreadCount === 0) return;
    conversation.unreadCount = 0;
    this.publishConversations();
  }

  setViewing() {
    // Nobody else is looking at a mock thread.
  }

  setTyping() {
    // No-op in the mock: the peer does not react to our typing state.
  }

  setMuted(conversationId: string, muted: boolean) {
    const conversation = this.conversations.find((c) => c.id === conversationId);
    if (!conversation) return;
    conversation.muted = muted;
    this.publishConversations();
  }

  async purgeSeen(conversationId: string) {
    const before = this.messages.length;
    // Same rule as the real backend: incoming messages are seen once I have read
    // them, but my own only once the peer's receipt has come back.
    this.messages = this.messages.filter(
      (m) =>
        m.conversationId !== conversationId
          ? true
          : m.senderId === 'me' && m.status !== 'read',
    );
    if (this.messages.length === before) return;

    const conversation = this.conversations.find((c) => c.id === conversationId);
    if (conversation) conversation.unreadCount = 0;
    this.publish(conversationId);
  }

  async deleteConversation(conversationId: string) {
    this.messages = this.messages.filter((m) => m.conversationId !== conversationId);
    this.conversations = this.conversations.filter((c) => c.id !== conversationId);
    this.publishConversations();
  }

  async openConversationWith(peerId: string) {
    const existing = this.conversations.find((c) => c.participantIds.includes(peerId));
    if (existing) return existing.id;

    const conversation: Conversation = {
      id: `c_${peerId}_${Math.random().toString(36).slice(2, 6)}`,
      participantIds: ['me', peerId],
      unreadCount: 0,
    };
    this.conversations.push(conversation);
    this.publishConversations();
    return conversation.id;
  }

  /** Stops every pending timer — used on teardown so tests and HMR stay clean. */
  dispose() {
    this.timers.forEach(clearTimeout);
    this.timers.clear();
  }

  // ---- internals ---------------------------------------------------------

  private later(fn: () => void, ms: number) {
    const t = setTimeout(() => {
      this.timers.delete(t);
      fn();
    }, ms);
    this.timers.add(t);
  }

  private emitterFor<T>(map: Map<string, Emitter<T>>, key: string) {
    let emitter = map.get(key);
    if (!emitter) {
      emitter = new Emitter<T>();
      map.set(key, emitter);
    }
    return emitter;
  }

  private peerIdOf(conversationId: string) {
    const conversation = this.conversations.find((c) => c.id === conversationId);
    return conversation?.participantIds.find((p) => p !== 'me');
  }

  private messagesIn(conversationId: string) {
    return this.messages
      .filter((m) => m.conversationId === conversationId)
      .sort((a, b) => a.createdAt - b.createdAt);
  }

  private snapshotConversations() {
    return [...this.conversations].sort((a, b) => {
      if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
      return (b.lastMessage?.createdAt ?? 0) - (a.lastMessage?.createdAt ?? 0);
    });
  }

  private recomputeLastMessages() {
    this.conversations.forEach((conversation) => {
      const list = this.messagesIn(conversation.id);
      conversation.lastMessage = list[list.length - 1];
    });
  }

  private publishConversations() {
    this.recomputeLastMessages();
    this.conversationEmitter.emit(this.snapshotConversations());
  }

  private publish(conversationId: string) {
    this.messageEmitters.get(conversationId)?.emit(this.messagesIn(conversationId));
    this.publishConversations();
  }

  private setStatus(messageId: string, status: Message['status']) {
    const message = this.messages.find((m) => m.id === messageId);
    if (!message) return;
    message.status = status;
    this.publish(message.conversationId);
  }

  private scheduleReply(conversationId: string) {
    const peerId = this.peerIdOf(conversationId);
    if (!peerId) return;
    const typing = this.emitterFor(this.typingEmitters, conversationId);

    this.later(() => typing.emit(true), 1200);
    this.later(() => {
      typing.emit(false);
      this.messages.push({
        id: id(),
        conversationId,
        senderId: peerId,
        text: REPLIES[Math.floor(Math.random() * REPLIES.length)]!,
        createdAt: Date.now(),
        status: 'read',
      });
      this.publish(conversationId);
    }, 3400);
  }
}

export function createMockChatService(): ChatService {
  return new MockChatService();
}
