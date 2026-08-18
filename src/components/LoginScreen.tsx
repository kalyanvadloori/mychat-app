import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import GoogleIcon from '@mui/icons-material/Google';
import { authErrorMessage, useAuth } from '../auth/context';
import LogoOrbit from './LogoOrbit';
import {
  ACCENT,
  ACCENT_2,
  ACCENT_GRADIENT,
  BRAND_MARK,
  EASE,
  EASE_SPRING,
  tintPaper,
  tintPrimary,
  tintSecondary,
} from '../theme';

/** Google is the only sign-in method: no passwords to choose, forget or leak. */
export default function LoginScreen() {
  const { signInWithGoogle } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // The orbit is the tallest element, so it is the first thing to give way.
  const compact = useMediaQuery('(max-height: 760px)');

  const signIn = async () => {
    setError(null);
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        height: 'var(--app-h, 100dvh)',
        width: 'var(--app-w, 100%)',
        transform: 'translate(var(--app-left, 0px), var(--app-top, 0px))',
        // Column flow rather than centring both children independently: the card
        // takes the space it needs, the footer takes the rest, nothing overlaps.
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        px: 2,
        py: 2,
        overflowY: 'auto',
        // A scrollbar on a screen this small reads as a layout bug; the content
        // fits, and the scroll stays available for very short windows.
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' },
        bgcolor: 'background.default',
        // The wash sits on its own layer so it can drift without repainting the card.
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: '-10%',
          pointerEvents: 'none',
          backgroundImage: (t) =>
            `radial-gradient(50% 45% at 12% 8%, ${tintPrimary(t, 0.28)} 0%, transparent 70%),
             radial-gradient(45% 40% at 88% 92%, ${tintSecondary(t, 0.26)} 0%, transparent 70%)`,
          animation: 'appDrift 18s ease-in-out infinite',
        },

        // The card's entrance: rises and resolves out of a blur, as though it were
        // being focused rather than simply faded in.
        '@keyframes loginRise': {
          '0%': {
            opacity: 0,
            transform: 'translateY(34px) scale(0.94)',
            filter: 'blur(14px)',
          },
          '60%': { opacity: 1, filter: 'blur(0px)' },
          '100%': { opacity: 1, transform: 'none', filter: 'blur(0px)' },
        },
        // A single pass of light across the card, once, just after it lands.
        '@keyframes loginSheen': {
          '0%': { transform: 'translateX(-120%) rotate(8deg)', opacity: 0 },
          '18%': { opacity: 1 },
          '100%': { transform: 'translateX(220%) rotate(8deg)', opacity: 0 },
        },
      }}
    >
      <Paper
        sx={{
          position: 'relative',
          width: '100%',
          maxWidth: 400,
          // Centres in the leftover space without pushing the footer off-screen.
          my: 'auto',
          p: { xs: 2.5, sm: 4.5 },
          borderRadius: 5,
          // Glass rather than a solid card, so the drifting wash behind it stays
          // visible through the surface instead of being covered by it.
          backgroundColor: (t) => tintPaper(t, 0.72),
          backdropFilter: 'blur(22px) saturate(150%)',
          border: '1px solid transparent',
          boxShadow: (t) =>
            `0 30px 70px -40px rgba(15,23,42,0.55), 0 0 60px -30px ${tintPrimary(t, 0.9)}`,
          overflow: 'hidden',
          animation: `loginRise 720ms ${EASE} both`,

          /* Gradient hairline. A gradient cannot be a border colour, so the ring is
             painted as a background and the card's interior is masked back out of
             it — leaving only the 1px frame. */
          '&::after': {
            content: '""',
            position: 'absolute',
            inset: 0,
            borderRadius: 'inherit',
            padding: '1px',
            pointerEvents: 'none',
            background: `linear-gradient(140deg, ${ACCENT}AA 0%, transparent 38%, transparent 62%, ${ACCENT_2}AA 100%)`,
            WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
          },
        }}
      >
        {/* One pass of light over the card as it settles. Purely decorative, and
            clipped by the card's own overflow. */}
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            top: '-30%',
            left: 0,
            width: '38%',
            height: '160%',
            pointerEvents: 'none',
            background:
              'linear-gradient(90deg, transparent, rgba(255,255,255,0.38), transparent)',
            animation: `loginSheen 1400ms ${EASE} 420ms both`,
          }}
        />

        <Stack spacing={1} sx={{ position: 'relative', alignItems: 'center', mb: 2 }}>
          <LogoOrbit size={compact ? 148 : 190}>
            <Box
              sx={{
                width: 62,
                height: 62,
                borderRadius: '19px',
                // Deeper than the app-wide accent: sitting in the night sky, a
                // bright tile would flatten into the glow around it.
                background: 'linear-gradient(135deg, #4338CA 0%, #6D28D9 100%)',
                display: 'grid',
                placeItems: 'center',
                color: '#fff',
                fontWeight: 800,
                fontSize: 24,
                letterSpacing: '-0.03em',
                border: '1px solid rgba(255,255,255,0.14)',
                boxShadow:
                  '0 18px 40px -14px rgba(76,29,149,0.95), inset 0 1px 0 rgba(255,255,255,0.16)',
                // Lands a beat after the card, so the eye follows it in.
                animation: `appPop 520ms ${EASE_SPRING} 120ms both`,
              }}
            >
              {BRAND_MARK}
            </Box>
          </LogoOrbit>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 800,
              letterSpacing: '-0.02em',
              textAlign: 'center',
              animation: `appFadeUp 460ms ${EASE} 200ms both`,
            }}
          >
            Welcome to{' '}
            {/* Same gradient wordmark as the splash, so the two screens read as
                one brand rather than two designs. */}
            <Box
              component="span"
              sx={{
                backgroundImage: ACCENT_GRADIENT,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
              }}
            >
              MyChat
            </Box>
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ textAlign: 'center', animation: `appFadeUp 460ms ${EASE} 280ms both` }}
          >
            Sign in with Google to start chatting.
          </Typography>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 3 }}>
            {error}
          </Alert>
        )}

        <Button
          fullWidth
          size="large"
          variant="contained"
          startIcon={<GoogleIcon />}
          loading={busy}
          onClick={() => void signIn()}
          sx={{
            py: 1.35,
            position: 'relative',
            overflow: 'hidden',
            background: ACCENT_GRADIENT,
            boxShadow: '0 16px 32px -16px rgba(99,102,241,0.9)',
            animation: `appFadeUp 460ms ${EASE} 360ms both`,
            transition: `transform 300ms ${EASE_SPRING}, box-shadow 240ms ease, filter 200ms ease`,
            '&:hover': {
              filter: 'brightness(1.06)',
              transform: 'translateY(-2px)',
              boxShadow: '0 22px 40px -16px rgba(99,102,241,0.95)',
            },
            // Light sweeps across the button on hover, parked off to the left
            // until then so it never plays on its own.
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              width: '45%',
              height: '100%',
              pointerEvents: 'none',
              transform: 'translateX(-160%) skewX(-18deg)',
              background:
                'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
              transition: `transform 620ms ${EASE}`,
            },
            '&:hover::before': { transform: 'translateX(320%) skewX(-18deg)' },
          }}
        >
          Continue with Google
        </Button>

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            mt: 3,
            textAlign: 'center',
            display: 'block',
            animation: `appFadeIn 500ms ${EASE} 460ms both`,
          }}
        >
          New here? Signing in with Google creates your account automatically.
        </Typography>
      </Paper>

      <Stack
        spacing={0.25}
        sx={{
          flexShrink: 0,
          alignItems: 'center',
          pt: 3,
          // Clears the home bar on phones.
          pb: 'env(safe-area-inset-bottom)',
          px: 2,
          animation: `appFadeIn 600ms ${EASE} 620ms both`,
        }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
          © {new Date().getFullYear()} Kalyan Vadloori
        </Typography>
        <Typography
          variant="caption"
          sx={{ textAlign: 'center', color: 'text.disabled', letterSpacing: '0.01em' }}
        >
          Built with React · TypeScript · MUI · Vite · Firebase
        </Typography>
      </Stack>
    </Box>
  );
}
