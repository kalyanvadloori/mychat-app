import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import ForumRoundedIcon from '@mui/icons-material/ForumRounded';
import { useAuth } from './auth/context';
import { useAppHeight } from './hooks/useAppHeight';
import CallOverlay from './components/CallOverlay';
import ChatHeader from './components/ChatHeader';
import Composer from './components/Composer';
import LoginScreen from './components/LoginScreen';
import MessageList from './components/MessageList';
import NewChatDialog from './components/NewChatDialog';
import NightWeather from './components/NightWeather';
import ProfilePanel from './components/ProfilePanel';
import Sidebar from './components/Sidebar';
import { disposeChatService, getChatService } from './services';
import { ACCENT_GRADIENT, EASE, EASE_SPRING, tintPrimary, tintSecondary } from './theme';
import { showNotification } from './utils/notify';
import type { Call, CallKind, Conversation, Message, User } from './types';

/** Placeholder for a participant whose profile doc has not loaded yet. */
const UNKNOWN: User = { id: 'unknown', name: 'Unknown', presence: 'offline' };

export default function App() {
  const { user, enabled, logout } = useAuth();
  useAppHeight();

  if (enabled && user === undefined) {
    return (
      <Box sx={{ height: '100dvh', display: 'grid', placeItems: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (enabled && !user) return <LoginScreen />;

  const signOut = async () => {
    // Stop the Firestore listeners before auth goes away, or they throw on teardown.
    disposeChatService();
    await logout();
  };

  // Remount the whole chat when the signed-in identity changes.
  return <Chat key={user?.uid ?? 'mock'} onSignOut={enabled ? () => void signOut() : undefined} />;
}

function Chat({ onSignOut }: { onSignOut?: () => void }) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const { user, enabled } = useAuth();

  // Lifetime is owned by the module cache, not by this component — see services/index.ts.
  const service = useMemo(() => getChatService(enabled ? user : null), [enabled, user]);

  const [users, setUsers] = useState<User[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [peerTyping, setPeerTyping] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [call, setCall] = useState<Call | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);

  const currentUser = service.currentUser();

  useEffect(() => service.subscribeUsers(setUsers), [service]);
  useEffect(() => service.subscribeConversations(setConversations), [service]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      setPeerTyping(false);
      return;
    }
    service.markRead(selectedId);
    service.setViewing(selectedId, true);
    const stopMessages = service.subscribeMessages(selectedId, setMessages);
    const stopTyping = service.subscribeTyping(selectedId, setPeerTyping);
    return () => {
      stopMessages();
      stopTyping();
    };
  }, [service, selectedId]);

  // On desktop the thread pane is always visible, so open the newest chat by default.
  useEffect(() => {
    if (isDesktop && !selectedId && conversations.length) setSelectedId(conversations[0]!.id);
  }, [isDesktop, selectedId, conversations]);

  // Clear the unread badge again when new messages land in the open thread.
  useEffect(() => {
    if (selectedId && messages.length) service.markRead(selectedId);
  }, [service, selectedId, messages.length]);

  // Read inside callbacks without making them depend on the current selection.
  const selectedIdRef = useRef<string | null>(null);
  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  /**
   * Leaving a thread purges what both people have already seen. Deliberately
   * driven by this explicit navigation callback rather than an effect cleanup:
   * StrictMode runs cleanups on its dev-only remount, which would wipe a
   * conversation the moment you opened it.
   */
  const openConversation = useCallback(
    (id: string | null) => {
      const previous = selectedIdRef.current;
      if (previous && previous !== id) {
        // Stand down first, then purge — the check looks at the *other* person,
        // and they must see us gone if they are the next to leave.
        service.setViewing(previous, false);
        void service.purgeSeen(previous);
      }
      selectedIdRef.current = id;
      setEditing(null);
      setSelectedId(id);
    },
    [service],
  );

  /**
   * Backgrounding the app counts as leaving the thread too, otherwise closing the
   * tab straight from an open chat would leave the history sitting there. This is
   * the last reliable moment to write — `unload` is not guaranteed to flush.
   */
  useEffect(() => {
    const onHidden = () => {
      const open = selectedIdRef.current;
      if (!open) return;

      if (document.visibilityState === 'hidden') {
        service.setViewing(open, false);
        void service.purgeSeen(open);
      } else {
        // Back on screen and still in the thread: resume announcing.
        service.setViewing(open, true);
      }
    };
    document.addEventListener('visibilitychange', onHidden);
    return () => document.removeEventListener('visibilitychange', onHidden);
  }, [service]);

  /**
   * Notifies about incoming messages, driven off the conversation list rather
   * than the open thread — that is the only stream covering every chat at once.
   * The first snapshot only seeds the baseline, so signing in never fires a
   * burst of notifications for messages you already had.
   */
  const notifiedAt = useRef<Map<string, number> | null>(null);
  // Read at notification time, so the effect need not depend on either.
  const userMapRef = useRef<Map<string, User>>(new Map());
  const openConversationRef = useRef<(id: string | null) => void>(() => {});
  useEffect(() => {
    if (!conversations.length) return;

    const seen = notifiedAt.current;
    const next = new Map<string, number>();
    conversations.forEach((c) => next.set(c.id, c.lastMessage?.createdAt ?? 0));

    if (!seen) {
      notifiedAt.current = next;
      return;
    }

    conversations.forEach((conversation) => {
      const last = conversation.lastMessage;
      if (!last || last.senderId === currentUser.id || conversation.muted) return;
      if (last.createdAt <= (seen.get(conversation.id) ?? 0)) return;

      // Silent when you are already looking at that thread.
      const watching = conversation.id === selectedIdRef.current && !document.hidden;
      if (watching) return;

      const peerId = conversation.participantIds.find((p) => p !== currentUser.id);
      showNotification({
        title: (peerId && userMapRef.current.get(peerId)?.name) || 'New message',
        body: last.text || 'Sent you a message',
        tag: conversation.id,
        onClick: () => openConversationRef.current(conversation.id),
      });
    });

    notifiedAt.current = next;
  }, [conversations, currentUser.id]);

  const userMap = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);

  useEffect(() => {
    userMapRef.current = userMap;
    openConversationRef.current = openConversation;
  }, [userMap, openConversation]);

  const peerOf = useCallback(
    (conversation: Conversation) => {
      const peerId = conversation.participantIds.find((p) => p !== currentUser.id);
      return (peerId && userMap.get(peerId)) || UNKNOWN;
    },
    [currentUser.id, userMap],
  );

  const selected = useMemo(
    () => conversations.find((c) => c.id === selectedId) ?? null,
    [conversations, selectedId],
  );

  // An emptied thread drops out of the list, but never the one currently open.
  const listed = useMemo(
    () => conversations.filter((c) => c.lastMessage || c.id === selectedId),
    [conversations, selectedId],
  );
  const peer = selected ? peerOf(selected) : null;

  const startCall = useCallback(
    (kind: CallKind) => {
      if (!peer || !selected) return;
      setCall({ conversationId: selected.id, peer, kind, state: 'ringing' });
    },
    [peer, selected],
  );

  /** Every call leaves a record in the thread, connected or not. */
  const endCall = useCallback(() => {
    setCall((prev) => {
      if (prev) {
        const connected = prev.state === 'connected';
        void service.logCall(prev.conversationId, {
          kind: prev.kind,
          outcome: connected ? 'completed' : 'cancelled',
          durationSec:
            connected && prev.startedAt ? Math.round((Date.now() - prev.startedAt) / 1000) : 0,
        });
      }
      return null;
    });
  }, [service]);

  const deleteConversation = useCallback(
    async (conversationId: string) => {
      // Close it first so the thread is not rendering rows that are being deleted.
      if (selectedIdRef.current === conversationId) {
        selectedIdRef.current = null;
        setSelectedId(null);
      }
      try {
        await service.deleteConversation(conversationId);
      } catch {
        setNotice('Could not delete the chat. Check your connection and Firestore rules.');
      }
    },
    [service],
  );

  const startChatWith = useCallback(
    async (userId: string) => {
      setNewChatOpen(false);
      openConversation(await service.openConversationWith(userId));
    },
    [service, openConversation],
  );

  const showSidebar = isDesktop || !selectedId;
  const showThread = isDesktop || Boolean(selectedId);

  return (
    <Box
      sx={{
        // Anchored to the layout viewport, then sized and shifted to match the
        // visible area so the on-screen keyboard never displaces the layout.
        position: 'fixed',
        top: 0,
        left: 0,
        height: 'var(--app-h, 100dvh)',
        width: 'var(--app-w, 100%)',
        transform: 'translate(var(--app-left, 0px), var(--app-top, 0px))',
        maxWidth: '100vw',
        overflow: 'hidden',
        // On phones the shell goes edge to edge, but must clear the notch and home bar.
        pt: { xs: 'env(safe-area-inset-top)', md: 2.5 },
        pb: { xs: 'env(safe-area-inset-bottom)', md: 2.5 },
        pl: { xs: 'env(safe-area-inset-left)', md: 2.5 },
        pr: { xs: 'env(safe-area-inset-right)', md: 2.5 },
        bgcolor: 'background.default',
        // Ambient accent wash behind the app shell.
        backgroundImage: (t) =>
          `radial-gradient(90% 55% at 8% 0%, ${tintPrimary(t, 0.16)} 0%, transparent 60%),
           radial-gradient(70% 50% at 100% 100%, ${tintSecondary(t, 0.14)} 0%, transparent 60%)`,
      }}
    >
      <Paper
        sx={{
          height: '100%',
          width: '100%',
          minWidth: 0,
          display: 'flex',
          overflow: 'hidden',
          borderRadius: { xs: 0, md: 5 },
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: { xs: 'none', md: '0 30px 70px -40px rgba(15,23,42,0.55)' },
          animation: `appFadeUp 420ms ${EASE} both`,
        }}
      >
        {showSidebar && (
          <Box
            sx={{
              width: { xs: '100%', md: 340 },
              flexShrink: 0,
              borderRight: { md: '1px solid' },
              borderColor: { md: 'divider' },
              minHeight: 0,
            }}
          >
            <Sidebar
              conversations={listed}
              peerOf={peerOf}
              selectedId={selectedId}
              onSelect={openConversation}
              currentUser={currentUser}
              peopleCount={users.length}
              onNewChat={() => setNewChatOpen(true)}
              onDeleteConversation={(id) => void deleteConversation(id)}
              onSignOut={onSignOut}
            />
          </Box>
        )}

        {showThread && (
          <Stack sx={{ flex: 1, minWidth: 0, minHeight: 0 }}>
            {selected && peer ? (
              <>
                <ChatHeader
                  peer={peer}
                  typing={peerTyping}
                  onStartCall={startCall}
                  onToggleProfile={() => setProfileOpen((v) => !v)}
                  onBack={() => openConversation(null)}
                />
                <MessageList
                  messages={messages}
                  peer={peer}
                  currentUserId={currentUser.id}
                  peerTyping={peerTyping}
                  onEditMessage={(message) =>
                    setEditing({ id: message.id, text: message.text })
                  }
                  onUnsendMessage={(message) => {
                    if (editing?.id === message.id) setEditing(null);
                    void service
                      .deleteMessage(selected.id, message.id)
                      .then(() => setNotice('Message unsent'))
                      .catch(() => setNotice('Could not unsend that message.'));
                  }}
                />
                <Composer
                  attachmentsEnabled={service.supportsAttachments}
                  onAttachmentBlocked={() =>
                    setNotice('File sharing needs Firebase Storage, which requires the paid plan.')
                  }
                  onSend={(text, attachments) =>
                    void service.sendMessage(selected.id, text, attachments)
                  }
                  onTyping={(typing) => service.setTyping(selected.id, typing)}
                  editing={editing}
                  onCancelEdit={() => setEditing(null)}
                  onSaveEdit={(text) => {
                    if (!editing) return;
                    const { id } = editing;
                    setEditing(null);
                    void service
                      .editMessage(selected.id, id, text)
                      .catch(() => setNotice('Could not save the edit.'));
                  }}
                />
              </>
            ) : (
              <EmptyState onNewChat={() => setNewChatOpen(true)} />
            )}
          </Stack>
        )}
      </Paper>

      <NightWeather />

      <NewChatDialog
        open={newChatOpen}
        users={users.filter((u) => u.id !== currentUser.id)}
        onClose={() => setNewChatOpen(false)}
        onSelect={(userId) => void startChatWith(userId)}
      />

      <ProfilePanel
        open={profileOpen}
        peer={peer}
        muted={Boolean(selected?.muted)}
        onClose={() => setProfileOpen(false)}
        onToggleMute={() => selected && service.setMuted(selected.id, !selected.muted)}
        onStartCall={startCall}
      />

      <CallOverlay
        call={call}
        onEnd={endCall}
        onConnected={() =>
          setCall((prev) => (prev ? { ...prev, state: 'connected', startedAt: Date.now() } : prev))
        }
      />

      <Snackbar
        open={Boolean(notice)}
        autoHideDuration={5000}
        onClose={() => setNotice(null)}
        message={notice}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}

function EmptyState({ onNewChat }: { onNewChat: () => void }) {
  return (
    <Stack spacing={2} sx={{ flex: 1, px: 4, alignItems: 'center', justifyContent: 'center' }}>
      <Box
        onClick={onNewChat}
        sx={{
          width: 84,
          height: 84,
          borderRadius: '26px',
          background: ACCENT_GRADIENT,
          display: 'grid',
          placeItems: 'center',
          color: '#fff',
          cursor: 'pointer',
          boxShadow: '0 20px 40px -18px rgba(99,102,241,0.8)',
          // Idles gently so the empty screen still feels alive.
          animation: `appPop 480ms ${EASE_SPRING} both, appFloat 4.5s ease-in-out 600ms infinite`,
          transition: `transform 200ms ${EASE_SPRING}`,
          '&:hover': { transform: 'scale(1.06)' },
        }}
      >
        <ForumRoundedIcon sx={{ fontSize: 40 }} />
      </Box>
      <Typography variant="h6" sx={{ animation: `appFadeUp 420ms ${EASE} 140ms both` }}>
        Select a conversation
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ textAlign: 'center', maxWidth: 320, animation: `appFadeUp 420ms ${EASE} 220ms both` }}
      >
        Pick someone from the list to start chatting, or place a video call straight from the chat
        header.
      </Typography>
    </Stack>
  );
}
