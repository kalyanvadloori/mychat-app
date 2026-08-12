import { createTheme, alpha } from '@mui/material/styles';

// Single accent used across the app. Change these two values to re-brand.
export const ACCENT = '#6366F1';
export const ACCENT_2 = '#8B5CF6';

export const ACCENT_GRADIENT = `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_2} 100%)`;

/** Deterministic gradient per user id, so avatars look intentional without image assets. */
const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
  'linear-gradient(135deg, #0EA5E9 0%, #22D3EE 100%)',
  'linear-gradient(135deg, #F43F5E 0%, #FB923C 100%)',
  'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
  'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)',
  'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)',
];

export function gradientFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

export const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'class' },
  colorSchemes: {
    light: {
      palette: {
        primary: { main: ACCENT, light: '#818CF8', dark: '#4F46E5' },
        secondary: { main: ACCENT_2 },
        success: { main: '#10B981' },
        background: { default: '#F6F7FB', paper: '#FFFFFF' },
        text: { primary: '#0F172A', secondary: '#64748B' },
        divider: '#E7E9F0',
      },
    },
    dark: {
      palette: {
        primary: { main: '#818CF8', light: '#A5B4FC', dark: '#6366F1' },
        secondary: { main: '#A78BFA' },
        success: { main: '#34D399' },
        background: { default: '#0B0D14', paper: '#12151F' },
        text: { primary: '#E8EAF2', secondary: '#8C94AB' },
        divider: 'rgba(255,255,255,0.08)',
      },
    },
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: '"Inter Variable", "Inter", system-ui, -apple-system, "Segoe UI", sans-serif',
    h6: { fontWeight: 700, letterSpacing: '-0.01em' },
    subtitle1: { fontWeight: 600, letterSpacing: '-0.01em' },
    subtitle2: { fontWeight: 600 },
    body2: { lineHeight: 1.55 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        '*::-webkit-scrollbar': { width: 8, height: 8 },
        '*::-webkit-scrollbar-thumb': {
          borderRadius: 8,
          backgroundColor: alpha('#8C94AB', 0.35),
        },
        '*::-webkit-scrollbar-track': { backgroundColor: 'transparent' },
        body: { overflow: 'hidden' },
      },
    },
    MuiPaper: { defaultProps: { elevation: 0 } },
    MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { borderRadius: 12 } } },
    MuiIconButton: { styleOverrides: { root: { borderRadius: 12 } } },
    MuiTooltip: {
      defaultProps: { arrow: true },
      styleOverrides: { tooltip: { borderRadius: 8, fontSize: 12, fontWeight: 500 } },
    },
    MuiListItemButton: { styleOverrides: { root: { borderRadius: 14 } } },
    MuiChip: { styleOverrides: { root: { fontWeight: 600 } } },
  },
});
