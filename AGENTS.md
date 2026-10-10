# Developer Preferences
- Always communicate, explain, and reply in Korean.
- Write code commits or system logs in English if needed, but chat response must be Korean.
- Follow the project technology stack closely.

# Quick Start
- Tech: Next.js 16, React 19, Tailwind CSS 4, Supabase
- Dev: `npm run dev` | Build: `npm run build` | Check: `npm run typecheck`
- Path alias: `@/*` → `src/*`
- Note: "DO NOT change functionality or visuals" applies to optimization/cleanup tasks only. For new feature requests, implement as requested.

# File Navigation Index

## Components (src/components/)
### UI Components
- Header.tsx, BottomNav.tsx - Navigation
- WorkCard.tsx, Thumb.tsx - Portfolio cards
- Modals.tsx, ModalContext.ts - Modal system
- Icons.tsx - Icon components
- Contact.tsx - Contact form
- Tracker.tsx - Visit statistics tracking
- PortfolioView.tsx (18KB) - Portfolio view component
- RateBoard.tsx (11KB) - Rate board display

### Admin Components (src/components/admin/)
- AdminNav.tsx - Admin navigation
- ArtistPicker.tsx, ArtistTable.tsx - Artist management
- WorkPicker.tsx, WorkBasics.tsx - Work editing
- FeaturedPicker.tsx, ScopeFeatured.tsx - Featured works
- DiscountFields.tsx, ExtrasEditor.tsx - Pricing components
- PublishButton.tsx, ConfirmButton.tsx - Action buttons
- OwnerMark.tsx - Owner marking for works
- QuoteMaker.tsx (51KB, 1235 lines) - Quote/statement maker (large file, see section index below)

## Library (src/lib/)
### Database & Auth
- supabase.ts - Supabase client
- auth/ - Authentication (server.ts, browser.ts, guard.ts, permissions.ts, admin-db.ts, upload.ts)

### Data Management
- site-data.ts - Site configuration
- artist-admin.ts - Artist data
- admin-menu.ts - Admin menu structure
- sample-data.ts - Sample data for seeding
- track.ts - Visit tracking

### Domain Specific
- guide.ts, guide-settings.ts - Guide/commission data
- bonus.ts, bonus-settings.ts - Bonus settings
- discounts.ts, discounts-settings.ts - Discount rules
- turnaround.ts, turnaround-settings.ts - Turnaround times
- status.ts, status-settings.ts - Status tracking
- featured.ts - Featured works
- social.ts, social-settings.ts - Social links
- rate-badge.ts - Rate badge logic

### Utilities
- filters.ts - Filter logic
- copy.ts - Copy to clipboard
- stats.ts - Statistics
- i18n.ts - Internationalization
- types.ts - TypeScript types

## Pages (src/app/)
### Public Pages (src/app/(site)/)
- page.tsx - Home
- portfolio/ - Portfolio page
- pricing/ - Pricing page
- guide/ - Commission guide

### Admin Panel (src/app/hr-admin/)
- login/ - Login page
- mfa/ - 2FA page
- (panel)/ - Admin sub-pages (artists, rates, discounts, guide, settings, etc.)
- admin.css (30KB) - Admin-specific styles (separated from globals.css)
- api/stat/route.ts - Visit statistics API
- (panel)/actions.ts (20KB) - Admin server actions
- (panel)/stats/page.tsx (18KB) - Statistics page
- (panel)/works/page.tsx (14KB) - Works management
- (panel)/rates/actions.ts (13KB) - Rate actions

# Key Patterns
- Server components by default, add 'use client' only when needed
- Supabase: `@supabase/ssr` for server, `@supabase/supabase-js` for client
- Images: Next.js Image component from `next/image`
- Auth: Supabase Auth with MFA support
- Server Actions: 5MB body limit configured

# CSS Navigation
Use `grep` to find selectors in `src/app/globals.css` (1603 lines):
- Theme/CSS variables: grep for `:root`, `[data-theme=`
- Base styles: grep for `html`, `body`, `a`, `button`
- GNB/Header: grep for `.gnb`, `.menu`, `.logo`
- Cards: grep for `.card`, `.ph`
- Modals: grep for `.modal`
- Admin styles: See `src/app/hr-admin/admin.css` (separated file)
- Mobile responsive: grep for `@media.*max-width`

# Large Files Section Index
### QuoteMaker.tsx (51KB, 1235 lines)
Use `grep` to find sections:
- Types: grep for `export type`, `type`, `interface`
- Constants: grep for `const KEY`, `KIND_NAME`, `DEFAULT_NOTES`
- Helper functions: grep for `^const.*=`, `^function.*\(`
- Main component: Line 701 `export function QuoteMaker`
- Drawing functions: grep for `drawQuote`, `songBlock`, `stageBlock`, `totalsBlock`

### admin.css (30KB)
Use `grep` to find selectors:
- Layout: grep for `.hr-`, `.hr-admin`
- Tables: grep for `table`, `th`, `td`
- Forms: grep for `input`, `select`, `button`
- Cards: grep for `.hr-card`, `.hr-cta`
- Spacing: grep for `padding`, `margin`

### (panel)/actions.ts (20KB)
Use `grep` to find functions:
- Quote actions: grep for `quote`
- Artist actions: grep for `artist`
- General actions: grep for `export async function`

### PortfolioView.tsx (18KB)
Use `grep` to find:
- Components: grep for `export function`, `export const`
- Filters: grep for `filter`, `Filter`
- Rendering: grep for `return`, `map`

### stats/page.tsx (18KB)
Use `grep` to find:
- Data fetching: grep for `const.*= await`, `supabase`
- Charts: grep for `Chart`, `graph`
- Statistics: grep for `stat`, `count`

### works/page.tsx (14KB)
Use `grep` to find:
- Table: grep for `table`, `WorkTable`
- Actions: grep for `action`, `handle`
- Filters: grep for `filter`

### rates/actions.ts (13KB)
Use `grep` to find:
- Rate actions: grep for `rate`, `price`
- Package actions: grep for `package`, `pkg`

### RateBoard.tsx (11KB)
Use `grep` to find:
- Display: grep for `Rate`, `price`
- Calculations: grep for `calc`, `compute`

# Verification
Before completing tasks: run `npm run typecheck`
