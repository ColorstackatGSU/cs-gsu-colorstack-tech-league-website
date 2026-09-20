// Tech League ambient layer.
// Replaces the old hand-drawn notebook doodles, which were keyed to the
// cream sketch palette and read as clutter against the stadium dark.
//
// What goes in the side gutters now is broadcast furniture: corner brackets,
// thin stat readouts, and a scanning rule — the graphics that frame a live
// sports feed. Nothing in your existing markup changes: call mountDoodles()
// once after the page renders and it returns its own cleanup.

const NEON = { green: '#3df07f', blue: '#4d7cfe', purple: '#a970ff' };

/* A framing bracket, the corner mark used around broadcast lower-thirds. */
const bracket = (color, flip) => `
  <svg viewBox="0 0 64 64" fill="none" aria-hidden="true"
       style="transform:${flip ? 'scaleX(-1)' : 'none'}">
    <path d="M2 20 V4 H18" stroke="${color}" stroke-width="2.5" stroke-linecap="square"/>
    <path d="M2 44 V60 H18" stroke="${color}" stroke-width="2.5" stroke-linecap="square"/>
    <circle cx="6" cy="32" r="2" fill="${color}"/>
  </svg>`;

/* A small bar readout, the shape of an on-screen stat block. */
const bars = (color, heights) => `
  <svg viewBox="0 0 72 44" fill="none" aria-hidden="true">
    ${heights
      .map(
        (h, i) =>
          `<rect x="${i * 14}" y="${40 - h}" width="8" height="${h}" rx="1.5"
             fill="${color}" opacity="${0.35 + i * 0.16}"/>`
      )
      .join('')}
    <path d="M0 42 H68" stroke="${color}" stroke-width="1" opacity=".4"/>
  </svg>`;

/* A bracketed tag, like a scoreboard chip. */
const chip = (color, label) => `
  <div class="tl-chip" style="--c:${color}">
    <span class="tl-chip-b">[</span>${label}<span class="tl-chip-b">]</span>
  </div>`;

/* Stacked rules that suggest a signal readout. */
const rules = (color) => `
  <svg viewBox="0 0 90 30" fill="none" aria-hidden="true">
    <path d="M0 4 H90" stroke="${color}" stroke-width="2" opacity=".75"/>
    <path d="M0 13 H62" stroke="${color}" stroke-width="2" opacity=".45"/>
    <path d="M0 22 H34" stroke="${color}" stroke-width="2" opacity=".25"/>
  </svg>`;

/* Gutter furniture. `e` is the distance out from the page centre, `t` the
   offset down from the section's top. `near` shows from 1360px, `far` only
   past 1700px, so nothing crowds the copy on a laptop. */
const LAYOUT = [
  {
    sel: '.hero',
    items: [
      { kind: 'bracket', color: NEON.green, side: 'l', e: 470, t: 150, w: 56, tier: 'near' },
      { kind: 'bracket', color: NEON.green, side: 'r', e: 470, t: 150, w: 56, tier: 'near', flip: true },
      { kind: 'chip', color: NEON.green, label: 'FALL SEASON', side: 'l', e: 500, t: 330, tier: 'near' },
      { kind: 'bars', color: NEON.blue, side: 'r', e: 490, t: 340, w: 72, tier: 'near', a: 'pulse' },
      { kind: 'rules', color: NEON.purple, side: 'l', e: 640, t: 520, w: 90, tier: 'far' },
      { kind: 'chip', color: NEON.blue, label: 'LIVE BOARD', side: 'r', e: 660, t: 520, tier: 'far' },
    ],
  },
  {
    sel: '#challenges',
    cell: true,
    items: [
      { kind: 'chip', color: NEON.green, label: '5 CHALLENGES', side: 'l', e: 450, t: 200, tier: 'near' },
      { kind: 'bars', color: NEON.green, side: 'l', e: 470, t: 470, w: 72, tier: 'near', a: 'pulse' },
      { kind: 'bracket', color: NEON.purple, side: 'r', e: 450, t: 240, w: 48, tier: 'near', flip: true },
      { kind: 'rules', color: NEON.blue, side: 'r', e: 460, t: 560, w: 90, tier: 'near' },
      { kind: 'chip', color: NEON.purple, label: '550 PTS', side: 'l', e: 640, t: 760, tier: 'far' },
      { kind: 'bracket', color: NEON.blue, side: 'l', e: 650, t: 330, w: 48, tier: 'far' },
    ],
  },
  {
    sel: '#timeline',
    items: [
      { kind: 'bracket', color: NEON.green, side: 'l', e: 440, t: 180, w: 52, tier: 'near' },
      { kind: 'chip', color: NEON.blue, label: 'SEPT 30', side: 'l', e: 470, t: 400, tier: 'near' },
      { kind: 'chip', color: NEON.purple, label: 'DEC 4', side: 'r', e: 460, t: 900, tier: 'near' },
      { kind: 'rules', color: NEON.green, side: 'r', e: 450, t: 300, w: 90, tier: 'near' },
      { kind: 'bars', color: NEON.purple, side: 'l', e: 460, t: 800, w: 72, tier: 'near', a: 'pulse' },
      { kind: 'bracket', color: NEON.blue, side: 'r', e: 650, t: 560, w: 48, tier: 'far', flip: true },
      { kind: 'chip', color: NEON.green, label: 'MATCHWEEK', side: 'l', e: 640, t: 620, tier: 'far' },
    ],
  },
  {
    sel: '#partners',
    items: [
      { kind: 'chip', color: NEON.green, label: '3 ORGS', side: 'l', e: 440, t: 160, tier: 'near' },
      { kind: 'bracket', color: NEON.purple, side: 'r', e: 440, t: 170, w: 48, tier: 'near', flip: true },
      { kind: 'rules', color: NEON.blue, side: 'l', e: 640, t: 330, w: 90, tier: 'far' },
    ],
  },
  {
    sel: 'section.section:last-of-type',
    items: [
      { kind: 'bracket', color: NEON.green, side: 'l', e: 430, t: 170, w: 52, tier: 'near' },
      { kind: 'bracket', color: NEON.green, side: 'r', e: 430, t: 170, w: 52, tier: 'near', flip: true },
      { kind: 'chip', color: NEON.blue, label: 'APPLY NOW', side: 'r', e: 460, t: 380, tier: 'near' },
      { kind: 'bars', color: NEON.green, side: 'l', e: 450, t: 380, w: 72, tier: 'near', a: 'pulse' },
    ],
  },
];

function art(it) {
  switch (it.kind) {
    case 'bracket':
      return bracket(it.color, it.flip);
    case 'bars':
      return bars(it.color, [12, 22, 16, 30, 24]);
    case 'rules':
      return rules(it.color);
    case 'chip':
      return chip(it.color, it.label);
    default:
      return '';
  }
}

function pieceEl(it) {
  const d = document.createElement('div');
  d.className = `tl-d ${it.side} ${it.tier}`;
  d.style.setProperty('--e', `${it.e}px`);
  d.style.setProperty('--t', `${it.t}px`);
  if (it.w) d.style.setProperty('--w', `${it.w}px`);
  d.innerHTML = `<div class="tl-in ${it.a ? 'tl-a-' + it.a : ''}">${art(it)}</div>`;
  return d;
}

/* The challenges grid holds five cards in a three-column layout, leaving one
   empty slot. This fills it rather than letting the row end ragged. */
function cellEl() {
  const c = document.createElement('div');
  c.className = 'tl-cell';
  c.setAttribute('aria-hidden', 'true');
  c.innerHTML = `
    <div class="tl-cell-in">
      <div class="tl-cell-rank">01</div>
      <div class="tl-cell-note">Top of the board?</div>
      <div class="tl-cell-sub">That could be your team on Dec 4</div>
      <div class="tl-cell-bars">${bars(NEON.green, [14, 26, 20, 34, 28])}</div>
    </div>`;
  return c;
}

export function mountDoodles() {
  if (document.querySelector('.tl-layer')) return () => {};
  const made = [];

  for (const sec of LAYOUT) {
    const host = document.querySelector(sec.sel);
    if (!host) continue;
    const layer = document.createElement('div');
    layer.className = 'tl-layer';
    layer.setAttribute('aria-hidden', 'true');
    sec.items.forEach((it) => layer.appendChild(pieceEl(it)));
    host.appendChild(layer);
    made.push(layer);
    if (sec.cell) {
      const grid = host.querySelector('.challenges__grid');
      if (grid) {
        const c = cellEl();
        grid.appendChild(c);
        made.push(c);
      }
    }
  }
  return () => made.forEach((n) => n.remove());
}
