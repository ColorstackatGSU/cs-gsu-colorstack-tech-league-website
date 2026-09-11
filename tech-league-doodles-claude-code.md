# Task: add hand drawn notebook doodles to the Tech League site

## Goal

The ColorStack Tech League site has a lot of empty space on the left and right sides of every page. Fill that space with small hand drawn, notebook style objects (think doodles in the margin of a notebook).

There are two doodle sets:

1. **Homepage doodles** for `src/pages/Landing.jsx`
2. **App doodles** for the logged in pages: `src/pages/Dashboard.jsx` and `src/pages/Apply.jsx` (every step of the application plus the "Application received" screen)

**Do not change anything that already exists.** No edits to existing components, text, layout, colors, fonts, or CSS. This task only adds four new files and a few lines of code to mount them.

## Rules

1. Do not edit any existing JSX, CSS, or content. Only add the files below and the mount code described in the steps.
2. Copy all four files exactly as written. Do not restyle, rename classes, or "improve" them.
3. The doodles use the site's existing fonts (Caveat and Quicksand) and existing color palette, so no new dependencies or font imports are needed.
4. If a selector the scripts depend on does not match the markup, report it and fix only that selector in the doodle file. Do not change the site's markup to fit the script.

## What gets added

All doodles are decorative SVGs, `aria-hidden`, don't block clicks on real content, only appear on wide screens where there is empty space, and turn off their motion when the user has reduced motion enabled.

**Homepage**

- **Hero:** to do notebook, pencil, "only takes 5 min!" arrow, laptop, JAVA mug, crumpled paper, paper plane, sparkles, code scribbles
- **Challenges:** rubber duck ("debug buddy"), ctrl + Z keycaps ("one bad round? undo."), O(n log n) sticky note, lightbulb, plus a dashed "top of the board?" trophy card in the empty grid spot next to the Capstone Hackathon card
- **Timeline:** Sept 30 calendar ("kickoff!"), alarm clock, pizza ("hackathon fuel"), rocket ("ship it"), "teams lock after kickoff!" sticky note
- **Partners:** "HELLO my name is future SWE" name tag, speech bubbles
- **Ready to apply:** resume with an A+ sticker, envelope ("check your inbox"), paper plane

**Dashboard**

Potted plant with a smiley face, "RECEIVED" rubber stamp, resume.pdf folder ("pdf only!"), paperclip, magnifying glass ("under review"), mailbox with the flag up ("decision lands here"), ramen cup ("late night fuel"), headphones, ruler, highlighter, stack of DSA / SQL / OOP books.

**Application form** (changes per step)

- **Every step:** clipboard checklist, pen, floppy disk ("save your draft")
- **Step 1, About you:** student ID card ("use your GSU email"), "nice to meet you!" sticky note
- **Step 2, Academics:** graduation cap ("future grad"), backpack, ruler
- **Step 3, Short answers:** "hmm..." thought bubble, eraser ("first drafts are fine"), "be honest :)" sticky note
- **Step 4, Logistics:** checkered finish flag ("almost there!"), three smiling teammates ("squad up"), hourglass ("be realistic")
- **Application received:** party popper ("you did it!"), envelope with wings ("sent to e-board"), and an arrow pointing at the missing resume message ("add your resume!") that only shows when that message is on screen

## Steps

### 1. Create `src/doodles/doodles.js` (homepage)

```js
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
```

### 2. Create `src/doodles/doodles.css` (homepage)

```css
/* Tech League hand drawn doodles. Only adds decoration, never moves existing content. */
.tl-defs { position: absolute; width: 0; height: 0; overflow: hidden; }

.tl-layer { position: absolute; inset: 0; pointer-events: none; z-index: 0; }

.tl-d {
  position: absolute;
  display: none;
  top: var(--t);
  width: var(--w, auto);
  transform: rotate(var(--r));
}
.tl-d.l { right: calc(50% + var(--e)); }
.tl-d.r { left: calc(50% + var(--e)); }
@media (min-width: 1360px) { .tl-d.near { display: block; } }
@media (min-width: 1700px) { .tl-d.far { display: block; } }

.tl-in { pointer-events: auto; will-change: transform; }
.tl-in:hover { animation: tl-wiggle .6s ease-in-out; }
.tl-d svg, .tl-cell svg { display: block; width: 100%; height: auto; overflow: visible; filter: url(#tl-wobble); }

.tl-label {
  font-family: "Caveat", "Comic Sans MS", cursive;
  font-weight: 700;
  font-size: 1.35rem;
  line-height: 1;
  color: #5c574f;
  text-align: center;
  white-space: nowrap;
  margin-block: 4px;
}
.tl-scribble {
  font-family: "Caveat", "Comic Sans MS", cursive;
  font-weight: 700;
  font-size: 1.55rem;
  color: #8a8378;
  white-space: nowrap;
}

/* the empty spot next to the last challenge card */
.tl-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px dashed #a8d9d1;
  border-radius: 22px;
  min-height: 300px;
  padding: 24px;
}
.tl-cell-in { position: relative; display: flex; flex-direction: column; align-items: center; text-align: center; }
.tl-cell-trophy { width: 140px; }
.tl-cell-note {
  font-family: "Caveat", "Comic Sans MS", cursive;
  font-weight: 700;
  font-size: 2.3rem;
  color: #33302b;
  line-height: 1;
  margin-top: 14px;
}
.tl-cell-sub {
  font-family: "Caveat", "Comic Sans MS", cursive;
  font-size: 1.4rem;
  color: #5c574f;
  margin-top: 4px;
}
.tl-cell-arrow { position: absolute; width: 56px; right: -54px; top: 70px; transform: rotate(8deg); }
.tl-cell-sp { position: absolute; display: block; }
.tl-cell-sp.s1 { width: 30px; left: -30px; top: 6px; animation: tl-twinkle 2.6s ease-in-out infinite; }
.tl-cell-sp.s2 { width: 20px; right: -8px; top: -8px; animation: tl-twinkle 3.1s .4s ease-in-out infinite; }
.tl-cell-sp.s3 { width: 22px; left: -12px; top: 110px; animation: tl-twinkle 2.8s .9s ease-in-out infinite; }
@media (max-width: 700px) { .tl-cell { display: none; } }

/* motion */
.tl-a-bob { animation: tl-bob 6s ease-in-out infinite; }
.tl-a-drift { animation: tl-drift 7s ease-in-out infinite; }
.tl-a-twinkle { animation: tl-twinkle 2.8s ease-in-out infinite; }
.tl-a-ring { animation: tl-ring 4s ease-in-out infinite; transform-origin: 50% 60%; }
.tl-a-glow .tl-rays { animation: tl-glow 2.4s ease-in-out infinite; }
.tl-steam path { animation: tl-steam 3s ease-in-out infinite; }
.tl-steam path + path { animation-delay: .8s; }
.tl-cursor { animation: tl-blink 1.1s steps(1) infinite; }
.tl-flame { animation: tl-flame .35s ease-in-out infinite alternate; transform-origin: 60px 114px; transform-box: view-box; }

@keyframes tl-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
@keyframes tl-drift { 0%, 100% { transform: translate(0, 0) rotate(0); } 50% { transform: translate(8px, -10px) rotate(-3deg); } }
@keyframes tl-twinkle { 0%, 100% { transform: scale(1) rotate(0); opacity: 1; } 50% { transform: scale(.7) rotate(20deg); opacity: .7; } }
@keyframes tl-ring { 0%, 84%, 100% { transform: rotate(0); } 87% { transform: rotate(-9deg); } 90% { transform: rotate(8deg); } 93% { transform: rotate(-6deg); } 96% { transform: rotate(4deg); } }
@keyframes tl-glow { 0%, 100% { opacity: 1; } 50% { opacity: .25; } }
@keyframes tl-steam { 0% { opacity: 0; transform: translateY(6px); } 40% { opacity: 1; } 100% { opacity: 0; transform: translateY(-8px); } }
@keyframes tl-blink { 50% { opacity: 0; } }
@keyframes tl-flame { from { transform: scaleY(1); } to { transform: scaleY(.8); } }
@keyframes tl-wiggle { 0%, 100% { transform: rotate(0); } 25% { transform: rotate(-6deg); } 75% { transform: rotate(5deg); } }

@media (prefers-reduced-motion: reduce) {
  .tl-layer *, .tl-cell * { animation: none !important; }
}
```

### 3. Create `src/doodles/app-doodles.js` (dashboard + application)

```js
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
```

### 4. Create `src/doodles/app-doodles.css` (dashboard + application)

```css
/* Tech League app doodles (dashboard + application). Decoration only. */
.tla-defs { position: absolute; width: 0; height: 0; overflow: hidden; }
.tla-layer { position: absolute; inset: 0; pointer-events: none; z-index: 0; }

.tla-d {
  position: absolute;
  display: none;
  top: var(--t);
  width: var(--w);
  transform: rotate(var(--r));
}
.tla-d.l { right: calc(50% + var(--e)); }
.tla-d.r { left: calc(50% + var(--e)); }
@media (min-width: 1200px) { .tla-d.mid { display: block; } }
@media (min-width: 1360px) { .tla-d.near { display: block; } }
@media (min-width: 1700px) { .tla-d.far { display: block; } }

.tla-in { pointer-events: auto; will-change: transform; }
.tla-in:hover { animation: tla-wiggle .6s ease-in-out; }
.tla-d svg { display: block; width: 100%; height: auto; overflow: visible; filter: url(#tla-wobble); }

.tla-label {
  font-family: "Caveat", "Comic Sans MS", cursive;
  font-weight: 700;
  font-size: 1.35rem;
  line-height: 1;
  color: #5c574f;
  text-align: center;
  white-space: nowrap;
  margin-block: 4px;
}

.tla-a-bob { animation: tla-bob 6s ease-in-out infinite; }
.tla-a-drift { animation: tla-drift 5s ease-in-out infinite; }
.tla-a-twinkle { animation: tla-twinkle 2.8s ease-in-out infinite; }
.tla-steam path { animation: tla-steam 3s ease-in-out infinite; }
.tla-steam path + path { animation-delay: .8s; }
.tla-sand { animation: tla-sand 1s linear infinite; }
.tla-burst { animation: tla-pop 2.4s ease-in-out infinite; transform-origin: 60px 90px; transform-box: view-box; }

@keyframes tla-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
@keyframes tla-drift { 0%, 100% { transform: translate(0, 0) rotate(0); } 50% { transform: translate(6px, -10px) rotate(-3deg); } }
@keyframes tla-twinkle { 0%, 100% { transform: scale(1) rotate(0); opacity: 1; } 50% { transform: scale(.7) rotate(20deg); opacity: .7; } }
@keyframes tla-steam { 0% { opacity: 0; transform: translateY(6px); } 40% { opacity: 1; } 100% { opacity: 0; transform: translateY(-8px); } }
@keyframes tla-sand { to { stroke-dashoffset: -12; } }
@keyframes tla-pop { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08) rotate(3deg); } }
@keyframes tla-wiggle { 0%, 100% { transform: rotate(0); } 25% { transform: rotate(-6deg); } 75% { transform: rotate(5deg); } }

@media (prefers-reduced-motion: reduce) {
  .tla-layer * { animation: none !important; }
}
```

### 5. Mount the homepage doodles in `src/pages/Landing.jsx`

Add the imports at the top:

```jsx
import { useEffect } from 'react';
import { mountDoodles } from '../doodles/doodles.js';
import '../doodles/doodles.css';
```

Then inside the `Landing` component, before the `return`:

```jsx
useEffect(() => mountDoodles(), []);
```

Put it in `Landing.jsx`, not `App.jsx`, so the doodles mount every time someone navigates back to the homepage.

### 6. Start the app doodles in `src/App.jsx`

Add the imports at the top:

```jsx
import { useEffect } from 'react';
import { startAppDoodles } from './doodles/app-doodles.js';
import './doodles/app-doodles.css';
```

Then inside the `App` component, before the `return`:

```jsx
useEffect(() => startAppDoodles(), []);
```

`startAppDoodles()` watches the page, figures out whether you are on the dashboard, a specific application step, or the "Application received" screen, and swaps doodles automatically. You do not need to pass it the route or the step.

If `useEffect` is already imported in either file, don't import it twice. Both functions return a cleanup function, so they are safe with React StrictMode.

## Selectors the scripts depend on

These already exist in the site. Confirm each one matches before finishing:

| Selector | Used for |
|---|---|
| `section.hero` | Homepage hero |
| `#challenges` and `.challenges__grid` | Homepage challenges and the trophy card |
| `#timeline` | Homepage timeline |
| `#partners` | Homepage partners |
| `section.section:last-of-type` | Homepage "Ready to apply" |
| `.dash` | Dashboard page wrapper |
| `.apply` | Application page wrapper |
| `.apply__rail-item` with `.is-current` | Which application step is active |
| `.apply__done` | "Application received" screen |
| `.status-msg--error` | Missing resume message on the received screen |

Every wrapper the doodles attach to must have `position: relative` (they already do). If one doesn't, report it rather than changing the wrapper.

## Check your work

Run the dev server and confirm:

- [ ] Nothing in the original pages moved, changed color, or changed size
- [ ] Homepage at 1440px wide: doodles beside every section, never covering text or cards
- [ ] Homepage trophy card fills the empty third spot in the second row of the challenges grid
- [ ] Dashboard at 1440px wide: doodles on both sides of the cards
- [ ] Application: going from step 1 to step 4 with Continue and Back swaps the step specific doodles each time
- [ ] "Application received" screen shows the popper and winged envelope, and the "add your resume!" arrow only when the missing resume message is visible
- [ ] Leaving and returning to the homepage brings the homepage doodles back
- [ ] Below 1200px wide, no side doodles show anywhere
- [ ] All buttons, links, and form fields still work, including typing in every field
- [ ] No console errors, and no horizontal scrollbar at any width

## Tweaking positions later

Each doodle entry in `LAYOUT` (homepage) or `SCENES` (app) has:

- `e`: distance in px from the center of the page to the doodle's inner edge
- `t`: distance in px from the top of its section (homepage) or page (app)
- `w`: width in px
- `r`: rotation in degrees
- `tier`: `mid` shows at 1200px and wider (app only), `near` at 1360px and wider, `far` only at 1700px and wider
- `label` / `labelTop`: optional handwritten caption below or above the doodle
- `a`: optional motion (`bob`, `drift`, `twinkle`, plus `ring` and `glow` on the homepage)
- `when` (app only): only show the doodle if this selector is on the page

To move a doodle, change its numbers. To remove one, delete its line.

## Optional separate fix: Vercel 404 on refresh

On the deployed site, opening `/login` (or refreshing any page other than the homepage) shows Vercel's `404: NOT_FOUND`. That happens because Vercel doesn't know to send every route to the React app. If there is no `vercel.json` in the project root, add this one:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

If a `vercel.json` already exists, add only the `rewrites` entry and keep everything else. After deploying, confirm that opening `/login` directly loads the login page.
