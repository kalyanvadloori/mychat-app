import { createTheme, alpha, type Theme } from '@mui/material/styles';

/**
 * Translucent colours that actually follow the active colour scheme.
 *
 * `alpha(theme.palette.background.paper, 0.8)` looks right but is a trap once
 * `cssVariables` is on: `theme.palette` holds the *light* scheme's literal values
 * no matter which scheme is active, so dark mode ends up with a white header.
 * The `*Channel` tokens are CSS variables that swap with the scheme, so they stay
 * correct — and they are the only thing `rgba(R G B / a)` can interpolate.
 */
const channel = (token: string | undefined, fallback: string) => token ?? fallback;

export const tintText = (t: Theme, opacity: number) =>
  `rgba(${channel(t.vars?.palette.text.primaryChannel, '15 23 42')} / ${opacity})`;

export const tintPaper = (t: Theme, opacity: number) =>
  `rgba(${channel(t.vars?.palette.background.paperChannel, '255 255 255')} / ${opacity})`;

export const tintPrimary = (t: Theme, opacity: number) =>
  `rgba(${channel(t.vars?.palette.primary.mainChannel, '99 102 241')} / ${opacity})`;

export const tintSecondary = (t: Theme, opacity: number) =>
  `rgba(${channel(t.vars?.palette.secondary.mainChannel, '139 92 246')} / ${opacity})`;

// Single accent used across the app. Change these two values to re-brand.
export const ACCENT = '#6366F1';
export const ACCENT_2 = '#8B5CF6';

export const ACCENT_GRADIENT = `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_2} 100%)`;

/** The mark inside the app logo tile, shown on the sidebar and the login screen. */
export const BRAND_MARK = 'VK';

/**
 * One easing curve for everything that moves, so the whole app feels like a
 * single object. Slightly overshooting on entrances, flat on exits.
 */
export const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
export const EASE_SPRING = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

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
          transition: 'background-color 200ms ease',
        },
        '*:hover::-webkit-scrollbar-thumb': { backgroundColor: alpha('#8C94AB', 0.55) },
        '*::-webkit-scrollbar-track': { backgroundColor: 'transparent' },
        body: {
          overflow: 'hidden',
          // Softens the flip between light and dark instead of snapping.
          transition: 'background-color 320ms ease',
        },

        // Shared motion vocabulary. Only transform and opacity are animated, so
        // everything stays on the compositor and never triggers layout.
        '@keyframes appFadeUp': {
          from: { opacity: 0, transform: 'translateY(10px)' },
          to: { opacity: 1, transform: 'none' },
        },
        '@keyframes appFadeIn': {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
        '@keyframes appPop': {
          '0%': { opacity: 0, transform: 'scale(0.8)' },
          '100%': { opacity: 1, transform: 'scale(1)' },
        },
        '@keyframes appFloat': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        '@keyframes appDrift': {
          '0%, 100%': { transform: 'translate3d(0, 0, 0) scale(1)' },
          '50%': { transform: 'translate3d(0, -2%, 0) scale(1.06)' },
        },

        // Anyone who has asked their OS to reduce motion gets none of it.
        '@media (prefers-reduced-motion: reduce)': {
          '*, *::before, *::after': {
            animationDuration: '0.01ms !important',
            animationIterationCount: '1 !important',
            transitionDuration: '0.01ms !important',
            scrollBehavior: 'auto !important',
          },
        },
      },
    },
    MuiPaper: { defaultProps: { elevation: 0 } },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 12,
          transition: `transform 160ms ${EASE}, box-shadow 200ms ease, background-color 200ms ease`,
          '&:active': { transform: 'scale(0.97)' },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          transition: `transform 160ms ${EASE_SPRING}, background-color 200ms ease, color 200ms ease`,
          '&:hover': { transform: 'scale(1.08)' },
          '&:active': { transform: 'scale(0.92)' },
        },
      },
    },
    MuiDialog: {
      defaultProps: { transitionDuration: 260 },
      styleOverrides: { paper: { animation: `appPop 260ms ${EASE} both` } },
    },
    MuiMenu: { defaultProps: { transitionDuration: 180 } },
    MuiDrawer: { defaultProps: { transitionDuration: 280 } },
    MuiTooltip: {
      defaultProps: { arrow: true },
      styleOverrides: { tooltip: { borderRadius: 8, fontSize: 12, fontWeight: 500 } },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          transition: `background-color 200ms ease, transform 180ms ${EASE}`,
          '&:active': { transform: 'scale(0.985)' },
        },
      },
    },
    MuiChip: { styleOverrides: { root: { fontWeight: 600 } } },
  },
});
