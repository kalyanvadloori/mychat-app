import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import GoogleIcon from '@mui/icons-material/Google';
import { authErrorMessage, useAuth } from '../auth/context';
import { ACCENT_GRADIENT, BRAND_MARK, EASE, EASE_SPRING, tintPrimary, tintSecondary } from '../theme';

/** Google is the only sign-in method: no passwords to choose, forget or leak. */
export default function LoginScreen() {
  const { signInWithGoogle } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
        display: 'grid',
        placeItems: 'center',
        p: 2,
        overflowY: 'auto',
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
      }}
    >
      <Paper
        sx={{
          position: 'relative',
          width: '100%',
          maxWidth: 400,
          p: { xs: 3, sm: 4.5 },
          borderRadius: 5,
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 30px 70px -40px rgba(15,23,42,0.55)',
          animation: `appFadeUp 480ms ${EASE} both`,
        }}
      >
        <Stack spacing={1} sx={{ alignItems: 'center', mb: 4 }}>
          <Box
            sx={{
              width: 54,
              height: 54,
              borderRadius: '17px',
              background: ACCENT_GRADIENT,
              display: 'grid',
              placeItems: 'center',
              color: '#fff',
              fontWeight: 800,
              fontSize: 21,
              letterSpacing: '-0.02em',
              boxShadow: '0 18px 36px -18px rgba(99,102,241,0.9)',
              // Lands a beat after the card, so the eye follows it in.
              animation: `appPop 520ms ${EASE_SPRING} 120ms both`,
            }}
          >
            {BRAND_MARK}
          </Box>
          <Typography
            variant="h5"
            sx={{ fontWeight: 700, textAlign: 'center', animation: `appFadeUp 460ms ${EASE} 200ms both` }}
          >
            Welcome to MyChat
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
            background: ACCENT_GRADIENT,
            boxShadow: '0 16px 32px -16px rgba(99,102,241,0.9)',
            animation: `appFadeUp 460ms ${EASE} 360ms both`,
            '&:hover': { filter: 'brightness(1.06)' },
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
    </Box>
  );
}
