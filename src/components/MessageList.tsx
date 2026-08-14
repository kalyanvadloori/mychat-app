import { useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import { EASE, tintText } from '../theme';
import type { Message, User } from '../types';
import { dayLabel } from '../utils/format';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';

interface Props {
  messages: Message[];
  peer: User;
  currentUserId: string;
  peerTyping: boolean;
  onEditMessage: (message: Message) => void;
  onUnsendMessage: (message: Message) => void;
}

export default function MessageList({
  messages,
  peer,
  currentUserId,
  peerTyping,
  onEditMessage,
  onUnsendMessage,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, peerTyping]);

  // Opening the keyboard shrinks the thread; keep the newest message in view.
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const stick = () => bottomRef.current?.scrollIntoView({ block: 'end' });
    viewport.addEventListener('resize', stick);
    return () => viewport.removeEventListener('resize', stick);
  }, []);

  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        px: { xs: 1.25, md: 4 },
        py: 2,
        // Faint dotted texture keeps the thread from reading as a flat sheet.
        backgroundImage: (t) => `radial-gradient(${tintText(t, 0.07)} 1px, transparent 1px)`,
        backgroundSize: '22px 22px',
      }}
    >
      {/* Keyed by peer so switching conversation replays the entrance. */}
      <Stack key={peer.id} sx={{ maxWidth: 900, mx: 'auto', minWidth: 0 }}>
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
                <Divider
                  sx={{
                    my: 2.5,
                    animation: `appFadeIn 320ms ${EASE} both`,
                    '&::before, &::after': { borderColor: 'divider' },
                  }}
                >
                  <Chip
                    label={dayLabel(message.createdAt)}
                    size="small"
                    sx={{
                      bgcolor: (t) => tintText(t, 0.08),
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
                onEdit={onEditMessage}
                onUnsend={onUnsendMessage}
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
