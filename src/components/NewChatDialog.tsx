import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import InputAdornment from '@mui/material/InputAdornment';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import { tintPaper, tintText } from '../theme';
import type { User } from '../types';
import { lastSeenLabel } from '../utils/format';
import UserAvatar from './UserAvatar';

interface Props {
  open: boolean;
  users: User[];
  onClose: () => void;
  onSelect: (userId: string) => void;
}

export default function NewChatDialog({ open, users, onClose, onSelect }: Props) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? users.filter((u) => u.name.toLowerCase().includes(q)) : users;
  }, [users, query]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      slotProps={{ paper: { sx: { borderRadius: 4 } } }}
    >
      <DialogTitle sx={{ fontWeight: 700 }}>New chat</DialogTitle>
      <DialogContent sx={{ pb: 2 }}>
        <TextField
          autoFocus
          fullWidth
          size="small"
          placeholder="Search people"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          sx={{ mb: 1 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />

        {filtered.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
            No one else has signed up yet. Register a second account in another browser to chat.
          </Typography>
        ) : (
          <Box
            sx={{
              position: 'relative',
              // A soft fade at the bottom edge says "there is more" on iOS, where
              // scrollbars are invisible until you are already scrolling.
              '&::after': {
                content: '""',
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                height: 28,
                pointerEvents: 'none',
                background: (t) =>
                  `linear-gradient(to top, ${tintPaper(t, 1)} 0%, ${tintPaper(t, 0)} 100%)`,
              },
            }}
          >
            <List
              sx={{
                maxHeight: { xs: '52vh', sm: 380 },
                overflowY: 'auto',
                WebkitOverflowScrolling: 'touch',
                // Keeps a visible track on platforms that allow styling it.
                '&::-webkit-scrollbar': { width: 6 },
                '&::-webkit-scrollbar-thumb': {
                  borderRadius: 6,
                  bgcolor: (t) => tintText(t, 0.28),
                },
                scrollbarWidth: 'thin',
              }}
            >
            {filtered.map((user) => (
              <ListItemButton
                key={user.id}
                onClick={() => onSelect(user.id)}
                sx={{ gap: 1.5, py: 1 }}
              >
                <UserAvatar user={user} size={40} />
                <ListItemText
                  primary={user.name}
                  secondary={user.presence === 'online' ? 'Online' : lastSeenLabel(user.lastSeen)}
                  slotProps={{ primary: { sx: { fontWeight: 600 } } }}
                />
              </ListItemButton>
            ))}
            </List>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
