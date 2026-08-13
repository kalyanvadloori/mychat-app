import { useCallback, useEffect, useMemo, useState } from 'react';
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
import ProfilePanel from './components/ProfilePanel';
import Sidebar from './components/Sidebar';
import { disposeChatService, getChatService } from './services';
import { ACCENT_GRADIENT, tintPrimary, tintSecondary } from './theme';
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

  const userMap = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);

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

  const startChatWith = useCallback(
    async (userId: string) => {
      setNewChatOpen(false);
      setSelectedId(await service.openConversationWith(userId));
    },
    [service],
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
        right: 0,
        height: 'var(--app-h, 100dvh)',
        transform: 'translateY(var(--app-top, 0px))',
        width: '100%',
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
              conversations={conversations}
              peerOf={peerOf}
              selectedId={selectedId}
              onSelect={setSelectedId}
              currentUser={currentUser}
              onNewChat={() => setNewChatOpen(true)}
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
                  onBack={() => setSelectedId(null)}
                />
                <MessageList
                  messages={messages}
                  peer={peer}
                  currentUserId={currentUser.id}
                  peerTyping={peerTyping}
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
                />
              </>
            ) : (
              <EmptyState onNewChat={() => setNewChatOpen(true)} />
            )}
          </Stack>
        )}
      </Paper>

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
        }}
      >
        <ForumRoundedIcon sx={{ fontSize: 40 }} />
      </Box>
      <Typography variant="h6">Select a conversation</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', maxWidth: 320 }}>
        Pick someone from the list to start chatting, or place a video call straight from the chat
        header.
      </Typography>
    </Stack>
  );
}
