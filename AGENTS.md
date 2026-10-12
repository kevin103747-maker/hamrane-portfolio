# Developer Preferences
- Always communicate, explain, and reply in Korean.
- Write code commits or system logs in English if needed, but chat response must be Korean.
- Follow the project technology stack closely.

# Quick Start
- Tech: Next.js 16, React 19, Tailwind CSS 4, Supabase
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
grep -r "type.*=" src/
```

### Find Imports/Exports
```bash
# Import statements
grep -r "import.*from" src/

# Export statements
grep -r "export {" src/
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

### globals.css (1603 lines)
```bash
# Theme variables
grep ":root\|\[data-theme" src/app/globals.css

# Component classes
grep "\.card\|\.modal\|\.gnb" src/app/globals.css

# Responsive breakpoints
grep "@media.*max-width" src/app/globals.css
```

### admin.css (30KB)
```bash
# Admin layout
grep "\.hr-\|\.hr-admin" src/app/hr-admin/admin.css

# Tables
grep "table\|th\|td" src/app/hr-admin/admin.css

# Forms
grep "input\|select\|button" src/app/hr-admin/admin.css
```

### QuoteMaker.tsx (51KB, 1235 lines)
```bash
# Types
grep "export type\|type.*=" src/components/admin/QuoteMaker.tsx

# Main functions
grep "function.*(\|const.*=" src/components/admin/QuoteMaker.tsx

# Drawing functions
grep "drawQuote\|songBlock\|stageBlock" src/components/admin/QuoteMaker.tsx
```

### Large Files (>10KB)
```bash
# QuoteMaker types and constants
grep "KEY\|KIND_NAME\|DEFAULT_NOTES" src/components/admin/QuoteMaker.tsx

# Admin actions
grep "export async function" src/app/hr-admin/(panel)/actions.ts

# Portfolio view
grep "export function\|export const" src/components/PortfolioView.tsx

# Stats page
grep "supabase\|Chart\|stat" src/app/hr-admin/(panel)/stats/page.tsx
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
- **UI**: Header, BottomNav, WorkCard, Thumb, Modals, Icons, Contact, Tracker
- **Admin**: AdminNav, ArtistPicker, ArtistTable, WorkPicker, FeaturedPicker, DiscountFields, ExtrasEditor, PublishButton, ConfirmButton, OwnerMark, QuoteMaker

### Library (src/lib/)
- **Auth**: supabase.ts, auth/ (server, browser, guard, permissions, admin-db, upload)
- **Data**: site-data.ts, artist-admin.ts, admin-menu.ts, sample-data.ts, track.ts
- **Domain**: guide, bonus, discounts, turnaround, status, featured, social, rate-badge
- **Utils**: filters, copy, stats, i18n, types

### Pages (src/app/)
- **Public**: (site)/ (page, portfolio, pricing, guide)
- **Admin**: hr-admin/ (login, mfa, (panel) sub-pages, admin.css, api/stat)

# Key Patterns
- Server components by default, add 'use client' only when needed
- Supabase: `@supabase/ssr` for server, `@supabase/supabase-js` for client
- Images: Next.js Image component from `next/image`
- Auth: Supabase Auth with MFA support
- Server Actions: 5MB body limit configured

# Verification
Before completing tasks: run `npm run typecheck`

# Additional Navigation Aids
- **FEATURES.md**: Feature → file/function mapping
- **SEARCH_INDEX.md**: Exported functions by category with grep commands
