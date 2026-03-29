# Backend

Express.js API server with Better Auth authentication and Prisma ORM.

## Setup

### Prerequisites

- Node.js 24+
- Docker (for PostgreSQL)

### Install dependencies

```bash
npm install
```

### Environment variables

Copy `.env.example` to `.env` in the `video-review-system/` directory and fill in the values. Generate secrets with:

```bash
openssl rand -base64 32
```

### Start PostgreSQL

From `video-review-system/`:

```bash
docker compose up -d postgres
```

### Run migrations and generate Prisma client

```bash
npx prisma migrate dev
npx prisma generate
```

### Start the server

```bash
npm start
```

Server runs at `http://localhost:8080`

## Project structure

```
src/
├── index.js              # Express app entry point
├── domains/              # Feature modules
│   ├── auth/             # Authentication (invite, activate)
│   ├── videos/           # Video management
│   ├── annotations/      # Video annotations
│   ├── clips/            # Video clips
│   ├── accounts/         # User accounts
│   └── audit/            # Audit logging
├── lib/                  # Shared utilities
│   ├── auth.js           # Better Auth instance
│   └── prisma.js         # Prisma client
├── middleware/           # Express middleware
└── generated/            # Generated code (gitignored)
    └── prisma/           # Prisma client
```

## API endpoints

### Health check

```
GET /health
```

### Authentication (Better Auth)

```
POST /api/auth/sign-in/email    # Sign in with email/password
POST /api/auth/sign-out         # Sign out
GET  /api/auth/session          # Get current session
```

### Auth domain

```
POST /domain/auth/invite        # Create invitation (requires admin-secret header)
POST /domain/auth/activate      # Activate invitation and create account
```

## Testing authentication

### 1. Create an invitation

```bash
curl -X POST http://localhost:8080/domain/auth/invite \
  -H "Content-Type: application/json" \
  -H "admin-secret: YOUR_ADMIN_SECRET" \
  -d '{"email": "user@example.com", "role": "SYSADMIN"}'
```

Response: `{"id": "...", "token": "TOKEN_HERE"}`

### 2. Activate the invitation

```bash
curl -X POST http://localhost:8080/domain/auth/activate \
  -H "Content-Type: application/json" \
  -d '{"token": "TOKEN_HERE", "name": "User Name", "email": "user@example.com", "password": "securepassword123"}'
```

Response: `{"success": true, "message": "Account created. Please sign in."}`

### 3. Sign in

```bash
curl -X POST http://localhost:8080/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "securepassword123"}'
```

Response: `{"token": "...", "user": {...}}`

## Error handling

All errors return a consistent JSON shape:

```json
{
  "status": "error",
  "statusCode": 400,
  "message": "Human-readable description",
  "errors": []
}
```

`errors` is only present for validation failures and contains per-field details.
In non-production environments a `stack` field is also included.

### HTTP status codes

| Code | Meaning | Common causes |
|------|---------|---------------|
| `400` | Bad Request | Zod validation failure, malformed JSON, expired/invalid invitation token |
| `401` | Unauthorized | Missing or invalid `admin-secret` header |
| `403` | Forbidden | Authenticated but lacks permission for the resource |
| `404` | Not Found | Resource ID doesn't exist, unmatched route |
| `409` | Conflict | Duplicate resource (e.g. email already registered) |
| `500` | Internal Server Error | Unexpected server-side error — details are never exposed to the client |

### Prisma error code mapping

| Prisma code | HTTP status | Description |
|-------------|-------------|-------------|
| `P2025` | `404` | Record not found (e.g. update/delete on unknown ID) |
| `P2002` | `409` | Unique constraint violation |
| All others | `500` | Unexpected database error |

### Throwing errors in routes and services

Use the `AppError` factory methods — the global `errorHandler` middleware will format the response automatically:

```ts
import { AppError } from "../../middleware/errors.js";

throw AppError.badRequest("Invalid input");   // 400
throw AppError.unauthorized();                // 401
throw AppError.forbidden();                   // 403
throw AppError.notFound("Video not found");   // 404
throw AppError.conflict("Already exists");    // 409
```

## Database

### View with psql

```bash
docker exec -it video-review-system-postgres-1 psql -U postgres -d angelman
```

### Connect with GUI (pgAdmin, TablePlus, etc.)

- Host: `localhost`
- Port: `5432`
- Database: `angelman`
- User: `postgres`
- Password: `postgres`
