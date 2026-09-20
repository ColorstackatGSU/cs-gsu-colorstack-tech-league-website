import { useRef, useState } from 'react';
import {
  motion,
  useScroll,
  useTransform,
  useMotionValueEvent,
} from 'framer-motion';

/**
 * A pinned, scroll-driven card deck.
 *
 * The section holds still while a tall track scrolls behind it, and scroll
 * position walks a "card index" value from 0 to n-1. The card at that index is
 * centred and fully lit; the next one waits below it and the one just read
 * sits above it, both scaled down and faded back to ghosts.
 *
 * Two things this deliberately does not do:
 *
 * Nothing is mounted or unmounted by scroll position, and nothing is hidden
 * with `display: none` or `visibility: hidden`. Every card stays in the DOM and
 * in the accessibility tree the whole time, so a screen reader or a keyboard
 * user reads all of them in order without having to land on an exact pixel.
 * Receding is done with opacity and transform only.
 *
 * It never runs itself. The caller decides whether the pinned treatment is
 * appropriate at all (it is desktop-only, and off entirely under
 * prefers-reduced-motion) and renders a plain grid instead when it is not.
 * That keeps the "should this move" decision in one place next to the rest of
 * the page's `still` checks.
 */

/* Padding at each end of the track, as a fraction of scroll progress. Without
   it the first card is already sliding away before the section has finished
   arriving, and the last one is still moving as the pin releases. */
const LEAD_IN = 0.08;
const LEAD_OUT = 0.92;

/**
 * One card in the stack. It gets its own component because each card needs its
 * own `useTransform` chain, and hooks cannot be created inside a map callback.
 *
 * `position` is the card's index. `index` is the shared motion value holding
 * the scroll-driven position, so `index - position` is how far this card is
 * from being the active one.
 *
 * Cards behind the front one are taken out of the mouse's reach in CSS, with
 * `pointer-events: none`, so a hover state cannot fire through the stack. They
 * are not marked `inert`: that would take them out of the accessibility tree
 * too, which is exactly what this deck is not allowed to do.
 */
function DeckCard({ index, position, depth, active, children }) {
  // Every card is described in whole steps from its own index: two away, one
  // away, active, one past, two past.
  //
  // The neighbours are moved a full card height clear rather than stacked
  // behind the active one. An overlapping deck was the first attempt and it
  // read badly: these cards are panels of body text, so half way through a
  // cross-fade two headings sat on top of each other and the stage turned to
  // mush. Sliding them past each other keeps every frame legible.
  const y = useTransform(
    index,
    [position - 1.4, position - 1, position, position + 1, position + 1.4],
    ['150%', '96%', '0%', '-96%', '-150%']
  );

  const scale = useTransform(
    index,
    [position - 1, position, position + 1],
    [0.88, 1, 0.88]
  );

  // The card either side of the active one stays a visible ghost, which is
  // what tells you this is a reel with more in it. Anything further out fades
  // right off: those cards all clamp to the same offset, so leaving them
  // faintly lit piled three headings into one smear at the top of the stage.
  // Opacity only. They are still in the DOM and in the accessibility tree.
  const opacity = useTransform(
    index,
    [
      position - 1.4,
      position - 1,
      position - 0.5,
      position,
      position + 0.5,
      position + 1,
      position + 1.4,
    ],
    [0, 0.1, 0.7, 1, 0.7, 0.1, 0]
  );

  return (
    <motion.div
      className={`challenge-deck__card ${active ? 'is-active' : ''}`}
      style={{ y, scale, opacity, zIndex: depth }}
    >
      {children}
    </motion.div>
  );
}

export default function ChallengeDeck({ items, getKey, getLabel, children }) {
  const trackRef = useRef(null);
  const [active, setActive] = useState(0);
  const last = items.length - 1;

  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ['start start', 'end end'],
  });

  // Progress is remapped into index space (0 to n-1) rather than kept as 0..1,
  // so each card can describe itself in whole steps instead of every card
  // needing the fraction maths repeated with different constants.
  const index = useTransform(
    scrollYProgress,
    [LEAD_IN, LEAD_OUT],
    [0, last],
    { clamp: true }
  );

  // The only thing React state is used for is stacking order and the rail,
  // both of which are genuinely discrete. The transforms stay off the render
  // path and run on the motion values.
  useMotionValueEvent(index, 'change', (value) => {
    const next = Math.min(last, Math.max(0, Math.round(value)));
    setActive((current) => (current === next ? current : next));
  });

  return (
    <div className="challenge-deck__track" ref={trackRef}>
      <div className="challenge-deck__pin">
        {/* Decorative: it repeats names and ordering that the cards already
            carry, so announcing it again would only duplicate the section. */}
        <ol className="challenge-deck__rail" aria-hidden="true">
          {items.map((item, i) => (
            <li
              key={getKey(item)}
              className={`challenge-deck__step ${
                i === active ? 'is-active' : ''
              } ${i < active ? 'is-done' : ''}`}
            >
              <span className="challenge-deck__step-num">{i + 1}</span>
              <span className="challenge-deck__step-label">{getLabel(item)}</span>
            </li>
          ))}
        </ol>

        <div className="challenge-deck__stage">
          {items.map((item, i) => (
            <DeckCard
              key={getKey(item)}
              index={index}
              position={i}
              // The active card has to sit on top, and the nearer a card is to
              // active the closer to the front it stacks.
              depth={items.length - Math.abs(i - active)}
              active={i === active}
            >
              {children(item)}
            </DeckCard>
          ))}
        </div>
      </div>
    </div>
  );
}
