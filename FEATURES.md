# Feature Mapping

## Authentication
- **Login**: `src/app/hr-admin/login/page.tsx`
- **MFA**: `src/app/hr-admin/mfa/page.tsx`, `src/app/hr-admin/mfa/MfaForm.tsx`
- **Auth Guard**: `src/lib/auth/guard.ts`
- **Permissions**: `src/lib/auth/permissions.ts`
- **Admin DB**: `src/lib/auth/admin-db.ts`
- **Upload**: `src/lib/auth/upload.ts`

## Portfolio/Works
- **Work Card**: `src/components/WorkCard.tsx`
- **Thumbnail**: `src/components/Thumb.tsx`
- **Portfolio View**: `src/components/PortfolioView.tsx`
- **Filter**: `src/lib/filters.ts`
- **Featured Works**: `src/lib/featured.ts`

## Pricing
- **Rate Board**: `src/components/RateBoard.tsx`
- **Rate Badge**: `src/lib/rate-badge.ts`
- **Discounts**: `src/lib/discounts.ts`, `src/lib/discounts-settings.ts`
- **Bonus**: `src/lib/bonus.ts`, `src/lib/bonus-settings.ts`
- **Turnaround**: `src/lib/turnaround.ts`, `src/lib/turnaround-settings.ts`
- **Packages**: `src/components/PackageList.tsx`, `src/components/BundleBox.tsx`

## Quote/Statement
- **Quote Maker**: `src/components/admin/QuoteMaker.tsx`
- **Quote Page**: `src/app/hr-admin/(panel)/quote/page.tsx`

## Admin Panel
- **Admin Nav**: `src/components/admin/AdminNav.tsx`
- **Artist Management**: `src/components/admin/ArtistPicker.tsx`, `src/components/admin/ArtistTable.tsx`, `src/lib/artist-admin.ts`
- **Work Management**: `src/components/admin/WorkPicker.tsx`, `src/components/admin/WorkBasics.tsx`
- **Admin Actions**: `src/app/hr-admin/(panel)/actions.ts`
- **Admin Menu**: `src/lib/admin-menu.ts`

## Statistics/Tracking
- **Tracker**: `src/components/Tracker.tsx`
- **Track Logic**: `src/lib/track.ts`
- **Stats API**: `src/app/api/stat/route.ts`
- **Stats Page**: `src/app/hr-admin/(panel)/stats/page.tsx`
- **Stats Utils**: `src/lib/stats.ts`

## Site Configuration
- **Site Data**: `src/lib/site-data.ts`
- **Guide**: `src/lib/guide.ts`, `src/lib/guide-settings.ts`
- **Status**: `src/lib/status.ts`, `src/lib/status-settings.ts`
- **Social**: `src/lib/social.ts`, `src/lib/social-settings.ts`

## UI Components
- **Header**: `src/components/Header.tsx`
- **Bottom Nav**: `src/components/BottomNav.tsx`
- **Modal**: `src/components/Modals.tsx`, `src/components/ModalContext.ts`
- **Icons**: `src/components/Icons.tsx`
- **Contact**: `src/components/Contact.tsx`
- **Owner Mark**: `src/components/admin/OwnerMark.tsx`

## Utilities
- **Copy**: `src/lib/copy.ts`
- **I18n**: `src/lib/i18n.ts`
- **Types**: `src/lib/types.ts`
- **Sample Data**: `src/lib/sample-data.ts`

## Styles
- **Global CSS**: `src/app/globals.css`
- **Admin CSS**: `src/app/hr-admin/admin.css`

## Grep Quick Reference

### Find by Feature
```bash
# Authentication
grep -r "auth\|guard\|permission" src/lib/auth/

# Portfolio
grep -r "work\|portfolio\|WorkCard" src/components/ src/lib/

# Pricing
grep -r "price\|rate\|discount\|bonus" src/lib/ src/components/

# Quote
grep -r "quote\|QuoteMaker" src/components/ src/app/hr-admin/

# Admin
grep -r "admin\|AdminNav\|ArtistPicker" src/components/admin/ src/app/hr-admin/

# Stats
grep -r "stat\|track\|Tracker" src/lib/ src/components/ src/app/api/
```
