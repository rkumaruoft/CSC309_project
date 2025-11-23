# INSTALL

This file describes how to set up and run the CSC309 project (frontend + backend) in a new environment.

Prerequisites
- Node.js 18+ and npm (install from https://nodejs.org/)
- Git

Quick Local Setup (Windows PowerShell)

1) Clone the repo

```powershell
git clone https://github.com/rkumaruoft/CSC309_project
cd CSC309_project
```

2) Backend: install, generate Prisma client, push schema, seed DB

```powershell
cd backend
npm install

# Generate Prisma client (required before importing @prisma/client)
npx prisma generate

# Push schema to SQLite (creates dev.db and tables from prisma/schema.prisma)
npx prisma db push

# Seed the database (creates example users/events/promotions)
npm run seed
```

3) Backend: environment variables

- Copy the provided example and set a real secret locally (do NOT commit `.env`):

```powershell
copy .env.example .env
# Then edit .env and set a secure JWT_SECRET value
```

4) Start the backend

5) Frontend: install and run (in a separate terminal)
