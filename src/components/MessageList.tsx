import { useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import type { Message, User } from '../types';
import { dayLabel } from '../utils/format';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';

interface Props {
  messages: Message[];
  peer: User;
  currentUserId: string;
  peerTyping: boolean;
}

export default function MessageList({ messages, peer, currentUserId, peerTyping }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, peerTyping]);

  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        px: { xs: 2, md: 4 },
        py: 2,
        // Faint dotted texture keeps the thread from reading as a flat sheet.
        backgroundImage: (t) =>
          `radial-gradient(${alpha(t.palette.text.primary, 0.05)} 1px, transparent 1px)`,
        backgroundSize: '22px 22px',
      }}
    >
      <Stack sx={{ maxWidth: 900, mx: 'auto' }}>
        {messages.map((message, index) => {
          const previous = messages[index - 1];
          const next = messages[index + 1];
          const newDay = !previous || dayLabel(previous.createdAt) !== dayLabel(message.createdAt);
          // A "group" is a run of consecutive messages from the same sender.
          const startsGroup = newDay || previous?.senderId !== message.senderId;
          const endsGroup = !next || next.senderId !== message.senderId;

          return (
            <Box key={message.id}>
              {newDay && (
                <Divider sx={{ my: 2.5, '&::before, &::after': { borderColor: 'divider' } }}>
                  <Chip
                    label={dayLabel(message.createdAt)}
                    size="small"
                    sx={{
                      bgcolor: (t) => alpha(t.palette.text.primary, 0.06),
                      fontSize: 11,
                      color: 'text.secondary',
                    }}
                  />
                </Divider>
              )}
              <MessageBubble
                message={message}
                peer={peer}
                currentUserId={currentUserId}
                startsGroup={startsGroup}
                endsGroup={endsGroup}
              />
            </Box>
          );
        })}

        {peerTyping && <TypingIndicator peer={peer} />}
        <Box ref={bottomRef} sx={{ height: 8 }} />
      </Stack>
    </Box>
  );
}
