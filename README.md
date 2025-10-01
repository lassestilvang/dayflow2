# DayFlow - Daily Task & Calendar Planner

A production-ready Next.js 15 application for comprehensive daily planning, combining task management with calendar integration.

## 🚀 Features

- **Calendar Management**: Hourly time blocks, week/day/month views
- **Task Tracking**: Tasks with priorities, categories, subtasks, and due dates
- **Category System**: Work, Family, Personal, Travel with color coding
- **Dark Mode**: Built-in dark theme support
- **Database Integration**: PostgreSQL with Drizzle ORM
- **Authentication**: NextAuth with Google OAuth
- **State Management**: Zustand for client-side state
- **Testing**: Jest for unit tests, Playwright for E2E tests
- **Type Safety**: Full TypeScript support with strict mode

## 📋 Tech Stack

### Core

- **Next.js 15** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type safety

### UI & Styling

- **Tailwind CSS** - Utility-first CSS
- **shadcn/ui** - Component library
- **Framer Motion** - Animations
- **Lucide React** - Icons

### State & Data

- **Zustand** - State management
- **Drizzle ORM** - Type-safe database ORM
- **Neon Database** - Serverless PostgreSQL
- **React Hook Form** - Form management
- **Zod** - Schema validation

### Authentication & Integration

- **NextAuth v5** - Authentication
- **Upstash Redis** - Session storage
- **Google OAuth** - Authentication provider

### Testing

- **Jest** - Unit testing
- **React Testing Library** - Component testing
- **Playwright** - E2E testing

### Utilities

- **date-fns** - Date manipulation
- **@dnd-kit** - Drag and drop

## 🛠️ Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- PostgreSQL database (Neon recommended)
- Google OAuth credentials
- Upstash Redis instance

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd dayflow
```

2. Install dependencies:

```bash
pnpm install
```

3. Set up environment variables:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

- `DATABASE_URL`: Your PostgreSQL connection string
- `NEXTAUTH_SECRET`: Generate with `openssl rand -base64 32`
- `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`: From Google Cloud Console
- `UPSTASH_REDIS_URL` & `UPSTASH_REDIS_TOKEN`: From Upstash console

4. Set up the database:

```bash
pnpm db:generate
pnpm db:push
```

5. Run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## 📁 Project Structure

```
dayflow/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes
│   │   │   ├── auth/          # NextAuth endpoints
│   │   │   ├── tasks/         # Task CRUD operations
│   │   │   └── events/        # Event CRUD operations
│   │   ├── dashboard/         # Dashboard page
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Home page
│   ├── components/            # React components
│   │   ├── ui/               # shadcn/ui components
│   │   ├── calendar/         # Calendar components
│   │   ├── tasks/            # Task components
│   │   └── layout/           # Layout components
│   ├── lib/                  # Utilities and configurations
│   │   ├── db/               # Database schema and connection
│   │   ├── auth.ts           # NextAuth configuration
│   │   ├── store.ts          # Zustand store
│   │   └── utils.ts          # Utility functions
│   ├── hooks/                # Custom React hooks
│   ├── types/                # TypeScript type definitions
│   └── styles/               # Global styles
├── tests/                    # Test files
│   ├── unit/                # Unit tests
│   └── e2e/                 # E2E tests
├── drizzle/                 # Database migrations
└── public/                  # Static assets
```

## 🧪 Testing

### Unit Tests

```bash
pnpm test
pnpm test:watch
```

### E2E Tests

```bash
pnpm test:e2e
pnpm test:e2e:ui
```

## 📦 Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm type-check` - Run TypeScript type checking
- `pnpm test` - Run unit tests
- `pnpm test:e2e` - Run E2E tests
- `pnpm db:generate` - Generate database migrations
- `pnpm db:push` - Push schema changes to database
- `pnpm db:studio` - Open Drizzle Studio

## 🎨 Category Colors

- **Work**: Blue (#3B82F6)
- **Family**: Green (#10B981)
- **Personal**: Orange (#F97316)
- **Travel**: Purple (#A855F7)

## 🔐 Environment Variables

See `.env.example` for all required environment variables.

Required:

- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_URL` - Application URL
- `NEXTAUTH_SECRET` - Secret for JWT encryption
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `UPSTASH_REDIS_URL` - Upstash Redis URL
- `UPSTASH_REDIS_TOKEN` - Upstash Redis token

## 📝 Database Schema

The application uses Drizzle ORM with PostgreSQL. Key tables:

- `users` - User accounts
- `tasks` - User tasks with subtasks
- `events` - Calendar events
- `categories` - Task/event categories
- `calendar_integrations` - External calendar connections
- `task_integrations` - External task manager connections
- `shared_events` - Collaborative events

## 🚧 Development

This is the project foundation. The following features are ready to be implemented:

1. Full authentication flow
2. Task CRUD operations
3. Event CRUD operations
4. Calendar integrations (Google, Outlook, Apple)
5. Task integrations (Todoist, Notion, Asana)
6. Drag-and-drop functionality
7. Real-time updates
8. Collaboration features
9. Mobile responsiveness
10. Progressive Web App (PWA) support

## 📄 License

This project is licensed under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

Built with ❤️ using Next.js 15
