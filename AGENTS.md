# Developer Preferences
- Always communicate, explain, and reply in Korean.
- Write code commits or system logs in English if needed, but chat response must be Korean.
- Follow the project technology stack closely.

# Quick Start
- Tech: Next.js 16, React 19, Tailwind CSS 4 (설치됨, 스타일 대부분은 globals.css/admin.css의 직접 작성 클래스), Supabase
- Dev: `npm run dev` | Build: `npm run build` | Check: `npm run typecheck`
- Path alias: `@/*` → `src/*`
- Note: "DO NOT change functionality or visuals" applies to optimization/cleanup tasks only. For new feature requests, implement as requested.

# Grep-Based Navigation Guide

## Common Search Patterns

### Find Functions/Components
```bash
# Exported functions
grep -r "export function" src/
grep -r "export const" src/

# Component definitions
grep -r "export default function" src/
grep -r "export default async function" src/

# Server actions
grep -r "'use server'" src/
```

### Find Types/Interfaces
```bash
# Type definitions
grep -r "export type" src/
grep -r "export interface" src/
```

### Find Imports/Exports
```bash
# Import statements
grep -r "import.*from" src/
```

### Find Supabase Usage
```bash
# Supabase client usage
grep -r "createClient" src/
grep -r "supabase.from" src/
grep -r "supabase.auth" src/
```

## Feature-Based Search

### Authentication
```bash
# Auth-related files
grep -r "auth" src/lib/ src/app/
grep -r "guard" src/lib/auth/
grep -r "permissions" src/lib/auth/
```

### Admin Panel
```bash
# Admin components
grep -r "admin" src/components/ src/app/hr-admin/

# Admin styles
grep -r "\.hr-" src/app/hr-admin/admin.css
```

### Portfolio/Works
```bash
# Work-related
grep -r "work" src/lib/ src/components/ --include="*.ts" --include="*.tsx"
grep -r "WorkCard" src/components/
```

### Pricing
```bash
# Pricing system
grep -r "price\|rate\|discount\|bonus" src/lib/ --include="*.ts"
grep -r "package" src/lib/ --include="*.ts"
```

### Statistics/Tracking
```bash
# Stats and tracking
grep -r "stat\|track" src/lib/ src/components/ src/app/api/
```

## File-Specific Grep Patterns

### globals.css
```bash
# Theme variables
grep ":root\|\[data-theme" src/app/globals.css

# Component classes
grep "\.card\|\.modal\|\.gnb" src/app/globals.css

# Responsive breakpoints
grep "@media.*max-width" src/app/globals.css
```

### admin.css
```bash
# Admin layout
grep "\.hr-\|\.hr-admin" src/app/hr-admin/admin.css

# Tables
grep "table\|th\|td" src/app/hr-admin/admin.css

# Forms
grep "input\|select\|button" src/app/hr-admin/admin.css
```

### QuoteMaker.tsx
```bash
# Types
grep -nE "^(export )?type " src/components/admin/QuoteMaker.tsx

# Helper functions
grep "normalize\|blankDoc\|blankLine" src/components/admin/QuoteMaker.tsx

# Drawing functions
grep "drawQuote\|songBlock\|stageBlock\|totalsBlock" src/components/admin/QuoteMaker.tsx
```

### Large Files (>10KB)
```bash
# QuoteMaker types and constants
grep "KEY\|KIND_NAME\|DEFAULT_NOTES" src/components/admin/QuoteMaker.tsx

# Admin actions
grep "export async function" "src/app/hr-admin/(panel)/actions.ts"

# Stats page
grep "supabase\|Chart\|stat" "src/app/hr-admin/(panel)/stats/page.tsx"
```

## Cross-File Search

### Find Where a Function is Used
```bash
# Find import of specific component
grep -r "QuoteMaker" src/

# Find usage of a specific function
grep -r "functionName" src/
```

### Find Supabase Table References
```bash
# Find table names in queries
grep -r "supabase.from" src/ | grep -o "from('.*')" | sort -u
```

## File Structure Quick Reference

### Components (src/components/)
- **UI**: Header, BottomNav, WorkCard, Thumb, Modals, Icons, Contact, Tracker, RecentMarquee, SocialLinks , GroupWorks
- **Admin**: AdminNav, ArtistPicker, ArtistTable, WorkPicker, FeaturedPicker, DiscountFields, ExtrasEditor, PublishButton, ConfirmButton, OwnerMark, QuoteMaker, ScopeFeatured, DropActions
- **Drop** (src/components/drop/): DropPage, DropTheme, DropTracker


### Library (src/lib/)
- **Auth**: supabase.ts, auth/ (server, browser, guard, permissions, admin-db, upload)
- **Data**: site-data.ts, artist-admin.ts, admin-menu.ts, sample-data.ts, track.ts
- **Domain**: guide, bonus, discounts, turnaround, status, featured, social, rate-badge, drops, pricing-works
- **Quote**: quote-store.ts, quote-accounts.ts
- **Utils**: filters, copy, stats, i18n, types

### Pages (src/app/)
- **Public**: (site)/ (page, portfolio, pricing, guide)
- **Public (outside (site))**: dl/[slug] (page.tsx, get/[kind]/route.ts)
- **Admin outside (panel)**: hr-admin/drop-preview/[id]
- **Admin**: hr-admin/ (login, mfa, (panel) sub-pages, admin.css)
- **API**: api/stat/route.ts

# Key Patterns
- Server components by default, add 'use client' only when needed
- Supabase: `@supabase/ssr` for server, `@supabase/supabase-js` for client
- Images: Next.js Image component from `next/image`
- Auth: Supabase Auth with MFA support
- Server Actions: 5MB body limit configured

# Drops (무료 배포 · /dl/[slug])
- Event BGM download page. Public URL `/dl/<slug>` lives OUTSIDE `(site)`: no site header/footer/Tracker.
  Never linked from the public site, `noindex`, `/dl` itself is 404. `revalidate = 60`.
- Audio is NOT in Supabase. MP3/WAV live in Cloudflare R2, served by a Worker (R2 binding variable `BUCKET`).
  The `drops` table stores only file names.
- Env `DROP_FILES_BASE` = Worker URL (no trailing `/`). Set in Vercel (Production + Preview) and `.env.local`.
  Env changes apply only after a redeploy.
- Download flow: button -> `/dl/<slug>/get/<mp3|wav>` (route.ts) -> 302 to `DROP_FILES_BASE/<file name>`.
  404 when closed/unpublished/missing env. Deleting a drop does NOT delete R2 files (delete them in R2).
- Admin: `/hr-admin/drops` (perm `settings`), preview `/hr-admin/drop-preview/<id>`.
- Stats: `stat_events` values `dl:view-<slug>`, `dl:mp3-<slug>`, `dl:wav-<slug>`, `dl:home-<slug>`;
  admin list reads RPC `stat_drops`. Recorded only when VERCEL_ENV=production.

# Pricing example works (단가표 예시 작업물)
- Stored in `site_settings` key `pricing_works` = `{ [groupId]: workId[] }`, max `PRICING_WORKS_MAX` (8) per group.
  Separate from portfolio featured (`works.feat`).
- Admin `/hr-admin/pricing-works` (perm `rates`) reuses `ScopeFeatured`. Public: `GroupWorks` under the active
  rate tab only (`RateBoard`). Nothing picked -> latest `MAX_AUTO` (4) works of that group.
- Groups, parts and usage types are editable in admin: NEVER hard-code their names or ids in code.

# Verification
Before completing tasks: run `npm run typecheck`

# Additional Navigation Aids
- **FEATURES.md**: Feature → file/function mapping
- **SEARCH_INDEX.md**: Exported functions by category

# Working Rules
- Every code answer must end with copy-paste git commands (add / commit / push).
- Run `npm run typecheck` before every commit; fix failures before committing.
- Large files (QuoteMaker.tsx, globals.css, admin.css): do not trust line numbers.
  Locate with `grep -n "<anchor>"`, then read with `sed -n 'a,bp'`.
- Make code edits in the editor, not by pasting into the terminal
  (zsh mangles backticks and `$`).
- When editing lines with `${...}` template literals, re-check that every
  `$`, `{`, `}` and backtick survived (caused repeated build failures).
- In QuoteMaker.tsx, `st` means "staged payment is ON", NOT "statement".
  Use `d.kind === 'statement'` for statement-only logic.
- Keep input `maxLength` and the `.slice(n)` in `normalize` identical,
  or saved drafts get truncated on reload.
- New Doc/Line fields need a default in `blankDoc`/`blankLine` AND a safe read
  in `normalize`, so old saved drafts keep loading.
- `git commit` alone does not deploy. After `git push origin main`, `git log origin/main..HEAD --oneline` must print nothing.
- Groups/parts/usage types change in admin at any time. Attach new data to works (or store ids with delete guards), never to fixed names.


# CSS Rules
- globals.css = public site only; admin.css = /hr-admin only.
- Later duplicate selector wins. When merging duplicates, keep the later value
  and check @media blocks that sit between them.
- `.bottom-nav` base rule must stay ABOVE its @media blocks.
- `@media (pointer: coarse) { a, button { min-height: 44px } }` also affects
  small buttons (e.g. theme switch); check mobile after CSS changes.
- Lint: `npx stylelint src/app/globals.css src/app/hr-admin/admin.css`

# Deploy / Domain
- Public domain: hamrane.com. Admin login must run on the same origin
  (OAuth redirectTo uses window.location.origin).
- Stats are recorded only when VERCEL_ENV=production.
