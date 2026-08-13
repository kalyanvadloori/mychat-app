import { useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import InputBase from '@mui/material/InputBase';
import Paper from '@mui/material/Paper';
import Popover from '@mui/material/Popover';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import { ACCENT_GRADIENT, tintPaper } from '../theme';
import AttachFileRoundedIcon from '@mui/icons-material/AttachFileRounded';
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
}

export default function Composer({
  onSend,
  onTyping,
  disabled,
  attachmentsEnabled = true,
  onAttachmentBlocked,
}: Props) {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [emojiAnchor, setEmojiAnchor] = useState<HTMLElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canSend = Boolean(text.trim() || attachments.length);

  const signalTyping = () => {
    onTyping(true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => onTyping(false), 1500);
  };

  const send = () => {
    if (!canSend || disabled) return;
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
                sx={{ maxWidth: 260 }}
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
            multiline
            maxRows={6}
            fullWidth
            disabled={disabled}
            placeholder="Write a message…"
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
            }}
            sx={{ px: 1, py: 0.75, fontSize: 14.5, minWidth: 0, flex: 1 }}
          />

          {canSend ? (
            <Tooltip title="Send">
              <IconButton
                onClick={send}
                sx={{
                  background: ACCENT_GRADIENT,
                  color: '#fff',
                  width: 42,
                  height: 42,
                  flexShrink: 0,
                  '&:hover': { background: ACCENT_GRADIENT, filter: 'brightness(1.08)' },
                }}
              >
                <SendRoundedIcon fontSize="small" />
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
