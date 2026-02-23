# Backend — Angelman Video Portal

Go REST API built with chi v5, pgx v5, and goose migrations.

---

## Getting Started

### 1. Install dependencies

```bash
cd backend
go mod download
```

### 2. Set up the database

Make sure PostgreSQL is running locally, then run migrations:

```bash
make migrate-up
```

### 3. Set environment variables

The backend loads config from AWS Secrets Manager at runtime. Set the secret name:

```bash
export SECRET_NAME=angelman-portal/local
```

The `angelman-portal/local` secret should contain:

| Key | Value |
|---|---|
| `DATABASE_URL` | `postgres://user:pass@localhost:5432/dbname?sslmode=disable` |
| `ALLOWED_ORIGIN` | `http://localhost:5173` |

### 4. Start the server

```bash
go run .
```

The API will be available at `http://localhost:8080`.

---

## Useful Commands

| Command | Description |
|---|---|
| `go run .` | Start the API server |
| `go build -o server .` | Compile to a binary |
| `go test ./...` | Run all tests |
| `make migrate-up` | Apply all pending migrations |
| `make migrate-down` | Roll back the last migration |
| `make migrate-status` | Show applied and pending migrations |
| `make migrate-create name=<name>` | Create a new migration file |

---

## File Structure

```
backend/
├── main.go                     # Entry point — wires chi router, pgxpool, middleware
├── go.mod                      # Module definition — chi, pgx, goose
├── go.sum
├── Dockerfile                  # Multi-stage production build
├── Makefile                    # Migration convenience targets
│
├── db/
│   ├── pool.go                 # pgxpool setup and config
│   └── migrations/             # Goose SQL migration files
│       ├── 001_create_users.sql
│       ├── 002_create_sites.sql
│       ├── 003_create_videos.sql
│       ├── 004_create_annotations.sql
│       ├── 005_create_clips.sql
│       └── 006_create_audit_logs.sql
│
├── middleware/
│   ├── auth.go                 # JWT validation — injects role into request context
│   ├── cors.go                 # CORS headers
│   └── audit.go                # Logs user actions to audit_logs table
│
├── secrets/
│   └── loader.go               # AWS Secrets Manager client
│
└── internal/                   # Domain packages
    ├── auth/                   # POST /api/auth/login, POST /api/auth/logout
    ├── videos/                 # GET|POST /api/videos, GET /api/videos/{id}
    ├── annotations/            # GET|POST /api/videos/{id}/annotations
    ├── clips/                  # GET|POST /api/videos/{id}/clips
    ├── accounts/               # GET|POST|PUT /api/accounts
    └── audit/                  # GET /api/audit
```

Each domain package follows the same layered structure:

```
handler.go      ← HTTP — parse request, call service, write response
service.go      ← Business logic — no SQL, no HTTP types
repository.go   ← Database — all pgx queries, returns domain types
types.go        ← Domain structs and request/response shapes
```

---

## Key Conventions

**Layered architecture**
Business logic never lives in handlers. SQL never lives in services. Each layer has one responsibility and communicates through domain types defined in `types.go`.

**Error handling**
Each domain defines typed sentinel errors. Handlers map these to HTTP status codes — the service and repository layers never touch HTTP.

```go
// repository / service
var ErrNotFound = errors.New("not found")
var ErrConflict = errors.New("conflict")

// handler
switch {
case errors.Is(err, service.ErrNotFound):
    http.Error(w, "not found", http.StatusNotFound)
case errors.Is(err, service.ErrConflict):
    http.Error(w, "conflict", http.StatusConflict)
default:
    http.Error(w, "internal server error", http.StatusInternalServerError)
}
```

**pgx v5**
Use pgx-native APIs only — no `database/sql`. Use `pgxpool` for all connections. Scan rows with `pgx.CollectOneRow` and `pgx.RowToAddrOfStructByName`.

**Migrations — goose**
All schema changes are made through numbered migration files in `db/migrations/`. Never modify the database schema manually. Each file uses goose annotations:

```sql
-- +goose Up
CREATE TABLE example ( ... );

-- +goose Down
DROP TABLE example;
```

**Routing — chi**
Each domain handler exposes a `Routes()` method that returns a `chi.Router`. This is mounted in `main.go` so route registration stays close to the handler that owns it.

```go
// main.go
r.Mount("/api/videos", videosHandler.Routes())
r.Mount("/api/accounts", accountsHandler.Routes())
```

---

## API Overview

| Method | Path | Description | Roles |
|---|---|---|---|
| POST | `/api/auth/login` | Authenticate user | Public |
| POST | `/api/auth/logout` | Invalidate session | Authenticated |
| GET | `/api/videos` | List accessible videos | All |
| POST | `/api/videos` | Upload a video | Caregiver, Coordinator |
| GET | `/api/videos/{id}` | Get single video | All |
| GET | `/api/videos/{id}/annotations` | List annotations | Reviewer, Coordinator, Admin |
| POST | `/api/videos/{id}/annotations` | Add annotation | Reviewer |
| GET | `/api/videos/{id}/clips` | List clips | Reviewer, Coordinator, Admin |
| POST | `/api/videos/{id}/clips` | Create clip | Reviewer |
| GET | `/api/accounts` | List accounts | Coordinator, Admin |
| POST | `/api/accounts` | Create account | Coordinator, Admin |
| PUT | `/api/accounts/{id}` | Update account | Admin |
| GET | `/api/audit` | Get audit log | Coordinator, Admin |

---

## Docker

Build and run the backend in Docker:

```bash
docker build -t angelman-backend ./backend
docker run -p 8080:8080 -e SECRET_NAME=angelman-portal/local angelman-backend
```

---

## AWS App Runner Deployment

1. Push the backend image to ECR
2. Create an App Runner service pointed at the ECR image
3. Set environment variable: `SECRET_NAME=angelman-portal/production`
4. Attach an IAM role with `secretsmanager:GetSecretValue` permission
5. Enable VPC connector to reach RDS privately

Refer to the root `README.md` for full deployment steps.