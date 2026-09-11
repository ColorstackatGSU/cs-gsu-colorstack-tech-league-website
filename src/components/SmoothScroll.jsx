import { ReactLenis, useLenis } from 'lenis/react';
import { useMotionValue, useReducedMotion } from 'framer-motion';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';

/**
 * Site-wide smooth scrolling, built on Lenis.
 *
 * Lenis takes over the wheel: instead of the browser jumping a fixed number of
 * pixels per tick, scroll position eases toward its target every frame. The
 * page keeps its normal document flow and its real scrollbar, so anchors,
 * `position: sticky`, and the scroll-linked parallax in Landing.jsx all keep
 * working — they just read a smoothed position.
 *
 * Anything that has `prefers-reduced-motion` set never gets the Lenis path at
 * all: easing the viewport is exactly the kind of motion that setting asks us
 * to drop, so those visitors scroll natively and this file only tracks position.
 */

// Lenis' own expo-out curve. Kept as a plain function because Lenis wants an
// easing fn (t) => number, not the bezier control-point arrays framer-motion
// takes for `ease`.
const EASE_SCROLL = (t) => Math.min(1, 1.001 - 2 ** (-10 * t));

const SmoothScrollContext = createContext(null);

/** Current offset and the maximum scrollable distance for a scroll source. */
function readMetrics(target) {
  if (target instanceof Window) {
    const max = Math.max(
      0,
      document.documentElement.scrollHeight - window.innerHeight
    );
    return { y: window.scrollY, max };
  }
  return {
    y: target.scrollTop,
    max: Math.max(0, target.scrollHeight - target.clientHeight),
  };
}

/** Turns a number / selector / element into an absolute scroll offset. */
function resolveTop(target, source, offset = 0) {
  if (typeof target === 'number') return target + offset;

  if (source instanceof Window) {
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) return window.scrollY;
    return el.getBoundingClientRect().top + window.scrollY + offset;
  }

  const el = typeof target === 'string' ? source.querySelector(target) : target;
  if (!(el instanceof HTMLElement)) return source.scrollTop;
  return el.offsetTop + offset;
}

/**
 * Pushes Lenis' per-frame scroll state into the shared motion values, and
 * hands the live instance up to the provider so `scrollTo` can use it.
 */
function LenisBridge({ scrollY, progress, velocity, lenisRef }) {
  const lenis = useLenis((instance) => {
    scrollY.set(instance.scroll);
    progress.set(instance.progress);
    velocity.set(instance.velocity);
  });

  useEffect(() => {
    lenisRef.current = lenis ?? null;
    return () => {
      lenisRef.current = null;
    };
  }, [lenis, lenisRef]);

  return null;
}

/**
 * Plain scroll listener, used on the reduced-motion path and by
 * `useSmoothScroll` when it's called outside a provider. Keeps the motion
 * values meaningful even when Lenis isn't running.
 */
function useNativeScrollSync(enabled, getTarget, scrollY, progress, velocity) {
  useEffect(() => {
    if (!enabled) return;

    const target = getTarget();
    if (!target) return;

    let lastY = readMetrics(target).y;
    let lastT = performance.now();

    const onScroll = () => {
      const { y, max } = readMetrics(target);
      const now = performance.now();
      // Guard against a 0ms delta on back-to-back events.
      const dt = now - lastT || 16;

      scrollY.set(y);
      progress.set(max > 0 ? y / max : 0);
      // Normalized to px-per-frame so it matches what Lenis reports.
      velocity.set(((y - lastY) / dt) * 16);

      lastY = y;
      lastT = now;
    };

    onScroll();
    target.addEventListener('scroll', onScroll, { passive: true });
    return () => target.removeEventListener('scroll', onScroll);
  }, [enabled, getTarget, scrollY, progress, velocity]);
}

/**
 * Wraps the app (or, with `root={false}`, a single scrollable box).
 *
 * @param root             Drive the page itself, or a contained scroll area.
 * @param lerp             Smoothing factor. Lower is heavier/slower to settle.
 * @param duration         Ease duration in seconds for wheel + programmatic scrolls.
 * @param wheelMultiplier  Wheel speed multiplier.
 * @param touch            Smooth touch scrolling. Off by default — native
 *                         momentum already feels right on phones, and
 *                         overriding it fights the OS.
 */
export default function SmoothScroll({
  children,
  root = true,
  lerp = 0.1,
  duration = 1.2,
  orientation = 'vertical',
  wheelMultiplier = 1,
  touch = false,
  className,
}) {
  const reduce = useReducedMotion();
  const scrollY = useMotionValue(0);
  const progress = useMotionValue(0);
  const velocity = useMotionValue(0);
  const lenisRef = useRef(null);
  const containerRef = useRef(null);

  const nativeSource = useCallback(
    () => (root ? window : containerRef.current),
    [root]
  );

  const scrollTo = useCallback(
    (target, options) => {
      const lenis = lenisRef.current;

      if (lenis && !reduce) {
        lenis.scrollTo(target, {
          offset: options?.offset,
          duration: options?.duration,
          immediate: options?.immediate,
        });
        return;
      }

      const source = nativeSource() ?? window;
      const behavior = reduce || options?.immediate ? 'auto' : 'smooth';
      source.scrollTo({
        top: resolveTop(target, source, options?.offset),
        behavior,
      });
    },
    [reduce, nativeSource]
  );

  // Only one of these feeds the motion values: reduced motion uses the native
  // listener, otherwise LenisBridge does it.
  useNativeScrollSync(!!reduce, nativeSource, scrollY, progress, velocity);

  const api = useMemo(
    () => ({ lenis: lenisRef.current, scrollY, progress, velocity, scrollTo }),
    [scrollY, progress, velocity, scrollTo]
  );

  if (reduce) {
    return (
      <SmoothScrollContext.Provider value={api}>
        <div ref={containerRef} className={className}>
          {children}
        </div>
      </SmoothScrollContext.Provider>
    );
  }

  return (
    <SmoothScrollContext.Provider value={api}>
      <ReactLenis
        root={root}
        className={className}
        options={{
          lerp,
          duration,
          orientation,
          wheelMultiplier,
          smoothWheel: true,
          syncTouch: touch,
          easing: EASE_SCROLL,
        }}
      >
        <LenisBridge
          scrollY={scrollY}
          progress={progress}
          velocity={velocity}
          lenisRef={lenisRef}
        />
        {children}
      </ReactLenis>
    </SmoothScrollContext.Provider>
  );
}

/**
 * Read the page's scroll state, or scroll somewhere programmatically.
 *
 * Inside <SmoothScroll> this returns the shared motion values and a `scrollTo`
 * that routes through Lenis. Called outside one it falls back to a native
 * window listener, so a component using it never breaks for want of a provider.
 */
export function useSmoothScroll() {
  const ctx = useContext(SmoothScrollContext);
  const scrollY = useMotionValue(0);
  const progress = useMotionValue(0);
  const velocity = useMotionValue(0);

  const windowSource = useCallback(() => window, []);
  useNativeScrollSync(ctx === null, windowSource, scrollY, progress, velocity);

  const scrollTo = useCallback((target, options) => {
    window.scrollTo({
      top: resolveTop(target, window, options?.offset),
      behavior: options?.immediate ? 'auto' : 'smooth',
    });
  }, []);

  const fallback = useMemo(
    () => ({ lenis: null, scrollY, progress, velocity, scrollTo }),
    [scrollY, progress, velocity, scrollTo]
  );

  return ctx ?? fallback;
}
