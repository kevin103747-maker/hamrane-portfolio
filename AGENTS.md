# Developer Preferences
- Always communicate, explain, and reply in Korean.
- Write code commits or system logs in English if needed, but chat response must be Korean.
- Follow the project technology stack closely.

# Quick Start
- Tech: Next.js 16, React 19, Tailwind CSS 4, Supabase
- Dev: `npm run dev` | Build: `npm run build` | Check: `npm run typecheck`
- Path alias: `@/*` → `src/*`
- DO NOT change functionality or visuals - optimize only

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
