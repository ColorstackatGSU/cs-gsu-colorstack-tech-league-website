# ColorStack Tech League @ GSU

The hub site for the ColorStack Tech League at Georgia State University, a
semester-long, points-based technical development program. Students land here,
create an account, upload a resume for partner recruiters, and apply to the
League.

Content on the marketing pages mirrors the official *Full Program Overview &
Scoring Guide* (included in the repo).

## Running it

The site is a Vite + React SPA, and its backend is a Hono API in `api/` that
runs as one Vercel Function beside it. Data lives in the Tech League's own
Supabase project (Postgres, Auth, Storage). Locally, Supabase runs in Docker
and Vite serves the API from the same process, so there is one origin exactly
as in production.

```bash
npm install
npx supabase start            # Docker must be running. Ports 54431-54439.
cp .env.example .env.local    # then paste the keys from `npx supabase status`
npm run dev                   # http://localhost:5175, site and /api together
```

Port 5175 is not a preference: it is part of the redirect URI the member portal
has registered for Sign in with ColorStack, which is matched literally.

With no Gmail credentials in `.env.local`, emails are printed to the terminal
instead of sent, confirmation links included. That is how you sign up locally.
To make yourself an admin, open Studio at http://127.0.0.1:54433 and set
`is_admin` on your row in `profiles`.

```bash
npm run build          # production build into dist/
npm run preview        # serve the production build (no /api)
npm run lint           # oxlint
npm run typecheck:api  # tsc over api/
npx supabase db reset  # rebuild the local database from supabase/migrations
```

The database rules have their own test, which runs as real members rather than
as postgres so RLS is actually exercised:

```bash
docker exec -i supabase_db_tech-league psql -U postgres -v ON_ERROR_STOP=1 < supabase/tests/league_rules.sql
```

## Design

A friendly hand-drawn sketch style: warm cream paper, soft teal accents,
handwritten headings (Caveat) over a rounded readable body face (Quicksand),
rounded pill controls, dashed outlines, and pencil-like hard offset shadows.

All design decisions live as CSS custom properties in
[src/index.css](src/index.css) - color, type scale, spacing, motion.
Components never hardcode a hex value, so retheming happens in one file.

Two details carry most of the character: cards use slightly uneven corner
radii (`--r-wobble`) so shapes read as drawn rather than generated, and
buttons sit on a hard offset shadow that they sink onto when pressed.

Body copy uses Quicksand rather than a true handwriting face because
handwriting becomes unreadable at form-label sizes. Caveat is reserved for
headings, numbers, and short labels.

## Routes

| Route | Access | What it does |
|---|---|---|
| `/` | public | Landing hub: hero, five challenges, timeline, partners, apply CTA |
| `/scoring` | public | The scoring system, from `src/lib/season.js` |
| `/login` | public | Student email + password, or Sign in with ColorStack at GSU |
| `/signup` | public | Account creation; sends a confirmation link |
| `/verify` | public | Where the confirmation link lands |
| `/forgot-password`, `/reset-password` | public | Password reset by email |
| `/dashboard` | auth | Progress, resume, application status, team |
| `/apply` | auth | Four-step League application; final once submitted |
| `/teams` | auth | Every team, and the member directory (accepted members only) |
| `/leaderboard` | auth | Standings, ranked from server-held scores |
| `/admin` | admin | Application review and decisions, score entry, resume retirement |

Signed-out visitors hitting a protected route are sent to `/login` and returned
to where they were headed after signing in.

## Data and auth

[src/lib/authStore.js](src/lib/authStore.js) is the only frontend file that
knows where data lives, and it only ever calls `/api`. The browser never talks
to Supabase directly and holds no keys.

- **Accounts** are Supabase Auth users with a `@student.gsu.edu` address,
  enforced in the database, not just the form. Sessions are HttpOnly cookies set
  by the API. Confirmation and reset emails are sent by the API through Gmail as
  official@colorstackatgsu.com, the same way the member portal sends mail,
  because Supabase's built-in mailer only reaches the project's own team.
- **Sign in with ColorStack at GSU** is an option beside email signup, not a
  replacement: most GSU students are not ColorStack members. It prefills the
  application from the portal and copies the member's portal resume.
- **Rules live in the database.** Row level security on every table, and every
  team action is a Postgres function in
  [supabase/migrations](supabase/migrations). The API validates shapes and passes
  the database's refusals through as sentences.
- **Scores are server-authoritative.** Only admins write them;
  `src/lib/season.js` ranks for display over numbers the server returned.
- **Applications are final once submitted.** Only an admin can reopen one.
- **Resumes** are private files in Supabase Storage, shared with League partners
  (deleting one is the opt-out), and retired from `/admin` about a month after
  the season.

### Deploying

Set every variable in `.env.example` on the Vercel project, pointed at the
hosted Supabase project, then apply the migrations with
`npx supabase link` and `npx supabase db push`. `COLORSTACK_REDIRECT_URI` must be
`https://techleague.colorstackatgsu.com/api/auth/callback`, matching
`TECH_LEAGUE_REDIRECT_URI` on the portal.

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
colored square inside a white box. Either way the full logo always shows -
nothing is cropped.

Omit `logo` entirely and the tile renders the org's name as text, so the
carousel still looks intentional while you wait on an asset. **CS Club is currently a text tile**, drop its logo in
`public/partners/` and add a `logo:` key to that row to swap it in.

The marquee repeats short lists automatically to fill the strip, and it has a
pause button (and stops for `prefers-reduced-motion`).

The partners section is framed as a co-organized effort, the League is run by
ColorStack, ProGSU, CS Club, and NSBE together, not by
ColorStack alone with outside sponsors.
