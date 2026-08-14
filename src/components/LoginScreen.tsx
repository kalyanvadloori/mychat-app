import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import GoogleIcon from '@mui/icons-material/Google';
import { authErrorMessage, useAuth } from '../auth/context';
import { ACCENT_GRADIENT, BRAND_MARK, tintPrimary, tintSecondary } from '../theme';

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
        backgroundImage: (t) =>
          `radial-gradient(90% 55% at 8% 0%, ${tintPrimary(t, 0.18)} 0%, transparent 60%),
           radial-gradient(70% 50% at 100% 100%, ${tintSecondary(t, 0.16)} 0%, transparent 60%)`,
      }}
    >
      <Paper
        sx={{
          width: '100%',
          maxWidth: 400,
          p: { xs: 3, sm: 4.5 },
          borderRadius: 5,
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 30px 70px -40px rgba(15,23,42,0.55)',
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
            }}
          >
            {BRAND_MARK}
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 700, textAlign: 'center' }}>
            Welcome to MyChat
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
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
          sx={{ py: 1.35, background: ACCENT_GRADIENT }}
        >
          Continue with Google
        </Button>

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mt: 3, textAlign: 'center', display: 'block' }}
        >
          New here? Signing in with Google creates your account automatically.
        </Typography>
      </Paper>
    </Box>
  );
}
