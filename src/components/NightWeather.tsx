import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useColorScheme } from '@mui/material/styles';

type Weather = 'rain' | 'snow' | 'thunder';

const WEATHERS: Weather[] = ['rain', 'snow', 'thunder'];
/** How long one kind of weather lasts before it changes. */
const SPELL_MS = 3 * 60_000;

/**
 * Ambient weather behind the chat, dark mode only.
 *
 * Deliberately CSS-only: a canvas would mean a render loop competing with React
 * for every frame, while these particles animate on the compositor and cost the
 * main thread nothing. The layer never takes pointer events, so it cannot
 * interfere with the UI underneath.
 */
export default function NightWeather() {
  const { mode, systemMode } = useColorScheme();
  const isDark = (mode === 'system' ? systemMode : mode) === 'dark';
  const isSmall = useMediaQuery('(max-width: 600px)');
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  const [weather, setWeather] = useState<Weather>(
    () => WEATHERS[Math.floor(Math.random() * WEATHERS.length)]!,
  );

  // Change the weather every few minutes, never repeating the current one.
  useEffect(() => {
    if (!isDark || reduceMotion) return;
    const timer = setInterval(() => {
      setWeather((current) => {
        const others = WEATHERS.filter((w) => w !== current);
        return others[Math.floor(Math.random() * others.length)]!;
      });
    }, SPELL_MS);
    return () => clearInterval(timer);
  }, [isDark, reduceMotion]);

  const snowing = weather === 'snow';
  const count = snowing ? (isSmall ? 26 : 44) : isSmall ? 40 : 70;

  // Regenerated only when the look changes, so particles do not jump on re-render.
  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * (snowing ? 16 : 5),
        // Unhurried on purpose: fast particles pull the eye away from the messages.
        duration: snowing ? 16 + Math.random() * 14 : 2.6 + Math.random() * 2.2,
        size: snowing ? 2 + Math.random() * 4 : 10 + Math.random() * 12,
        opacity: snowing ? 0.35 + Math.random() * 0.45 : 0.2 + Math.random() * 0.4,
        sway: 4 + Math.random() * 4,
      })),
    [count, snowing],
  );

  if (!isDark || reduceMotion) return null;

  return (
    <Box
      aria-hidden
      sx={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        // Above the app shell, below dialogs and drawers (1200+).
        zIndex: 5,
        '@keyframes wxFall': {
          from: { transform: 'translate3d(0, -12vh, 0)' },
          to: { transform: 'translate3d(0, 112vh, 0)' },
        },
        '@keyframes wxSway': {
          from: { transform: 'translateX(-10px)' },
          to: { transform: 'translateX(10px)' },
        },
        '@keyframes wxFlash': {
          // Two quick strikes, then a long quiet stretch — a steady blink reads as a bug.
          '0%, 88%, 100%': { opacity: 0 },
          '89%': { opacity: 0.16 },
          '90.5%': { opacity: 0 },
          '92%': { opacity: 0.24 },
          '94%': { opacity: 0 },
        },
      }}
    >
      {particles.map((p) => (
        // Outer element falls, inner element sways: two transforms cannot share one node.
        <Box
          key={`${weather}-${p.id}`}
          sx={{
            position: 'absolute',
            top: 0,
            left: `${p.left}%`,
            animation: `wxFall ${p.duration}s linear ${p.delay}s infinite`,
            willChange: 'transform',
          }}
        >
          <Box
            sx={{
              width: snowing ? p.size : 1.4,
              height: snowing ? p.size : p.size,
              borderRadius: snowing ? '50%' : 2,
              opacity: p.opacity,
              ...(snowing
                ? {
                    backgroundColor: '#FFFFFF',
                    boxShadow: '0 0 4px rgba(255,255,255,0.65)',
                    animation: `wxSway ${p.sway}s ease-in-out infinite alternate`,
                  }
                : {
                    background:
                      'linear-gradient(to bottom, rgba(190,214,255,0) 0%, rgba(190,214,255,0.9) 100%)',
                    transform: 'rotate(12deg)',
                  }),
            }}
          />
        </Box>
      ))}

      {weather === 'thunder' && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(70% 50% at 50% 0%, rgba(214,229,255,0.95) 0%, rgba(214,229,255,0.25) 45%, transparent 75%)',
            animation: 'wxFlash 11s ease-out infinite',
          }}
        />
      )}
    </Box>
  );
}
