import { useMemo, useState } from 'react';
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
          <List sx={{ maxHeight: 380, overflowY: 'auto' }}>
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
        )}
      </DialogContent>
    </Dialog>
  );
}
