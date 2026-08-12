import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import type { User } from '../types';
import UserAvatar from './UserAvatar';

export default function TypingIndicator({ peer }: { peer: User }) {
  return (
    <Stack direction="row" spacing={1} sx={{ mt: 1.5, alignItems: 'flex-end' }}>
      <Box sx={{ width: 32, flexShrink: 0 }}>
        <UserAvatar user={peer} size={32} showPresence={false} />
      </Box>
      <Stack
        direction="row"
        spacing={0.6}
        sx={{
          alignItems: 'center',
          px: 2,
          py: 1.4,
          borderRadius: 3,
          borderBottomLeftRadius: 6,
          bgcolor: (t) => alpha(t.palette.text.primary, 0.06),
          '@keyframes typingBounce': {
            '0%, 60%, 100%': { transform: 'translateY(0)', opacity: 0.45 },
            '30%': { transform: 'translateY(-5px)', opacity: 1 },
          },
        }}
      >
        {[0, 1, 2].map((i) => (
          <Box
            key={i}
            sx={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              bgcolor: 'text.secondary',
              animation: 'typingBounce 1.3s ease-in-out infinite',
              animationDelay: `${i * 0.18}s`,
            }}
          />
        ))}
      </Stack>
    </Stack>
  );
}
