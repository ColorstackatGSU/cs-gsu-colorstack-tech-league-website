import { useRef, useEffect } from 'react';
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
 * Either way the whole logo is always visible, nothing is ever cropped.
 *
 * The marquee scrolls continuously and never pauses.
 */
const PARTNERS = [
  // `bleed` = the logo file has its own solid background baked in, so it
  // fills the tile edge to edge instead of floating on white.
  { name: 'ColorStack @ GSU', logo: '/partners/colorstack.png', bleed: true },
  { name: 'CS Club', logo: '/partners/csclub.png' },
  { name: 'ProGSU', logo: '/partners/progsu.png', bleed: true },
];

export default function PartnerCarousel({ partners = PARTNERS }) {
  const trackRef = useRef(null);

  // The list is repeated COPIES times and the track slides left by exactly one
  // copy's width, so copy N lands where copy N-1 started and the restart is
  // invisible. Two copies would be enough for the wrap itself, but with only a
  // handful of partners a two-copy track can be narrower than a wide desktop
  // viewport, which leaves visible empty strip no matter how the animation
  // behaves. Four copies keep the track wider than any realistic screen.
  const COPIES = 4;
  const loop = Array.from({ length: COPIES }, () => partners).flat();

  // Pace the loop by tile count so adding a partner doesn't speed it up
  useEffect(() => {
    if (!trackRef.current) return;
    trackRef.current.style.setProperty(
      '--marquee-duration',
      `${partners.length * 5}s`
    );
    // How far to slide: one copy out of COPIES.
    trackRef.current.style.setProperty(
      '--marquee-shift',
      `-${100 / COPIES}%`
    );
  }, [partners.length]);

  return (
    <div className="partners">
      <div className="partners__viewport">
        <ul className="partners__track" ref={trackRef}>
          {loop.map((partner, i) => {
            // Only the first occurrence of each real partner is announced;
            // repeats and the duplicated set are decorative.
            const isClone = i >= partners.length;
            // Every tile that closes a copy carries the same trailing spacing
            // `gap` gives every other pair, so all copies are identical in
            // width and each seam looks like any other space between tiles.
            const isCopyEnd = (i + 1) % partners.length === 0;
            return (
              <li
                className={`partner ${isCopyEnd ? 'partner--copy-end' : ''}`}
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

    </div>
  );
}
