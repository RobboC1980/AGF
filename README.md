# AgileForge Enterprise (Full-stack Monorepo)

## Prerequisites
- Node.js 20+
- PostgreSQL 15+
- pnpm / npm / yarn (choose one)

## Setup

```bash
git clone <repo>
cd agileforge-enterprise-full

# Backend
cd backend
cp .env.example .env  # set DATABASE_URL & JWT_SECRET
pnpm install
pnpm prisma:migrate
pnpm dev
```

```bash
# Frontend (new terminal)
cd frontend
pnpm install
pnpm dev
```

Visit <http://localhost:5173>

## Tech stack
| Layer | Tech |
|-------|------|
| Front-end | Vite + React + TypeScript + Zustand + TanStack Query |
| Back-end | Fastify + Prisma + PostgreSQL + JWT |
| Auth | fastify-jwt (Bearer) |
| Styling | CSS design tokens (light/dark) |
| Charts | Chart.js via react-chartjs-2 |
| State Mgmt | Zustand |
| Data fetching | TanStack React Query |

### Development scripts
| Command | Desc |
|---------|------|
| `pnpm dev` | hot‑reload |
| `pnpm build` | prod build |
| `pnpm prisma:migrate` | apply DB migrations |

---

> _This repository is a production‑ready foundation covering all CRUD artefacts (Projects, Epics, Stories, Tasks, Sprints, Initiatives, Risks, OKRs) with JWT auth, full Prisma models, and modular front‑end. Extend as needed._
# AGF
