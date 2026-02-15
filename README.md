# CertificationHub

A comprehensive certification management system built with Next.js 16, featuring role-based access control for administrators, mandate owners, and attesters.

## 🚀 Features

- **Role-Based Access Control**: Separate dashboards and permissions for admins, mandate owners, and attesters
- **Certification Management**: Create, assign, and track certifications across teams
- **AI-Powered Question Generation**: Leverage Google Gemini AI to generate certification questions
- **Real-Time Notifications**: Stay updated on certification submissions and assignments
- **Responsive Design**: Works seamlessly across desktop, tablet, and mobile devices
- **Modern UI**: Built with shadcn/ui components and Tailwind CSS

## 🛠️ Technology Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Database**: PostgreSQL (Neon)
- **ORM**: Drizzle ORM
- **Authentication**: Custom session-based authentication with bcrypt
- **AI**: Google Gemini API
- **UI**: shadcn/ui + Tailwind CSS
- **Deployment**: Vercel

## 📋 Prerequisites

Before you begin, ensure you have:

- Node.js 18+ installed
- npm or yarn package manager
- A Neon Postgres database ([Get one free at neon.tech](https://neon.tech))
- A Google Gemini API key ([Get one at AI Studio](https://aistudio.google.com/app/apikey))

## 🏁 Local Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd certification-management-system
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in your actual values:

```bash
# Database (required)
DATABASE_URL=postgresql://user:password@your-neon-host.neon.tech/certificationhub?sslmode=require

# AI Service (required)
GEMINI_API_KEY=your_actual_gemini_api_key

# Session Security (required)
# Generate with: openssl rand -base64 32
SESSION_SECRET=your_generated_32_character_secret

# Application Environment
NODE_ENV=development
```

**Generating SESSION_SECRET:**

```bash
# Using OpenSSL
openssl rand -base64 32

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 4. Set Up Database

#### Generate and run migrations:

```bash
npm run db:generate
npm run db:push
```

#### Seed the database with initial admin user:

```bash
npm run seed
```

This creates an admin user with:
- Email: `admin@certificationhub.com`
- Password: `Admin@123`
- **⚠️ You must change this password on first login**

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 6. Login

Use the seeded admin credentials:
- Email: `admin@certificationhub.com`
- Password: `Admin@123`

You'll be prompted to change your password immediately.

## 📦 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate new database migration |
| `npm run db:migrate` | Run pending migrations |
| `npm run db:push` | Push schema changes (development only) |
| `npm run db:studio` | Open Drizzle Studio (database GUI) |
| `npm run seed` | Seed database with initial data |

## 🗄️ Database Management

### Creating Migrations

When you modify the database schema in `src/db/schema.ts`:

```bash
# Generate migration files
npm run db:generate

# Apply migrations
npm run db:migrate
```

### Development Quick Push

For rapid development, you can push schema changes directly without migrations:

```bash
npm run db:push
```

**⚠️ Warning**: Only use `db:push` in development. Always use migrations in production.

### Database GUI

Explore your database with Drizzle Studio:

```bash
npm run db:studio
```

## 🚢 Deployment to Vercel

### Prerequisites

1. A Vercel account ([Sign up free](https://vercel.com))
2. Vercel CLI installed: `npm i -g vercel`
3. Production Neon database ready

### Deployment Steps

#### 1. Connect to Vercel

```bash
vercel login
vercel link
```

#### 2. Set Environment Variables

Set these in Vercel Dashboard (Project Settings → Environment Variables):

```
DATABASE_URL=<your-production-neon-connection-string>
GEMINI_API_KEY=<your-gemini-api-key>
SESSION_SECRET=<generate-new-32-char-secret-for-production>
NODE_ENV=production
```

**Important**: Generate a **new** SESSION_SECRET for production!

#### 3. Deploy

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

#### 4. Run Database Migrations

After deployment, run migrations on your production database:

```bash
# Set DATABASE_URL to production database
export DATABASE_URL="your-production-database-url"

# Run migrations
npm run db:migrate

# Seed if needed
npm run seed
```

### Vercel Configuration

The project includes a `vercel.json` configuration file that:
- Sets the build command
- Configures environment variables
- Specifies the deployment region

## 🔐 Security Best Practices

- ✅ Never commit `.env.local` to version control
- ✅ Use different SESSION_SECRET values for development and production
- ✅ Rotate SESSION_SECRET periodically in production
- ✅ Use strong passwords and enable 2FA on Vercel and Neon accounts
- ✅ Regularly update dependencies: `npm audit fix`

## 📁 Project Structure

```
certification-management-system/
├── src/
│   ├── app/                  # Next.js App Router pages
│   │   ├── admin/           # Admin dashboard and pages
│   │   ├── mandate-owner/   # Mandate owner pages
│   │   ├── attester/        # Attester pages
│   │   └── api/             # API routes
│   ├── components/          # React components
│   │   ├── ui/             # shadcn/ui components
│   │   └── navigation/     # Navigation components
│   ├── db/                  # Database schema and config
│   ├── lib/                 # Utility functions
│   └── middleware.ts        # Route protection middleware
├── scripts/
│   └── seed.ts             # Database seeding script
├── drizzle/                 # Database migrations
├── public/                  # Static assets
├── .env.example            # Environment variables template
├── .env.local              # Your local environment (gitignored)
├── drizzle.config.ts       # Drizzle ORM configuration
├── vercel.json             # Vercel deployment config
└── package.json            # Dependencies and scripts
```

## 🧑‍💼 User Roles

### Admin
- Manage all users (create, edit, delete)
- Manage mandates
- View all certifications
- Full system access

### Mandate Owner
- Create and manage certifications
- Assign attesters to certifications
- View attestation responses
- Generate questions with AI

### Attester
- View assigned certifications
- Complete attestations
- Submit responses
- Track completion status

## 🐛 Troubleshooting

### Database Connection Issues

```bash
# Test connection
node -e "const { Pool } = require('@neondatabase/serverless'); const pool = new Pool({ connectionString: process.env.DATABASE_URL }); pool.query('SELECT NOW()').then(r => console.log('✅ Connected:', r.rows[0])).catch(e => console.error('❌ Error:', e));"
```

### Missing Environment Variables

If you see "Environment variable not found" errors:
1. Ensure `.env.local` exists and has all required variables
2. Restart the dev server after changing environment variables

### Build Errors

```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Try building again
npm run build
```

### Database Schema Out of Sync

```bash
# Reset and regenerate
npm run db:push
```

## 📄 License

This project is private and proprietary.

## 🤝 Support

For issues and questions, please contact the development team.

---

Built with ❤️ using Next.js, Drizzle ORM, and shadcn/ui
