# Getting Started

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Setup](#environment-setup)
- [Database Setup](#database-setup)
- [Run Development Server](#run-development-server)
- [Open the App](#open-the-app)

## Prerequisites

| Requirement | Version / notes |
|-------------|------------------|
| Node.js | 18+ |
| PostgreSQL | 15+ |
| Git | For cloning |

## Installation

1. **Clone the repo**

```bash
git clone https://github.com/[username]/egx-pro
cd egx-pro
```

2. **Install dependencies**

```bash
npm install
```

3. **Setup environment**

```bash
cp .env.example .env.local
```

Fill in required values in `.env.local` (see [Environment Variables](./environment-variables.md)).

4. **Setup database**

```bash
npx prisma migrate dev
npx prisma db seed
```

5. **Run development server**

```bash
npm run dev
```

6. **Open the app**

Open [http://localhost:3000](http://localhost:3000) in your browser.
