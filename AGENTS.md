# Developer Preferences
- Always communicate, explain, and reply in Korean.
- Write code commits or system logs in English if needed, but chat response must be Korean.
- Follow the project technology stack closely.

# Quick Start
- Tech: Next.js 16, React 19, Tailwind CSS 4, Supabase
- Dev: `npm run dev` | Build: `npm run build` | Check: `npm run typecheck`
- Path alias: `@/*` → `src/*`
- DO NOT change functionality or visuals - optimize only

# File Navigation Index

## Components (src/components/)
### UI Components
- Header.tsx, BottomNav.tsx - Navigation
- WorkCard.tsx, Thumb.tsx - Portfolio cards
- Modals.tsx, ModalContext.ts - Modal system
- Icons.tsx - Icon components
- Contact.tsx - Contact form

### Admin Components (src/components/admin/)
- AdminNav.tsx - Admin navigation
- ArtistPicker.tsx, ArtistTable.tsx - Artist management
- WorkPicker.tsx, WorkBasics.tsx - Work editing
- FeaturedPicker.tsx, ScopeFeatured.tsx - Featured works
- DiscountFields.tsx, ExtrasEditor.tsx - Pricing components
- PublishButton.tsx, ConfirmButton.tsx - Action buttons

## Library (src/lib/)
### Database & Auth
- supabase.ts - Supabase client
- auth/ - Authentication (server.ts, browser.ts, guard.ts, permissions.ts, admin-db.ts, upload.ts)

### Data Management
- site-data.ts - Site configuration
- artist-admin.ts - Artist data
- admin-menu.ts - Admin menu structure
- sample-data.ts - Sample data for seeding

### Domain Specific
- guide.ts, guide-settings.ts - Guide/commission data
- pricing/bonus/discounts/turnaround - Pricing system
- status.ts, status-settings.ts - Status tracking
- featured.ts - Featured works
- social.ts, social-settings.ts - Social links

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

# Key Patterns
- Server components by default, add 'use client' only when needed
- Supabase: `@supabase/ssr` for server, `@supabase/supabase-js` for client
- Images: Next.js Image component from `next/image`
- Auth: Supabase Auth with MFA support
- Server Actions: 5MB body limit configured

# CSS Navigation (globals.css: 92KB, 1603 lines)
- Lines 1-43: Theme setup, CSS variables
- Lines 44-70: Base styles, GNB
- Lines 94-267: Common components (cards, modals, portfolio, pricing)
- Lines 639-1029: Admin & pricing
- Lines 1147-1603: Mobile responsiveness

# Verification
Before completing tasks: run `npm run typecheck`
