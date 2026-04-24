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

Follow the [root README setup instructions](../README.md#quick-start-docker) to configure AWS credentials and run `./scripts/pull-env.sh` to generate the `.env` file. The script pulls all required secrets from AWS Secrets Manager.

If you need to generate a random secret value locally (e.g. for `BETTER_AUTH_SECRET`), use:

```bash
openssl rand -base64 32
```

### Start PostgreSQL locally

```bash
docker compose up -d postgres
```

### Connect to the shared development Postgres server

The development database runs on AWS RDS. To connect, you must first be on the Northeastern GlobalProtect VPN. The `DATABASE_URL` in your `.env` file (populated by the setup script) points to this shared instance.

### Run migrations and generate Prisma client

```bash
npx prisma migrate dev
npx prisma generate
```

### Start the server

```bash
npm start
```

Server runs at `http://localhost:3000` by default.

## Project structure

```text
src/
├── index.ts              # Express app entry point
├── __tests__/            # Backend test suite
│   ├── setup.ts          # Shared Vitest setup
│   ├── helpers/          # Fixtures and mock reset helpers
│   ├── unit/             # Unit tests for services and middleware
│   └── http/             # Router-level HTTP tests with Supertest
├── domains/              # Feature modules
│   ├── auth/             # Authentication (invite, activate)
│   ├── videos/           # Video management
│   ├── annotations/      # Video annotations
│   ├── clips/            # Video clips
│   ├── accounts/         # User accounts
│   └── audit/            # Audit logging
├── lib/                  # Shared utilities
│   ├── auth.ts           # Better Auth instance
│   └── prisma.ts         # Prisma client
├── middleware/           # Express middleware
└── generated/            # Generated code (gitignored)
    └── prisma/           # Prisma client
```

## Audit layer

The backend now includes a standalone audit logging core under `src/domains/audit/`.

- the core currently provides typed audit events, safe snapshot builders, and a write service
- route integration is intentionally deferred until the endpoint surface is more stable
- the current implementation is aligned to the existing `AuditLog` schema, so future wiring should only log flows that can provide a concrete actor, entity ID, and site ID honestly

## Testing

Backend tests use `Vitest` as the test runner and `Supertest` for router-level
HTTP requests against a minimal Express app.

### Commands

```bash
npm test
npm run test:coverage
npm run test:unit
npm run test:http
```

- `npm test`: runs the full backend test suite
- `npm run test:coverage`: runs the suite with V8 coverage output
- `npm run test:unit`: runs unit tests only
- `npm run test:http`: runs router-level HTTP tests only

### Test structure

```text
src/__tests__/
├── setup.ts
├── helpers/
│   ├── auth-mock.ts
│   ├── fixtures.ts
│   ├── prisma-mock.ts
│   └── test-app.ts
├── unit/
│   ├── auth.service.test.ts
│   ├── auth.types.test.ts
│   ├── errors.test.ts
│   ├── videos.service.test.ts
│   └── videos.types.test.ts
└── http/
    ├── app.test.ts
    ├── auth.router.test.ts
    └── videos.router.test.ts
```

### What is covered

- `unit/` tests cover middleware and service logic in isolation
- `http/` tests cover request validation, status codes, and router-to-service
  contracts using the real routers

### Test coverage

Coverage is reported by Vitest using the V8 coverage provider. When you run
`npm run test:coverage`, Vitest instruments the files matched in
`backend/vitest.config.ts`, runs the normal backend suite, and writes both a
terminal summary and an HTML report to `backend/coverage/`.

- included in coverage:
  - `src/domains/**`
  - `src/middleware/**`
  - `src/lib/**`
  - `src/config/**`
  - `src/index.ts`
- excluded from coverage:
  - `src/__tests__/**`
  - `src/generated/**`
  - `src/types/**`
  - build output and generated reports like `dist/**` and `coverage/**`

Coverage answers two questions:

- which backend modules are exercised by at least one test
- which lines and branches inside those modules are still untested

The report is only as meaningful as the test ownership split above. Schema
tests drive validation paths, service tests drive business logic paths, and
router tests drive HTTP and middleware paths. That means a coverage gap usually
points to a missing test in one of those layers rather than a need to duplicate
the same assertion everywhere.

### Coverage ownership

- `*.types.test.ts` owns payload validation and normalization expectations
- `*.service.test.ts` owns business logic, data shaping, and Prisma or Better
  Auth interactions
- `*.router.test.ts` owns HTTP behavior, status codes, request parsing, and
  route-to-service wiring
- `app.test.ts` owns minimal app wiring coverage like mounted routers, Better
  Auth mounting, health checks, and shared middleware behavior

### What is not covered

- these tests are not DB-backed integration tests
- Prisma and Better Auth are mocked in unit tests
- router tests mock the service layer and do not connect to a real database
- there is currently no end-to-end test that boots the real app against a real
  PostgreSQL database

### Mocking approach

- service tests use inline `vi.hoisted()` mocks so mocked modules are defined
  before the module under test is imported
- helper files mainly provide mock reset functions, typed mock shapes, fixtures,
  and the minimal Express app used by router tests
- `src/__tests__/setup.ts` sets stable test-only environment defaults and resets
  Vitest mocks after each test

### How to add a test

Follow the existing ownership split before writing anything:

- add schema behavior to `src/__tests__/unit/<domain>.types.test.ts`
- add service behavior to `src/__tests__/unit/<domain>.service.test.ts`
- add HTTP behavior to `src/__tests__/http/<domain>.router.test.ts`
- only add app-level coverage to `src/__tests__/http/app.test.ts` when the
  behavior is truly about global wiring

### Test style

- use `describe()` blocks named after the module under test, such as
  `describe("auth.router", ...)`
- group related tests with short banner comments like
  `// ========= POST /domain/auth/invite =========`
- write descriptive `it(...)` names that read like behavior, not implementation
- start each test with two short comments when useful:
  - `Input: ...`
  - `Expected: ...`
- prefer shared fixtures from `src/__tests__/helpers/fixtures.ts` instead of
  repeating raw payload objects in every file
- reset mocks in `beforeEach()` and keep one test focused on one behavior
- use `toHaveBeenCalledWith(...)` to verify service or Prisma contracts
- use `toMatchObject(...)` for error responses when stack traces or extra fields
  may be present


### When not to add a test

- do not duplicate the same bug expectation in schema, router, and service
  tests unless each layer is responsible for different behavior
- do not add low-value constructor wiring tests unless the module has caused a
  real regression before
- do not add router tests for logic that is already fully owned by the schema
  or service layer

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
curl -X POST http://localhost:3000/domain/auth/invite \
  -H "Content-Type: application/json" \
  -H "admin-secret: YOUR_ADMIN_SECRET" \
  -d '{"email": "user@example.com", "role": "SYSADMIN"}'
```

Response: `{"id": "...", "token": "TOKEN_HERE"}`

### 2. Activate the invitation

```bash
curl -X POST http://localhost:3000/domain/auth/activate \
  -H "Content-Type: application/json" \
  -d '{"token": "TOKEN_HERE", "name": "User Name", "email": "user@example.com", "password": "securepassword123"}'
```

Response: `{"success": true, "message": "Account created. Please sign in."}`

### 3. Sign in

```bash
curl -X POST http://localhost:3000/api/auth/sign-in/email \
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
