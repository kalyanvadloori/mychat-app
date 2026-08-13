import { useState, type FormEvent } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import GoogleIcon from '@mui/icons-material/Google';
import { authErrorMessage, useAuth } from '../auth/context';
import { ACCENT_GRADIENT, tintPrimary, tintSecondary } from '../theme';

export default function LoginScreen() {
  const { signIn, register, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<void>) => {
    setError(null);
    setBusy(true);
    try {
      await action();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void run(() =>
      mode === 'signin' ? signIn(email, password) : register(name.trim(), email, password),
    );
  };

  return (
    <Box
      sx={{
        height: 'var(--app-h, 100dvh)',
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
        component="form"
        onSubmit={submit}
        sx={{
          width: '100%',
          maxWidth: 420,
          p: { xs: 3, sm: 4.5 },
          borderRadius: 5,
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 30px 70px -40px rgba(15,23,42,0.55)',
        }}
      >
        <Stack spacing={1} sx={{ alignItems: 'center', mb: 3 }}>
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
              fontSize: 24,
            }}
          >
            M
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {mode === 'signin' ? 'Welcome back' : 'Create your account'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
            {mode === 'signin'
              ? 'Sign in to continue to MyChat'
              : 'Sign up and start chatting in seconds'}
          </Typography>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 3 }}>
            {error}
          </Alert>
        )}

        <Stack spacing={2}>
          {mode === 'signup' && (
            <TextField
              label="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
              fullWidth
            />
          )}
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            fullWidth
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            helperText={mode === 'signup' ? 'At least 6 characters' : ' '}
            fullWidth
          />

          <Button
            type="submit"
            size="large"
            variant="contained"
            loading={busy}
            sx={{ py: 1.3, background: ACCENT_GRADIENT }}
          >
            {mode === 'signin' ? 'Sign in' : 'Create account'}
          </Button>

          <Divider sx={{ color: 'text.secondary', fontSize: 12 }}>or</Divider>

          <Button
            size="large"
            variant="outlined"
            startIcon={<GoogleIcon />}
            disabled={busy}
            onClick={() => void run(signInWithGoogle)}
            sx={{ py: 1.2 }}
          >
            Continue with Google
          </Button>
        </Stack>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 3, textAlign: 'center' }}>
          {mode === 'signin' ? "Don't have an account? " : 'Already registered? '}
          <Link
            component="button"
            type="button"
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setError(null);
            }}
            sx={{ fontWeight: 600 }}
          >
            {mode === 'signin' ? 'Sign up' : 'Sign in'}
          </Link>
        </Typography>
      </Paper>
    </Box>
  );
}
