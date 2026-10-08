---
description: "Supabase data access patterns"
trigger: glob
globs: ["src/lib/supabase.ts", "src/lib/supabase/**/*", "src/lib/auth/**/*"]
---

# Supabase Data Access

When working with Supabase:
- Server components: import from `@supabase/ssr`
- Client components: import from `@supabase/supabase-js`
- Server client: `src/lib/supabase/server.ts`
- Client client: `src/lib/supabase/client.ts`
- Never commit service role keys
- Use RLS policies for security
- Validate permissions server-side
