import { useRef, useState } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import MoreHorizRoundedIcon from '@mui/icons-material/MoreHorizRounded';
import UndoRoundedIcon from '@mui/icons-material/UndoRounded';
import AttachFileRoundedIcon from '@mui/icons-material/AttachFileRounded';
import DoneAllRoundedIcon from '@mui/icons-material/DoneAllRounded';
import DoneRoundedIcon from '@mui/icons-material/DoneRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import CallMadeRoundedIcon from '@mui/icons-material/CallMadeRounded';
import CallReceivedRoundedIcon from '@mui/icons-material/CallReceivedRounded';
import CallRoundedIcon from '@mui/icons-material/CallRounded';
import VideocamRoundedIcon from '@mui/icons-material/VideocamRounded';
import { ACCENT_GRADIENT, EASE, tintText } from '../theme';
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
  onEdit?: (message: Message) => void;
  onUnsend?: (message: Message) => void;
}

/** Long-press duration before the actions menu opens on touch devices. */
const LONG_PRESS_MS = 450;

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
          bgcolor: mine ? alpha('#000', 0.18) : (t) => tintText(t, 0.1),
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
  onEdit,
  onUnsend,
}: Props) {
  const mine = message.senderId === currentUserId;
  // Call records are history, not something you wrote — nothing to edit there.
  const actionable = mine && !message.call && Boolean(onEdit || onUnsend);

  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openMenu = (element: HTMLElement) => actionable && setMenuAnchor(element);
  const cancelPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = null;
  };

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

      {/* Desktop affordance: appears on hover, keeps touch users to long-press. */}
      {actionable && (
        <Tooltip title="Message options">
          <IconButton
            size="small"
            onClick={(event) => openMenu(event.currentTarget)}
            sx={{
              order: -1,
              alignSelf: 'center',
              opacity: 0,
              transition: 'opacity 160ms ease',
              color: 'text.secondary',
              '.MuiStack-root:hover > &': { opacity: 1 },
              '&:focus-visible': { opacity: 1 },
              // Touch devices get the long-press instead; a permanent button crowds the thread.
              '@media (hover: none)': { display: 'none' },
            }}
          >
            <MoreHorizRoundedIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      )}

      <Box
        onContextMenu={(event) => {
          if (!actionable) return;
          event.preventDefault();
          openMenu(event.currentTarget as HTMLElement);
        }}
        onPointerDown={(event) => {
          if (!actionable || event.pointerType === 'mouse') return;
          const element = event.currentTarget as HTMLElement;
          pressTimer.current = setTimeout(() => openMenu(element), LONG_PRESS_MS);
        }}
        onPointerUp={cancelPress}
        onPointerLeave={cancelPress}
        onPointerCancel={cancelPress}
        sx={(t) => ({
          // Incoming rows also carry a 32px avatar + gap, so they get less room.
          maxWidth: {
            xs: mine ? 'calc(100% - 8px)' : 'calc(100% - 48px)',
            sm: '78%',
            md: '62%',
          },
          minWidth: 0,
          px: 1.75,
          py: 1.1,
          borderRadius: 3,
          // Flatten the corner facing the group so a run of messages reads as one block.
          borderBottomRightRadius: mine && endsGroup ? 6 : undefined,
          borderBottomLeftRadius: !mine && endsGroup ? 6 : undefined,
          color: mine ? '#fff' : 'text.primary',
          background: mine ? ACCENT_GRADIENT : undefined,
          // Incoming bubbles need a visible surface — a 6% tint disappears on an OLED phone.
          ...(mine
            ? {}
            : {
                bgcolor: alpha('#0F172A', 0.07),
                ...t.applyStyles('dark', { backgroundColor: alpha('#FFFFFF', 0.11) }),
              }),
          boxShadow: mine ? '0 6px 18px -8px rgba(99,102,241,0.65)' : 'none',
          // Bubbles arrive from the side they belong to, which reads as movement
          // toward you or away from you rather than a generic fade.
          // Stops the long-press turning into a text selection on mobile.
          ...(actionable ? { WebkitTouchCallout: 'none', userSelect: 'none' } : {}),
          animation: `bubbleIn 260ms ${EASE} both`,
          '@keyframes bubbleIn': {
            from: {
              opacity: 0,
              transform: `translate(${mine ? '12px' : '-12px'}, 8px) scale(0.94)`,
            },
            to: { opacity: 1, transform: 'none' },
          },
        })}
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
              bgcolor: mine ? alpha('#000', 0.16) : (t) => tintText(t, 0.1),
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
          {message.editedAt && (
            <Typography variant="caption" sx={{ fontSize: 11, fontStyle: 'italic' }}>
              edited
            </Typography>
          )}
          <Typography variant="caption" sx={{ fontSize: 11 }}>
            {timeOf(message.createdAt)}
          </Typography>
          {mine && <StatusIcon status={message.status} />}
        </Stack>
      </Box>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        slotProps={{ paper: { sx: { borderRadius: 3, minWidth: 180 } } }}
      >
        {onEdit && (
          <MenuItem
            onClick={() => {
              setMenuAnchor(null);
              onEdit(message);
            }}
          >
            <ListItemIcon>
              <EditRoundedIcon fontSize="small" />
            </ListItemIcon>
            Edit
          </MenuItem>
        )}
        {onUnsend && (
          <MenuItem
            onClick={() => {
              setMenuAnchor(null);
              onUnsend(message);
            }}
            sx={{ color: 'error.main' }}
          >
            <ListItemIcon>
              <UndoRoundedIcon fontSize="small" sx={{ color: 'error.main' }} />
            </ListItemIcon>
            Unsend
          </MenuItem>
        )}
      </Menu>
    </Stack>
  );
}
