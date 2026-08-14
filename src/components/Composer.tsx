import { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import InputBase from '@mui/material/InputBase';
import Paper from '@mui/material/Paper';
import Popover from '@mui/material/Popover';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { ACCENT_GRADIENT, EASE, EASE_SPRING, tintPaper, tintPrimary } from '../theme';
import AttachFileRoundedIcon from '@mui/icons-material/AttachFileRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import MicRoundedIcon from '@mui/icons-material/MicRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import SentimentSatisfiedAltRoundedIcon from '@mui/icons-material/SentimentSatisfiedAltRounded';
import type { Attachment } from '../types';
import { formatBytes } from '../utils/format';

const EMOJIS = [
  '😀', '😄', '😁', '😊', '🙂', '😉', '😍', '🤩',
  '🤔', '😎', '😅', '🙌', '👍', '👏', '🔥', '✨',
  '🎉', '❤️', '💯', '🚀', '✅', '👀', '🙏', '😴',
];

interface Props {
  onSend: (text: string, attachments?: Attachment[]) => void;
  onTyping: (typing: boolean) => void;
  disabled?: boolean;
  /** False on backends that cannot store files (Firebase Storage needs a paid plan). */
  attachmentsEnabled?: boolean;
  onAttachmentBlocked?: () => void;
  /** Set while an existing message is being rewritten. */
  editing?: { id: string; text: string } | null;
  onSaveEdit?: (text: string) => void;
  onCancelEdit?: () => void;
}

export default function Composer({
  onSend,
  onTyping,
  disabled,
  attachmentsEnabled = true,
  onAttachmentBlocked,
  editing,
  onSaveEdit,
  onCancelEdit,
}: Props) {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [emojiAnchor, setEmojiAnchor] = useState<HTMLElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canSend = Boolean(text.trim() || attachments.length);

  const signalTyping = () => {
    onTyping(true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => onTyping(false), 1500);
  };

  // Loading the message being edited into the field, and restoring on cancel.
  useEffect(() => {
    setText(editing ? editing.text : '');
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const send = () => {
    if (!canSend || disabled) return;

    if (editing) {
      onSaveEdit?.(text.trim());
      return;
    }

    onSend(text.trim(), attachments.length ? attachments : undefined);
    setText('');
    setAttachments([]);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    onTyping(false);
  };

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList?.length) return;
    setAttachments((prev) => [
      ...prev,
      ...Array.from(fileList).map((file, i) => ({
        id: `${file.name}-${i}-${file.size}`,
        name: file.name,
        size: file.size,
        type: file.type.startsWith('image/') ? ('image' as const) : ('file' as const),
        url: URL.createObjectURL(file),
      })),
    ]);
  };

  return (
    <Box sx={{ px: { xs: 1, md: 3 }, pb: { xs: 1, md: 2 }, pt: 1, minWidth: 0 }}>
      <Box sx={{ maxWidth: 900, mx: 'auto', minWidth: 0 }}>
        {editing && (
          <Stack
            direction="row"
            spacing={1}
            sx={{
              alignItems: 'center',
              mb: 1,
              px: 1.5,
              py: 1,
              borderRadius: 3,
              borderLeft: '3px solid',
              borderColor: 'primary.main',
              bgcolor: (t) => tintPrimary(t, 0.1),
              animation: `appFadeUp 220ms ${EASE} both`,
            }}
          >
            <EditRoundedIcon sx={{ fontSize: 17, color: 'primary.main' }} />
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main' }}>
                Editing message
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap>
                {editing.text}
              </Typography>
            </Box>
            <Tooltip title="Cancel editing">
              <IconButton size="small" onClick={onCancelEdit}>
                <CloseRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        )}

        {attachments.length > 0 && (
          <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap', gap: 1 }}>
            {attachments.map((attachment) => (
              <Chip
                key={attachment.id}
                icon={<AttachFileRoundedIcon />}
                label={`${attachment.name} · ${formatBytes(attachment.size)}`}
                onDelete={() =>
                  setAttachments((prev) => prev.filter((a) => a.id !== attachment.id))
                }
                sx={{ maxWidth: 260, animation: `appPop 260ms ${EASE} both` }}
              />
            ))}
          </Stack>
        )}

        <Paper
          sx={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: { xs: 0, sm: 0.5 },
            p: 0.75,
            minWidth: 0,
            borderRadius: 4,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: (t) => tintPaper(t, 0.95),
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            transition: `border-color 220ms ease, box-shadow 220ms ${EASE}`,
            // Lifts toward you as soon as the caret lands in the field.
            '&:focus-within': {
              borderColor: 'primary.main',
              boxShadow: (t) => `0 0 0 4px ${tintPrimary(t, 0.16)}`,
            },
          }}
        >
          <Tooltip title="Emoji">
            <IconButton onClick={(e) => setEmojiAnchor(e.currentTarget)} disabled={disabled}>
              <SentimentSatisfiedAltRoundedIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title={attachmentsEnabled ? 'Attach file' : 'File sharing unavailable'}>
            <IconButton
              onClick={() =>
                attachmentsEnabled ? fileInputRef.current?.click() : onAttachmentBlocked?.()
              }
              disabled={disabled}
              sx={{ opacity: attachmentsEnabled ? 1 : 0.5 }}
            >
              <AttachFileRoundedIcon />
            </IconButton>
          </Tooltip>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            hidden
            onChange={(event) => {
              handleFiles(event.target.files);
              event.target.value = '';
            }}
          />

          <InputBase
            inputRef={inputRef}
            multiline
            maxRows={6}
            fullWidth
            disabled={disabled}
            placeholder={editing ? 'Edit your message…' : 'Write a message…'}
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              signalTyping();
            }}
            onKeyDown={(event) => {
              // Enter sends, Shift+Enter inserts a newline.
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                send();
              }
              if (event.key === 'Escape' && editing) onCancelEdit?.();
            }}
            // Must stay at 16px on phones: iOS zooms the page when a focused
            // field is smaller, which shrinks the viewport and clips the layout.
            sx={{ px: 1, py: 0.75, fontSize: { xs: 16, md: 14.5 }, minWidth: 0, flex: 1 }}
          />

          {canSend ? (
            <Tooltip title={editing ? 'Save changes' : 'Send'}>
              <IconButton
                onClick={send}
                sx={{
                  background: ACCENT_GRADIENT,
                  color: '#fff',
                  width: 42,
                  height: 42,
                  flexShrink: 0,
                  boxShadow: '0 8px 20px -10px rgba(99,102,241,0.95)',
                  // Springs in the moment there is something worth sending.
                  animation: `appPop 280ms ${EASE_SPRING} both`,
                  '&:hover': { background: ACCENT_GRADIENT, filter: 'brightness(1.08)' },
                }}
              >
                {editing ? <CheckRoundedIcon fontSize="small" /> : <SendRoundedIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
          ) : (
            <Tooltip title="Voice message (coming soon)">
              <span>
                <IconButton disabled sx={{ width: 42, height: 42, flexShrink: 0 }}>
                  <MicRoundedIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          )}
        </Paper>

        <Popover
          open={Boolean(emojiAnchor)}
          anchorEl={emojiAnchor}
          onClose={() => setEmojiAnchor(null)}
          anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
          transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          slotProps={{ paper: { sx: { p: 1, borderRadius: 3, width: 296 } } }}
        >
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)' }}>
            {EMOJIS.map((emoji) => (
              <IconButton
                key={emoji}
                onClick={() => {
                  setText((prev) => prev + emoji);
                  setEmojiAnchor(null);
                }}
                sx={{ fontSize: 20 }}
              >
                {emoji}
              </IconButton>
            ))}
          </Box>
        </Popover>
      </Box>
    </Box>
  );
}
