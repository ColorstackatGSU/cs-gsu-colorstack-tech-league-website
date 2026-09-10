import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/**
 * Shared motion vocabulary. Every scroll animation on the site comes from
 * here so the whole app moves with one rhythm instead of each section
 * inventing its own timing.
 *
 * All of these collapse to "render the final state instantly" when the user
 * has prefers-reduced-motion set.
 */

const EASE = [0.22, 1, 0.36, 1];

/** Phones and small tablets. Matches the CSS breakpoints used across the app. */
const SMALL_SCREEN = '(max-width: 767px)';

/**
 * True on small screens. Scroll-linked effects (parallax, fade-on-scroll) are
 * disabled here: the viewport is short enough that a drifting layer overlaps
 * the section below it before that section has finished arriving.
 *
 * Starts false so the server/first paint matches the desktop layout, then
 * corrects on mount.
 */
export function useIsSmallScreen() {
  const [small, setSmall] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(SMALL_SCREEN).matches
  );

  useEffect(() => {
    const mq = window.matchMedia(SMALL_SCREEN);
    const onChange = (e) => setSmall(e.matches);
    setSmall(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return small;
}

/**
 * Safety net for the scroll-triggered reveals below.
 *
 * These animate from `opacity: 0` and rely on framer-motion's `whileInView`
 * (an IntersectionObserver) to bring them in. If that never fires the content
 * stays invisible forever, which turns a decorative animation into missing
 * content. This flips everything to the visible state shortly after mount
 * regardless, so a missed observer costs an animation, never the content.
 */
function useRevealFallback(delayMs = 1200) {
  const [force, setForce] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setForce(true), delayMs);
    return () => clearTimeout(t);
  }, [delayMs]);

  return force;
}

/** Fades and lifts a block into view as it enters the viewport. */
export function Reveal({
  children,
  delay = 0,
  y = 26,
  duration = 0.62,
  className,
  as = 'div',
  once = true,
  ...rest
}) {
  const reduce = useReducedMotion();
  const forced = useRevealFallback();
  const Tag = motion[as] ?? motion.div;

  if (reduce) {
    const Plain = as;
    return (
      <Plain className={className} {...rest}>
        {children}
      </Plain>
    );
  }

  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      animate={forced ? { opacity: 1, y: 0 } : undefined}
      viewport={{ once, margin: '-12% 0px -8% 0px' }}
      transition={{ duration, delay, ease: EASE }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/**
 * Parent for staggered children. Pair with <StaggerItem>. Children arrive
 * ~70ms apart, which reads as a deliberate cascade rather than a queue.
 */
export function Stagger({
  children,
  className,
  gap = 0.07,
  delay = 0,
  once = true,
  ...rest
}) {
  const reduce = useReducedMotion();
  const forced = useRevealFallback();

  if (reduce) {
    return (
      <div className={className} {...rest}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      animate={forced ? 'show' : undefined}
      viewport={{ once, margin: '-10% 0px' }}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: gap, delayChildren: delay } },
      }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className, y = 22, ...rest }) {
  const reduce = useReducedMotion();
  const small = useIsSmallScreen();

  if (reduce) {
    return (
      <div className={className} {...rest}>
        {children}
      </div>
    );
  }

  // On small screens these sit in horizontal scroll rails. A vertical slide is
  // the wrong axis there, so items just fade in place.
  const offset = small ? 0 : y;

  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: offset },
        show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
      }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/**
 * Word-by-word headline reveal. Splits on spaces (not characters) so screen
 * readers and text selection still work normally, and keeps the DOM small.
 */
export function RevealText({ text, className, delay = 0, as: Tag = 'h1' }) {
  const reduce = useReducedMotion();
  const small = useIsSmallScreen();
  const words = text.split(' ');

  if (reduce) return <Tag className={className}>{text}</Tag>;

  // On small screens, drop the per-word slide for a plain fade. The slide needs
  // each word wrapped in its own `overflow: hidden` clipping box, and at phone
  // headline sizes those boxes clip descenders and force awkward breaks, which
  // reads as the words colliding. A fade needs no clipping box, so the headline
  // wraps like ordinary text.
  if (small) {
    const MotionTag = motion[Tag] ?? motion.h1;
    return (
      <MotionTag
        className={className}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay, ease: EASE }}
      >
        {text}
      </MotionTag>
    );
  }

  return (
    <Tag className={className} aria-label={text}>
      {words.map((word, i) => (
        <span
          key={`${word}-${i}`}
          style={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'top' }}
          aria-hidden="true"
        >
          <motion.span
            style={{ display: 'inline-block', willChange: 'transform' }}
            initial={{ y: '105%', opacity: 0 }}
            animate={{ y: '0%', opacity: 1 }}
            transition={{ duration: 0.75, delay: delay + i * 0.055, ease: EASE }}
          >
            {word}
            {i < words.length - 1 ? ' ' : ''}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}
