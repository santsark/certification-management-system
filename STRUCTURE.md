# Project Structure

## Root Directory
```
hidden-aurora/
├── .env.example              # Environment variable template
├── .gitignore               # Git ignore rules
├── README.md                # Project documentation
├── components.json          # Shadcn/ui configuration
├── drizzle.config.ts       # Drizzle Kit configuration
├── eslint.config.mjs       # ESLint configuration
├── next.config.ts          # Next.js configuration
├── next-env.d.ts           # Next.js TypeScript definitions
├── package.json            # Dependencies and scripts
├── postcss.config.mjs      # PostCSS configuration
├── tsconfig.json           # TypeScript configuration
│
├── drizzle/                # Database migrations
│   └── 0000_flowery_umar.sql
│
├── public/                 # Static assets
│
└── src/                    # Source code
    ├── app/                # Next.js App Router
    │   ├── favicon.ico
    │   ├── fonts/
    │   ├── globals.css     # Global styles
    │   ├── layout.tsx      # Root layout
    │   └── page.tsx        # Homepage
    │
    ├── db/                 # Database layer
    │   ├── db.ts          # Database connection
    │   ├── examples.ts    # Usage examples
    │   ├── index.ts       # Exports
    │   └── schema.ts      # Drizzle schema
    │
    └── lib/               # Utilities
        └── utils.ts       # Shadcn utilities
```

## Key Files

### Database Configuration

**`src/db/schema.ts`** (3.0 KB)
- Drizzle ORM schema definitions
- Users, mandates, and sessions tables
- Enums for roles and statuses
- Relations and indexes
- TypeScript type exports

**`src/db/db.ts`** (328 bytes)
- Neon Postgres connection
- Drizzle instance initialization
- Environment variable validation

**`src/db/examples.ts`** (5.3 KB)
- Database usage examples
- Common query patterns
- Authentication helpers
- CRUD operation templates

**`drizzle.config.ts`** (282 bytes)
- Migration configuration
- Database credentials
- Schema path definition

### Build & Configuration

**`package.json`** (1.1 KB)
- Dependencies:
  - next@16.1.6
  - drizzle-orm@^0.45.1
  - @neondatabase/serverless@^1.0.2
  - bcrypt@^6.0.0
  - shadcn/ui components
- Scripts:
  - `dev`, `build`, `start`, `lint`
  - `db:generate`, `db:migrate`, `db:push`, `db:studio`

**`tsconfig.json`** (670 bytes)
- Strict TypeScript settings
- Path aliases (@/*)
- App Router configuration

### Documentation

**`README.md`** (4.2 KB)
- Complete setup guide
- Database schema documentation
- Available scripts
- Next steps for development

**`.env.example`** (166 bytes)
- Environment variable template
- Database URL format
- Setup instructions

## Database Schema Size

```
Total Schema Size: ~3.1 KB
├── Enums: 2 types
├── Tables: 3 tables
├── Indexes: 3 explicit indexes
├── Foreign Keys: 3 relationships
├── Relations: Type-safe relationships
└── Types: 6 exported TypeScript types
```

## Dependencies Overview

### Production
- **next**: 16.1.6 (React framework)
- **drizzle-orm**: 0.45.1 (SQL ORM)
- **@neondatabase/serverless**: 1.0.2 (Postgres driver)
- **bcrypt**: 6.0.0 (Password hashing)
- **tailwindcss**: 4.x (Styling)
- **shadcn/ui**: Latest (UI components)

### Development
- **drizzle-kit**: 0.31.8 (Migration tool)
- **typescript**: 5.x (Type checking)
- **eslint**: 9.x (Linting)
- **@types/bcrypt**: 6.0.0 (Type definitions)

## Total Project Size

```
Source Code (src/): ~9 KB
Configuration: ~3 KB
Documentation: ~4 KB
Migrations: ~2 KB
───────────────────────
Total (excluding node_modules): ~18 KB
```

## Next Files to Create

For a complete application, you'll need to add:

1. **Authentication API Routes**
   - `src/app/api/auth/login/route.ts`
   - `src/app/api/auth/register/route.ts`
   - `src/app/api/auth/logout/route.ts`

2. **Middleware**
   - `src/middleware.ts` (session validation)

3. **UI Pages**
   - `src/app/login/page.tsx`
   - `src/app/register/page.tsx`
   - `src/app/dashboard/page.tsx`
   - `src/app/mandates/page.tsx`

4. **Components**
   - `src/components/auth/login-form.tsx`
   - `src/components/mandates/mandate-list.tsx`
   - `src/components/layout/navbar.tsx`

5. **Server Actions**
   - `src/app/actions/auth.ts`
   - `src/app/actions/mandates.ts`

6. **Utilities**
   - `src/lib/session.ts`
   - `src/lib/auth.ts`
