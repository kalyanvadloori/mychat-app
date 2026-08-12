import { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Fade from '@mui/material/Fade';
import IconButton from '@mui/material/IconButton';
import Modal from '@mui/material/Modal';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import CallEndRoundedIcon from '@mui/icons-material/CallEndRounded';
import FlipCameraIosRoundedIcon from '@mui/icons-material/FlipCameraIosRounded';
import MicOffRoundedIcon from '@mui/icons-material/MicOffRounded';
import MicRoundedIcon from '@mui/icons-material/MicRounded';
import ScreenShareRoundedIcon from '@mui/icons-material/ScreenShareRounded';
import VideocamOffRoundedIcon from '@mui/icons-material/VideocamOffRounded';
import VideocamRoundedIcon from '@mui/icons-material/VideocamRounded';
import { gradientFor } from '../theme';
import type { Call } from '../types';
import { callDuration, initials } from '../utils/format';

interface Props {
  call: Call | null;
  onEnd: () => void;
  onConnected: () => void;
}

/**
 * Call UI running on local media only — the peer tile is a placeholder.
 * Agora's remote track gets rendered into the `remote-video` container in step 3;
 * every control below already maps 1:1 onto an Agora track method.
 */
export default function CallOverlay({ call, onEnd, onConnected }: Props) {
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [mediaError, setMediaError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const open = Boolean(call && call.state !== 'idle' && call.state !== 'ended');
  const connected = call?.state === 'connected';

  // Acquire the local camera/mic for the self-view while a call is open.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    navigator.mediaDevices
      ?.getUserMedia({ video: call?.kind === 'video', audio: true })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => {
        if (!cancelled) setMediaError('Camera unavailable — showing placeholder');
      });

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [open, call?.kind]);

  // Simulate the callee picking up.
  useEffect(() => {
    if (call?.state !== 'ringing') return;
    const t = setTimeout(onConnected, 2600);
    return () => clearTimeout(t);
  }, [call?.state, onConnected]);

  // Drive the duration readout once connected.
  useEffect(() => {
    if (!connected) return;
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, [connected]);

  // Mirror the control state onto the real local tracks.
  useEffect(() => {
    streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = micOn));
    streamRef.current?.getVideoTracks().forEach((t) => (t.enabled = camOn));
  }, [micOn, camOn]);

  // Reset controls for the next call.
  useEffect(() => {
    if (!open) {
      setMicOn(true);
      setCamOn(true);
      setMediaError(null);
    }
  }, [open]);

  if (!call) return null;
  const peer = call.peer;

  return (
    <Modal open={open} onClose={onEnd} closeAfterTransition>
      <Fade in={open}>
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            bgcolor: '#0A0C12',
            display: 'flex',
            flexDirection: 'column',
            outline: 'none',
          }}
        >
          {/* Remote tile */}
          <Box
            id="remote-video"
            sx={{
              flex: 1,
              position: 'relative',
              display: 'grid',
              placeItems: 'center',
              background: `radial-gradient(120% 90% at 50% 0%, ${alpha('#6366F1', 0.35)} 0%, transparent 60%), #0A0C12`,
            }}
          >
            <Stack spacing={2} sx={{ alignItems: 'center' }}>
              <Box
                sx={{
                  width: 132,
                  height: 132,
                  borderRadius: '50%',
                  background: gradientFor(peer.id),
                  display: 'grid',
                  placeItems: 'center',
                  color: '#fff',
                  fontSize: 46,
                  fontWeight: 700,
                  boxShadow: '0 24px 60px -20px rgba(99,102,241,0.8)',
                  animation: connected ? 'none' : 'callPulse 1.9s ease-out infinite',
                  '@keyframes callPulse': {
                    '0%': { boxShadow: `0 0 0 0 ${alpha('#818CF8', 0.55)}` },
                    '100%': { boxShadow: `0 0 0 42px ${alpha('#818CF8', 0)}` },
                  },
                }}
              >
                {initials(peer.name)}
              </Box>

              <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700 }}>
                {peer.name}
              </Typography>
              <Typography sx={{ color: alpha('#fff', 0.7) }}>
                {call.state === 'ringing' && 'Ringing…'}
                {call.state === 'incoming' && `Incoming ${call.kind} call`}
                {connected && callDuration(call.startedAt, nowMs)}
              </Typography>
              {mediaError && (
                <Typography variant="caption" sx={{ color: alpha('#fff', 0.5) }}>
                  {mediaError}
                </Typography>
              )}
            </Stack>

            {/* Local self-view */}
            {call.kind === 'video' && (
              <Box
                sx={{
                  position: 'absolute',
                  right: { xs: 16, md: 28 },
                  bottom: { xs: 16, md: 28 },
                  width: { xs: 116, md: 190 },
                  aspectRatio: '3 / 4',
                  borderRadius: 4,
                  overflow: 'hidden',
                  bgcolor: '#151824',
                  border: '1px solid',
                  borderColor: alpha('#fff', 0.14),
                  boxShadow: '0 18px 40px -18px rgba(0,0,0,0.9)',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <Box
                  component="video"
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: 'scaleX(-1)',
                    display: camOn ? 'block' : 'none',
                  }}
                />
                {!camOn && <VideocamOffRoundedIcon sx={{ color: alpha('#fff', 0.5) }} />}
              </Box>
            )}
          </Box>

          {/* Controls */}
          <Stack
            direction="row"
            spacing={{ xs: 1.5, md: 2.5 }}
            sx={{ py: { xs: 3, md: 4 }, justifyContent: 'center' }}
          >
            <CallButton
              label={micOn ? 'Mute' : 'Unmute'}
              active={!micOn}
              onClick={() => setMicOn((v) => !v)}
            >
              {micOn ? <MicRoundedIcon /> : <MicOffRoundedIcon />}
            </CallButton>

            <CallButton
              label={camOn ? 'Turn camera off' : 'Turn camera on'}
              active={!camOn}
              onClick={() => setCamOn((v) => !v)}
            >
              {camOn ? <VideocamRoundedIcon /> : <VideocamOffRoundedIcon />}
            </CallButton>

            <CallButton label="Share screen" disabled>
              <ScreenShareRoundedIcon />
            </CallButton>

            <CallButton label="Switch camera" disabled>
              <FlipCameraIosRoundedIcon />
            </CallButton>

            <Tooltip title="End call">
              <IconButton
                onClick={onEnd}
                sx={{
                  width: 62,
                  height: 62,
                  bgcolor: '#EF4444',
                  color: '#fff',
                  '&:hover': { bgcolor: '#DC2626' },
                }}
              >
                <CallEndRoundedIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>
      </Fade>
    </Modal>
  );
}

function CallButton({
  children,
  label,
  active,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <Tooltip title={disabled ? `${label} (coming soon)` : label}>
      <span>
        <IconButton
          onClick={onClick}
          disabled={disabled}
          sx={{
            width: 62,
            height: 62,
            color: active ? '#0A0C12' : '#fff',
            bgcolor: active ? '#fff' : alpha('#fff', 0.12),
            '&:hover': { bgcolor: active ? '#fff' : alpha('#fff', 0.2) },
            '&.Mui-disabled': { color: alpha('#fff', 0.28), bgcolor: alpha('#fff', 0.06) },
          }}
        >
          {children}
        </IconButton>
      </span>
    </Tooltip>
  );
}
