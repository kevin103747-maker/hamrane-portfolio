# Developer Preferences
- Always communicate, explain, and reply in Korean.
- Write code commits or system logs in English if needed, but chat response must be Korean.
- Follow the project technology stack closely.

# Quick Start
- Tech: Next.js 16, React 19, Tailwind CSS 4, Supabase
- Dev: `npm run dev` | Build: `npm run build` | Check: `npm run check`
- Path alias: `@/*` → `src/*`
- DO NOT change functionality or visuals - optimize only

# Key Patterns
- Use `@supabase/ssr` for server components, `@supabase/supabase-js` for client
- Images: Next.js Image component from `next/image`
- Auth: Supabase Auth with MFA support
- Server Actions: 5MB body limit configured
- Supabase client: `src/lib/supabase.ts`

# Verification
Before completing tasks: run `npm run typecheck`
