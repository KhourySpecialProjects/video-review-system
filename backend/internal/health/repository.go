package health

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Repository handles database operations for health checks.
type Repository struct {
	pool *pgxpool.Pool
}

// NewRepository creates a new Repository with the given connection pool.
func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

// Ping verifies the database connection is alive.
func (r *Repository) Ping(ctx context.Context) error {
	return r.pool.Ping(ctx)
}
