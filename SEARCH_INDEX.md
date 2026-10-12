# Quick Search Index

## Exported Functions by Category

### Authentication
- `requireAdmin()` - Check admin permissions → `src/lib/auth/guard.ts`
- `can()` - Check specific permission → `src/lib/auth/permissions.ts`
- `adminDb()` - Admin database client → `src/lib/auth/admin-db.ts`

### Portfolio
- `WorkCard` - Work card component → `src/components/WorkCard.tsx`
- `Thumb` - Thumbnail component → `src/components/Thumb.tsx`
- `PortfolioView` - Portfolio view → `src/components/PortfolioView.tsx`

### Pricing
- `RateBoard` - Rate display → `src/components/RateBoard.tsx`
- `PackageList` - Package list → `src/components/PackageList.tsx`
- `BundleBox` - Bundle display → `src/components/BundleBox.tsx`

### Quote
- `QuoteMaker` - Quote/statement maker → `src/components/admin/QuoteMaker.tsx`
- `QuoteItem` - Quote item type → `src/components/admin/QuoteMaker.tsx`
- `QuoteGroup` - Quote group type → `src/components/admin/QuoteMaker.tsx`

### Admin Components
- `AdminNav` - Admin navigation → `src/components/admin/AdminNav.tsx`
- `ArtistPicker` - Artist selection → `src/components/admin/ArtistPicker.tsx`
- `ArtistTable` - Artist table → `src/components/admin/ArtistTable.tsx`
- `WorkPicker` - Work selection → `src/components/admin/WorkPicker.tsx`
- `FeaturedPicker` - Featured selection → `src/components/admin/FeaturedPicker.tsx`

### Utilities
- `copyToClipboard` - Copy text → `src/lib/copy.ts`
- `today()` - Today's date → `src/components/admin/QuoteMaker.tsx`
- `won()` - Format currency → `src/components/admin/QuoteMaker.tsx`

## Key File Locations

### Supabase Client
- Server: `src/lib/supabase/server.ts`
- Client: `src/lib/supabase/client.ts`
- Main: `src/lib/supabase.ts`

### Auth
- Guard: `src/lib/auth/guard.ts`
- Permissions: `src/lib/auth/permissions.ts`
- Admin DB: `src/lib/auth/admin-db.ts`

### Admin Pages
- Login: `src/app/hr-admin/login/page.tsx`
- MFA: `src/app/hr-admin/mfa/page.tsx`
- Quote: `src/app/hr-admin/(panel)/quote/page.tsx`
- Stats: `src/app/hr-admin/(panel)/stats/page.tsx`
- Works: `src/app/hr-admin/(panel)/works/page.tsx`

### Public Pages
- Home: `src/app/(site)/page.tsx`
- Portfolio: `src/app/(site)/portfolio/page.tsx`
- Pricing: `src/app/(site)/pricing/page.tsx`
- Guide: `src/app/(site)/guide/page.tsx`

## One-Liner Grep Commands

### Find all admin pages
```bash
grep -r "export default" src/app/hr-admin/ --include="*.tsx"
```

### Find all server actions
```bash
grep -r "'use server'" src/
```

### Find all Supabase queries
```bash
grep -r "supabase.from" src/
```

### Find all exports
```bash
grep -r "export" src/ --include="*.ts" --include="*.tsx"
```

### Find component names
```bash
grep -r "export.*function\|export.*const" src/components/ --include="*.tsx"
```
