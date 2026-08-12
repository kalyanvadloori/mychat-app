import Avatar from '@mui/material/Avatar';
import Badge from '@mui/material/Badge';
import { styled } from '@mui/material/styles';
import { gradientFor } from '../theme';
import type { Presence, User } from '../types';
import { initials } from '../utils/format';

const PRESENCE_COLOR: Record<Presence, string> = {
  online: '#22C55E',
  away: '#F59E0B',
  offline: '#94A3B8',
};

const PresenceBadge = styled(Badge, {
  shouldForwardProp: (prop) => prop !== 'presence',
})<{ presence: Presence }>(({ theme, presence }) => ({
  '& .MuiBadge-badge': {
    minWidth: 11,
    height: 11,
    borderRadius: '50%',
    padding: 0,
    backgroundColor: PRESENCE_COLOR[presence],
    boxShadow: `0 0 0 2.5px ${theme.vars?.palette.background.paper ?? theme.palette.background.paper}`,
    // Soft pulse so an active contact reads as live rather than decorative.
    ...(presence === 'online' && {
      '&::after': {
        content: '""',
        position: 'absolute',
        inset: 0,
        borderRadius: '50%',
        border: `1px solid ${PRESENCE_COLOR.online}`,
        animation: 'presencePulse 2.2s ease-out infinite',
      },
    }),
  },
  '@keyframes presencePulse': {
    '0%': { transform: 'scale(1)', opacity: 0.9 },
    '100%': { transform: 'scale(2.4)', opacity: 0 },
  },
}));

interface Props {
  user: User;
  size?: number;
  showPresence?: boolean;
}

export default function UserAvatar({ user, size = 44, showPresence = true }: Props) {
  const avatar = (
    <Avatar
      src={user.avatar}
      sx={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        fontWeight: 700,
        color: '#fff',
        background: gradientFor(user.id),
      }}
    >
      {initials(user.name)}
    </Avatar>
  );

  if (!showPresence) return avatar;

  return (
    <PresenceBadge
      presence={user.presence}
      overlap="circular"
      variant="dot"
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    >
      {avatar}
    </PresenceBadge>
  );
}
