# NOX — Your Second Self

<div align="center">

![NOX Banner](apps/web/public/arixen.png)

### **Personal Context Operating System**
*A Product of Arixen*

[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black.svg)](https://nextjs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-emerald.svg)](https://www.prisma.io/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8.svg)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

</div>

---

## 🌟 Overview

**NOX** is a next-generation **Personal Context Operating System** designed to unify every dimension of your personal and professional life—Goals, Roadmaps, Milestones, Action Tasks, Learning Paths, Events, Habits, Fast Clipboard Captures, and Vertical Time Flow—into a single calm, high-performance workstation.

---

## ✨ Key Features

- **🎯 Outcome Goals & Roadmaps**: Connect high-level aspirations to multi-phase roadmaps, milestone trees, and actionable daily tasks.
- **⚡ 1-Second Quick Capture**: Instant drawer shortcut (`Ctrl+K` or floating trigger) to capture URLs, code snippets, and thoughts with auto-tagging.
- **⏳ Non-Grid Vertical Time**: Dynamic, fluid time stream displaying **Now**, **Next**, and **Upcoming** focus blocks without rigid calendar grids.
- **🔥 Habit Streaks & Tracking**: Daily habit check-ins with streak counters, best streak records, and completion history.
- **📚 Learning Paths**: Course modules with progress tracking, interactive checklists, and resource links.
- **🔔 Notification Center**: Centralized notifications for milestone achievements, habit streaks, and event alerts with unread filtering.
- **🌓 100% Light & Dark Theme Parity**: Seamless dynamic theme switching across the landing page, workstation, modals, and drawers.
- **🛡️ Enterprise Security & Admin Control**: Role-based access control (`USER` vs `ADMIN`), rate limiting, security headers, and system metrics audit panel.

---

## 🏗️ Architecture & Monorepo Structure

NOX is built as a clean TypeScript monorepo powered by npm workspaces:

```text
Nox/
├── apps/
│   ├── web/               # Next.js 14 Frontend (App Router, TailwindCSS, Framer Motion)
│   └── api/               # Node.js + Express Backend API (TypeScript, JWT, Rate Limiting)
├── packages/
│   └── database/          # Prisma ORM schema, migrations, & database client
└── .github/
    └── workflows/ci.yml   # Continuous Integration Pipeline (TSC, Jest, Playwright)
```

---

## 🚀 Quick Start & Installation

### Prerequisites

- **Node.js**: `v20.x` or higher
- **npm**: `v10.x` or higher
- **PostgreSQL Database**: [Neon.tech](https://neon.tech) (Recommended) or local PostgreSQL instance

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/ilakkiyan-j/Nox.git
cd Nox
npm install
```

### 2. Environment Setup

Copy `.env.example` in `apps/api/` to `.env`:

```bash
cp apps/api/.env.example apps/api/.env
```

Configure your PostgreSQL database connection string in `apps/api/.env`:

```env
PORT=4000
NODE_ENV=development
DATABASE_URL="postgresql://user:password@ep-cool-name.neon.tech/neondb?sslmode=require"
JWT_SECRET="your-secure-jwt-secret"
CORS_ORIGIN="http://localhost:3000"
```

### 3. Database Migration & Seeding

Sync the Prisma schema with your database and seed initial accounts:

```bash
# Push schema tables
cd packages/database
npx prisma db push

# Seed default accounts and demo data
npx ts-node src/seed.ts
cd ../..
```

### 4. Launch Development Servers

Start both Frontend (`http://localhost:3000`) and Backend (`http://localhost:4000`):

```bash
npm run dev
```

---

## 🧪 Testing & Quality Assurance

NOX maintains a 100% test pass rate across automated unit, integration, and E2E suites:

```bash
# Run Backend Unit & Integration Tests (Jest)
cd apps/api
npm test

# Run End-to-End Tests (Playwright)
cd apps/web
npx playwright test

# Static Type Verification
npx tsc --noEmit
```

---

## 🌐 Production Deployment

- **Frontend (`@nox/web`)**: Deploy to [Vercel](https://vercel.com) with root directory set to `apps/web`.
- **Backend (`@nox/api`)**: Deploy to [Render](https://render.com), [Railway](https://railway.app), or via Docker.
- **Database**: [Neon.tech](https://neon.tech) Serverless PostgreSQL.

---

## 🏢 Brand & Attribution

**NOX** is designed and engineered as a **Product of Arixen**.

*Copyright © 2026 Arixen. All rights reserved.*
