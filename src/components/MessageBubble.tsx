import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import AttachFileRoundedIcon from '@mui/icons-material/AttachFileRounded';
import DoneAllRoundedIcon from '@mui/icons-material/DoneAllRounded';
import DoneRoundedIcon from '@mui/icons-material/DoneRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import CallMadeRoundedIcon from '@mui/icons-material/CallMadeRounded';
import CallReceivedRoundedIcon from '@mui/icons-material/CallReceivedRounded';
import CallRoundedIcon from '@mui/icons-material/CallRounded';
import VideocamRoundedIcon from '@mui/icons-material/VideocamRounded';
import { ACCENT_GRADIENT } from '../theme';
import type { CallLog, Message, User } from '../types';
import { callDetail, callHeadline, callIsNegative } from '../utils/call';
import { formatBytes, timeOf } from '../utils/format';
import UserAvatar from './UserAvatar';

interface Props {
  message: Message;
  peer: User;
  /** Id of the signed-in user — decides which side the bubble sits on. */
  currentUserId: string;
  /** True when the previous message came from a different sender — controls the avatar and the tail. */
  startsGroup: boolean;
  endsGroup: boolean;
}

/** Inline call history entry: icon, what happened, and how long it lasted. */
function CallRecord({ call, mine }: { call: CallLog; mine: boolean }) {
  const negative = callIsNegative(call);
  const DirectionIcon = mine ? CallMadeRoundedIcon : CallReceivedRoundedIcon;
  const KindIcon = call.kind === 'video' ? VideocamRoundedIcon : CallRoundedIcon;

  return (
    <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', pr: 1 }}>
      <Box
        sx={{
          width: 34,
          height: 34,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
          bgcolor: mine ? alpha('#000', 0.18) : (t) => alpha(t.palette.text.primary, 0.07),
          color: negative && !mine ? 'error.main' : 'inherit',
        }}
      >
        <KindIcon sx={{ fontSize: 18 }} />
      </Box>

      <Box sx={{ minWidth: 0 }}>
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
          <DirectionIcon sx={{ fontSize: 13, opacity: 0.75 }} />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {callHeadline(call, mine)}
          </Typography>
        </Stack>
        <Typography variant="caption" sx={{ opacity: 0.75 }}>
          {callDetail(call)}
        </Typography>
      </Box>
    </Stack>
  );
}

function StatusIcon({ status }: { status: Message['status'] }) {
  const sx = { fontSize: 15, opacity: 0.85 } as const;
  if (status === 'sending') return <ScheduleRoundedIcon sx={sx} />;
  if (status === 'sent') return <DoneRoundedIcon sx={sx} />;
  return <DoneAllRoundedIcon sx={{ ...sx, opacity: status === 'read' ? 1 : 0.85 }} />;
}

export default function MessageBubble({
  message,
  peer,
  currentUserId,
  startsGroup,
  endsGroup,
}: Props) {
  const mine = message.senderId === currentUserId;

  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{
        justifyContent: mine ? 'flex-end' : 'flex-start',
        alignItems: 'flex-end',
        mt: startsGroup ? 1.5 : 0.35,
      }}
    >
      {!mine && (
        <Box sx={{ width: 32, flexShrink: 0 }}>
          {endsGroup && <UserAvatar user={peer} size={32} showPresence={false} />}
        </Box>
      )}

      <Box
        sx={{
          maxWidth: { xs: '78%', md: '62%' },
          px: 1.75,
          py: 1.1,
          borderRadius: 3,
          // Flatten the corner facing the group so a run of messages reads as one block.
          borderBottomRightRadius: mine && endsGroup ? 6 : undefined,
          borderBottomLeftRadius: !mine && endsGroup ? 6 : undefined,
          color: mine ? '#fff' : 'text.primary',
          background: mine ? ACCENT_GRADIENT : undefined,
          bgcolor: mine ? undefined : (t) => alpha(t.palette.text.primary, 0.06),
          boxShadow: mine ? '0 6px 18px -8px rgba(99,102,241,0.65)' : 'none',
          animation: 'bubbleIn 180ms ease-out',
          '@keyframes bubbleIn': {
            from: { opacity: 0, transform: 'translateY(6px) scale(0.98)' },
            to: { opacity: 1, transform: 'none' },
          },
        }}
      >
        {message.attachments?.map((attachment) => (
          <Stack
            key={attachment.id}
            direction="row"
            spacing={1}
            sx={{
              alignItems: 'center',
              mb: message.text ? 1 : 0,
              px: 1.25,
              py: 1,
              borderRadius: 2,
              bgcolor: mine ? alpha('#000', 0.16) : (t) => alpha(t.palette.text.primary, 0.06),
            }}
          >
            <AttachFileRoundedIcon sx={{ fontSize: 18 }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                {attachment.name}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                {formatBytes(attachment.size)}
              </Typography>
            </Box>
          </Stack>
        ))}

        {message.call ? (
          <CallRecord call={message.call} mine={mine} />
        ) : (
          message.text && (
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {message.text}
            </Typography>
          )
        )}

        <Stack
          direction="row"
          spacing={0.5}
          sx={{ mt: 0.4, alignItems: 'center', justifyContent: 'flex-end', opacity: mine ? 0.85 : 0.6 }}
        >
          <Typography variant="caption" sx={{ fontSize: 11 }}>
            {timeOf(message.createdAt)}
          </Typography>
          {mine && <StatusIcon status={message.status} />}
        </Stack>
      </Box>
    </Stack>
  );
}
