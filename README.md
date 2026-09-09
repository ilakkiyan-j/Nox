# NOX — Your Second Self

<div align="center">

<img src="apps/web/public/arixen.png" alt="Arixen Logo" width="160" style="max-width: 160px; height: auto;" />

### **Personal Context Operating System**
*A Product of Arixen*

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-nox--self.vercel.app-4F46E5?style=for-the-badge&logo=vercel)](https://nox-self.vercel.app/)

<br />

[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black.svg)](https://nextjs.org/)
[![Express](https://img.shields.io/badge/Express-4.21-000000.svg)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-emerald.svg)](https://www.prisma.io/)
[![Neon](https://img.shields.io/badge/Neon-PostgreSQL-00e5a0.svg)](https://neon.tech/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8.svg)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

</div>

---

## 🚀 Live Demo

Access the live production application:  
👉 **[https://nox-self.vercel.app/](https://nox-self.vercel.app/)**

---

## 🌟 Overview

**NOX** is a next-generation **Personal Context Operating System** designed to unify every dimension of your personal and professional life—Goals, Roadmaps, Milestones, Action Tasks, Learning Paths, Events, Habits, Fast Clipboard Captures, and Vertical Time Flow—into a single calm, high-performance workstation.

Engineered with privacy-first data isolation boundaries, NOX delivers 100% Light and Dark theme parity, real-time sync with serverless PostgreSQL, and dedicated admin account provisioning.

---

## ✨ Key Features

- **🎯 Outcome Goals & Multi-Phase Roadmaps**: Connect high-level aspirations to multi-phase roadmaps, milestone trees, and actionable daily tasks.
- **⚡ 1-Second Quick Capture**: Instant drawer shortcut (`Ctrl+K` or floating trigger) to capture URLs, code snippets, and thoughts with auto-tagging.
- **⏳ Non-Grid Vertical Time Stream**: Dynamic, fluid time stream displaying **Now**, **Next**, and **Upcoming** focus blocks without rigid calendar grids.
- **🔥 Habit Streaks & Tracking**: Daily habit check-ins with streak counters, best streak records, and visual completion history.
- **📚 Learning Paths**: Interactive course modules with progress tracking, unit checklists, and resource links.
- **🔔 Notification Center**: Centralized notifications for milestone achievements, habit streaks, and event alerts with unread filtering.
- **🌓 100% Light & Dark Theme Parity**: Seamless dynamic theme switching across the landing page, workstation, modals, and drawers.
- **🛡️ Admin Credentials Server & Privacy Boundary**: Dedicated admin control panel for provisioning system accounts with zero access to personal user data (Goals, Tasks, Notes, Habits).

---

## 🏗️ Architecture & Monorepo Structure

NOX is built as a clean TypeScript monorepo powered by npm workspaces:

```text
Nox/
├── apps/
│   ├── web/               # Next.js 14 Frontend (App Router, TailwindCSS, Framer Motion, Lucide)
│   └── api/               # Node.js + Express Backend API (TypeScript, JWT, Rate Limiting, CORS)
├── packages/
│   └── database/          # Prisma ORM schema, Neon PostgreSQL migrations, & database client
└── .github/
    └── workflows/ci.yml   # Continuous Integration Pipeline (TSC, Jest, Playwright)
```

---

## 🚀 Quick Start & Installation

### Prerequisites

- **Node.js**: `v20.x` or `v24.x`
- **npm**: `v10.x` or higher
- **PostgreSQL Database**: [Neon.tech](https://neon.tech) Serverless PostgreSQL (Recommended) or local instance

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/ilakkiyan-j/Nox.git
cd Nox
npm install
```

### 2. Environment Setup

#### Frontend Environment (`apps/web/.env`)
Create `apps/web/.env` (or copy from `.env.example`):
```env
NEXT_PUBLIC_API_BASE_URL="http://localhost:4000"
```

#### Backend Environment (`apps/api/.env`)
Create `apps/api/.env` (or copy from `.env.example`):
```env
PORT=4000
NODE_ENV=development
DATABASE_URL="postgresql://user:password@ep-cool-name.neon.tech/neondb?sslmode=require"
JWT_SECRET="your-secure-jwt-secret"
JWT_EXPIRES_IN="7d"
CORS_ORIGIN="http://localhost:3000"
```

### 3. Database Migration & Seeding

Generate the Prisma Client, push table schemas to Neon PostgreSQL, and seed initial system accounts:

```bash
# Generate Prisma Client & Push Database Schema
npm run build --workspace=@nox/database

# Seed Default Accounts and Sample Data
cd packages/database
npx ts-node src/seed.ts
cd ../..
```

### 4. Launch Development Servers

Start both Frontend (`http://localhost:3000`) and Backend (`http://localhost:4000`) concurrently:

```bash
npm run dev
```

---

## 🔐 Default System Seed Credentials

| Role | Email | Password | Access Rights |
| :--- | :--- | :--- | :--- |
| **System Admin** | `admin@nox.internal` | `admin123password` | Provision accounts, revoke access, generate credentials |
| **Nox Architect (User)** | `user@nox.internal` | `user123password` | Personal workstation (Goals, Tasks, Time, Habits, Notes) |

---

## 🧪 Testing & Quality Assurance

NOX maintains automated test coverage across unit, integration, and end-to-end user workflows:

```bash
# Type Check All Monorepo Workspaces
npx tsc --noEmit

# Backend API Tests (Jest)
cd apps/api
npm test

# Frontend E2E Tests (Playwright)
cd apps/web
npx playwright test
```

---

## 🌐 Production Deployment

- **Live Application**: [https://nox-self.vercel.app/](https://nox-self.vercel.app/)
- **Frontend (`@nox/web`)**: Deployed to [Vercel](https://vercel.com) with root directory set to `apps/web` and environment variable `NEXT_PUBLIC_API_BASE_URL` pointing to your deployed API server.
- **Backend (`@nox/api`)**: Deployed to Node.js cloud runtime.
- **Database**: [Neon.tech](https://neon.tech) Serverless PostgreSQL.

---

## 🏢 Brand & Attribution

**NOX** is designed and engineered as a **Product of Arixen**.

*Copyright © 2026 Arixen. All rights reserved.*
