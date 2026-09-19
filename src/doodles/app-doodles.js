// Tech League app ambient layer (log in, sign up, dashboard, application).
// Decoration only, in the side gutters of the signed-in pages.
//
// Replaces the old hand-drawn notebook props, which were drawn in the cream
// sketch palette. The scene detection and the observer that re-syncs it as
// you move through the application steps are unchanged; only the artwork is
// new — broadcast furniture rather than desk objects.

const NEON = { green: '#3df07f', blue: '#4d7cfe', purple: '#a970ff' };

const bracket = (color, flip) => `
  <svg viewBox="0 0 64 64" fill="none" aria-hidden="true"
       style="transform:${flip ? 'scaleX(-1)' : 'none'}">
    <path d="M2 20 V4 H18" stroke="${color}" stroke-width="2.5" stroke-linecap="square"/>
    <path d="M2 44 V60 H18" stroke="${color}" stroke-width="2.5" stroke-linecap="square"/>
    <circle cx="6" cy="32" r="2" fill="${color}"/>
  </svg>`;

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

const rules = (color) => `
  <svg viewBox="0 0 90 30" fill="none" aria-hidden="true">
    <path d="M0 4 H90" stroke="${color}" stroke-width="2" opacity=".75"/>
    <path d="M0 13 H62" stroke="${color}" stroke-width="2" opacity=".45"/>
    <path d="M0 22 H34" stroke="${color}" stroke-width="2" opacity=".25"/>
  </svg>`;

const chip = (color, label) => `
  <div class="tla-chip" style="--c:${color}">
    <span class="tla-chip-b">[</span>${label}<span class="tla-chip-b">]</span>
  </div>`;

/* A step counter, used down the application flow. */
const step = (color, n) => `
  <div class="tla-step" style="--c:${color}">
    <span class="tla-step-n">${n}</span>
    <span class="tla-step-r"></span>
  </div>`;

/* Shared furniture for every application step. */
const APPLY_COMMON = [
  { kind: 'bracket', color: NEON.green, side: 'l', e: 560, t: 120, w: 48, tier: 'near' },
  { kind: 'bracket', color: NEON.green, side: 'r', e: 560, t: 120, w: 48, tier: 'near', flip: true },
  { kind: 'rules', color: NEON.blue, side: 'l', e: 700, t: 420, w: 90, tier: 'far' },
];

const SCENES = {
  login: {
    host: '.auth__grid',
    items: [
      { kind: 'chip', color: NEON.green, label: 'WELCOME BACK', side: 'r', e: -160, t: 160, tier: 'mid' },
      { kind: 'bars', color: NEON.blue, side: 'r', e: -150, t: 520, w: 72, tier: 'mid', a: 'pulse' },
      { kind: 'bracket', color: NEON.purple, side: 'l', e: 590, t: 150, w: 48, tier: 'near' },
      { kind: 'rules', color: NEON.green, side: 'l', e: 595, t: 330, w: 90, tier: 'near' },
      { kind: 'chip', color: NEON.purple, label: 'SECURE', side: 'r', e: 560, t: 40, tier: 'near' },
      { kind: 'bracket', color: NEON.blue, side: 'l', e: 760, t: 40, w: 44, tier: 'far', flip: false },
    ],
  },
  signup: {
    host: '.auth__grid',
    items: [
      { kind: 'chip', color: NEON.green, label: 'JOIN THE LEAGUE', side: 'r', e: -170, t: 150, tier: 'mid' },
      { kind: 'bars', color: NEON.purple, side: 'r', e: -160, t: 520, w: 72, tier: 'mid', a: 'pulse' },
      { kind: 'bracket', color: NEON.green, side: 'l', e: 590, t: 140, w: 48, tier: 'near' },
      { kind: 'rules', color: NEON.blue, side: 'l', e: 600, t: 420, w: 90, tier: 'near' },
      { kind: 'chip', color: NEON.blue, label: 'STRONG PASSWORD', side: 'r', e: 560, t: 290, tier: 'near' },
      { kind: 'bracket', color: NEON.purple, side: 'r', e: 720, t: 120, w: 44, tier: 'far', flip: true },
    ],
  },
  dashboard: {
    host: '.dash',
    items: [
      { kind: 'bracket', color: NEON.green, side: 'l', e: 570, t: 120, w: 52, tier: 'near' },
      { kind: 'chip', color: NEON.green, label: 'YOUR SEASON', side: 'l', e: 575, t: 300, tier: 'near' },
      { kind: 'bars', color: NEON.blue, side: 'l', e: 570, t: 450, w: 72, tier: 'near', a: 'pulse' },
      { kind: 'chip', color: NEON.purple, label: 'UNDER REVIEW', side: 'r', e: 565, t: 250, tier: 'near' },
      { kind: 'rules', color: NEON.green, side: 'r', e: 570, t: 460, w: 90, tier: 'near' },
      { kind: 'bracket', color: NEON.purple, side: 'r', e: 565, t: 690, w: 48, tier: 'near', flip: true },
      { kind: 'chip', color: NEON.blue, label: 'STANDINGS', side: 'l', e: 700, t: 800, tier: 'far' },
      { kind: 'bars', color: NEON.green, side: 'r', e: 700, t: 830, w: 72, tier: 'far', a: 'pulse' },
    ],
  },
  'apply-1': {
    host: '.apply',
    items: [
      ...APPLY_COMMON,
      { kind: 'step', color: NEON.green, n: '01', side: 'r', e: 400, t: 520, tier: 'mid' },
      { kind: 'chip', color: NEON.blue, label: 'USE YOUR GSU EMAIL', side: 'l', e: 420, t: 560, tier: 'mid' },
    ],
  },
  'apply-2': {
    host: '.apply',
    items: [
      ...APPLY_COMMON,
      { kind: 'step', color: NEON.green, n: '02', side: 'r', e: 400, t: 500, tier: 'mid' },
      { kind: 'chip', color: NEON.purple, label: 'FUTURE GRAD', side: 'l', e: 420, t: 540, tier: 'mid' },
    ],
  },
  'apply-3': {
    host: '.apply',
    items: [
      ...APPLY_COMMON,
      { kind: 'step', color: NEON.green, n: '03', side: 'r', e: 390, t: 470, tier: 'mid' },
      { kind: 'chip', color: NEON.blue, label: 'FIRST DRAFTS ARE FINE', side: 'l', e: 420, t: 620, tier: 'mid' },
    ],
  },
  'apply-4': {
    host: '.apply',
    items: [
      ...APPLY_COMMON,
      { kind: 'step', color: NEON.green, n: '04', side: 'r', e: 410, t: 440, tier: 'mid' },
      { kind: 'chip', color: NEON.purple, label: 'SQUAD UP', side: 'l', e: 400, t: 540, tier: 'mid' },
      { kind: 'chip', color: NEON.blue, label: 'ALMOST THERE', side: 'r', e: 430, t: 760, tier: 'mid' },
    ],
  },
  'apply-done': {
    host: '.apply',
    items: [
      { kind: 'chip', color: NEON.green, label: 'SUBMITTED', side: 'l', e: 400, t: 170, tier: 'mid' },
      { kind: 'chip', color: NEON.blue, label: 'SENT TO E-BOARD', side: 'r', e: 390, t: 200, tier: 'mid' },
      // Only mounted when the page is showing the missing-resume error.
      { kind: 'chip', color: NEON.purple, label: 'ADD YOUR RESUME', side: 'r', e: 345, t: 715, tier: 'mid', when: '.status-msg--error' },
      { kind: 'bars', color: NEON.green, side: 'l', e: 620, t: 420, w: 72, tier: 'far', a: 'pulse' },
      { kind: 'bracket', color: NEON.green, side: 'r', e: 640, t: 520, w: 44, tier: 'far', flip: true },
    ],
  },
};

function detectScene() {
  if (document.querySelector('.auth'))
    return location.pathname.startsWith('/signup') ? 'signup' : 'login';
  if (document.querySelector('.dash')) return 'dashboard';
  const apply = document.querySelector('.apply');
  if (!apply) return null;
  if (apply.querySelector('.apply__status')) return 'apply-done';
  const items = [...apply.querySelectorAll('.apply__rail-item')];
  const i = items.findIndex((li) => li.classList.contains('is-current'));
  // The review step reuses the last section's scene rather than having one of its own.
  return i >= 0 ? `apply-${Math.min(i + 1, 4)}` : null;
}

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
    case 'step':
      return step(it.color, it.n);
    default:
      return '';
  }
}

function buildLayer(scene) {
  const layer = document.createElement('div');
  layer.className = 'tla-layer';
  layer.dataset.scene = scene;
  layer.setAttribute('aria-hidden', 'true');
  for (const it of SCENES[scene].items) {
    if (it.when && !document.querySelector(it.when)) continue;
    const d = document.createElement('div');
    d.className = `tla-d ${it.side} ${it.tier}`;
    d.style.setProperty('--e', `${it.e}px`);
    d.style.setProperty('--t', `${it.t}px`);
    if (it.w) d.style.setProperty('--w', `${it.w}px`);
    d.innerHTML = `<div class="tla-in ${it.a ? 'tla-a-' + it.a : ''}">${art(it)}</div>`;
    layer.appendChild(d);
  }
  return layer;
}

export function startAppDoodles() {
  if (window.__tlaStop) return window.__tlaStop;

  let layer = null;
  let key = '';
  let queued = false;

  const sync = () => {
    queued = false;
    const scene = detectScene();
    const host = scene && SCENES[scene] && document.querySelector(SCENES[scene].host);
    const errKey = document.querySelector('.status-msg--error') ? '+err' : '';
    const nextKey = scene ? scene + errKey : '';
    if (nextKey === key && layer && layer.isConnected && layer.parentElement === host) return;
    if (layer) layer.remove();
    layer = null;
    key = nextKey;
    if (scene && host) {
      layer = buildLayer(scene);
      host.appendChild(layer);
    }
  };

  const obs = new MutationObserver(() => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(sync);
    }
  });
  obs.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class'],
  });
  sync();

  const stop = () => {
    obs.disconnect();
    if (layer) layer.remove();
    window.__tlaStop = null;
  };
  window.__tlaStop = stop;
  return stop;
}
