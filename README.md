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

## 🔑 Key Features

### 1. Unified Authentication (Verse-ID)
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
- `POST /api/auth/register` - Register new user
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
