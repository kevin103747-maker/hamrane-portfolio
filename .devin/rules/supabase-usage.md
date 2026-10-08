---
description: "Supabase database and auth patterns"
trigger: always_on
---

# Supabase Usage Guidelines

- Server components: import from `@supabase/ssr`
- Client components: import from `@supabase/supabase-js`
- Client initialization: `src/lib/supabase.ts`
- Auth: Supabase Auth with OAuth and MFA support
- Server Actions: 5MB body limit for image uploads
- Never commit service role keys or secrets
