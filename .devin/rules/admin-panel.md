---
description: "Admin panel specific rules and patterns"
trigger: glob
globs: ["src/app/hr-admin/**/*", "src/components/admin/**/*", "src/lib/admin-*.ts"]
---

# Admin Panel Guidelines

When working with admin panel code:
- All admin pages require authentication check
- Use server actions for data mutations
- Validate permissions before allowing actions
- Use Supabase service role key for admin operations (server-side only)
- Admin UI uses consistent patterns from `src/components/admin/`
- Server actions in `src/app/hr-admin/actions.ts` and `src/app/hr-admin/(panel)/*/actions.ts`
