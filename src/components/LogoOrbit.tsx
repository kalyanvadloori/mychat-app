import { useMemo, type ReactNode } from 'react';
import Box from '@mui/material/Box';

interface Orbit {
  /** Diameter in px. */
  size: number;
  /** How far the ring is laid back, giving the elliptical look. */
  tilt: number;
  /** Rotation of the whole ellipse, so orbits cross instead of nesting. */
  skew: number;
  seconds: number;
  reverse?: boolean;
  color: string;
}

const ORBITS: Orbit[] = [
  { size: 1, tilt: 74, skew: 0, seconds: 16, color: '#38BDF8' },
  { size: 0.82, tilt: 66, skew: 52, seconds: 12, reverse: true, color: '#FBBF24' },
  { size: 0.64, tilt: 80, skew: -38, seconds: 20, color: '#A78BFA' },
];

interface Props {
  children: ReactNode;
  /** Diameter of the orbit field. The logo sits at its centre. */
  size?: number;
}

/**
 * Orbiting rings behind the app mark.
 *
 * Built from transforms alone — no canvas, no WebGL — so it animates on the
 * compositor and costs the main thread nothing. The 3D look comes from a
 * perspective ancestor plus `rotateX` on each ring; each ring then spins about
 * its own axis, carrying a glowing point around with it.
 */
export default function LogoOrbit({ children, size = 190 }: Props) {
  // Fixed positions rather than random, so the field never reshuffles on render.
  const stars = useMemo(
    () => [
      { top: 8, left: 22, delay: 0, scale: 1 },
      { top: 26, left: 88, delay: 1.4, scale: 0.7 },
      { top: 62, left: 6, delay: 2.6, scale: 0.85 },
      { top: 78, left: 74, delay: 0.8, scale: 1 },
      { top: 44, left: 96, delay: 3.2, scale: 0.6 },
      { top: 90, left: 40, delay: 2, scale: 0.75 },
    ],
    [],
  );

  return (
    <Box
      aria-hidden
      sx={{
        position: 'relative',
        width: size,
        height: size,
        display: 'grid',
        placeItems: 'center',
        perspective: '620px',
        '@keyframes orbitSpin': {
          from: { transform: 'rotateZ(0deg)' },
          to: { transform: 'rotateZ(360deg)' },
        },
        '@keyframes orbitGlow': {
          '0%, 100%': { opacity: 0.55, transform: 'scale(1)' },
          '50%': { opacity: 0.9, transform: 'scale(1.08)' },
        },
        '@keyframes orbitTwinkle': {
          '0%, 100%': { opacity: 0.15 },
          '50%': { opacity: 0.9 },
        },
      }}
    >
      {/* Atmospheric halo behind everything */}
      <Box
        sx={{
          position: 'absolute',
          inset: '18%',
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(99,102,241,0.42) 0%, rgba(56,189,248,0.14) 45%, transparent 70%)',
          filter: 'blur(6px)',
          animation: 'orbitGlow 5s ease-in-out infinite',
        }}
      />

      {stars.map((star, i) => (
        <Box
          key={i}
          sx={{
            position: 'absolute',
            top: `${star.top}%`,
            left: `${star.left}%`,
            width: 2.5 * star.scale,
            height: 2.5 * star.scale,
            borderRadius: '50%',
            backgroundColor: '#E0E7FF',
            animation: `orbitTwinkle 3.4s ease-in-out ${star.delay}s infinite`,
          }}
        />
      ))}

      {ORBITS.map((orbit) => (
        // Outer element holds the fixed tilt; the inner one does the spinning,
        // because a single element cannot animate one transform and pin another.
        <Box
          key={orbit.size}
          sx={{
            position: 'absolute',
            width: size * orbit.size,
            height: size * orbit.size,
            transformStyle: 'preserve-3d',
            transform: `rotateX(${orbit.tilt}deg) rotateZ(${orbit.skew}deg)`,
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: '1px solid',
              borderColor: `${orbit.color}55`,
              // A brighter arc on one side reads as a light source, not a flat hoop.
              borderTopColor: `${orbit.color}dd`,
              borderRightColor: `${orbit.color}99`,
              animation: `orbitSpin ${orbit.seconds}s linear infinite${
                orbit.reverse ? ' reverse' : ''
              }`,
              willChange: 'transform',
            }}
          >
            {/* The travelling point of light, carried by the spinning ring */}
            <Box
              sx={{
                position: 'absolute',
                top: -3,
                left: '50%',
                width: 6,
                height: 6,
                ml: '-3px',
                borderRadius: '50%',
                backgroundColor: orbit.color,
                boxShadow: `0 0 10px 2px ${orbit.color}, 0 0 20px 4px ${orbit.color}55`,
              }}
            />
          </Box>
        </Box>
      ))}

      <Box sx={{ position: 'relative', zIndex: 1 }}>{children}</Box>
    </Box>
  );
}
