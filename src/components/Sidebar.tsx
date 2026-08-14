import { useMemo, useState } from 'react';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useColorScheme } from '@mui/material/styles';
import AddCommentRoundedIcon from '@mui/icons-material/AddCommentRounded';
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import DoneAllRoundedIcon from '@mui/icons-material/DoneAllRounded';
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import MoreVertRoundedIcon from '@mui/icons-material/MoreVertRounded';
import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded';
import PushPinRoundedIcon from '@mui/icons-material/PushPinRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import VolumeOffRoundedIcon from '@mui/icons-material/VolumeOffRounded';
import { ACCENT_GRADIENT, BRAND_MARK, EASE, EASE_SPRING, tintPrimary, tintText } from '../theme';
import type { Conversation, User } from '../types';
import { shortStamp } from '../utils/format';
import { notificationPermission, requestNotificationPermission } from '../utils/notify';
import UserAvatar from './UserAvatar';

interface Props {
  conversations: Conversation[];
  peerOf: (conversation: Conversation) => User;
  selectedId: string | null;
  onSelect: (conversationId: string) => void;
  currentUser: User;
  /** Everyone registered on the app, including the current user. */
  peopleCount: number;
  onNewChat: () => void;
  onDeleteConversation: (conversationId: string) => void;
  /** Only provided when running on the Firebase backend. */
  onSignOut?: () => void;
}

export default function Sidebar({
  conversations,
  peerOf,
  selectedId,
  onSelect,
  currentUser,
  peopleCount,
  onNewChat,
  onDeleteConversation,
  onSignOut,
}: Props) {
  const [query, setQuery] = useState('');
  const [accountAnchor, setAccountAnchor] = useState<HTMLElement | null>(null);
  const [rowMenu, setRowMenu] = useState<{ el: HTMLElement; id: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Conversation | null>(null);
  const [notifyPermission, setNotifyPermission] = useState(notificationPermission);
  const { mode, systemMode, setMode } = useColorScheme();
  const isDark = (mode === 'system' ? systemMode : mode) === 'dark';

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((conversation) => {
      const peer = peerOf(conversation);
      return (
        peer.name.toLowerCase().includes(q) ||
        (conversation.lastMessage?.text ?? '').toLowerCase().includes(q)
      );
    });
  }, [conversations, peerOf, query]);

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <Stack sx={{ height: '100%', minHeight: 0, minWidth: 0 }}>
      <Box sx={{ px: { xs: 1.75, md: 2.5 }, pt: 2.5, pb: 1.5, minWidth: 0 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <Tooltip title={`${peopleCount} ${peopleCount === 1 ? 'person has' : 'people have'} signed up`}>
            <Badge
              badgeContent={peopleCount}
              max={999}
              color="secondary"
              overlap="circular"
              anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
              sx={{ flexShrink: 0, '& .MuiBadge-badge': { fontSize: 10, height: 18, minWidth: 18 } }}
            >
              <Box
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: '12px',
                  background: ACCENT_GRADIENT,
                  display: 'grid',
                  placeItems: 'center',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: 15,
                  letterSpacing: '-0.02em',
                }}
              >
                {BRAND_MARK}
              </Box>
            </Badge>
          </Tooltip>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="subtitle1" noWrap>
              Messages
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {totalUnread > 0 ? `${totalUnread} unread` : 'All caught up'}
            </Typography>
          </Box>
          <Tooltip title="New chat">
            <IconButton size="small" onClick={onNewChat}>
              <AddCommentRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={isDark ? 'Light mode' : 'Dark mode'}>
            <IconButton size="small" onClick={() => setMode(isDark ? 'light' : 'dark')}>
              {isDark ? <LightModeRoundedIcon fontSize="small" /> : <DarkModeRoundedIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
          <Tooltip title={currentUser.name}>
            <Box
              sx={{ display: 'flex', cursor: onSignOut ? 'pointer' : 'default' }}
              onClick={(event) => onSignOut && setAccountAnchor(event.currentTarget)}
            >
              <UserAvatar user={currentUser} size={34} showPresence={false} />
            </Box>
          </Tooltip>

          <Menu
            anchorEl={accountAnchor}
            open={Boolean(accountAnchor)}
            onClose={() => setAccountAnchor(null)}
            slotProps={{ paper: { sx: { borderRadius: 3, minWidth: 200 } } }}
          >
            <MenuItem disabled sx={{ opacity: '1 !important' }}>
              <ListItemText
                primary={currentUser.name}
                secondary="Signed in"
                slotProps={{ primary: { sx: { fontWeight: 600 } } }}
              />
            </MenuItem>
            {notifyPermission !== 'granted' && notifyPermission !== 'unsupported' && (
              <MenuItem
                disabled={notifyPermission === 'denied'}
                onClick={() => {
                  setAccountAnchor(null);
                  void requestNotificationPermission().then(setNotifyPermission);
                }}
              >
                <ListItemIcon>
                  <NotificationsActiveRoundedIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary="Enable notifications"
                  secondary={
                    notifyPermission === 'denied' ? 'Blocked in browser settings' : undefined
                  }
                />
              </MenuItem>
            )}

            <MenuItem
              onClick={() => {
                setAccountAnchor(null);
                onSignOut?.();
              }}
            >
              <ListItemIcon>
                <LogoutRoundedIcon fontSize="small" />
              </ListItemIcon>
              Sign out
            </MenuItem>
          </Menu>
        </Stack>

        <TextField
          fullWidth
          size="small"
          placeholder="Search conversations"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          sx={{
            mt: 2,
            '& .MuiOutlinedInput-root': {
              borderRadius: 3,
              bgcolor: (t) => tintText(t, 0.06),
              '& fieldset': { borderColor: 'transparent' },
              '&:hover fieldset': { borderColor: 'transparent' },
            },
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
            },
          }}
        />
      </Box>

      <List sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: 1.25, pb: 2 }}>
        {filtered.length === 0 && (
          <Stack spacing={1.5} sx={{ px: 2, py: 4, alignItems: 'center', textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              {query
                ? `No conversations match “${query}”.`
                : 'No conversations yet. Start one to get going.'}
            </Typography>
            {!query && (
              <IconButton onClick={onNewChat} sx={{ background: ACCENT_GRADIENT, color: '#fff' }}>
                <AddCommentRoundedIcon />
              </IconButton>
            )}
          </Stack>
        )}

        {filtered.map((conversation, index) => {
          const peer = peerOf(conversation);
          const selected = conversation.id === selectedId;
          const last = conversation.lastMessage;
          const fromMe = last?.senderId === currentUser.id;

          return (
            <ListItemButton
              key={conversation.id}
              selected={selected}
              onClick={() => onSelect(conversation.id)}
              sx={{
                position: 'relative',
                overflow: 'hidden',
                px: 1.5,
                py: 1.25,
                mb: 0.5,
                alignItems: 'flex-start',
                gap: 1.5,
                // Rows cascade in rather than appearing all at once. Capped so a
                // long list never leaves the last row waiting.
                animation: `appFadeUp 300ms ${EASE} both`,
                animationDelay: `${Math.min(index, 10) * 26}ms`,
                // Accent bar that grows out of the left edge when selected.
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  left: 0,
                  top: '50%',
                  width: 3,
                  height: selected ? 26 : 0,
                  borderRadius: 3,
                  background: ACCENT_GRADIENT,
                  transform: 'translateY(-50%)',
                  transition: `height 260ms ${EASE_SPRING}`,
                },
                '&.Mui-selected': {
                  bgcolor: (t) => tintPrimary(t, 0.14),
                  '&:hover': { bgcolor: (t) => tintPrimary(t, 0.2) },
                },
              }}
            >
              <UserAvatar user={peer} size={46} />

              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                  <Typography variant="subtitle2" noWrap sx={{ flex: 1 }}>
                    {peer.name}
                  </Typography>
                  {conversation.pinned && (
                    <PushPinRoundedIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
                  )}
                  {conversation.muted && (
                    <VolumeOffRoundedIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                  )}
                  <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                    {last ? shortStamp(last.createdAt) : ''}
                  </Typography>
                  <Tooltip title="Chat options">
                    <IconButton
                      size="small"
                      // Stop the row underneath from opening the conversation.
                      onClick={(event) => {
                        event.stopPropagation();
                        setRowMenu({ el: event.currentTarget, id: conversation.id });
                      }}
                      sx={{ p: 0.25, ml: -0.25, mr: -0.75, color: 'text.secondary' }}
                    >
                      <MoreVertRoundedIcon sx={{ fontSize: 17 }} />
                    </IconButton>
                  </Tooltip>
                </Stack>

                <Stack direction="row" spacing={0.5} sx={{ mt: 0.25, alignItems: 'center' }}>
                  {fromMe && (
                    <DoneAllRoundedIcon
                      sx={{
                        fontSize: 15,
                        flexShrink: 0,
                        color: last?.status === 'read' ? 'primary.main' : 'text.disabled',
                      }}
                    />
                  )}
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    noWrap
                    sx={{ flex: 1, fontWeight: conversation.unreadCount ? 600 : 400 }}
                  >
                    {last?.text ?? 'No messages yet'}
                  </Typography>
                  {conversation.unreadCount > 0 && (
                    <Badge
                      badgeContent={conversation.unreadCount}
                      color="primary"
                      sx={{
                        mr: 1.25,
                        '& .MuiBadge-badge': {
                          position: 'static',
                          transform: 'none',
                          animation: `appPop 320ms ${EASE_SPRING} both`,
                        },
                      }}
                    />
                  )}
                </Stack>
              </Box>
            </ListItemButton>
          );
        })}
      </List>

      <Menu
        anchorEl={rowMenu?.el ?? null}
        open={Boolean(rowMenu)}
        onClose={() => setRowMenu(null)}
        slotProps={{ paper: { sx: { borderRadius: 3, minWidth: 180 } } }}
      >
        <MenuItem
          onClick={() => {
            const target = conversations.find((c) => c.id === rowMenu?.id) ?? null;
            setRowMenu(null);
            setConfirmDelete(target);
          }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <DeleteOutlineRoundedIcon fontSize="small" sx={{ color: 'error.main' }} />
          </ListItemIcon>
          Delete chat
        </MenuItem>
      </Menu>

      <Dialog
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        slotProps={{ paper: { sx: { borderRadius: 4, maxWidth: 380 } } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Delete this chat?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Every message and call record with{' '}
            <strong>{confirmDelete ? peerOf(confirmDelete).name : ''}</strong> will be permanently
            deleted for both of you. This cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              if (confirmDelete) onDeleteConversation(confirmDelete.id);
              setConfirmDelete(null);
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
