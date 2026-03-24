package db

import (
	"context"
	"database/sql"
	"embed"
	"fmt"
	"log/slog"

	"github.com/jackc/pgx/v5/pgxpool"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"
)

//go:embed migrations/*.sql
var migrations embed.FS

// Connect creates a new pgxpool connection pool for the given database URL.
func Connect(ctx context.Context, databaseURL string) (*pgxpool.Pool, error) {
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		return nil, fmt.Errorf("db.Connect: failed to create pool: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("db.Connect: failed to ping database: %w", err)
	}

	slog.Info("database connection established")
	return pool, nil
}

// RunMigrations applies all pending goose migrations from the embedded SQL files.
// It opens a separate *sql.DB connection using the pgx stdlib driver because
// goose requires a *sql.DB, while the rest of the app uses pgxpool.
func RunMigrations(ctx context.Context, databaseURL string) error {
	sqlDB, err := sql.Open("pgx", databaseURL)
	if err != nil {
		return fmt.Errorf("db.RunMigrations: failed to open sql.DB: %w", err)
	}
	defer sqlDB.Close()

	goose.SetBaseFS(migrations)

	if err := goose.SetDialect("postgres"); err != nil {
		return fmt.Errorf("db.RunMigrations: failed to set dialect: %w", err)
	}

	if err := goose.UpContext(ctx, sqlDB, "migrations"); err != nil {
		return fmt.Errorf("db.RunMigrations: failed to run migrations: %w", err)
	}

	slog.Info("database migrations applied successfully")
	return nil
}
