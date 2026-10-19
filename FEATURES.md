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
- **Pricing Example Works**: `src/components/GroupWorks.tsx`, `src/lib/pricing-works.ts`, `src/app/hr-admin/(panel)/pricing-works/` (page.tsx, actions.ts)


## Quote/Statement
- **Quote Maker**: `src/components/admin/QuoteMaker.tsx`
- **Quote Page**: `src/app/hr-admin/(panel)/quote/page.tsx`
- **Quote Store**: `src/lib/quote-store.ts` (문서 번호, 보관함, 프리셋)
- **Quote Accounts**: `src/lib/quote-accounts.ts` (서버 저장 입금 계좌)

## Admin Panel
- **Admin Nav**: `src/components/admin/AdminNav.tsx`
- **Artist Management**: `src/components/admin/ArtistPicker.tsx`, `src/components/admin/ArtistTable.tsx`, `src/lib/artist-admin.ts`
- **Work Management**: `src/components/admin/WorkPicker.tsx`, `src/components/admin/WorkBasics.tsx`,     'ScopeFeatured.tsx'
- **Admin Actions**: `src/app/hr-admin/(panel)/actions.ts`
- **Admin Menu**: `src/lib/admin-menu.ts`

## Drops (Free Download Pages)
- **Public Page**: `src/app/dl/[slug]/page.tsx`
- **Download Redirect**: `src/app/dl/[slug]/get/[kind]/route.ts`
- **Page Body (public + admin preview)**: `src/components/drop/DropPage.tsx`, `DropTheme.tsx`, `DropTracker.tsx`
- **Helpers**: `src/lib/drops.ts`
- **Admin**: `src/app/hr-admin/(panel)/drops/` (page.tsx, actions.ts), `src/components/admin/DropActions.tsx`
- **Admin Preview**: `src/app/hr-admin/drop-preview/[id]`

## Statistics/Tracking
- **Tracker**: `src/components/Tracker.tsx`
- **Track Logic**: `src/lib/track.ts`
- **Stats API**: `src/app/api/stat/route.ts`
- **Stats Page**: `src/app/hr-admin/(panel)/stats/page.tsx`
- **Stats CSV**: `src/app/hr-admin/(panel)/stats/csv/route.ts`
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
- **Recent Marquee**: `src/components/RecentMarquee.tsx`
- **Social Links**: `src/components/SocialLinks.tsx`
- **Owner Mark**: `src/components/admin/OwnerMark.tsx`

## Utilities
- **Copy**: `src/lib/copy.ts`
- **I18n**: `src/lib/i18n.ts`
- **Types**: `src/lib/types.ts`
- **Sample Data**: `src/lib/sample-data.ts`

## Styles
- **Global CSS**: `src/app/globals.css`
- **Admin CSS**: `src/app/hr-admin/admin.css`
