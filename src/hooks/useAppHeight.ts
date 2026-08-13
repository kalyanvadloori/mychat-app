import { useEffect } from 'react';

/**
 * Keeps `--app-h` equal to the actually-visible viewport height.
 *
 * iOS Safari does not shrink the layout viewport when the keyboard opens. It
 * keeps the page full height, overlays the keyboard, and then *scrolls the page*
 * to bring the focused field into view — which drags a full-height app shell up
 * and sideways and exposes a horizontal scrollbar. Mirroring `visualViewport`
 * into a CSS variable lets the shell be exactly as tall as the visible area, so
 * the composer sits on the keyboard and nothing needs to scroll at all.
 */
export function useAppHeight() {
  useEffect(() => {
    const viewport = window.visualViewport;

    const apply = () => {
      const height = viewport?.height ?? window.innerHeight;
      document.documentElement.style.setProperty('--app-h', `${Math.round(height)}px`);
      // Safari can still leave the page nudged after the keyboard animates in.
      if (window.scrollX !== 0 || window.scrollY !== 0) window.scrollTo(0, 0);
    };

    apply();
    viewport?.addEventListener('resize', apply);
    viewport?.addEventListener('scroll', apply);
    window.addEventListener('orientationchange', apply);

    return () => {
      viewport?.removeEventListener('resize', apply);
      viewport?.removeEventListener('scroll', apply);
      window.removeEventListener('orientationchange', apply);
    };
  }, []);
}
