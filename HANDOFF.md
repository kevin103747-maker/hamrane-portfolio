# Handoff Document

## Project Overview
- **Name**: Hamrane Portfolio
- **Repository**: https://github.com/kevin103747-maker/hamrane-portfolio
- **Tech Stack**: Next.js 16, React 19, Tailwind CSS 4, Supabase
- **Purpose**: Artist portfolio and commission management platform

## Recent Work Completed

### 1. Mobile Theme Switch Height Fix (Latest)
- **Issue**: Theme switch button had incorrect height on narrow mobile screens
- **Solution**: Set height to 32px to match other buttons (cta-m)
- **Files Modified**: `src/app/globals.css`
- **Commits**:
  - `f6ccbaf`: Fix theme switch height to match other buttons on mobile
  - `928e9f7`: Fix theme switch height on narrow mobile screens (initial attempt)

### 2. AI Agent Optimization
- **Goal**: Make project efficient for multiple AI agents with minimal token usage
- **Changes**:
  - Created `.devin/skills/` with three skills:
    - `css-guide`: Navigate globals.css (92KB, 1603 lines)
    - `nextjs-patterns`: Next.js App Router patterns
    - `supabase-guide`: Supabase database and auth patterns
  - Created `.devin/rules/` with glob-triggered rules:
    - `admin-panel.md`: Admin panel specific rules
    - `public-pages.md`: Public site rules
    - `supabase-data.md`: Supabase data access rules
  - Updated `AGENTS.md` for universal AI compatibility
  - Added `.devin/config.json` with permission settings
- **Commits**:
  - `2a9fadb`: Add AI agent optimization: Skills and glob-triggered rules
  - `b74119a`: Update AGENTS.md for universal AI agent compatibility

### 3. Project Cleanup
- **Removed**: Duplicate `hamrane-portfolio/` folder
- **Added**: `README.md` with project documentation
- **Improved**: `.gitignore` with standard patterns
- **Commit**: `c90f1f4`: Optimize for AI agent collaboration: add config files and documentation

## Current Project State

### File Structure
```
src/
├── app/
│   ├── (site)/           # Public pages
│   ├── hr-admin/         # Admin panel
│   ├── api/              # API routes
│   └── globals.css       # Global styles (92KB, 1603 lines)
├── components/           # React components
├── lib/                  # Utilities & data logic
└── scripts/              # Build scripts
```

### Key Configuration Files
- `AGENTS.md`: AI agent guidelines (universal compatibility)
- `.devin/config.json`: Devin CLI permissions
- `.devin/skills/`: Devin-specific skills (css-guide, nextjs-patterns, supabase-guide)
- `.devin/rules/`: Devin-specific rules with glob triggers
- `README.md`: Project documentation
- `.gitignore`: Standard Next.js patterns

### Environment Variables
Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (admin only, never commit)

## Important Notes

### DO NOT Change
- **Functionality**: All features must work exactly as before
- **Visuals**: No visual changes unless explicitly requested
- **Secrets**: Never commit service role keys or environment variables

### DO
- Run `npm run typecheck` before completing tasks
- Follow patterns in `AGENTS.md`
- Use Devin Skills when working with CSS, Next.js, or Supabase
- Test on mobile after responsive changes

### CSS Navigation
`src/app/globals.css` is large (92KB, 1603 lines). Use this index:
- Lines 1-43: Theme setup, CSS variables
- Lines 44-70: Base styles, GNB
- Lines 94-267: Common components
- Lines 639-1029: Admin & pricing
- Lines 1147-1603: Mobile responsiveness

Or use the `css-guide` skill (Devin only).

## Development Commands
```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run start        # Start production server
npm run typecheck    # TypeScript type check
```

## Known Issues
None at this time.

## Next Steps (Suggestions)
1. No immediate tasks - all recent work is complete
2. If adding new features, check existing patterns in `src/lib/` and `src/components/`
3. For styling changes, use Tailwind CSS classes first, custom CSS in globals.css only when necessary

## Deployment
- **Platform**: Vercel
- **Branch**: main
- **Build Command**: `npm run build`
- **Status**: Currently deployed and live

## Contact
- GitHub: https://github.com/kevin103747-maker/hamrane-portfolio
- Last Updated: 2026-10-08
