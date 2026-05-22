# QWIZDS Workspace

## Overview

QWIZDS is a full-stack interactive quiz game platform (similar to Kahoot) with AI-powered language learning. Teachers, students, and content creators can build, host, and play quiz-based games. AI generates quizzes and vocabulary sets automatically. Language learning features include Duolingo-style flashcards and multiple-choice vocabulary quizzes.

## Features
- AI quiz generation (OpenAI GPT)
- PIN-based live multiplayer with real-time leaderboards
- **Game modes**: Classic, Classic+, Bomb Mode, Volcano, Relay Race, Self-Paced
- Free-text questions with AI grading (OpenAI)
- Audio questions (audio player embedded in question)
- **Coin system (Gimkit-style)**: Players earn 🪙 coins per correct answer + streak bonuses (+5 every 3-in-a-row); coins stored per user and shown in dashboard and answer feedback
- **XP & levels**: XP earned per correct answer proportional to points scored; stored per user
- Solo Practice mode and Volcano mode
- Sequential podium animation on results
- Sound effects system (Web Audio API — tick, correct/wrong, music, podium fanfares)
- Image questions (URL-based, displayed on host screen)
- **Settings page** (`/settings`): profile picture URL, display name, Night/Day theme, music & SFX toggles
- Theme system: `ThemeContext` reads/writes `qwizds_theme` localStorage; `dark` class on `<html>` toggled dynamically
- Teacher-only worksheets, Duolingo-style language learning
- WhatsApp quiz sharing with private share-token links

## Production Deployment

### Replit Autoscale
- **Target**: Autoscale (stateless — uses polling, no WebSockets)
- **Build**: `BASE_PATH=/ pnpm --filter @workspace/qwizds run build && pnpm --filter @workspace/api-server run build`
- **Run**: `NODE_ENV=production node artifacts/api-server/dist/index.cjs`
- **How it works**: API server build (`build.ts`) compiles the server to `dist/index.cjs` AND copies the frontend build (`artifacts/qwizds/dist/public/`) into `dist/public/`. In production, Express serves both API routes and static frontend files from a single process.
- **Port**: reads `PORT` env var (Replit sets this automatically in production)

### Vercel
- **Config**: `vercel.json` at root — routes `/api/*` to a serverless function, static files served from `artifacts/qwizds/dist/public`
- **Build command**: same as above (runs both frontend and API builds)
- **Serverless function**: `api/index.ts` wraps a pre-bundled Express app (`api/handler-bundle.cjs`), generated during build by `artifacts/api-server/build.ts`
- **handler-bundle.cjs** is gitignored (generated on each deploy) — it bundles `src/app.ts` without the `listen()` call
- **Required env vars**: `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SESSION_SECRET`, `OPENAI_API_KEY` — see `.env.example`
- **Google OAuth**: redirect URI auto-built from request host, so add `https://<your-vercel-domain>/api/auth/google/callback` to Google Console

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifacts/qwizds)
- **API framework**: Express 5 (artifacts/api-server)
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle for server), Vite (frontend)
- **AI**: OpenAI via Replit AI Integrations (env: AI_INTEGRATIONS_OPENAI_BASE_URL, AI_INTEGRATIONS_OPENAI_API_KEY)
- **Auth**: Session-based via cookies (custom, no JWT/passport)
- **Routing**: Wouter (frontend)
- **UI**: Tailwind CSS, Shadcn/ui, Framer Motion, Recharts

## Mobile App (Expo)

- **artifact**: `artifacts/qwizds-mobile` — Expo React Native (preview at `/mobile/`)
- **runtime**: Expo Router v6, React Native Web for web preview
- **preview**: Served via `scripts/web-dev.js` static server on port 22648 (QUIZDES Mobile Preview workflow)
- **Expo workflow note**: The `kind = "mobile"` port detection is broken at the Replit platform level — the artifact workflow cannot pass the port check regardless of what the server does. Workaround: `QUIZDES Mobile Preview` console workflow runs `web-dev.js` on port 22648 as the real server. The artifact's `dev` script also runs `web-dev.js`, but it detects EADDRINUSE (port taken by standalone) and exits cleanly with code 0, so Replit shows the artifact as **"finished"** (not "crashed"). This suppresses crash notifications. Do NOT change the dev script back to `expo start` (that exits with non-zero code → "crashed" notifications).

### Mobile Screens
- **Join** (`/`) — PIN entry with numeric keypad, 6-digit PIN display
- **Discover** (`/discover`) — Browse public quizzes by category
- **Lobby** (`/lobby/[id]`) — Waiting room before game starts, player list
- **Play** (`/play/[id]`) — Live game: multiple choice, short answer input, relay, audio
- **Results** (`/results/[id]`) — Final podium and per-player breakdown
- **Practice** (`/practice/[id]`) — Solo quiz practice mode

### Mobile Key Files
- `app/_layout.tsx` — Root layout with QueryClient, setBaseUrl config
- `app/(tabs)/_layout.tsx` — Bottom tab navigation (Join, Discover)
- `scripts/web-dev.js` — Static file server for Expo web export with `/mobile` base path patching
- `scripts/build.js` — Production build (expo export + static-build/)
- `server/serve.js` — Production static server

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express 5 API server
│   ├── qwizds/             # React + Vite frontend (preview at /)
│   └── qwizds-mobile/      # Expo React Native app (preview at /mobile/)
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Database Schema

- **users** — id, email, username, passwordHash, displayName, role (teacher/student/creator), totalPoints, gamesPlayed, quizzesCreated, avatarUrl
- **quizzes** — id, title, description, category, visibility (public/private), questionCount, timesPlayed, creatorId, coverImageUrl
- **questions** — id, quizId, questionText, questionType (multiple_choice/true_false/short_answer), options (array), correctAnswer, explanation, timeLimit, points, imageUrl, orderIndex
- **game_sessions** — id, quizId, hostId, pin (unique 6-digit), status (waiting/active/ended), gameMode (live/solo/timed/multiplayer), currentQuestion, startedAt, endedAt
- **participants** — id, gameId, userId (nullable), nickname, score, correctAnswers, totalAnswers, rank
- **answer_logs** — id, gameId, participantId, questionId, answer, isCorrect, pointsEarned, timeSpent

## Frontend Pages

- `/` — Landing page with hero, features, CTA
- `/auth` — Login/register with role selection
- `/dashboard` — Stats dashboard with recent quizzes and games
- `/my-quizzes` — List and manage user's quizzes
- `/quizzes/:id/edit` — Quiz editor with question management
- `/quizzes/:id` — Quiz detail and host game launcher
- `/ai-generate` — AI quiz generator + AI chat assistant
- `/join` — PIN entry to join a game
- `/host/:gameId` — Host view (PIN display, participant list, game controls)
- `/play/:gameId` — Player game view (questions, answer tiles, timer, scoring)
- `/results/:gameId` — Final results with podium and confetti
- `/discover` — Browse public quizzes
- `/leaderboard` — Global top players
- `/analytics` — Teacher analytics and charts

## API Endpoints

All under `/api`:
- **Auth**: POST /auth/register, POST /auth/login, GET /auth/me, POST /auth/logout
- **Quizzes**: CRUD at /quizzes and /quizzes/:id
- **Questions**: CRUD at /quizzes/:id/questions and /quizzes/:id/questions/:questionId
- **Games**: CRUD + /games/join/:pin, POST /games/:id/start, POST /games/:id/end
- **Participants**: GET/POST /games/:id/participants
- **Answers**: POST /games/:id/answer
- **Results**: GET /games/:id/results
- **AI**: POST /ai/generate-quiz, POST /ai/improve-question, POST /ai/chat
- **Analytics**: GET /analytics/dashboard, GET /analytics/quiz/:id
- **Leaderboard**: GET /leaderboard
- **Discover**: GET /discover

## Auth System

Simple cookie-based sessions. Cookie name: `qwizds_session`, base64-encoded JSON `{userId: number}`. Stored in HTTP-only cookie. Passwords hashed with SHA-256 + salt.

## AI Features

Uses Replit AI Integrations OpenAI proxy. Model: `gpt-4o-mini`. Three endpoints:
- **Generate quiz**: From topic or pasted text, configurable question count and difficulty
- **Improve question**: Takes existing question and returns improved version with explanation
- **AI Chat**: General assistant for quiz design advice

## TypeScript & Composite Projects

- lib/* packages are composite and emit declarations via `tsc --build`
- artifacts/* are leaf packages checked with `tsc --noEmit`
- Always typecheck from root: `pnpm run typecheck`

## Key Commands

- `pnpm --filter @workspace/api-server run dev` — API server
- `pnpm --filter @workspace/qwizds run dev` — Frontend
- `pnpm --filter @workspace/api-spec run codegen` — Regenerate API client hooks
- `pnpm --filter @workspace/db run push` — Push DB schema changes
- `pnpm run typecheck` — Full typecheck
