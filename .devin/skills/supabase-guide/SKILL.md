---
name: supabase-guide
description: "Supabase database and authentication patterns for this project"
trigger: agent
---

# Supabase Usage Guide

This project uses Supabase for database and authentication. Follow these patterns when working with data.

## Client Initialization

### Server Components
```tsx
import { createClient } from '@/lib/supabase/server'

export default async function Page() {
  const supabase = createClient()
  const { data, error } = await supabase.from('table').select('*')
  // ...
}
```

### Client Components
```tsx
'use client'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export default function Component() {
  const [data, setData] = useState([])
  const supabase = createClient()

  useEffect(() => {
    supabase.from('table').select('*').then(({ data }) => setData(data))
  }, [])
  // ...
}
```

## Authentication

### Server-Side Auth Check
```tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdminPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/hr-admin/login')
  }

  // Check admin role in database
  const { data: admin } = await supabase
    .from('admins')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!admin) {
    redirect('/hr-admin/denied')
  }

  return <div>Admin content</div>
}
```

### Client-Side Auth
```tsx
'use client'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginButton() {
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google' })
  }

  return <button onClick={handleLogin}>Login</button>
}
```

## Database Queries

### Basic Select
```tsx
const { data, error } = await supabase
  .from('works')
  .select('*')
  .eq('published', true)
  .order('created_at', { ascending: false })
```

### Join Queries
```tsx
const { data } = await supabase
  .from('works')
  .select(`
    *,
    artists (name, avatar_url)
  `)
```

### Real-time Subscriptions
```tsx
supabase
  .channel('table-changes')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'works' }, payload => {
    console.log('Change:', payload)
  })
  .subscribe()
```

## Server Actions

### Mutation Example
```tsx
'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateWork(id: string, updates: object) {
  const supabase = createClient()
  const { error } = await supabase
    .from('works')
    .update(updates)
    .eq('id', id)

  if (error) throw error
  revalidatePath('/portfolio')
}
```

## Environment Variables

Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anon key (public)
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key (admin only, never commit)

## Security Best Practices

1. **Never commit service role keys** to git
2. **Use RLS (Row Level Security)** on Supabase tables
3. **Validate user permissions** server-side before mutations
4. **Use server actions** for data mutations (not client-side)
5. **Sanitize user input** before database operations

## Common Tables

Based on the codebase, these tables likely exist:
- `works`: Portfolio/works data
- `artists`: Artist information
- `admins`: Admin users and permissions
- `packages`: Pricing packages
- `discounts`: Discount rules
- `turnaround`: Turnaround times by track

## Error Handling

```tsx
const { data, error } = await supabase.from('table').select('*')

if (error) {
  console.error('Supabase error:', error)
  // Handle error appropriately
  return <div>Error loading data</div>
}
```

## File Locations

- Server client: `src/lib/supabase/server.ts`
- Client client: `src/lib/supabase/client.ts`
- Admin auth: `src/lib/auth/admin-db.ts`
- Auth utilities: `src/lib/auth/`
