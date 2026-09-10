# ColorStack Tech League @ GSU

The hub site for the ColorStack Tech League at Georgia State University — a
semester-long, points-based technical development program. Students land here,
create an account, upload a resume for partner recruiters, and apply to the
League.

Content on the marketing pages mirrors the official *Full Program Overview &
Scoring Guide* (included in the repo).

## Running it

```bash
npm install
npm run dev      # http://localhost:5173
```

```bash
npm run build    # production build into dist/
npm run preview  # serve the production build
npm run lint     # oxlint
```

## Design

A vintage desktop-OS look: teal desktop ground, silver beveled panels with
window title bars, square corners, and pixel type (Press Start 2P for headings,
Space Mono for body).

All design decisions live as CSS custom properties in
[src/index.css](src/index.css) — color, type scale, spacing, motion. Components
never hardcode a hex value, so retheming happens in one file.

The bevel effect is four borders (light top-left, dark bottom-right) plus inset
shadows. Buttons invert those borders on `:active` so they physically depress.

## Routes

| Route | Access | What it does |
|---|---|---|
| `/` | public | Landing hub: program overview, five challenges, scoring weights, timeline |
| `/login` | public | Username + password sign-in |
| `/signup` | public | Account creation with password strength meter |
| `/dashboard` | auth | Progress tracker, resume upload, application status |
| `/apply` | auth | Four-step League application |

Signed-out visitors hitting a protected route are sent to `/login` and returned
to where they were headed after signing in.

## Demo accounts (dev only)

Two accounts are seeded automatically when you run `npm run dev`, so you can
click the whole flow without registering:

| Username | Password | State |
|---|---|---|
| `demo` | `demo1234` | Fresh account — nothing uploaded or applied yet |
| `applied` | `demo1234` | Resume uploaded and application already submitted |

Seeding lives in `seedDemoAccounts()` in
[src/lib/authStore.js](src/lib/authStore.js) and is called from
[src/main.jsx](src/main.jsx). It **no-ops in a production build** and never
overwrites an account that already exists, so changes you make while clicking
around stick. Delete both the function and its call when real auth lands.

To reset a demo account to its seeded state, clear site data for localhost in
your browser's devtools (Application → Storage → Clear site data) and reload.

## Data and auth — read this before deploying

`src/lib/authStore.js` is the **only** file that knows where data lives.
Everything else calls its functions. It currently persists to `localStorage`:

- Accounts live in `cstl.users`, the session in `cstl.session`, resumes and
  application answers in `cstl.profiles`.
- Resumes are stored as base64 data URLs, capped at 2 MB (localStorage tops out
  around 5 MB).
- Passwords are SHA-256 hashed so they aren't sitting in plain text.

**This is not production auth.** There is no salt and no server — anything in
`localStorage` is readable and editable by the person sitting at the browser,
and data lives only in that one browser. Before real students use this, move
verification server-side (Supabase, Firebase, or your own API with
bcrypt/argon2) and store resumes in real object storage.

Because every call site goes through `authStore.js`, that swap means rewriting
the function bodies in that one file. The signatures and return shapes are
designed to stay the same.

Recruiter-facing views (browsing submitted resumes and applications) are not
built yet — that is the natural next phase.

## Animation

Scroll animations are Framer Motion, wrapped in a small shared vocabulary in
[src/components/Motion.jsx](src/components/Motion.jsx): `Reveal`, `Stagger` /
`StaggerItem`, and `RevealText`. Using these rather than one-off animations per
section keeps the whole site moving on one rhythm.

Every one of them collapses to the final state when the visitor has
`prefers-reduced-motion` set.

## Accessibility

Built in rather than bolted on: visible focus on every interactive element,
44px minimum tap targets, labelled fields with errors tied via
`aria-describedby`, a focusable error summary on failed submits, `.edu` email
validation with a specific recovery message, and a skip link. Password fields
allow paste and password managers.

## Assets

`public/colorstack-gsu-logo.png` is the chapter logo (also the source for
`favicon.ico`, `apple-touch-icon.png`, and `icon-192.png`). To change it,
replace the source image and regenerate the icon sizes.

### Adding a partner logo

Partner logos live in `public/partners/` and are listed in the `PARTNERS`
array at the top of
[src/components/PartnerCarousel.jsx](src/components/PartnerCarousel.jsx):

```js
{ name: 'Org Name', logo: '/partners/org.png' }
```

Tiles are white, so a transparent PNG or SVG drops straight in. If the logo
file has its own solid background baked in (a white mark on a brand color),
add `bleed: true` so it fills the tile edge to edge instead of sitting as a
colored square inside a white box. Either way the full logo always shows —
nothing is cropped.

Omit `logo` entirely and the tile renders the org's name as text, so the
carousel still looks intentional while you wait on an asset. **CS Club is currently a text tile** — drop its logo in
`public/partners/` and add a `logo:` key to that row to swap it in.

The marquee repeats short lists automatically to fill the strip, and it has a
pause button (and stops for `prefers-reduced-motion`).

The partners section is framed as a co-organized effort — the League is run by
ColorStack, ProGSU, CS Club, and NSBE together, not by
ColorStack alone with outside sponsors.
