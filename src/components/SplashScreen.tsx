import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import LogoOrbit from './LogoOrbit';
import { useBootProgress } from '../utils/bootProgress';
import { ACCENT, ACCENT_2, BRAND_MARK, EASE, EASE_SPRING, tintPrimary, tintSecondary } from '../theme';

/**
 * Shown while the app decides who you are.
 *
 * Deliberately the same furniture as the login screen — orbit field, brand tile,
 * drifting wash — so the handover to `LoginScreen` reads as one screen settling
 * rather than two screens swapping. Only transform/opacity animate, so none of
 * this competes with Firebase for the main thread.
 */
interface Props {
  label?: string;
  /**
   * Plays the exit. The caller keeps the component mounted for the length of the
   * fade — unmounting on the same tick would cut the animation off before it ran.
   */
  out?: boolean;
}

export default function SplashScreen({ label = 'Loading', out = false }: Props) {
  const progress = useBootProgress();

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
        overflow: 'hidden',
        bgcolor: 'background.default',
        // Sits above the chat while it is used as an overlay after sign-in.
        zIndex: (t) => t.zIndex.drawer + 2,
        // Hands input back the moment the exit starts, rather than swallowing
        // clicks for the length of the fade.
        pointerEvents: out ? 'none' : 'auto',
        animation: out
          ? `splashOut 420ms ${EASE} both`
          : `appFadeIn 320ms ${EASE} both`,

        // Ambient wash on its own layer, drifting behind the mark.
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: '-10%',
          pointerEvents: 'none',
          backgroundImage: (t) =>
            `radial-gradient(50% 45% at 14% 10%, ${tintPrimary(t, 0.3)} 0%, transparent 70%),
             radial-gradient(45% 40% at 86% 90%, ${tintSecondary(t, 0.28)} 0%, transparent 70%)`,
          animation: 'appDrift 18s ease-in-out infinite',
        },

        '@keyframes splashSweep': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        '@keyframes splashRipple': {
          '0%': { opacity: 0.5, transform: 'scale(0.72)' },
          '70%, 100%': { opacity: 0, transform: 'scale(1.35)' },
        },
        // Lifts away rather than dissolving in place, so the app behind it reads
        // as arriving instead of the splash simply vanishing.
        '@keyframes splashOut': {
          from: { opacity: 1, transform: 'scale(1)' },
          to: { opacity: 0, transform: 'scale(1.04)' },
        },
        '@keyframes splashBreathe': {
          '0%, 100%': { opacity: 0.55 },
          '50%': { opacity: 1 },
        },
      }}
    >
      <Stack spacing={2.5} sx={{ position: 'relative', alignItems: 'center', px: 3 }}>
        <Box sx={{ position: 'relative', display: 'grid', placeItems: 'center' }}>
          {/* Two rings expanding out of the mark, half a cycle apart, so the pulse
              never fully stops — the app reads as working, not stalled. */}
          {[0, 1.1].map((delay) => (
            <Box
              key={delay}
              aria-hidden
              sx={{
                position: 'absolute',
                width: 190,
                height: 190,
                borderRadius: '50%',
                border: '1px solid',
                borderColor: (t) => tintPrimary(t, 0.5),
                animation: `splashRipple 2.2s ${EASE} ${delay}s infinite`,
              }}
            />
          ))}

          <LogoOrbit size={190}>
            <Box
              sx={{
                width: 62,
                height: 62,
                borderRadius: '19px',
                // Matches the login tile: a bright fill would wash out in the orbit glow.
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
                animation: `appPop 520ms ${EASE_SPRING} 100ms both, appFloat 4.5s ease-in-out 620ms infinite`,
              }}
            >
              {BRAND_MARK}
            </Box>
          </LogoOrbit>
        </Box>

        <Typography
          variant="h5"
          sx={{
            fontWeight: 800,
            letterSpacing: '-0.02em',
            // Gradient wordmark: `color: transparent` clipped to the text itself.
            backgroundImage: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_2} 100%)`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
            animation: `appFadeUp 460ms ${EASE} 180ms both`,
          }}
        >
          MyChat
        </Typography>

        {/* Same meter as the pre-boot splash, reading the same counter, so the
            handover between the two is invisible. */}
        <Stack
          spacing={1}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label}
          sx={{ width: 188, animation: `appFadeIn 460ms ${EASE} 260ms both` }}
        >
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                animation: 'splashBreathe 2.4s ease-in-out infinite',
              }}
            >
              {label}
            </Typography>
            <Typography
              sx={{
                fontSize: 15,
                fontWeight: 800,
                color: 'primary.main',
                // Fixed-width digits, or the number shifts the row as it counts.
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {progress}%
            </Typography>
          </Stack>

          <Box
            aria-hidden
            sx={{
              position: 'relative',
              width: '100%',
              height: 5,
              borderRadius: 3,
              overflow: 'hidden',
              backgroundColor: (t) => tintPrimary(t, 0.16),
            }}
          >
            <Box
              sx={{
                position: 'relative',
                width: `${progress}%`,
                height: '100%',
                borderRadius: 3,
                background: `linear-gradient(90deg, ${ACCENT}, ${ACCENT_2})`,
                boxShadow: `0 0 12px ${ACCENT}8C`,
                // Travelling highlight, so the bar still reads as alive while the
                // count crawls the last few percent.
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  inset: 0,
                  borderRadius: 3,
                  background:
                    'linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)',
                  animation: `splashSweep 1.6s ${EASE} infinite`,
                },
              }}
            />
          </Box>
        </Stack>
      </Stack>
    </Box>
  );
}
