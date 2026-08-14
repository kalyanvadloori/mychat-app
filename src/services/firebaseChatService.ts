import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDocs,
  writeBatch,
  increment,
  limitToLast,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import type { User as FirebaseUser } from 'firebase/auth';
import { db } from '../lib/firebase';
import type {
  Attachment,
  CallInvite,
  CallKind,
  CallLog,
  Conversation,
  Message,
  User,
} from '../types';
import { callSummary } from '../utils/call';
import type { ChatService, Unsubscribe } from './chatService';

/** A user counts as online only if their heartbeat is recent. */
const PRESENCE_TTL = 2 * 60_000;
const HEARTBEAT_MS = 60_000;
/** Newest N messages per conversation — keeps reads inside the free daily quota. */
const MESSAGE_WINDOW = 150;
/** How often an open thread re-announces itself, and when that goes stale. */
const VIEWING_HEARTBEAT_MS = 25_000;
const VIEWING_TTL = 70_000;
/** After this, an unanswered ring is treated as a missed call. */
const RING_TIMEOUT = 45_000;

type Listener<T> = (value: T) => void;

function millis(value: unknown, fallback = Date.now()): number {
  if (value instanceof Timestamp) return value.toMillis();
  if (typeof value === 'number') return value;
  return fallback;
}

/** Deterministic id for a 1:1 thread, so both sides always land on the same doc. */
export function conversationIdFor(a: string, b: string) {
  return [a, b].sort().join('__');
}

class FirebaseChatService implements ChatService {
  /** Cloud Storage needs the paid Blaze plan on new projects, so uploads stay off. */
  supportsAttachments = false;

  private me: User;
  private users = new Map<string, User>();
  private conversationDocs = new Map<string, DocumentData>();
  /** Raw docs, not mapped Messages: read-receipt status depends on the conversation doc,
   *  which updates independently, so messages are mapped fresh on every emit. */
  private roomDocs = new Map<string, { docs: QueryDocumentSnapshot<DocumentData>[]; pending: boolean }>();

  private messageListeners = new Map<string, Set<Listener<Message[]>>>();
  private typingListeners = new Map<string, Set<Listener<boolean>>>();
  private conversationListeners = new Set<Listener<Conversation[]>>();

  private roomUnsubs = new Map<string, Unsubscribe>();
  private rootUnsubs: Unsubscribe[] = [];
  private heartbeat?: ReturnType<typeof setInterval>;
  private viewingTimer?: ReturnType<typeof setInterval>;
  private lastTypingWrite = new Map<string, boolean>();

  constructor(authUser: FirebaseUser) {
    this.me = {
      id: authUser.uid,
      name: authUser.displayName || authUser.email?.split('@')[0] || 'You',
      avatar: authUser.photoURL ?? undefined,
      presence: 'online',
    };

    void this.writeProfile();
    this.startHeartbeat();
    this.watchUsers();
    this.watchConversations();
  }

  currentUser() {
    return this.me;
  }

  // ---- subscriptions -----------------------------------------------------

  subscribeUsers(cb: Listener<User[]>) {
    cb(this.userList());
    return this.addListener(this.userListeners, cb);
  }

  subscribeConversations(cb: Listener<Conversation[]>) {
    cb(this.conversationList());
    return this.addListener(this.conversationListeners, cb);
  }

  subscribeMessages(conversationId: string, cb: Listener<Message[]>) {
    cb(this.mapMessages(conversationId));
    const set = this.listenerSet(this.messageListeners, conversationId);
    set.add(cb);
    this.watchRoom(conversationId);
    return () => {
      set.delete(cb);
      this.maybeStopWatchingRoom(conversationId);
    };
  }

  subscribeTyping(conversationId: string, cb: Listener<boolean>) {
    cb(this.peerTyping(conversationId));
    const set = this.listenerSet(this.typingListeners, conversationId);
    set.add(cb);
    return () => set.delete(cb);
  }

  // ---- writes ------------------------------------------------------------

  async sendMessage(conversationId: string, text: string, attachments?: Attachment[]) {
    if (!text.trim() && !attachments?.length) return;
    const peerId = this.peerIdOf(conversationId);

    await addDoc(collection(db(), 'conversations', conversationId, 'messages'), {
      senderId: this.me.id,
      text,
      createdAt: serverTimestamp(),
    });

    await updateDoc(doc(db(), 'conversations', conversationId), {
      updatedAt: serverTimestamp(),
      lastMessage: { text, senderId: this.me.id, createdAt: serverTimestamp() },
      [`typing.${this.me.id}`]: false,
      ...(peerId ? { [`unread.${peerId}`]: increment(1) } : {}),
    });

    this.lastTypingWrite.set(conversationId, false);
  }

  async logCall(conversationId: string, call: CallLog) {
    const text = callSummary(call);

    // Stored as an ordinary message so it syncs to both sides and orders with the thread.
    await addDoc(collection(db(), 'conversations', conversationId, 'messages'), {
      senderId: this.me.id,
      text,
      call,
      createdAt: serverTimestamp(),
    });

    await updateDoc(doc(db(), 'conversations', conversationId), {
      updatedAt: serverTimestamp(),
      lastMessage: { text, senderId: this.me.id, createdAt: serverTimestamp() },
    });
  }

  async editMessage(conversationId: string, messageId: string, text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;

    await updateDoc(doc(db(), 'conversations', conversationId, 'messages', messageId), {
      text: trimmed,
      editedAt: serverTimestamp(),
    });

    // The sidebar preview is a copy, so it has to be corrected separately.
    if (this.isNewest(conversationId, messageId)) {
      await updateDoc(doc(db(), 'conversations', conversationId), {
        'lastMessage.text': trimmed,
      }).catch(() => {});
    }
  }

  async deleteMessage(conversationId: string, messageId: string) {
    const wasNewest = this.isNewest(conversationId, messageId);
    await deleteDoc(doc(db(), 'conversations', conversationId, 'messages', messageId));
    if (!wasNewest) return;

    // Unsending the newest message leaves the preview pointing at nothing.
    const remaining = (this.roomDocs.get(conversationId)?.docs ?? []).filter(
      (d) => d.id !== messageId,
    );
    const newest = remaining[remaining.length - 1]?.data();

    await updateDoc(
      doc(db(), 'conversations', conversationId),
      newest
        ? {
            lastMessage: {
              text: newest.text ?? '',
              senderId: newest.senderId,
              createdAt: newest.createdAt ?? null,
            },
          }
        : { lastMessage: deleteField() },
    ).catch(() => {});
  }

  private isNewest(conversationId: string, messageId: string) {
    const docs = this.roomDocs.get(conversationId)?.docs ?? [];
    return docs[docs.length - 1]?.id === messageId;
  }

  // ---- call signalling ---------------------------------------------------

  async ringCall(conversationId: string, kind: CallKind) {
    await updateDoc(doc(db(), 'conversations', conversationId), {
      call: {
        from: this.me.id,
        kind,
        status: 'ringing',
        createdAt: serverTimestamp(),
      },
    });
  }

  async setCallStatus(conversationId: string, status: CallInvite['status']) {
    // Ended and declined calls clear the invitation outright, so a stale ring can
    // never resurrect itself on the next snapshot.
    await updateDoc(
      doc(db(), 'conversations', conversationId),
      status === 'accepted' ? { 'call.status': 'accepted' } : { call: deleteField() },
    ).catch(() => {});
  }

  subscribeCallInvites(cb: (invite: CallInvite | null) => void) {
    cb(this.currentInvite());
    return this.addListener(this.inviteListeners, cb);
  }

  private inviteListeners = new Set<Listener<CallInvite | null>>();

  /** The one live invitation across all conversations, if any. */
  private currentInvite(): CallInvite | null {
    for (const [conversationId, data] of this.conversationDocs) {
      const call = data.call;
      if (!call?.status) continue;

      const createdAt = millis(call.createdAt);
      // A ring older than the timeout is a caller who vanished mid-call.
      if (call.status === 'ringing' && Date.now() - createdAt > RING_TIMEOUT) continue;

      return {
        conversationId,
        from: call.from,
        kind: call.kind ?? 'video',
        status: call.status,
        createdAt,
      };
    }
    return null;
  }

  markRead(conversationId: string) {
    const data = this.conversationDocs.get(conversationId);
    if (!data) return;
    // One write per open, not one per message — keeps the free quota comfortable.
    if ((data.unread?.[this.me.id] ?? 0) === 0 && data.lastReadAt?.[this.me.id]) return;

    void updateDoc(doc(db(), 'conversations', conversationId), {
      [`unread.${this.me.id}`]: 0,
      [`lastReadAt.${this.me.id}`]: serverTimestamp(),
    });
  }

  /**
   * Publishes "I am looking at this thread", refreshed on a timer.
   *
   * A timestamp rather than a plain flag, because a closed tab, a dead battery or
   * lost signal never gets to clear it. Firestore has no disconnect hook, so a
   * stale heartbeat is the only way to tell a reader from a vanished one.
   */
  setViewing(conversationId: string, viewing: boolean) {
    if (this.viewingTimer) clearInterval(this.viewingTimer);
    this.viewingTimer = undefined;

    const write = () =>
      void updateDoc(doc(db(), 'conversations', conversationId), {
        [`viewing.${this.me.id}`]: viewing,
        [`viewingAt.${this.me.id}`]: serverTimestamp(),
      }).catch(() => {});

    write();

    if (viewing) {
      this.viewingTimer = setInterval(write, VIEWING_HEARTBEAT_MS);
    }
  }

  /** True while the other person's heartbeat is both set and recent. */
  private peerIsViewing(conversationId: string) {
    const data = this.conversationDocs.get(conversationId);
    const peerId = this.peerIdOf(conversationId);
    if (!data || !peerId || data.viewing?.[peerId] !== true) return false;
    return Date.now() - millis(data.viewingAt?.[peerId], 0) < VIEWING_TTL;
  }

  setTyping(conversationId: string, typing: boolean) {
    // Composer signals on every keystroke; only write on an actual transition.
    if (this.lastTypingWrite.get(conversationId) === typing) return;
    this.lastTypingWrite.set(conversationId, typing);
    void updateDoc(doc(db(), 'conversations', conversationId), {
      [`typing.${this.me.id}`]: typing,
    });
  }

  setMuted(conversationId: string, muted: boolean) {
    void updateDoc(doc(db(), 'conversations', conversationId), {
      [`muted.${this.me.id}`]: muted,
    });
  }

  async openConversationWith(peerId: string) {
    const id = conversationIdFor(this.me.id, peerId);
    await setDoc(
      doc(db(), 'conversations', id),
      {
        participantIds: [this.me.id, peerId].sort(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    return id;
  }

  /**
   * Deletes only what *both* people have seen.
   *
   * The person leaving has seen everything on screen, so the test is per sender:
   *
   *   their message — they wrote it, and I just read it → safe to delete
   *   my message    — only once their read marker has passed it
   *
   * A single "delete everything I've seen" cutoff destroys outgoing messages
   * before the other person ever receives them, which silently loses real
   * conversation. Undelivered messages therefore survive until they are read.
   */
  async purgeSeen(conversationId: string) {
    const room = this.roomDocs.get(conversationId);
    const peerId = this.peerIdOf(conversationId);
    const data = this.conversationDocs.get(conversationId);
    if (!room?.docs.length || !peerId) return;

    // Whoever leaves last does the cleaning. Deleting while the other person is
    // still on the screen would empty the thread out from under them.
    if (this.peerIsViewing(conversationId)) return;

    const peerReadAt = millis(data?.lastReadAt?.[peerId], 0);

    const seen = room.docs.filter((d) => {
      const message = d.data();
      // An unresolved server timestamp means it is still in flight.
      const createdAt = millis(message.createdAt, Number.MAX_SAFE_INTEGER);
      if (createdAt === Number.MAX_SAFE_INTEGER) return false;
      if (message.senderId !== this.me.id) return true;
      return createdAt <= peerReadAt;
    });
    if (!seen.length) return;

    const doomed = new Set(seen.map((d) => d.id));
    const remaining = room.docs.filter((d) => !doomed.has(d.id));

    const batch = writeBatch(db());
    seen.forEach((d) => batch.delete(d.ref));
    const conversationRef = doc(db(), 'conversations', conversationId);

    if (remaining.length === 0) {
      // Nothing left to show: drop the preview so the thread leaves the sidebar.
      batch.update(conversationRef, {
        lastMessage: deleteField(),
        [`unread.${this.me.id}`]: 0,
        [`unread.${peerId}`]: 0,
      });
    } else {
      // Keep the preview pointing at a message that still exists.
      const newest = remaining[remaining.length - 1]!.data();
      batch.update(conversationRef, {
        lastMessage: {
          text: newest.text ?? '',
          senderId: newest.senderId,
          createdAt: newest.createdAt ?? null,
        },
        [`unread.${this.me.id}`]: 0,
      });
    }

    try {
      await batch.commit();
    } catch (error) {
      // Almost always means the delete rules have not been published yet.
      console.error('[chat] purge failed — check Firestore rules allow delete:', error);
    }
  }

  /**
   * Firestore does not cascade: deleting a document leaves its subcollection
   * behind as orphaned data that still counts against storage. The messages have
   * to be fetched and deleted explicitly before the thread itself goes.
   */
  async deleteConversation(conversationId: string) {
    try {
      const messages = await getDocs(
        collection(db(), 'conversations', conversationId, 'messages'),
      );

      // Batches cap at 500 writes, so large threads need more than one.
      for (let i = 0; i < messages.docs.length; i += 400) {
        const batch = writeBatch(db());
        messages.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }

      await deleteDoc(doc(db(), 'conversations', conversationId));
    } catch (error) {
      console.error('[chat] delete conversation failed:', error);
      throw error;
    }
  }

  dispose() {
    this.rootUnsubs.forEach((stop) => stop());
    this.roomUnsubs.forEach((stop) => stop());
    this.roomUnsubs.clear();
    if (this.heartbeat) clearInterval(this.heartbeat);
    if (this.viewingTimer) clearInterval(this.viewingTimer);
    void setDoc(
      doc(db(), 'users', this.me.id),
      { presence: 'offline', lastSeen: serverTimestamp() },
      { merge: true },
    ).catch(() => {});
  }

  // ---- listener plumbing -------------------------------------------------

  private userListeners = new Set<Listener<User[]>>();

  private addListener<T>(set: Set<Listener<T>>, cb: Listener<T>): Unsubscribe {
    set.add(cb);
    return () => set.delete(cb);
  }

  private listenerSet<T>(map: Map<string, Set<Listener<T>>>, key: string) {
    let set = map.get(key);
    if (!set) {
      set = new Set();
      map.set(key, set);
    }
    return set;
  }

  // ---- firestore watchers ------------------------------------------------

  private async writeProfile() {
    await setDoc(
      doc(db(), 'users', this.me.id),
      {
        name: this.me.name,
        avatar: this.me.avatar ?? null,
        presence: 'online',
        lastSeen: serverTimestamp(),
      },
      { merge: true },
    );
  }

  private startHeartbeat() {
    this.heartbeat = setInterval(() => {
      const visible = document.visibilityState === 'visible';
      void setDoc(
        doc(db(), 'users', this.me.id),
        { presence: visible ? 'online' : 'away', lastSeen: serverTimestamp() },
        { merge: true },
      );
    }, HEARTBEAT_MS);
  }

  /** Snapshot errors are silent by default — surface them or debugging is guesswork. */
  private static onError(source: string) {
    return (error: Error) => console.error(`[chat] ${source} listener failed:`, error);
  }

  private watchUsers() {
    const stop = onSnapshot(collection(db(), 'users'), (snap) => {
      this.users.clear();
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        const lastSeen = millis(data.lastSeen, 0);
        const stale = Date.now() - lastSeen > PRESENCE_TTL;
        this.users.set(docSnap.id, {
          id: docSnap.id,
          name: data.name ?? 'Unknown',
          avatar: data.avatar ?? undefined,
          about: data.about ?? undefined,
          presence: stale ? 'offline' : (data.presence ?? 'offline'),
          lastSeen: lastSeen || undefined,
        });
      });
      const mine = this.users.get(this.me.id);
      if (mine) this.me = { ...mine, presence: 'online' };
      this.userListeners.forEach((cb) => cb(this.userList()));
    }, FirebaseChatService.onError('users'));
    this.rootUnsubs.push(stop);
  }

  private watchConversations() {
    // No orderBy here: sorting client-side avoids needing a composite index.
    const q = query(
      collection(db(), 'conversations'),
      where('participantIds', 'array-contains', this.me.id),
    );
    const stop = onSnapshot(q, (snap) => {
      this.conversationDocs.clear();
      snap.forEach((docSnap) => this.conversationDocs.set(docSnap.id, docSnap.data()));

      this.conversationListeners.forEach((cb) => cb(this.conversationList()));
      const invite = this.currentInvite();
      this.inviteListeners.forEach((cb) => cb(invite));
      // Read receipts and typing live on the conversation doc, so refresh both.
      this.conversationDocs.forEach((_data, id) => {
        this.emitMessages(id);
        this.typingListeners.get(id)?.forEach((cb) => cb(this.peerTyping(id)));
      });
    }, FirebaseChatService.onError('conversations'));
    this.rootUnsubs.push(stop);
  }

  private watchRoom(conversationId: string) {
    if (this.roomUnsubs.has(conversationId)) return;
    const q = query(
      collection(db(), 'conversations', conversationId, 'messages'),
      orderBy('createdAt'),
      limitToLast(MESSAGE_WINDOW),
    );
    const stop = onSnapshot(q, (snap) => {
      this.roomDocs.set(conversationId, {
        docs: snap.docs,
        pending: snap.metadata.hasPendingWrites,
      });
      this.emitMessages(conversationId);
    }, FirebaseChatService.onError(`messages/${conversationId}`));
    this.roomUnsubs.set(conversationId, stop);
  }

  private maybeStopWatchingRoom(conversationId: string) {
    if (this.messageListeners.get(conversationId)?.size) return;
    this.roomUnsubs.get(conversationId)?.();
    this.roomUnsubs.delete(conversationId);
  }

  // ---- mapping -----------------------------------------------------------

  private toMessage(
    conversationId: string,
    docSnap: QueryDocumentSnapshot<DocumentData>,
    pending: boolean,
  ): Message {
    const data = docSnap.data();
    const createdAt = millis(data.createdAt);
    const mine = data.senderId === this.me.id;

    return {
      id: docSnap.id,
      conversationId,
      senderId: data.senderId,
      text: data.text ?? '',
      call: data.call ?? undefined,
      editedAt: data.editedAt ? millis(data.editedAt) : undefined,
      createdAt,
      status: !mine
        ? 'read'
        : pending && !data.createdAt
          ? 'sending'
          : this.peerReadAt(conversationId) >= createdAt
            ? 'read'
            : 'sent',
    };
  }

  private toConversation(id: string, data: DocumentData): Conversation {
    const last = data.lastMessage;
    return {
      id,
      participantIds: data.participantIds ?? [],
      unreadCount: data.unread?.[this.me.id] ?? 0,
      muted: Boolean(data.muted?.[this.me.id]),
      lastMessage: last
        ? {
            id: `${id}_last`,
            conversationId: id,
            senderId: last.senderId,
            text: last.text ?? '',
            createdAt: millis(last.createdAt, millis(data.updatedAt)),
            status: last.senderId === this.me.id && this.peerReadAt(id) >= millis(last.createdAt, 0)
              ? 'read'
              : 'sent',
          }
        : undefined,
    };
  }

  // ---- derived state -----------------------------------------------------

  private userList() {
    return [...this.users.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  private conversationList() {
    return [...this.conversationDocs.entries()]
      .map(([id, data]) => this.toConversation(id, data))
      .sort((a, b) => (b.lastMessage?.createdAt ?? 0) - (a.lastMessage?.createdAt ?? 0));
  }

  private peerIdOf(conversationId: string) {
    const data = this.conversationDocs.get(conversationId);
    return (data?.participantIds as string[] | undefined)?.find((p) => p !== this.me.id);
  }

  private peerReadAt(conversationId: string) {
    const peerId = this.peerIdOf(conversationId);
    const data = this.conversationDocs.get(conversationId);
    if (!peerId || !data?.lastReadAt) return 0;
    return millis(data.lastReadAt[peerId], 0);
  }

  private peerTyping(conversationId: string) {
    const peerId = this.peerIdOf(conversationId);
    const data = this.conversationDocs.get(conversationId);
    return Boolean(peerId && data?.typing?.[peerId]);
  }

  private mapMessages(conversationId: string) {
    const room = this.roomDocs.get(conversationId);
    if (!room) return [];
    return room.docs.map((d) => this.toMessage(conversationId, d, room.pending));
  }

  private emitMessages(conversationId: string) {
    const listeners = this.messageListeners.get(conversationId);
    if (!listeners?.size) return;
    const messages = this.mapMessages(conversationId);
    listeners.forEach((cb) => cb(messages));
  }
}

export function createFirebaseChatService(authUser: FirebaseUser): ChatService {
  return new FirebaseChatService(authUser);
}
