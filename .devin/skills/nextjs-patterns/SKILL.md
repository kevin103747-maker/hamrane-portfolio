---
name: nextjs-patterns
description: "Next.js App Router patterns and component guidelines for this project"
trigger: agent
---

# Next.js App Router Patterns

This project uses Next.js 16 with App Router. Follow these patterns when working with React components.

## Component Guidelines

### Server vs Client Components

- **Default**: Use Server Components (no 'use client' directive)
- **Add 'use client' only when needed**: State, event handlers, browser APIs
- **Keep client components small**: Extract logic to server components when possible

### File Structure

```
src/app/
├── (site)/           # Public pages (route group)
│   ├── page.tsx      # Home
│   ├── portfolio/    # Portfolio page
│   ├── pricing/      # Pricing page
│   └── guide/        # Guide page
├── hr-admin/         # Admin panel
│   ├── (panel)/      # Admin sub-pages
│   ├── login/        # Login
│   └── mfa/          # 2FA
├── api/              # API routes
└── layout.tsx        # Root layout
```

### Common Patterns

#### 1. Server Component with Data Fetching
```tsx
import { createClient } from '@/lib/supabase/server'

export default async function Page() {
  const supabase = createClient()
  const { data } = await supabase.from('table').select('*')
  return <div>{/* render data */}</div>
}
```

#### 2. Client Component with Interactivity
```tsx
'use client'
import { useState } from 'react'

export default function Button() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>
}
```

#### 3. Server Actions
```tsx
'use server'
import { revalidatePath } from 'next/cache'

export async function updateData(id: string) {
  // Update logic
  revalidatePath('/')
}
```

## Import Patterns

### Supabase
- Server components: `import { createClient } from '@/lib/supabase/server'`
- Client components: `import { createClient } from '@/lib/supabase/client'`

### Components
- Use path alias: `import { Component } from '@/components/Component'`
- Shared utilities: `import { helper } from '@/lib/helper'`

### Images
- Always use Next.js Image: `import Image from 'next/image'`
- Profile fallback: `/character.png`

## Layout Patterns

### Route Groups
- `(site)`: Groups public pages without affecting URL
- `(panel)`: Groups admin panel pages

### Nested Layouts
- Root layout: `src/app/layout.tsx`
- Admin layout: `src/app/hr-admin/layout.tsx`
- Panel layout: `src/app/hr-admin/(panel)/layout.tsx`

## Styling

- Use Tailwind CSS classes
- Custom CSS in `src/app/globals.css` (use css-guide skill for navigation)
- No external CSS-in-JS libraries

## Type Safety

- All components should be typed with TypeScript
- Use proper prop interfaces
- Server actions should have typed parameters

## Performance

- Use dynamic imports for heavy components: `import dynamic from 'next/dynamic'`
- Optimize images with Next.js Image component
- Use loading states for async operations
