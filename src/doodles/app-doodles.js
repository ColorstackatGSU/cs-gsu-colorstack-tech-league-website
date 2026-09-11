// Tech League app doodles (dashboard + application form).
// A different set of hand drawn objects from the homepage. Nothing in your existing markup changes.
// Call startAppDoodles() once (in App.jsx). It watches the page and swaps doodles when the
// route or the application step changes.

const INK = '#33302b';
const C = {
  soft: '#5c574f', light: '#8a8378', card: '#fffdf8', deep: '#ede4d3', teal: '#4fb3a5',
  tealDeep: '#2f8478', tealSoft: '#dcf0ec', tealLine: '#a8d9d1', tealMid: '#7cc8bc',
  clay: '#e08a5f', claySoft: '#fbe7dc', mustard: '#e3b23c', mustardSoft: '#faf0d7',
  manila: '#efd08a', wood: '#c98a4b', metal: '#bdb6aa', red: '#d2604f', navy: '#1f3f99', cap: '#3f3b35',
};
const QS = 'Quicksand, system-ui, sans-serif';

const svg = (vb, inner) =>
  `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
const txt = (x, y, size, s, fill = INK, anchor = 'middle', fam = 'Caveat, cursive', w = 700) =>
  `<text x="${x}" y="${y}" font-family="${fam}" font-weight="${w}" font-size="${size}" text-anchor="${anchor}" fill="${fill}" stroke="none">${s}</text>`;
const star = (cx, cy, r, fill) => {
  const k = r * 0.28;
  return `<path d="M${cx} ${cy - r} C${cx + k} ${cy - k} ${cx + k} ${cy - k} ${cx + r} ${cy} C${cx + k} ${cy + k} ${cx + k} ${cy + k} ${cx} ${cy + r} C${cx - k} ${cy + k} ${cx - k} ${cy + k} ${cx - r} ${cy} C${cx - k} ${cy - k} ${cx - k} ${cy - k} ${cx} ${cy - r} Z" fill="${fill}"/>`;
};
const face = (cx, cy) =>
  `<circle cx="${cx - 5}" cy="${cy - 2}" r="1.8" fill="${INK}" stroke="none"/><circle cx="${cx + 5}" cy="${cy - 2}" r="1.8" fill="${INK}" stroke="none"/><path d="M${cx - 5} ${cy + 5} q5 4 10 0" stroke-width="2"/>`;

const ART = {
  plant: svg('0 0 120 150', `
    <path d="M60 86 C 40 70, 24 44, 34 20 C 52 32, 62 58, 60 86 Z" fill="${C.teal}"/>
    <path d="M60 86 C 74 62, 92 46, 110 48 C 106 70, 84 84, 60 86 Z" fill="${C.tealMid}"/>
    <path d="M60 86 C 50 68, 50 38, 62 10 C 76 36, 72 64, 60 86 Z" fill="${C.tealDeep}"/>
    <path d="M60 84 C 58 60, 60 36, 62 16" stroke-width="1.4"/>
    <path d="M30 88 H90 L84 140 H36 Z" fill="${C.clay}"/>
    <path d="M24 80 H96 V94 H24 Z" fill="#eaa27d"/>
    ${face(60, 114)}
  `),

  headphones: svg('0 0 130 120', `
    <path d="M22 72 C 22 18, 108 18, 108 72" stroke-width="10"/>
    <path d="M22 72 C 22 18, 108 18, 108 72" stroke="${C.teal}" stroke-width="4"/>
    <rect x="10" y="62" width="28" height="46" rx="11" fill="${C.clay}"/>
    <rect x="92" y="62" width="28" height="46" rx="11" fill="${C.clay}"/>
    <rect x="34" y="70" width="9" height="30" rx="4" fill="${C.deep}"/>
    <rect x="87" y="70" width="9" height="30" rx="4" fill="${C.deep}"/>
    ${txt(65, 62, 26, '♪', C.mustard)}${txt(80, 44, 18, '♫', C.tealDeep)}
  `),

  books: svg('0 0 150 124', `
    <circle cx="62" cy="22" r="12" fill="${C.red}"/>
    <path d="M62 10 C 62 6, 64 4, 66 2" stroke-width="2"/>
    <path d="M64 8 C 70 2, 78 6, 74 10 C 70 12, 66 10, 64 8 Z" fill="${C.teal}" stroke-width="1.6"/>
    <rect x="16" y="34" width="118" height="26" rx="3" fill="${C.mustard}"/>
    ${txt(75, 52, 13, 'OOP', INK, 'middle', QS, 700)}
    <rect x="24" y="60" width="112" height="26" rx="3" fill="${C.clay}"/>
    ${txt(80, 78, 13, 'SQL', C.card, 'middle', QS, 700)}
    <rect x="10" y="86" width="130" height="28" rx="3" fill="${C.teal}"/>
    ${txt(75, 105, 13, 'DSA', C.card, 'middle', QS, 700)}
    <path d="M26 34 V60 M32 34 V60 M36 60 V86 M42 60 V86 M22 86 V114 M28 86 V114" stroke-width="1.4"/>
  `),

  hourglass: svg('0 0 90 132', `
    <path d="M20 20 C 20 50, 42 56, 42 66 C 42 76, 20 82, 20 112 H70 C 70 82, 48 76, 48 66 C 48 56, 70 50, 70 20 Z" fill="${C.card}"/>
    <path d="M28 34 C 34 48, 42 54, 45 60 C 48 54, 56 48, 62 34 Z" fill="${C.mustard}" stroke="none"/>
    <path d="M26 110 C 30 94, 40 90, 45 88 C 50 90, 60 94, 64 110 Z" fill="${C.mustard}" stroke="none"/>
    <path class="tla-sand" d="M45 62 V88" stroke="${C.mustard}" stroke-width="2.4" stroke-dasharray="2 4"/>
    <rect x="10" y="8" width="70" height="12" rx="4" fill="${C.clay}"/>
    <rect x="10" y="112" width="70" height="12" rx="4" fill="${C.clay}"/>
  `),

  magnifier: svg('0 0 130 130', `
    <path d="M80 72 L122 114 L114 122 L72 80 Z" fill="${C.wood}"/>
    <circle cx="52" cy="52" r="40" fill="${C.deep}"/>
    <circle cx="52" cy="52" r="31" fill="${C.tealSoft}"/>
    <path d="M36 46 H68 M36 56 H62 M36 66 H56" stroke="${C.tealDeep}" stroke-width="3"/>
    <path d="M30 36 C 34 28, 42 24, 50 23" stroke="${C.card}" stroke-width="4"/>
  `),

  folder: svg('0 0 150 120', `
    <path d="M10 22 C10 18 13 16 16 16 H56 L66 26 H134 C138 26 140 28 140 32 V106 H10 Z" fill="${C.manila}"/>
    <path d="M26 10 H112 V84 H26 Z" fill="${C.card}"/>
    <path d="M36 24 H92 M36 36 H100 M36 48 H80" stroke="${C.tealLine}" stroke-width="3"/>
    <path d="M10 46 H140 L134 110 H16 Z" fill="${C.mustard}"/>
    <rect x="40" y="64" width="70" height="24" rx="3" fill="${C.card}"/>
    ${txt(75, 81, 17, 'resume.pdf')}
  `),

  paperclip: svg('0 0 50 124', `
    <path d="M30 32 V94 C30 106 16 106 16 94 V24 C16 8 40 8 40 24 V98 C40 118 8 118 8 98 V42" stroke="${C.light}" stroke-width="4"/>
  `),

  highlighter: svg('0 0 200 72', `
    <path d="M12 60 C 60 54, 110 62, 176 56" stroke="${C.mustard}" stroke-width="13" opacity=".45"/>
    <path d="M40 14 H150 C156 14 158 18 158 22 V38 C158 42 156 46 150 46 H40 Z" fill="${C.card}"/>
    <path d="M60 24 H120 M60 32 H100" stroke-width="2"/>
    <path d="M18 14 H40 V46 H18 C12 46 10 42 10 38 V22 C10 18 12 14 18 14 Z" fill="${C.mustard}"/>
    <path d="M22 14 V6 H34 V14" stroke-width="2.2"/>
    <path d="M158 22 L182 26 V34 L158 38 Z" fill="${C.mustard}"/>
  `),

  ruler: svg('0 0 200 44', `
    <rect x="4" y="8" width="192" height="28" rx="4" fill="${C.mustard}"/>
    ${Array.from({ length: 18 }, (_, i) => `<path d="M${14 + i * 10} 8 V${i % 5 === 0 ? 24 : 16}" stroke-width="1.6"/>`).join('')}
    ${txt(170, 30, 12, 'cm', INK, 'middle', QS, 700)}
  `),

  gradcap: svg('0 0 150 124', `
    <path d="M40 52 V80 C40 94 110 94 110 80 V52 L75 66 Z" fill="${C.cap}"/>
    <path d="M75 12 L140 38 L75 64 L10 38 Z" fill="${C.cap}"/>
    <path d="M75 38 C 100 44, 120 48, 122 58 V86" stroke="${C.mustard}" stroke-width="3"/>
    <path d="M116 86 H128 L126 108 H118 Z" fill="${C.mustard}"/>
    <circle cx="75" cy="38" r="4.5" fill="${C.mustard}"/>
  `),

  backpack: svg('0 0 120 150', `
    <path d="M44 22 C44 6 76 6 76 22" stroke-width="4"/>
    <path d="M22 40 C22 26 34 20 60 20 C86 20 98 26 98 40 V132 C98 138 94 142 88 142 H32 C26 142 22 138 22 132 Z" fill="${C.teal}"/>
    <path d="M22 48 C 40 62, 80 62, 98 48" stroke-width="2.4"/>
    <rect x="34" y="84" width="52" height="44" rx="9" fill="${C.tealMid}"/>
    <path d="M40 97 H80" stroke-width="2"/>
    <circle cx="72" cy="97" r="3.5" fill="${C.mustard}"/>
    ${star(52, 114, 8, C.mustard)}
  `),

  thought: svg('0 0 172 132', `
    <path d="M40 78 C 18 78, 14 52, 34 46 C 30 24, 58 16, 70 30 C 80 12, 112 14, 116 34 C 140 28, 158 46, 146 64 C 160 80, 140 98, 122 90 C 114 106, 84 106, 76 92 C 64 102, 40 98, 40 78 Z" fill="${C.card}"/>
    <circle cx="36" cy="104" r="7" fill="${C.card}"/>
    <circle cx="22" cy="120" r="4" fill="${C.card}"/>
    ${txt(94, 68, 30, 'hmm...')}
  `),

  pen: svg('0 0 200 40', `
    <rect x="4" y="15" width="14" height="10" rx="2" fill="${C.deep}"/>
    <path d="M18 10 H130 V30 H18 Z" fill="${C.teal}"/>
    <path d="M30 10 V4 H96 V10" stroke-width="2.2"/>
    <path d="M130 12 H160 V28 H130 Z" fill="${C.tealDeep}"/>
    <path d="M138 12 V28 M146 12 V28 M154 12 V28" stroke-width="1.2"/>
    <path d="M160 12 L186 20 L160 28 Z" fill="${C.card}"/>
    <path d="M182 18.6 L193 20 L182 21.4 Z" fill="${INK}"/>
  `),

  team: svg('0 0 180 120', `
    <path d="M20 114 C20 84 60 84 60 114 Z" fill="${C.clay}"/>
    <path d="M70 114 C70 78 110 78 110 114 Z" fill="${C.teal}"/>
    <path d="M120 114 C120 84 160 84 160 114 Z" fill="${C.mustard}"/>
    <path d="M54 98 C 60 93, 68 93, 76 98 M104 98 C 112 93, 120 93, 126 98" stroke-width="3"/>
    <circle cx="40" cy="66" r="16" fill="${C.card}"/>${face(40, 66)}
    <circle cx="90" cy="58" r="18" fill="${C.card}"/>${face(90, 58)}
    <circle cx="140" cy="66" r="16" fill="${C.card}"/>${face(140, 66)}
  `),

  stamp: svg('0 0 150 150', `
    <g transform="rotate(-10 75 112)">
      <rect x="18" y="92" width="114" height="40" rx="6" stroke="${C.clay}" stroke-width="3"/>
      ${txt(75, 119, 21, 'RECEIVED', C.clay, 'middle', QS, 700)}
    </g>
    <circle cx="75" cy="18" r="12" fill="${C.clay}"/>
    <path d="M68 28 H82 V48 H68 Z" fill="${C.wood}"/>
    <path d="M44 48 H106 V60 H44 Z" fill="${C.soft}"/>
    <path d="M48 60 H102 V68 H48 Z" fill="${C.clay}"/>
  `),

  mailbox: svg('0 0 140 162', `
    <rect x="62" y="82" width="14" height="72" fill="${C.wood}"/>
    <path d="M36 154 q10 -10 20 0 q10 -10 20 0 q10 -10 20 0 q10 -10 20 0" stroke="${C.teal}"/>
    <path d="M20 44 C20 24 34 14 60 14 H100 C114 14 124 24 124 44 V84 H20 Z" fill="${C.teal}"/>
    <path d="M20 44 C20 28 28 20 40 20 C52 20 60 28 60 44 V84 H20 Z" fill="${C.tealDeep}"/>
    <path d="M26 42 L50 36 L53 50 L29 56 Z" fill="${C.card}"/>
    <path d="M108 66 V24" stroke-width="3"/>
    <path d="M108 24 H132 L126 32 L132 40 H108 Z" fill="${C.clay}"/>
  `),

  noodles: svg('0 0 120 152', `
    <g class="tla-steam"><path d="M44 40 c-9 -8 9 -14 0 -24" stroke="${C.light}" stroke-width="2.2"/><path d="M64 36 c-9 -8 9 -14 0 -24" stroke="${C.light}" stroke-width="2.2"/></g>
    <path d="M84 8 L52 72 M96 12 L62 74" stroke="${C.wood}" stroke-width="4"/>
    <path d="M32 60 C 36 50, 42 66, 46 54 C 50 44, 56 62, 62 52 C 66 44, 72 60, 84 52" stroke="${C.mustard}" stroke-width="3"/>
    <path d="M22 62 H98 L88 142 H32 Z" fill="${C.card}"/>
    <path d="M24 78 H96 L93 100 H27 Z" fill="${C.clay}"/>
    ${txt(60, 94, 14, 'RAMEN', C.card, 'middle', QS, 700)}
    <path d="M18 56 H102 V64 H18 Z" fill="${C.deep}"/>
  `),

  flag: svg('0 0 120 152', `
    <defs><clipPath id="tla-flagclip"><path d="M24 14 C 50 4, 70 24, 104 14 V64 C 70 74, 50 54, 24 64 Z"/></clipPath></defs>
    <path d="M24 14 C 50 4, 70 24, 104 14 V64 C 70 74, 50 54, 24 64 Z" fill="${C.card}"/>
    <g clip-path="url(#tla-flagclip)" fill="${INK}" stroke="none">
      <rect x="24" y="0" width="20" height="28"/><rect x="64" y="0" width="20" height="28"/>
      <rect x="44" y="28" width="20" height="24"/><rect x="84" y="28" width="20" height="24"/>
      <rect x="24" y="52" width="20" height="24"/><rect x="64" y="52" width="20" height="24"/>
    </g>
    <path d="M24 14 C 50 4, 70 24, 104 14 V64 C 70 74, 50 54, 24 64 Z"/>
    <path d="M24 8 V146" stroke-width="4"/>
    <circle cx="24" cy="6" r="4.5" fill="${C.mustard}"/>
  `),

  eraser: svg('0 0 140 92', `
    <path d="M8 80 C 30 76, 60 82, 92 78" stroke="${C.light}" stroke-width="2" stroke-dasharray="2 6"/>
    <rect x="14" y="26" width="98" height="38" rx="9" fill="${C.claySoft}"/>
    <path d="M54 26 H103 C108 26 112 30 112 35 V55 C112 60 108 64 103 64 H54 Z" fill="${C.teal}"/>
    ${txt(83, 51, 18, 'oops', C.card)}
    <path d="M118 72 c4 -5 9 0 4 4 M128 62 c3 -4 7 0 3 3 M122 82 c3 -3 6 0 3 3" stroke-width="2"/>
  `),

  clipboard: svg('0 0 130 170', `
    <rect x="10" y="18" width="110" height="146" rx="10" fill="${C.wood}"/>
    <rect x="22" y="32" width="86" height="122" rx="4" fill="${C.card}"/>
    <path d="M44 10 H86 V32 H44 Z" fill="${C.metal}"/>
    <circle cx="65" cy="19" r="4" fill="${C.card}"/>
    ${[56, 80, 104, 128].map((y, i) => `<rect x="32" y="${y - 6}" width="11" height="11" rx="2" stroke-width="2"/><path d="M52 ${y} H${i % 2 ? 86 : 96}" stroke="${C.tealLine}" stroke-width="3"/>${i < 3 ? `<path d="M30 ${y - 3} l6 7 l11 -14" stroke="${C.tealDeep}" stroke-width="3"/>` : ''}`).join('')}
  `),

  floppy: svg('0 0 110 110', `
    <path d="M10 14 C10 11 12 10 14 10 H84 L100 26 V96 C100 99 98 100 96 100 H14 C12 100 10 99 10 96 Z" fill="${C.teal}"/>
    <rect x="28" y="10" width="46" height="30" fill="${C.metal}"/>
    <rect x="58" y="16" width="10" height="18" fill="${C.teal}"/>
    <rect x="22" y="56" width="66" height="36" rx="3" fill="${C.card}"/>
    ${txt(55, 80, 18, 'draft_v1')}
  `),

  idcard: svg('0 0 170 124', `
    <rect x="8" y="16" width="154" height="100" rx="12" fill="${C.card}"/>
    <path d="M8 28 C8 21 13 16 20 16 H150 C157 16 162 21 162 28 V42 H8 Z" fill="${C.navy}"/>
    ${txt(85, 34, 12, 'STUDENT ID', C.card, 'middle', QS, 700)}
    <rect x="20" y="54" width="44" height="50" rx="6" fill="${C.tealSoft}"/>
    <circle cx="42" cy="72" r="9" fill="${C.card}"/>
    <path d="M28 102 C 28 86, 56 86, 56 102" fill="${C.card}"/>
    <path d="M76 62 H146 M76 76 H130 M76 90 H140" stroke="${C.tealLine}" stroke-width="3"/>
    <rect x="72" y="4" width="26" height="8" rx="4" fill="${C.deep}"/>
  `),

  popper: svg('0 0 150 150', `
    <g class="tla-burst">
      <rect x="90" y="28" width="8" height="14" fill="${C.clay}" transform="rotate(20 94 35)"/>
      <circle cx="112" cy="60" r="5" fill="${C.teal}"/>
      <circle cx="70" cy="24" r="4" fill="${C.clay}"/>
      <path d="M104 88 c6 -6 12 0 18 -6" stroke="${C.teal}" stroke-width="3"/>
      <path d="M122 28 l6 10" stroke="${C.mustard}" stroke-width="3"/>
      ${star(130, 72, 8, C.mustard)}${star(84, 50, 6, C.teal)}
    </g>
    <path d="M20 134 L50 60 L92 102 Z" fill="${C.mustard}"/>
    <path d="M40 96 L66 118 M30 116 L46 128 M46 78 L78 104" stroke-width="2"/>
  `),

  wingmail: svg('0 0 180 120', `
    <path d="M8 56 H30 M4 70 H26 M12 84 H32" stroke="${C.light}" stroke-width="2"/>
    <path d="M60 40 C 44 18, 22 16, 12 26 C 24 30, 30 36, 40 44 C 28 44, 20 48, 16 56 C 34 56, 46 54, 60 52 Z" fill="${C.card}"/>
    <path d="M122 40 C 138 18, 160 16, 170 26 C 158 30, 152 36, 142 44 C 154 44, 162 48, 166 56 C 148 56, 136 54, 122 52 Z" fill="${C.card}"/>
    <rect x="48" y="36" width="86" height="60" rx="6" fill="${C.card}"/>
    <path d="M50 40 L91 70 L132 40" stroke-width="2.4"/>
    <circle cx="91" cy="70" r="7" fill="${C.clay}"/>
  `),

  loopArrow: svg('0 0 140 90', `
    <path d="M132 20 C 110 10, 96 30, 108 42 C 120 54, 132 36, 112 30 C 86 22, 60 60, 20 64" stroke-width="2.6"/>
    <path d="M32 52 L18 64 L34 74" stroke-width="2.6"/>
  `),

  sticky: (l1, l2) => svg('0 0 130 130', `
    <path d="M10 16 H120 V100 L96 124 H10 Z" fill="${C.mustard}"/>
    <path d="M120 100 H96 V124 Z" fill="#c9982a"/>
    <rect x="40" y="4" width="50" height="18" fill="${C.tealLine}" opacity=".8" stroke="none" transform="rotate(-5 65 13)"/>
    ${txt(65, 62, 24, l1)}${txt(63, 94, 24, l2)}
  `),

  sparkle: (fill = C.mustard) => svg('0 0 40 40', star(20, 20, 18, fill)),
};

// e = px from page center to the doodle's inner edge, t = px from the top of the page
// w = width, r = rotation. tier: "mid" 1200px+, "near" 1360px+, "far" 1700px+
// when = only show if this selector exists on the page
const APPLY_COMMON = [
  { s: 'clipboard', side: 'l', e: 400, t: 150, w: 115, r: -6, tier: 'mid', a: 'bob' },
  { s: 'pen', side: 'r', e: 390, t: 230, w: 150, r: -28, tier: 'mid' },
  { s: 'floppy', side: 'l', e: 410, t: 900, w: 85, r: -8, tier: 'mid', label: 'save your draft' },
  { s: 'sparkle', side: 'r', e: 640, t: 150, w: 26, tier: 'far', a: 'twinkle', color: C.teal },
  { s: 'sparkle', side: 'l', e: 660, t: 700, w: 30, tier: 'far', a: 'twinkle' },
  { s: 'sparkle', side: 'r', e: 700, t: 980, w: 22, tier: 'far', a: 'twinkle', color: C.clay },
];

const SCENES = {
  dashboard: { host: '.dash', items: [
    { s: 'plant', side: 'l', e: 570, t: 120, w: 95, r: -4, tier: 'near', a: 'bob' },
    { s: 'stamp', side: 'r', e: 565, t: 250, w: 110, r: 8, tier: 'near' },
    { s: 'folder', side: 'l', e: 565, t: 450, w: 120, r: -8, tier: 'near', label: 'pdf only!' },
    { s: 'paperclip', side: 'l', e: 600, t: 690, w: 40, r: 20, tier: 'near' },
    { s: 'magnifier', side: 'r', e: 570, t: 460, w: 95, r: 8, tier: 'near', label: 'under review' },
    { s: 'mailbox', side: 'r', e: 565, t: 690, w: 105, r: -3, tier: 'near', label: 'decision lands here' },
    { s: 'noodles', side: 'l', e: 575, t: 930, w: 95, r: -6, tier: 'near', label: 'late night fuel' },
    { s: 'headphones', side: 'r', e: 575, t: 980, w: 100, r: 8, tier: 'near', a: 'bob' },
    { s: 'ruler', side: 'l', e: 700, t: 330, w: 150, r: -70, tier: 'far' },
    { s: 'highlighter', side: 'l', e: 700, t: 800, w: 140, r: -20, tier: 'far' },
    { s: 'books', side: 'r', e: 700, t: 830, w: 120, r: 3, tier: 'far' },
    { s: 'sparkle', side: 'r', e: 760, t: 440, w: 28, tier: 'far', a: 'twinkle', color: C.teal },
    { s: 'sparkle', side: 'l', e: 760, t: 150, w: 24, tier: 'far', a: 'twinkle' },
  ]},
  'apply-1': { host: '.apply', items: [...APPLY_COMMON,
    { s: 'idcard', side: 'r', e: 400, t: 520, w: 150, r: 6, tier: 'mid', label: 'use your GSU email' },
    { s: 'sticky', args: ['nice to', 'meet you!'], side: 'l', e: 420, t: 560, w: 115, r: -6, tier: 'mid' },
  ]},
  'apply-2': { host: '.apply', items: [...APPLY_COMMON,
    { s: 'gradcap', side: 'r', e: 400, t: 500, w: 140, r: 8, tier: 'mid', label: 'future grad', a: 'bob' },
    { s: 'backpack', side: 'l', e: 420, t: 540, w: 100, r: -5, tier: 'mid' },
    { s: 'ruler', side: 'r', e: 620, t: 760, w: 150, r: -12, tier: 'far' },
  ]},
  'apply-3': { host: '.apply', items: [...APPLY_COMMON,
    { s: 'thought', side: 'r', e: 390, t: 470, w: 150, r: 3, tier: 'mid', a: 'bob' },
    { s: 'eraser', side: 'l', e: 420, t: 620, w: 115, r: -8, tier: 'mid', label: 'first drafts are fine' },
    { s: 'sticky', args: ['be honest', ':)'], side: 'r', e: 420, t: 800, w: 115, r: 5, tier: 'mid' },
  ]},
  'apply-4': { host: '.apply', items: [...APPLY_COMMON,
    { s: 'flag', side: 'r', e: 410, t: 440, w: 100, r: 8, tier: 'mid', label: 'almost there!' },
    { s: 'team', side: 'l', e: 400, t: 540, w: 150, r: -4, tier: 'mid', label: 'squad up' },
    { s: 'hourglass', side: 'r', e: 430, t: 760, w: 70, r: -6, tier: 'mid', label: 'be realistic' },
  ]},
  'apply-done': { host: '.apply', items: [
    { s: 'popper', side: 'l', e: 400, t: 170, w: 140, r: -8, tier: 'mid', label: 'you did it!' },
    { s: 'wingmail', side: 'r', e: 390, t: 200, w: 160, r: 6, tier: 'mid', label: 'sent to e-board', a: 'drift' },
    { s: 'loopArrow', side: 'r', e: 345, t: 715, w: 125, r: 0, tier: 'mid', labelTop: 'add your resume!', when: '.status-msg--error' },
    { s: 'sparkle', side: 'l', e: 620, t: 420, w: 30, tier: 'far', a: 'twinkle', color: C.teal },
    { s: 'sparkle', side: 'r', e: 640, t: 520, w: 24, tier: 'far', a: 'twinkle' },
    { s: 'sparkle', side: 'l', e: 560, t: 760, w: 22, tier: 'far', a: 'twinkle', color: C.clay },
  ]},
};

function detectScene() {
  if (document.querySelector('.dash')) return 'dashboard';
  const apply = document.querySelector('.apply');
  if (!apply) return null;
  if (apply.querySelector('.apply__done')) return 'apply-done';
  const items = [...apply.querySelectorAll('.apply__rail-item')];
  const i = items.findIndex(li => li.classList.contains('is-current'));
  return i >= 0 ? `apply-${i + 1}` : null;
}

function art(it) {
  if (it.s === 'sparkle') return ART.sparkle(it.color);
  if (it.s === 'sticky') return ART.sticky(...it.args);
  return ART[it.s];
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
    d.style.setProperty('--r', `${it.r || 0}deg`);
    d.style.setProperty('--w', `${it.w}px`);
    d.innerHTML = `<div class="tla-in ${it.a ? 'tla-a-' + it.a : ''}">${it.labelTop ? `<div class="tla-label">${it.labelTop}</div>` : ''}${art(it)}${it.label ? `<div class="tla-label">${it.label}</div>` : ''}</div>`;
    layer.appendChild(d);
  }
  return layer;
}

const FILTER = `<svg class="tla-defs" width="0" height="0" aria-hidden="true" focusable="false"><filter id="tla-wobble" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="11" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="2.4" xChannelSelector="R" yChannelSelector="G"/></filter></svg>`;

export function startAppDoodles() {
  if (window.__tlaStop) return window.__tlaStop;
  const holder = document.createElement('div');
  holder.innerHTML = FILTER;
  const defs = holder.firstChild;
  document.body.appendChild(defs);

  let layer = null;
  let key = '';
  let queued = false;

  const sync = () => {
    queued = false;
    const scene = detectScene();
    const host = scene && document.querySelector(SCENES[scene].host);
    const errKey = document.querySelector('.status-msg--error') ? '+err' : '';
    const nextKey = scene ? scene + errKey : '';
    if (nextKey === key && layer && layer.isConnected && layer.parentElement === host) return;
    if (layer) layer.remove();
    layer = null;
    key = nextKey;
    if (scene && host) { layer = buildLayer(scene); host.appendChild(layer); }
  };

  const obs = new MutationObserver(() => {
    if (!queued) { queued = true; requestAnimationFrame(sync); }
  });
  obs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  sync();

  const stop = () => { obs.disconnect(); if (layer) layer.remove(); defs.remove(); window.__tlaStop = null; };
  window.__tlaStop = stop;
  return stop;
}
