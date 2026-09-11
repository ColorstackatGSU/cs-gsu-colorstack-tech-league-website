// Tech League hand drawn doodles.
// Adds notebook style objects into the empty side space of each section.
// Nothing in your existing markup changes: call mountDoodles() once after the page renders.

const INK = '#33302b';
const C = {
  ink: INK, soft: '#5c574f', light: '#8a8378', card: '#fffdf8', paper: '#fbf7ef',
  deep: '#ede4d3', warm: '#f5efe2', teal: '#4fb3a5', tealDeep: '#2f8478', tealSoft: '#dcf0ec',
  tealLine: '#a8d9d1', clay: '#e08a5f', claySoft: '#fbe7dc', mustard: '#e3b23c',
  mustardSoft: '#faf0d7', metal: '#bdb6aa', red: '#d2604f',
};

const svg = (vb, inner) =>
  `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
const txt = (x, y, size, s, fill = INK, anchor = 'middle', fam = 'Caveat, cursive', w = 700) =>
  `<text x="${x}" y="${y}" font-family="${fam}" font-weight="${w}" font-size="${size}" text-anchor="${anchor}" fill="${fill}" stroke="none">${s}</text>`;
const star = (cx, cy, r, fill) => {
  const k = r * 0.28;
  return `<path d="M${cx} ${cy - r} C${cx + k} ${cy - k} ${cx + k} ${cy - k} ${cx + r} ${cy} C${cx + k} ${cy + k} ${cx + k} ${cy + k} ${cx} ${cy + r} C${cx - k} ${cy + k} ${cx - k} ${cy + k} ${cx - r} ${cy} C${cx - k} ${cy - k} ${cx - k} ${cy - k} ${cx} ${cy - r} Z" fill="${fill}"/>`;
};

const SVGS = {
  notebook: svg('0 0 170 214', `
    <rect x="10" y="18" width="150" height="188" rx="6" fill="${C.card}"/>
    ${[60, 82, 104, 126, 148, 170, 192].map(y => `<path d="M20 ${y} H152" stroke="${C.tealLine}" stroke-width="1.4"/>`).join('')}
    <path d="M40 30 V200" stroke="${C.clay}" stroke-width="1.6"/>
    ${[30, 52, 74, 96, 118, 140].map(x => `<path d="M${x} 26 C ${x - 6} 18, ${x - 2} 8, ${x + 5} 10" stroke-width="2.4"/>`).join('')}
    ${[30, 52, 74, 96, 118, 140].map(x => `<circle cx="${x}" cy="26" r="2.6" fill="${INK}" stroke="none"/>`).join('')}
    <rect x="112" y="4" width="50" height="16" fill="${C.tealLine}" stroke="none" opacity=".75" transform="rotate(12 137 12)"/>
    ${txt(48, 54, 26, 'to do:', INK, 'start')}
    <rect x="47" y="66" width="11" height="11" rx="2" stroke-width="2"/>${txt(64, 78, 19, 'grind leetcode', C.soft, 'start')}
    <rect x="47" y="88" width="11" height="11" rx="2" stroke-width="2"/>${txt(64, 100, 19, 'fix my resume', C.soft, 'start')}
    <path d="M45 91 l6 7 l12 -16" stroke="${C.tealDeep}" stroke-width="3"/>
    <rect x="47" y="110" width="11" height="11" rx="2" stroke-width="2"/>${txt(64, 122, 19, 'mock interview', C.soft, 'start')}
    <path d="M45 113 l6 7 l12 -16" stroke="${C.tealDeep}" stroke-width="3"/>
    <rect x="47" y="132" width="11" height="11" rx="2" stroke-width="2"/>${txt(64, 144, 21, 'get hired', INK, 'start')}
    <path d="M62 150 C 80 146, 110 147, 128 150" stroke="${C.mustard}" stroke-width="3"/>
    ${txt(120, 186, 18, '★ ★', C.mustard, 'middle')}
  `),

  pencil: svg('0 0 204 44', `
    <path d="M18 10 H10 C6 10 4 13 4 16 V28 C4 31 6 34 10 34 H18 Z" fill="${C.clay}"/>
    <rect x="18" y="10" width="14" height="24" fill="${C.metal}"/>
    <path d="M23 10 V34 M27 10 V34" stroke-width="1.3"/>
    <path d="M32 10 H162 V34 H32 Z" fill="${C.mustard}"/>
    <path d="M32 18 H162 M32 26 H162" stroke-width="1.2"/>
    <path d="M162 10 L196 22 L162 34 Z" fill="#f3dcb2"/>
    <path d="M185 18 L196 22 L185 26 Z" fill="${INK}"/>
  `),

  laptop: svg('0 0 220 152', `
    <rect x="30" y="8" width="160" height="106" rx="10" fill="${C.card}"/>
    <rect x="42" y="20" width="136" height="82" rx="4" fill="${C.tealSoft}"/>
    <path d="M54 36 H84" stroke="${C.clay}" stroke-width="3.5"/>
    <path d="M90 36 H124" stroke="${C.tealDeep}" stroke-width="3.5"/>
    <path d="M66 50 H104" stroke="${C.tealDeep}" stroke-width="3.5"/>
    <path d="M66 64 H92" stroke="${C.mustard}" stroke-width="3.5"/><path d="M98 64 H140" stroke="${C.tealDeep}" stroke-width="3.5"/>
    <path d="M66 78 H116" stroke="${C.tealDeep}" stroke-width="3.5"/>
    <path d="M54 92 H70" stroke="${C.clay}" stroke-width="3.5"/>
    <rect class="tl-cursor" x="76" y="85" width="4" height="13" fill="${INK}" stroke="none"/>
    <path d="M30 114 H190 L210 126 H10 Z" fill="${C.warm}"/>
    <path d="M10 126 H210 L202 142 H18 Z" fill="${C.deep}"/>
    <path d="M94 126 H126" stroke-width="2"/>
  `),

  mug: svg('0 0 112 132', `
    <g class="tl-steam"><path d="M40 34 c-9 -8 9 -14 0 -24" stroke="${C.light}" stroke-width="2.2"/><path d="M58 32 c-9 -8 9 -14 0 -24" stroke="${C.light}" stroke-width="2.2"/></g>
    <path d="M78 58 C 102 56, 102 94, 78 92" stroke-width="3"/>
    <path d="M78 66 C 90 66, 90 84, 78 84" stroke-width="2.4"/>
    <path d="M18 44 H78 V104 C78 112 72 118 64 118 H32 C24 118 18 112 18 104 Z" fill="${C.teal}"/>
    <ellipse cx="48" cy="44" rx="30" ry="6" fill="${C.tealDeep}"/>
    ${txt(48, 90, 26, 'JAVA', C.card)}
  `),

  plane: svg('0 0 240 120', `
    <path d="M8 104 C 36 64, 74 112, 98 84 C 122 56, 92 40, 110 62 C 128 84, 150 62, 166 52" stroke="${C.light}" stroke-width="2" stroke-dasharray="6 8"/>
    <path d="M164 50 L234 18 L200 80 Z" fill="${C.card}"/>
    <path d="M234 18 L186 58 L192 84 L200 80" fill="${C.deep}"/>
    <path d="M186 58 L164 50" stroke-width="2"/>
  `),

  duck: svg('0 0 134 112', `
    <path d="M6 102 q10 -6 20 0 t20 0 t20 0 t20 0 t20 0 t20 0" stroke="${C.teal}" stroke-width="2.4"/>
    <path d="M18 62 C 12 50, 22 44, 34 52 C 44 56, 52 56, 60 54 C 58 36, 70 18, 88 18 C 106 18, 116 34, 110 50 C 107 57, 100 60, 94 61 C 112 66, 120 78, 112 92 C 104 104, 46 106, 30 96 C 20 88, 16 76, 18 62 Z" fill="${C.mustard}"/>
    <path d="M107 38 C 120 34, 130 40, 127 47 C 120 52, 111 50, 104 47 Z" fill="${C.clay}"/>
    <circle cx="94" cy="33" r="3.2" fill="${INK}" stroke="none"/>
    <path d="M42 72 C 56 64, 76 66, 82 80 C 70 88, 52 86, 42 72 Z" fill="#efc864"/>
  `),

  trophy: svg('0 0 130 152', `
    <path d="M30 26 H12 C12 52 24 62 40 64" stroke-width="3"/>
    <path d="M100 26 H118 C118 52 106 62 90 64" stroke-width="3"/>
    <path d="M28 14 H102 V42 C102 70 84 84 65 84 C46 84 28 70 28 42 Z" fill="${C.mustard}"/>
    <path d="M40 24 V46" stroke="${C.mustardSoft}" stroke-width="4"/>
    ${star(65, 44, 13, C.card)}
    <path d="M58 84 H72 V104 H58 Z" fill="${C.mustard}"/>
    <path d="M40 104 H90 V118 H40 Z" fill="${C.deep}"/>
    <path d="M30 118 H100 V134 H30 Z" fill="${C.soft}"/>
    ${txt(65, 131, 16, '#1', C.card)}
  `),

  keys: svg('0 0 196 92', `
    <rect x="8" y="16" width="96" height="66" rx="12" fill="${C.deep}"/>
    <rect x="16" y="10" width="80" height="54" rx="10" fill="${C.card}"/>
    ${txt(56, 44, 20, 'ctrl', INK, 'middle', 'Quicksand, system-ui, sans-serif', 700)}
    ${txt(122, 52, 30, '+', C.light)}
    <rect x="138" y="16" width="52" height="66" rx="12" fill="${C.deep}"/>
    <rect x="144" y="10" width="40" height="54" rx="10" fill="${C.tealSoft}"/>
    ${txt(164, 46, 26, 'Z', INK, 'middle', 'Quicksand, system-ui, sans-serif', 700)}
  `),

  sticky: (l1, l2, strike) => svg('0 0 130 130', `
    <path d="M10 16 H120 V100 L96 124 H10 Z" fill="${C.mustard}"/>
    <path d="M120 100 H96 V124 Z" fill="#c9982a"/>
    <rect x="40" y="4" width="50" height="18" fill="${C.tealLine}" opacity=".8" stroke="none" transform="rotate(-5 65 13)"/>
    ${txt(65, 58, 26, l1)}
    ${strike ? '<path d="M36 50 C 56 46, 76 48, 96 44" stroke-width="3"/>' : ''}
    ${txt(62, 94, strike ? 24 : 22, l2)}
  `),

  calendar: svg('0 0 130 142', `
    <rect x="10" y="22" width="110" height="112" rx="8" fill="${C.card}"/>
    <path d="M10 30 C10 25 14 22 18 22 H112 C116 22 120 25 120 30 V50 H10 Z" fill="${C.clay}"/>
    <path d="M38 10 V32 M92 10 V32" stroke-width="5"/>
    ${txt(65, 43, 15, 'SEPT', C.card, 'middle', 'Quicksand, system-ui, sans-serif', 700)}
    ${txt(65, 110, 56, '30')}
    <path d="M34 92 C 32 66, 98 62, 100 90 C 102 116, 40 122, 34 96 C 32 86, 44 76, 58 74" stroke="${C.clay}" stroke-width="2.6"/>
  `),

  clock: svg('0 0 120 132', `
    <path d="M16 36 A22 22 0 0 1 46 12 Z" fill="${C.clay}"/>
    <path d="M104 36 A22 22 0 0 0 74 12 Z" fill="${C.clay}"/>
    <path d="M60 26 V18 M52 18 H68" stroke-width="3"/>
    <path d="M32 104 L22 120 M88 104 L98 120" stroke-width="4"/>
    <circle cx="60" cy="68" r="42" fill="${C.card}"/>
    <circle cx="60" cy="68" r="34" stroke-width="1.3"/>
    <path d="M60 38 V44 M60 92 V98 M30 68 H36 M84 68 H90" stroke-width="2.4"/>
    <path d="M60 68 V46 M60 68 L78 78" stroke-width="3.6"/>
    <circle cx="60" cy="68" r="3.5" fill="${INK}"/>
  `),

  bulb: svg('0 0 110 140', `
    <g class="tl-rays"><path d="M55 4 V14 M18 20 l8 7 M92 20 l-8 7 M6 56 H16 M94 56 H104" stroke="${C.mustard}" stroke-width="3.2"/></g>
    <path d="M55 24 C 32 24, 22 42, 26 60 C 29 74, 40 80, 42 92 H68 C 70 80, 81 74, 84 60 C 88 42, 78 24, 55 24 Z" fill="${C.mustardSoft}"/>
    <path d="M46 90 L48 66 L55 74 L62 66 L64 90" stroke-width="2"/>
    <path d="M42 92 H68 V100 H42 Z" fill="${C.metal}"/>
    <path d="M44 100 H66 V108 H44 Z" fill="${C.metal}"/>
    <path d="M48 108 H62 L58 116 H52 Z" fill="${C.soft}"/>
  `),

  rocket: svg('0 0 120 172', `
    <g class="tl-flame"><path d="M46 114 C 46 138, 60 160, 60 160 C 60 160, 74 138, 74 114 Z" fill="${C.mustard}"/>
    <path d="M53 116 C 53 132, 60 146, 60 146 C 60 146, 67 132, 67 116 Z" fill="${C.clay}" stroke="none"/></g>
    <path d="M40 88 L18 122 L42 114 Z" fill="${C.clay}"/>
    <path d="M80 88 L102 122 L78 114 Z" fill="${C.clay}"/>
    <path d="M60 6 C 86 28, 90 72, 80 114 H40 C 30 72, 34 28, 60 6 Z" fill="${C.card}"/>
    <path d="M46 28 C 54 24, 66 24, 74 28" stroke-width="2"/>
    <circle cx="60" cy="56" r="13" fill="${C.teal}"/>
    <path d="M54 51 C 56 48, 60 47, 63 48" stroke="${C.card}" stroke-width="2.4"/>
    <path d="M60 90 V104" stroke-width="2"/>
  `),

  paper: svg('0 0 92 82', `
    <path d="M14 42 L22 16 L44 10 L64 14 L80 30 L82 52 L68 70 L40 74 L20 64 Z" fill="${C.card}"/>
    <path d="M22 16 L36 38 L64 14 M36 38 L20 64 M36 38 L58 46 L80 30 M58 46 L68 70 M58 46 L40 74" stroke-width="1.5"/>
  `),

  nametag: svg('0 0 172 122', `
    <rect x="8" y="8" width="156" height="106" rx="12" fill="${C.card}"/>
    <path d="M8 20 C8 13 13 8 20 8 H152 C159 8 164 13 164 20 V46 H8 Z" fill="${C.clay}"/>
    ${txt(86, 30, 19, 'HELLO', C.card, 'middle', 'Quicksand, system-ui, sans-serif', 700)}
    ${txt(86, 42, 10, 'my name is', C.card, 'middle', 'Quicksand, system-ui, sans-serif', 600)}
    ${txt(86, 90, 32, 'future SWE')}
    <path d="M40 98 C 70 94, 110 95, 134 98" stroke="${C.teal}" stroke-width="2.4"/>
  `),

  bubbles: svg('0 0 156 112', `
    <path d="M8 18 C8 12 12 8 18 8 H82 C88 8 92 12 92 18 V44 C92 50 88 54 82 54 H40 L24 68 V54 H18 C12 54 8 50 8 44 Z" fill="${C.tealSoft}"/>
    ${txt(50, 40, 24, 'hi!')}
    <path d="M62 56 C62 50 66 46 72 46 H138 C144 46 148 50 148 56 V82 C148 88 144 92 138 92 H134 V106 L118 92 H72 C66 92 62 88 62 82 Z" fill="${C.claySoft}"/>
    ${txt(105, 78, 22, 'what org?')}
  `),

  resume: svg('0 0 140 172', `
    <path d="M12 8 H104 L128 32 V164 H12 Z" fill="${C.card}"/>
    <path d="M104 8 V32 H128 Z" fill="${C.deep}"/>
    <circle cx="36" cy="36" r="12" fill="${C.tealSoft}"/>
    <path d="M56 30 H92 M56 42 H82" stroke-width="3"/>
    <path d="M26 66 H112 M26 80 H104 M26 94 H112 M26 108 H92 M26 122 H80 M26 136 H70" stroke="${C.tealLine}" stroke-width="3"/>
    <circle cx="104" cy="132" r="24" fill="${C.mustard}"/>
    ${txt(104, 141, 28, 'A+')}
  `),

  envelope: svg('0 0 160 112', `
    <rect x="8" y="12" width="144" height="92" rx="8" fill="${C.card}"/>
    <path d="M8 100 L64 56 M152 100 L96 56" stroke-width="1.6"/>
    <path d="M10 18 L80 66 L150 18" stroke-width="2.4"/>
    <rect x="118" y="22" width="24" height="28" rx="2" fill="${C.tealSoft}" stroke-dasharray="3 3" stroke-width="2"/>
    <circle cx="80" cy="66" r="10" fill="${C.clay}"/>
  `),

  pizza: svg('0 0 132 132', `
    <path d="M18 26 C 50 8, 90 10, 118 30 L66 124 Z" fill="${C.mustard}"/>
    <path d="M18 26 C 50 8, 90 10, 118 30 L112 40 C 86 22, 50 22, 24 36 Z" fill="#c98a4b"/>
    <circle cx="54" cy="52" r="8" fill="${C.red}"/>
    <circle cx="84" cy="54" r="7" fill="${C.red}"/>
    <circle cx="68" cy="84" r="6" fill="${C.red}"/>
    <path d="M44 72 q3 10 -2 16" stroke="${C.mustard}" stroke-width="4"/>
  `),

  arrow: svg('0 0 150 72', `
    <path d="M8 52 C 30 20, 60 62, 90 38 C 110 22, 124 28, 140 32" stroke-width="2.6"/>
    <path d="M126 20 L142 32 L124 42" stroke-width="2.6"/>
  `),

  arrowUp: svg('0 0 90 110', `
    <path d="M70 102 C 30 96, 20 60, 44 36 C 52 28, 56 22, 54 10" stroke-width="2.6"/>
    <path d="M42 20 L54 8 L64 22" stroke-width="2.6"/>
  `),

  sparkle: (fill = C.mustard) => svg('0 0 40 40', star(20, 20, 18, fill)),
};

// e = distance (px) from page center to the doodle's inner edge
// t = px from the top of the section, w = width, r = rotation
// tier "near" shows on screens 1360px and wider, "far" on 1700px and wider
const LAYOUT = [
  { sel: 'section.hero', items: [
    { s: 'notebook', side: 'l', e: 500, t: 168, w: 165, r: -7, tier: 'near', a: 'bob' },
    { s: 'pencil', side: 'l', e: 486, t: 430, w: 160, r: 16, tier: 'near' },
    { s: 'arrow', side: 'l', e: 466, t: 604, w: 128, r: 0, tier: 'near', labelTop: 'only takes 5 min!' },
    { s: 'plane', side: 'l', e: 650, t: 110, w: 190, r: -6, tier: 'far', a: 'drift' },
    { s: 'sparkle', side: 'l', e: 700, t: 380, w: 30, tier: 'far', a: 'twinkle' },
    { text: 'git push', side: 'l', e: 640, t: 820, r: -8, tier: 'far' },
    { s: 'laptop', side: 'r', e: 490, t: 190, w: 175, r: 5, tier: 'near', a: 'bob' },
    { s: 'mug', side: 'r', e: 560, t: 390, w: 92, r: -5, tier: 'near' },
    { s: 'paper', side: 'r', e: 500, t: 570, w: 70, r: 0, tier: 'near' },
    { s: 'paper', side: 'r', e: 590, t: 622, w: 52, r: 40, tier: 'near' },
    { text: 'SELECT * FROM wins;', side: 'r', e: 480, t: 740, r: -5, tier: 'near' },
    { s: 'sparkle', side: 'r', e: 720, t: 150, w: 30, tier: 'far', a: 'twinkle', color: C.teal },
    { s: 'sparkle', side: 'r', e: 790, t: 520, w: 22, tier: 'far', a: 'twinkle' },
    { text: 'O(1)', side: 'r', e: 690, t: 330, r: 8, tier: 'far' },
  ]},
  { sel: '#challenges', cell: true, items: [
    { s: 'duck', side: 'l', e: 430, t: 110, w: 120, r: -6, tier: 'near', label: 'debug buddy', a: 'bob' },
    { s: 'keys', side: 'r', e: 420, t: 132, w: 150, r: 5, tier: 'near', label: 'one bad round? undo.' },
    { s: 'sticky', args: ['O(n²)', 'O(n log n)', true], side: 'l', e: 560, t: 430, w: 100, r: -8, tier: 'near' },
    { s: 'sparkle', side: 'l', e: 580, t: 900, w: 28, tier: 'near', a: 'twinkle', color: C.clay },
    { text: '{ }', side: 'l', e: 575, t: 1010, r: -6, tier: 'near' },
    { s: 'bulb', side: 'r', e: 570, t: 470, w: 85, r: 8, tier: 'near', a: 'glow' },
    { s: 'sparkle', side: 'r', e: 590, t: 380, w: 24, tier: 'near', a: 'twinkle', color: C.teal },
    { text: 'while (!hired) grind();', side: 'r', e: 600, t: 880, r: -4, tier: 'far' },
    { s: 'paper', side: 'l', e: 700, t: 640, w: 60, r: 20, tier: 'far' },
    { s: 'pencil', side: 'l', e: 640, t: 300, w: 150, r: -30, tier: 'far' },
    { s: 'mug', side: 'r', e: 700, t: 620, w: 80, r: 6, tier: 'far' },
  ]},
  { sel: '#timeline', items: [
    { s: 'sparkle', side: 'l', e: 280, t: 110, w: 26, tier: 'near', a: 'twinkle' },
    { s: 'sparkle', side: 'r', e: 280, t: 130, w: 20, tier: 'near', a: 'twinkle', color: C.teal },
    { s: 'calendar', side: 'l', e: 450, t: 250, w: 115, r: -6, tier: 'near', label: 'kickoff!' },
    { s: 'clock', side: 'l', e: 460, t: 640, w: 95, r: 6, tier: 'near', a: 'ring' },
    { s: 'pizza', side: 'l', e: 450, t: 1030, w: 105, r: -8, tier: 'near', label: 'hackathon fuel' },
    { s: 'rocket', side: 'r', e: 460, t: 280, w: 90, r: 14, tier: 'near', label: 'ship it', a: 'bob' },
    { s: 'sticky', args: ['teams lock', 'after kickoff!', false], side: 'r', e: 450, t: 660, w: 118, r: 5, tier: 'near' },
    { s: 'paper', side: 'r', e: 470, t: 1070, w: 62, r: 0, tier: 'near' },
    { text: 'final_v2_FINAL.js', side: 'r', e: 450, t: 1160, r: -4, tier: 'near' },
    { s: 'sparkle', side: 'l', e: 640, t: 420, w: 26, tier: 'far', a: 'twinkle', color: C.clay },
    { text: "git commit -m 'wip'", side: 'l', e: 600, t: 880, r: 5, tier: 'far' },
    { s: 'sparkle', side: 'r', e: 660, t: 520, w: 28, tier: 'far', a: 'twinkle' },
    { s: 'sparkle', side: 'r', e: 720, t: 960, w: 20, tier: 'far', a: 'twinkle', color: C.teal },
    { s: 'plane', side: 'l', e: 620, t: 200, w: 170, r: -4, tier: 'far', a: 'drift' },
    { s: 'laptop', side: 'r', e: 640, t: 820, w: 150, r: -6, tier: 'far' },
    { s: 'duck', side: 'l', e: 640, t: 1150, w: 100, r: 4, tier: 'far', a: 'bob' },
  ]},
  { sel: '#partners', items: [
    { s: 'nametag', side: 'l', e: 420, t: 110, w: 150, r: -8, tier: 'near', a: 'bob' },
    { s: 'bubbles', side: 'r', e: 420, t: 118, w: 140, r: 4, tier: 'near' },
    { s: 'sparkle', side: 'l', e: 570, t: 420, w: 26, tier: 'near', a: 'twinkle', color: C.teal },
    { s: 'sparkle', side: 'r', e: 575, t: 500, w: 22, tier: 'near', a: 'twinkle' },
    { text: '4 orgs, 1 league', side: 'l', e: 640, t: 430, r: -5, tier: 'far' },
    { s: 'mug', side: 'r', e: 680, t: 330, w: 76, r: -6, tier: 'far' },
  ]},
  { sel: 'section.section:last-of-type', items: [
    { s: 'resume', side: 'l', e: 430, t: 150, w: 120, r: -7, tier: 'near', a: 'bob' },
    { s: 'sparkle', side: 'l', e: 450, t: 470, w: 28, tier: 'near', a: 'twinkle', color: C.clay },
    { s: 'envelope', side: 'r', e: 420, t: 160, w: 140, r: 6, tier: 'near', label: 'check your inbox' },
    { s: 'plane', side: 'r', e: 440, t: 380, w: 170, r: -8, tier: 'near', a: 'drift' },
    { s: 'sparkle', side: 'r', e: 680, t: 120, w: 24, tier: 'far', a: 'twinkle', color: C.teal },
    { s: 'pencil', side: 'l', e: 640, t: 300, w: 150, r: -20, tier: 'far' },
  ]},
];

const FILTER = `<svg class="tl-defs" width="0" height="0" aria-hidden="true" focusable="false"><filter id="tl-wobble" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="2.4" xChannelSelector="R" yChannelSelector="G"/></filter></svg>`;

function art(it) {
  if (it.s === 'sparkle') return SVGS.sparkle(it.color);
  if (it.s === 'sticky') return SVGS.sticky(...it.args);
  return SVGS[it.s];
}

function doodleEl(it) {
  const d = document.createElement('div');
  d.className = `tl-d ${it.side} ${it.tier}`;
  d.style.setProperty('--e', `${it.e}px`);
  d.style.setProperty('--t', `${it.t}px`);
  d.style.setProperty('--r', `${it.r || 0}deg`);
  if (it.w) d.style.setProperty('--w', `${it.w}px`);
  if (it.text) {
    d.innerHTML = `<div class="tl-in tl-scribble">${it.text}</div>`;
  } else {
    d.innerHTML = `<div class="tl-in ${it.a ? 'tl-a-' + it.a : ''}">${it.labelTop ? `<div class="tl-label">${it.labelTop}</div>` : ''}${art(it)}${it.label ? `<div class="tl-label">${it.label}</div>` : ''}</div>`;
  }
  return d;
}

function cellEl() {
  const c = document.createElement('div');
  c.className = 'tl-cell';
  c.setAttribute('aria-hidden', 'true');
  c.innerHTML = `
    <div class="tl-cell-in">
      <span class="tl-cell-sp s1">${SVGS.sparkle()}</span>
      <span class="tl-cell-sp s2">${SVGS.sparkle(C.teal)}</span>
      <span class="tl-cell-sp s3">${SVGS.sparkle(C.clay)}</span>
      <div class="tl-cell-trophy tl-a-bob">${SVGS.trophy}</div>
      <div class="tl-cell-note">top of the board?</div>
      <div class="tl-cell-arrow">${SVGS.arrowUp}</div>
      <div class="tl-cell-sub">that could be your team on Dec 4</div>
    </div>`;
  return c;
}

export function mountDoodles() {
  if (document.querySelector('.tl-defs')) return () => {};
  const made = [];
  const defs = document.createElement('div');
  defs.innerHTML = FILTER;
  const defsSvg = defs.firstChild;
  document.body.appendChild(defsSvg);
  made.push(defsSvg);

  for (const sec of LAYOUT) {
    const host = document.querySelector(sec.sel);
    if (!host) continue;
    const layer = document.createElement('div');
    layer.className = 'tl-layer';
    layer.setAttribute('aria-hidden', 'true');
    sec.items.forEach(it => layer.appendChild(doodleEl(it)));
    host.appendChild(layer);
    made.push(layer);
    if (sec.cell) {
      const grid = host.querySelector('.challenges__grid');
      if (grid) { const c = cellEl(); grid.appendChild(c); made.push(c); }
    }
  }
  return () => made.forEach(n => n.remove());
}
