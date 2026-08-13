import { useEffect } from 'react';

/**
 * Pins the app shell to the visible area of the screen.
 *
 * iOS Safari does not shrink the layout viewport when the keyboard opens. It
 * overlays the keyboard and then scrolls the *visual* viewport so the focused
 * field is visible. Two numbers describe that state and both are needed:
 *
 *   visualViewport.height    how much is actually visible above the keyboard
 *   visualViewport.offsetTop how far the visual viewport has been scrolled down
 *
 * Sizing to `height` alone (and trying to force the page back with scrollTo)
 * leaves the shell floating in the wrong place, because the browser has moved
 * the visual viewport out from under it. Publishing both as CSS variables lets
 * the shell size *and* translate to match, so the composer ends up directly on
 * top of the keyboard the way a native chat app does.
 */
export function useAppHeight() {
  useEffect(() => {
    const viewport = window.visualViewport;
    const style = document.documentElement.style;

    if (!viewport) {
      // Older browsers: dynamic viewport units are the best available answer.
      style.setProperty('--app-h', '100dvh');
      style.setProperty('--app-top', '0px');
      return;
    }

    let frame = 0;
    const apply = () => {
      cancelAnimationFrame(frame);
      // iOS fires a burst of events while the keyboard animates; only the last matters.
      frame = requestAnimationFrame(() => {
        style.setProperty('--app-h', `${Math.round(viewport.height)}px`);
        style.setProperty('--app-top', `${Math.round(viewport.offsetTop)}px`);
      });
    };

    apply();
    viewport.addEventListener('resize', apply);
    viewport.addEventListener('scroll', apply);

    return () => {
      cancelAnimationFrame(frame);
      viewport.removeEventListener('resize', apply);
      viewport.removeEventListener('scroll', apply);
    };
  }, []);
}
