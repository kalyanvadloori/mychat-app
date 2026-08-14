import { useCallback, useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Fade from '@mui/material/Fade';
import IconButton from '@mui/material/IconButton';
import Modal from '@mui/material/Modal';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import CallEndRoundedIcon from '@mui/icons-material/CallEndRounded';
import CallRoundedIcon from '@mui/icons-material/CallRounded';
import MicOffRoundedIcon from '@mui/icons-material/MicOffRounded';
import MicRoundedIcon from '@mui/icons-material/MicRounded';
import VideocamOffRoundedIcon from '@mui/icons-material/VideocamOffRounded';
import VideocamRoundedIcon from '@mui/icons-material/VideocamRounded';
import type { IAgoraRTCRemoteUser } from 'agora-rtc-sdk-ng';
import { callErrorMessage, joinCall, type CallSession } from '../lib/agora';
import { gradientFor } from '../theme';
import type { Call } from '../types';
import { callDuration, initials } from '../utils/format';

interface Props {
  call: Call | null;
  onEnd: () => void;
  onAccept: () => void;
  onDecline: () => void;
  onConnected: () => void;
}

export default function CallOverlay({ call, onEnd, onAccept, onDecline, onConnected }: Props) {
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);

  const sessionRef = useRef<CallSession | null>(null);
  const joiningRef = useRef(false);
  const localRef = useRef<HTMLDivElement>(null);
  const remoteRef = useRef<HTMLDivElement>(null);

  const state = call?.state;
  const open = Boolean(call && state !== 'idle' && state !== 'ended');
  const connected = state === 'connected';
  const incoming = state === 'incoming';
  const video = call?.kind === 'video';

  // An incoming call must not touch the camera until it is answered.
  const shouldJoin = open && !incoming;

  const onRemoteUsers = useCallback(
    (users: IAgoraRTCRemoteUser[]) => {
      const peer = users[0];
      if (!peer) {
        setHasRemoteVideo(false);
        return;
      }
      // Arrival of the other side is what turns "ringing" into "connected".
      onConnected();
      if (peer.videoTrack && remoteRef.current) {
        peer.videoTrack.play(remoteRef.current);
        setHasRemoteVideo(true);
      } else {
        setHasRemoteVideo(false);
      }
    },
    [onConnected],
  );

  useEffect(() => {
    // Guarded by refs, not state: connecting flips the state, and a second join
    // would drop the first session and restart the call.
    if (!shouldJoin || !call || sessionRef.current || joiningRef.current) return;

    joiningRef.current = true;
    let cancelled = false;

    joinCall({
      channel: call.conversationId,
      uid: call.selfId,
      video: call.kind === 'video',
      onRemoteUsers,
      onPeerLeft: onEnd,
    })
      .then((session) => {
        joiningRef.current = false;
        if (cancelled) {
          void session.leave();
          return;
        }
        sessionRef.current = session;
        if (session.cameraTrack && localRef.current) session.cameraTrack.play(localRef.current);
      })
      .catch((err) => {
        joiningRef.current = false;
        if (!cancelled) setError(callErrorMessage(err));
      });

    return () => {
      cancelled = true;
    };
  }, [shouldJoin, call, onRemoteUsers, onEnd]);

  // Tear the session down whenever the call screen closes.
  useEffect(() => {
    if (open) return;
    const session = sessionRef.current;
    sessionRef.current = null;
    void session?.leave();
    setMicOn(true);
    setCamOn(true);
    setError(null);
    setHasRemoteVideo(false);
  }, [open]);

  // Leave cleanly if the tab is closed mid-call.
  useEffect(
    () => () => {
      void sessionRef.current?.leave();
      sessionRef.current = null;
    },
    [],
  );

  useEffect(() => {
    if (!connected) return;
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [connected]);

  const toggleMic = () => {
    const next = !micOn;
    setMicOn(next);
    void sessionRef.current?.micTrack?.setEnabled(next);
  };

  const toggleCam = () => {
    const next = !camOn;
    setCamOn(next);
    void sessionRef.current?.cameraTrack?.setEnabled(next);
  };

  if (!call) return null;
  const peer = call.peer;

  return (
    <Modal open={open} onClose={incoming ? onDecline : onEnd} closeAfterTransition>
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
          <Box
            sx={{
              flex: 1,
              position: 'relative',
              display: 'grid',
              placeItems: 'center',
              background: `radial-gradient(120% 90% at 50% 0%, ${alpha('#6366F1', 0.35)} 0%, transparent 60%), #0A0C12`,
            }}
          >
            {/* Remote video fills the screen once their track arrives. */}
            <Box
              ref={remoteRef}
              sx={{
                position: 'absolute',
                inset: 0,
                opacity: hasRemoteVideo ? 1 : 0,
                transition: 'opacity 320ms ease',
                '& video': { objectFit: 'cover' },
              }}
            />

            {/* Identity card, shown until there is remote video to replace it. */}
            {!hasRemoteVideo && (
              <Stack spacing={2} sx={{ alignItems: 'center', zIndex: 1 }}>
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
                  {state === 'ringing' && 'Ringing…'}
                  {incoming && `Incoming ${call.kind} call`}
                  {connected && callDuration(call.startedAt, nowMs)}
                </Typography>
                {error && (
                  <Typography variant="caption" sx={{ color: '#FCA5A5', maxWidth: 320, textAlign: 'center' }}>
                    {error}
                  </Typography>
                )}
              </Stack>
            )}

            {/* Self-view */}
            {video && !incoming && (
              <Box
                ref={localRef}
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
                  zIndex: 2,
                  '& video': { objectFit: 'cover' },
                }}
              />
            )}
          </Box>

          {/* Controls */}
          <Stack
            direction="row"
            spacing={2}
            sx={{
              justifyContent: 'center',
              alignItems: 'center',
              py: { xs: 3, md: 4 },
              pb: 'calc(24px + env(safe-area-inset-bottom))',
              bgcolor: alpha('#000', 0.35),
            }}
          >
            {incoming ? (
              <>
                <Tooltip title="Decline">
                  <IconButton
                    onClick={onDecline}
                    sx={{ width: 64, height: 64, bgcolor: '#EF4444', color: '#fff', '&:hover': { bgcolor: '#DC2626' } }}
                  >
                    <CallEndRoundedIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Answer">
                  <IconButton
                    onClick={onAccept}
                    sx={{
                      width: 64,
                      height: 64,
                      bgcolor: '#22C55E',
                      color: '#fff',
                      '&:hover': { bgcolor: '#16A34A' },
                      animation: 'callPulse 1.6s ease-out infinite',
                      '@keyframes callPulse': {
                        '0%': { boxShadow: `0 0 0 0 ${alpha('#22C55E', 0.6)}` },
                        '100%': { boxShadow: `0 0 0 28px ${alpha('#22C55E', 0)}` },
                      },
                    }}
                  >
                    <CallRoundedIcon />
                  </IconButton>
                </Tooltip>
              </>
            ) : (
              <>
                <Tooltip title={micOn ? 'Mute' : 'Unmute'}>
                  <IconButton
                    onClick={toggleMic}
                    sx={{
                      width: 56,
                      height: 56,
                      color: '#fff',
                      bgcolor: micOn ? alpha('#fff', 0.12) : '#fff',
                      ...(micOn ? {} : { color: '#0A0C12' }),
                    }}
                  >
                    {micOn ? <MicRoundedIcon /> : <MicOffRoundedIcon />}
                  </IconButton>
                </Tooltip>

                {video && (
                  <Tooltip title={camOn ? 'Turn camera off' : 'Turn camera on'}>
                    <IconButton
                      onClick={toggleCam}
                      sx={{
                        width: 56,
                        height: 56,
                        color: '#fff',
                        bgcolor: camOn ? alpha('#fff', 0.12) : '#fff',
                        ...(camOn ? {} : { color: '#0A0C12' }),
                      }}
                    >
                      {camOn ? <VideocamRoundedIcon /> : <VideocamOffRoundedIcon />}
                    </IconButton>
                  </Tooltip>
                )}

                <Tooltip title="End call">
                  <IconButton
                    onClick={onEnd}
                    sx={{ width: 64, height: 64, bgcolor: '#EF4444', color: '#fff', '&:hover': { bgcolor: '#DC2626' } }}
                  >
                    <CallEndRoundedIcon />
                  </IconButton>
                </Tooltip>
              </>
            )}
          </Stack>
        </Box>
      </Fade>
    </Modal>
  );
}
