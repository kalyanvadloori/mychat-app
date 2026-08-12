import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import BlockRoundedIcon from '@mui/icons-material/BlockRounded';
import CallRoundedIcon from '@mui/icons-material/CallRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import ImageRoundedIcon from '@mui/icons-material/ImageRounded';
import NotificationsOffRoundedIcon from '@mui/icons-material/NotificationsOffRounded';
import VideocamRoundedIcon from '@mui/icons-material/VideocamRounded';
import type { User } from '../types';
import { lastSeenLabel } from '../utils/format';
import UserAvatar from './UserAvatar';

interface Props {
  open: boolean;
  peer: User | null;
  muted: boolean;
  onClose: () => void;
  onToggleMute: () => void;
  onStartCall: (kind: 'video' | 'audio') => void;
}

export default function ProfilePanel({
  open,
  peer,
  muted,
  onClose,
  onToggleMute,
  onStartCall,
}: Props) {
  return (
    <Drawer
      anchor="right"
      open={open && Boolean(peer)}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: '100%', sm: 340 }, borderLeft: '1px solid', borderColor: 'divider' } } }}
    >
      {peer && (
        <Box>
          <Stack direction="row" sx={{ p: 2, alignItems: 'center' }}>
            <Typography variant="subtitle1" sx={{ flex: 1 }}>
              Contact info
            </Typography>
            <IconButton onClick={onClose}>
              <CloseRoundedIcon />
            </IconButton>
          </Stack>
          <Divider />

          <Stack spacing={1.25} sx={{ py: 4, px: 3, alignItems: 'center' }}>
            <UserAvatar user={peer} size={104} showPresence={false} />
            <Typography variant="h6">{peer.name}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
              {peer.presence === 'online' ? 'Online' : lastSeenLabel(peer.lastSeen)}
            </Typography>
            {peer.about && (
              <Typography variant="body2" sx={{ textAlign: 'center', mt: 1 }}>
                {peer.about}
              </Typography>
            )}

            <Stack direction="row" spacing={1.5} sx={{ pt: 2 }}>
              <IconButton onClick={() => onStartCall('audio')} sx={{ border: '1px solid', borderColor: 'divider' }}>
                <CallRoundedIcon />
              </IconButton>
              <IconButton
                onClick={() => onStartCall('video')}
                color="primary"
                sx={{ border: '1px solid', borderColor: 'divider' }}
              >
                <VideocamRoundedIcon />
              </IconButton>
            </Stack>
          </Stack>

          <Divider />
          <List>
            <ListItemButton onClick={onToggleMute}>
              <ListItemIcon>
                <NotificationsOffRoundedIcon />
              </ListItemIcon>
              <ListItemText primary="Mute notifications" />
              <Switch edge="end" checked={muted} />
            </ListItemButton>
            <ListItemButton disabled>
              <ListItemIcon>
                <ImageRoundedIcon />
              </ListItemIcon>
              <ListItemText primary="Media & files" secondary="Available after backend wiring" />
            </ListItemButton>
            <ListItemButton disabled>
              <ListItemIcon>
                <BlockRoundedIcon />
              </ListItemIcon>
              <ListItemText primary="Block contact" />
            </ListItemButton>
          </List>
        </Box>
      )}
    </Drawer>
  );
}
