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
      variants={{
        hidden: { opacity: 0, y },
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
  const words = text.split(' ');

  if (reduce) return <Tag className={className}>{text}</Tag>;

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
