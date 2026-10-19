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

### Pricing example works
- `GroupWorks` - Works under each rate tab → `src/components/GroupWorks.tsx`
- `getPricingWorks()`, `parsePricingWorks()`, `PRICING_WORKS_MAX` → `src/lib/pricing-works.ts`
- `savePricingWorks()` (server action) → `src/app/hr-admin/(panel)/pricing-works/actions.ts`

### Drops
- `getDrop()`, `isLive()`, `fileUrl()`, `fmtSize()`, `fromRow()` → `src/lib/drops.ts`
- `saveDrop()`, `removeDrop()` (server actions) → `src/app/hr-admin/(panel)/drops/actions.ts`
- `DropPage`, `DropTheme`, `DropTracker` → `src/components/drop/`
- `DropActions` - copy address / delete buttons → `src/components/admin/DropActions.tsx`

### Quote
- `QuoteMaker` - Quote/statement maker → `src/components/admin/QuoteMaker.tsx`
- `QuoteItem` - Quote item type → `src/components/admin/QuoteMaker.tsx`
- `QuoteGroup` - Quote group type → `src/components/admin/QuoteMaker.tsx`
- QuoteStore (브라우저 localStorage 전용, 서버 코드에서 import 금지):
  - `nextNo()` - Next document number → `src/lib/quote-store.ts`
  - `renumber()` - Convert Q-/S- prefix → `src/lib/quote-store.ts`
  - `validLabel()` - Validity period label → `src/lib/quote-store.ts`
  - `listSlots()` - List saved slots → `src/lib/quote-store.ts`
  - `saveSlot()` - Save to slot → `src/lib/quote-store.ts`
  - `removeSlot()` - Remove slot → `src/lib/quote-store.ts`
  - `readPreset()` - Read preset → `src/lib/quote-store.ts`
  - `writePreset()` - Write preset → `src/lib/quote-store.ts`
  - `SavedAccount` type - Account type definition → `src/lib/quote-store.ts`
- `loadAccounts()` - Load saved accounts (server-only, 클라이언트 컴포넌트에서 import 금지) → `src/lib/quote-accounts.ts`

### Admin Components
- `AdminNav` - Admin navigation → `src/components/admin/AdminNav.tsx`
- `ArtistPicker` - Artist selection → `src/components/admin/ArtistPicker.tsx`
- `ArtistTable` - Artist table → `src/components/admin/ArtistTable.tsx`
- `WorkPicker` - Work selection → `src/components/admin/WorkPicker.tsx`
- `FeaturedPicker` - Featured selection → `src/components/admin/FeaturedPicker.tsx`

### QuoteMaker Internal Functions (grep -n "<name>" src/components/admin/QuoteMaker.tsx)
- `messengerText()` - Generate messenger text (exported)
- `normalize()` - Normalize saved draft
- `blankDoc()` - Create blank document
- `blankLine()` - Create blank line
- `whoText()` - Format who/org text
- `bankOf()` - Get bank info
- `bankText()` - Format bank text
- `wipCount()` - Count WIP/wait items
- `wipLabel()` - WIP label
- `drawQuote()` - Draw quote canvas
- `songBlock()` - Draw song block
- `stageBlock()` - Draw stage block
- `totalsBlock()` - Draw totals block

### Tracking
- `isOwnerDevice()` - Check owner device → `src/lib/track.ts`
- `markOwnerDevice()` - Mark as owner device → `src/lib/track.ts`
- `setOwnerDevice()` - Set owner device flag → `src/lib/track.ts`
- `track()` - Send tracking event → `src/lib/track.ts`

### Utilities
- `copyToClipboard` - Copy text → `src/lib/copy.ts`
- `today()` - Today's date → `src/components/admin/QuoteMaker.tsx` (내부 helper, 외부 import 불가)
- `won()` - Format currency → `src/components/admin/QuoteMaker.tsx` (내부 helper, 외부 import 불가)

## Key File Locations

### Supabase Client
- Public site (read-only): `src/lib/supabase.ts`
- Server (cookie-based): `src/lib/auth/server.ts`
- Browser (login/MFA): `src/lib/auth/browser.ts`

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
- Drop (free download): `src/app/dl/[slug]/page.tsx`



