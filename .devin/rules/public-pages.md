---
description: "Public site pages and components rules"
trigger: glob
globs: ["src/app/(site)/**/*", "src/components/!(admin)/**/*"]
---

# Public Site Guidelines

When working with public site code:
- Use server components by default
- Add 'use client' only for interactivity (state, events, browser APIs)
- Use Next.js Image component for all images
- Profile image fallback: `/character.png`
- Styling: Tailwind CSS + globals.css (use css-guide skill)
- No authentication required for public pages
- Use Supabase anon key for public data queries
