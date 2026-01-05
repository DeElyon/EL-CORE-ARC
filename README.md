# EL VERSE - ARC CORE Backend

The unified backend monorepo for the entire EL VERSE ecosystem, powering all five platforms:
- **ELCODERS** - Professional Developer Platform
- **EL ACCESS** - Internship & Growth Portal
- **NEXEL** - Social Media & Marketplace (Web & Mobile)
- **MY SPACE** - Freelance Marketplace
- **ELITES** - Education & Certification Platform

## 🏗️ Architecture

ARC CORE is built as a **Modular Monolith** within a **Monorepo** structure, ensuring:
- ✅ Single Source of Truth (Unified Database)
- ✅ Shared WTH Coin Wallet System
- ✅ Unified AI Hub (5 AI Personalities)
- ✅ Independent Frontend Deployments
- ✅ Real-time Features via WebSockets

## 📂 Project Structure

```
/EL-CORE-ARC
├── /apps
│   └── /arc-core-api          # Main NestJS API Gateway
├── /libs                       # Shared Infrastructure
│   ├── /ai-hub                 # AI Engine (Nelly, Lina, Uno, Buddy, Librarian)
│   ├── /auth-bridge            # Verse-ID SSO & JWT
│   ├── /database               # Prisma Schema & Service
│   └── /wallet-engine          # WTH Coin Ledger & Escrow
├── /services                    # Domain Services
│   ├── /nexel-service          # Social, Pulse, Marketplace
│   ├── /coders-service         # IDE, Projects, Milestones
│   ├── /access-service         # Internships, Tasks
│   ├── /myspace-service        # Jobs, Bids, Squads
│   └── /elites-service          # Courses, Lessons, Certifications
└── /infrastructure             # Docker, K8s, Env
```

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- pnpm (recommended) or npm
- PostgreSQL 15+
- Redis (optional, for caching)

### Installation

1. **Clone and install dependencies:**
```bash
pnpm install
```

2. **Set up environment variables:**
```bash
cp .env.example .env
# Edit .env with your database and API keys
```

3. **Set up database:**
```bash
# Generate Prisma Client
pnpm db:generate

# Run migrations
pnpm db:migrate

# Or push schema (dev only)
pnpm db:push
```

4. **Start development server:**
```bash
pnpm dev
```

The API will be available at `http://localhost:3000`
Swagger docs at `http://localhost:3000/docs`

### Docker Setup

```bash
# Start all services (PostgreSQL, Redis, API)
docker-compose up -d

# View logs
docker-compose logs -f api
```

## Media uploads, workers & realtime (S3 / WebSocket)

Notes and commands to run the S3 upload flow, processing worker, and realtime gateways used by NEXEL/ELITES/NEXEL streams.

- Required environment variables (minimum):
  - `DATABASE_URL` : Postgres connection string
  - `JWT_SECRET` : API JWT secret
  - `S3_BUCKET` : S3 bucket name for media
  - `S3_REGION` : S3 region (default `us-east-1`)
  - `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` : AWS credentials
  - `CDN_DOMAIN` : Optional CDN host for fallback URLs
  - `UPLOAD_COMPLETE_TOKEN` : Secret header token used by storage to call `/media/:id/complete`
  - `REDIS_URL` : (optional) for job queues and scaling

- Generate Prisma client and run migrations before starting the API or workers:

```bash
pnpm db:generate
pnpm db:migrate
```

- Start API (includes WebSocket gateways for `call` and `stream` namespaces):

```bash
pnpm start:api
# or
pnpm dev
```

- Start the upload worker (polls `Media.status = UPLOADED` and runs processing):

```bash
npm run upload-worker
```

Notes:
- The `MediaService` provides `createUploadRecord(...)` which returns a presigned PUT URL (S3) when `S3_BUCKET` is configured. Clients should PUT the file to that presigned URL, then the storage system (or the client) must call `POST /media/:id/complete` with the `x-upload-complete-token` header to enqueue processing.
- The `upload-worker` and `queue-worker` expect the same codebase imports to resolve (monorepo aliases like `@el-verse/database`). Ensure you run inside the monorepo with dependencies installed and `pnpm db:generate` run so `@prisma/client` and the `libs/database` package are available.
- If tests or workers fail with "Cannot find module '@el-verse/database'", run `pnpm install` and `pnpm db:generate`, or run via the monorepo toolchain (`pnpm --filter ./libs/database exec prisma generate`) so path aliases and generated Prisma client are resolvable.

If you want, I can add a small troubleshooting section or provide a Dockerized worker service file next.

## 🔑 Key Features

### 1. Unified Authentication (Verse-ID)

EL VERSE uses a globally-unique **VERSE ID** assigned on sign-up. The format is a 3-letter arm prefix followed by 8 digits (e.g., `NEX00012345`).

- ELCODERS: `ELC` + 8 digits
- NEXEL: `NEX` + 8 digits
- EL ACCESS: `ELA` + 8 digits
- MY SPACE: `MYS` + 8 digits
- ELITES: `ELI` + 8 digits

VERSE IDs are stored on the user profile (`User.verseId`) and a snapshot of `verseId` and `fullName` are stored on transfer/gift/transaction records to make internal transfers and gifting display the recipient/sender name and id consistently.


- Single Sign-On across all 5 platforms
- JWT-based authentication
- Role-based access control (INTERN, DEVELOPER, CLIENT, COMPANY, LEARNER)
- Daily Dev Streak tracking

### 2. WTH Coin Wallet System
- Double-entry ledger system
- Escrow for project payments
- Cross-platform transactions
- Withdrawal support (NGN/USD/Crypto)

### 3. AI Hub (5 Personalities)
- **Nelly** (NEXEL) - Social trends & content AI
- **Lina** (ELCODERS) - Code review & technical AI
- **Uno** (EL ACCESS) - Career mentor & CV builder
- **Buddy** (MY SPACE) - Talent matchmaker & lead gen
- **Librarian** (ELITES) - Educational AI & curriculum assistant

### 4. Real-time Features
- **Stream Gateway** - Live streaming with WTH gifting
- **IDE Gateway** - Real-time code collaboration & shadow mode
- **Chat Gateway** - E2EE messaging
- **Notification Gateway** - Global notifications

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user (now accepts `fullName` and optional `app` to set VERSE ID prefix). Example body:

```json
{
  "email": "jane@example.com",
  "username": "jane",
  "password": "secure",
  "fullName": "Jane Doe",
  "app": "NEXEL" // Optional: ELCODERS, NEXEL, EL_ACCESS, MY_SPACE, ELITES
}
```

The response includes `userId`, `verseId`, and `requiresVerification`.
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/dev-streak` - Update daily streak

### NEXEL
- `POST /api/nexel/posts` - Create post
- `GET /api/nexel/feed` - Get Universe Feed
- `POST /api/nexel/posts/:id/like` - Like post
- `GET /api/nexel/pulse` - Get Pulse videos
- `POST /api/nexel/streams` - Start live stream

### ELCODERS
- `POST /api/coders/projects` - Create project
- `POST /api/coders/projects/:id/submit` - Submit code
- `GET /api/coders/dashboard` - Developer dashboard
- `POST /api/coders/milestones/:id/approve` - Approve milestone

### EL ACCESS
- `POST /api/access/internships` - Create internship
- `POST /api/access/tasks/:id/submit` - Submit task
- `GET /api/access/tasks/:id/hint` - Get hint from Uno
- `GET /api/access/dashboard` - Intern dashboard

### MY SPACE
- `POST /api/myspace/verify-entry` - Verify gated entry
- `POST /api/myspace/jobs` - Create job
- `POST /api/myspace/jobs/:id/bids` - Place bid
- `GET /api/myspace/recommendations` - Buddy's job recommendations

### ELITES
- `POST /api/elites/courses/:id/enroll` - Enroll in course
- `POST /api/elites/lessons/:id/help` - Get help from Librarian
- `POST /api/elites/lessons/:id/complete` - Complete lesson
- `POST /api/elites/quizzes/:id/submit` - Submit quiz

## 🔌 WebSocket Namespaces

- `/stream` - Live streaming & gifting
- `/ide` - Real-time code collaboration
- `/chat` - Direct messaging
- `/notifications` - Global notifications

## 🛠️ Development

### Running Services
```bash
# Run all services
pnpm dev

# Run specific service
pnpm --filter @el-verse/arc-core-api dev

⚠️ After pulling these changes, run Prisma migrations to add `verseId` and new fields:

pnpm --filter libs/database prisma migrate dev --name add-verseId --preview-feature
```

### Database Management
```bash
# Generate Prisma Client
pnpm db:generate

# Create migration
pnpm db:migrate

# Open Prisma Studio
pnpm db:studio
```

### Building
```bash
# Build all packages
pnpm build

# Build specific package
pnpm --filter @el-verse/arc-core-api build
```

## 🔐 Environment Variables

See `.env.example` for all required variables:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret
- `OPENAI_API_KEY` / `GEMINI_API_KEY` - AI provider keys
- `WTH_EXCHANGE_RATE` - WTH to NGN conversion rate
- `PAYSTACK_SECRET_KEY` / `FLUTTERWAVE_SECRET_KEY` - Payment processor keys

## 📊 Database Schema

The Prisma schema (`libs/database/prisma/schema.prisma`) defines all models:
- User, Wallet, Transaction
- Post, Comment, LiveStream, Gift, Message
- Project, Milestone, CodeSession, Submission
- Internship, Task
- Job, Bid, Squad
- Course, Lesson, Quiz, Enrollment, Certification
- Notification

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Run tests and linting
4. Submit a pull request

## 📝 License

Private - EL VERSE Technologies

## 🆘 Support

For issues and questions, contact the EL VERSE development team.

---

**Built with ❤️ by EL VERSE Technologies**
