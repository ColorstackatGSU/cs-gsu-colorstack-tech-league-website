import { useRef, useState, useEffect } from 'react';
import { useReducedMotion } from 'framer-motion';
import { Pause, Play } from '@phosphor-icons/react';
import './PartnerCarousel.css';

/**
 * Partner logo marquee.
 *
 * TO ADD A PARTNER:
 *   1. Drop the logo file in `public/partners/` (SVG preferred, or a PNG with
 *      a transparent background).
 *   2. Add a row below with its name and `logo: '/partners/<file>'`.
 * Leave `logo` off and the tile renders the company name as text instead, so
 * the carousel looks intentional before every asset has arrived.
 *
 * Tiles are white, so a transparent logo drops straight in. If the logo
 * file has its own solid background baked in (a white mark on a brand
 * color, say), set `bleed: true` so it fills the tile edge to edge instead
 * of sitting as a colored square inside a white box.
 *
 * Either way the whole logo is always visible — nothing is ever cropped.
 */
const PARTNERS = [
  // `bleed` = the logo file has its own solid background baked in, so it
  // fills the tile edge to edge instead of floating on white.
  { name: 'ColorStack @ GSU', logo: '/partners/colorstack.png', bleed: true },
  { name: 'ProGSU', logo: '/partners/progsu.png', bleed: true },
  // TODO: drop the CS Club logo in public/partners/ and add `logo:` here.
  // Until then this renders as a text tile.
  { name: 'CS Club' },
  { name: 'NSBE', logo: '/partners/nsbe.png' },
];

export default function PartnerCarousel({ partners = PARTNERS }) {
  const reduce = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const trackRef = useRef(null);

  // A short partner list has to be repeated enough times to fill a wide
  // viewport, or the marquee shows visible gaps. Build one "set" of at least
  // 6 tiles, then duplicate that set once so the -50% loop is seamless.
  const perSet = Math.max(partners.length, 6);
  const set = Array.from({ length: perSet }, (_, i) => partners[i % partners.length]);
  const loop = [...set, ...set];

  // Respect reduced motion: never auto-scroll, let the user scroll manually.
  const animate = !reduce && !paused;

  // Pace the loop by tile count so adding partners doesn't speed it up
  useEffect(() => {
    if (!trackRef.current) return;
    trackRef.current.style.setProperty('--marquee-duration', `${perSet * 5}s`);
  }, [perSet]);

  return (
    <div className="partners">
      <div
        className={`partners__viewport ${animate ? '' : 'is-paused'}`}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
      >
        <ul className="partners__track" ref={trackRef}>
          {loop.map((partner, i) => {
            // Only the first occurrence of each real partner is announced;
            // repeats and the duplicated set are decorative.
            const isClone = i >= partners.length;
            return (
              <li
                className="partner"
                key={`${partner.name}-${i}`}
                aria-hidden={isClone ? 'true' : undefined}
              >
                <div
                  className={`partner__tile ${
                    partner.bleed ? 'partner__tile--bleed' : ''
                  }`}
                >
                  {partner.logo ? (
                    <img
                      src={partner.logo}
                      alt={partner.name}
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <span className="partner__name">{partner.name}</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Auto-scrolling content needs a stop control (WCAG 2.2.2). Hidden when
          reduced motion already stopped it. */}
      {!reduce && (
        <button
          type="button"
          className="partners__toggle"
          onClick={() => setPaused((p) => !p)}
          aria-pressed={paused}
        >
          {paused ? (
            <Play size={14} weight="fill" aria-hidden="true" />
          ) : (
            <Pause size={14} weight="fill" aria-hidden="true" />
          )}
          <span>{paused ? 'Resume scrolling' : 'Pause scrolling'}</span>
        </button>
      )}
    </div>
  );
}
