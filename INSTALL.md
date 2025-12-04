# INSTALL

This file describes how to set up and run the CSC309 project (frontend + backend) in a new environment.

**Prerequisites**
- Node.js 18+ and npm (install from https://nodejs.org/)
- Git

**Quick Local Setup (Windows PowerShell)**

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

```powershell
npm start
```

5) Frontend: install and run (in a separate terminal)

```powershell
cd frontend
npm install
npm run dev
```

**Demo Credentials (from Seed)**

The database is pre-populated with the following accounts for testing different roles. All accounts use the same password.

Password for all accounts: Password123!

Role, UTORid, Email
Superuser, super01, superuser@mail.utoronto.ca
Manager, manag01, manager@mail.utoronto.ca
Cashier, cash001, cashier@mail.utoronto.ca
Regular, regular1, regular1@mail.utoronto.ca

(There are also auto-generated regular users from u001 to u045 with the same password).

**Architecture & Technology Stack**

- Frontend: React (Vite), Bootstrap (Bootswatch), React Router.

- Backend: Node.js, Express.js.

- Database: SQLite (via Prisma ORM).

- Authentication: JWT (JSON Web Tokens) with bcrypt for password hashing.

- Email: Resend API (for verification codes and password resets).