# Hamrane Portfolio

아티스트 포트폴리오 및 커미션 관리 플랫폼

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI**: React 19
- **Styling**: Tailwind CSS 4
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (OAuth + MFA)
- **TypeScript**: 5.6.0
- **Build**: Turbopack

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase project
- Environment variables configured

### Installation

```bash
npm install
```

### Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Build

```bash
npm run build
npm run start
```

### Type Check

```bash
npm run typecheck
```

## Project Structure

```
src/
├── app/              # Next.js App Router
│   ├── (site)/      # Public pages
│   ├── hr-admin/    # Admin panel
│   └── api/         # API routes
├── components/      # React components
├── lib/            # Utilities & data logic
└── scripts/        # Build scripts
```

## Features

- Public portfolio showcase
- Commission pricing and packages
- Admin panel with authentication
- Artist management
- Status tracking
- Multi-factor authentication

## Deployment

Deployed on Vercel. See `vercel.json` for configuration.

## License

MIT
