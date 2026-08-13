import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import CallRoundedIcon from '@mui/icons-material/CallRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import VideocamRoundedIcon from '@mui/icons-material/VideocamRounded';
import type { User } from '../types';
import { lastSeenLabel } from '../utils/format';
import UserAvatar from './UserAvatar';

interface Props {
  peer: User;
  typing: boolean;
  onStartCall: (kind: 'video' | 'audio') => void;
  onToggleProfile: () => void;
  onBack?: () => void;
}

export default function ChatHeader({ peer, typing, onStartCall, onToggleProfile, onBack }: Props) {
  const statusText = typing
    ? 'typing…'
    : peer.presence === 'online'
      ? 'Online'
      : peer.presence === 'away'
        ? 'Away'
        : lastSeenLabel(peer.lastSeen);

  return (
    <Stack
      direction="row"
      spacing={{ xs: 0.75, md: 1.5 }}
      sx={{
        alignItems: 'center',
        px: { xs: 1, md: 3 },
        py: { xs: 1, md: 1.5 },
        minWidth: 0,
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: (t) => alpha(t.palette.background.paper, 0.75),
        backdropFilter: 'blur(10px)',
        flexShrink: 0,
      }}
    >
      {onBack && (
        <IconButton onClick={onBack} sx={{ display: { md: 'none' }, flexShrink: 0, ml: -0.5 }}>
          <ArrowBackRoundedIcon />
        </IconButton>
      )}

      <Box
        onClick={onToggleProfile}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: { xs: 1, md: 1.5 },
          cursor: 'pointer',
          minWidth: 0,
          flex: 1,
        }}
      >
        <Box sx={{ flexShrink: 0, display: 'flex' }}>
          <UserAvatar user={peer} size={40} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" noWrap>
            {peer.name}
          </Typography>
          <Typography
            variant="caption"
            noWrap
            component="div"
            sx={{
              color: typing || peer.presence === 'online' ? 'success.main' : 'text.secondary',
              fontWeight: typing ? 600 : 400,
            }}
          >
            {statusText}
          </Typography>
        </Box>
      </Box>

      <Tooltip title="Voice call">
        <IconButton onClick={() => onStartCall('audio')} sx={{ flexShrink: 0 }}>
          <CallRoundedIcon />
        </IconButton>
      </Tooltip>
      <Tooltip title="Video call">
        <IconButton onClick={() => onStartCall('video')} color="primary" sx={{ flexShrink: 0 }}>
          <VideocamRoundedIcon />
        </IconButton>
      </Tooltip>
      {/* The name block is tappable for contact info, so this button is desktop-only. */}
      <Tooltip title="Contact info">
        <IconButton onClick={onToggleProfile} sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
          <InfoOutlinedIcon />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}
