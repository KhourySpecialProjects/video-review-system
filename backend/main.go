package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/KhourySpecialProjects/video-review-system/config"
	"github.com/KhourySpecialProjects/video-review-system/db"
	"github.com/KhourySpecialProjects/video-review-system/internal/health"
	"github.com/KhourySpecialProjects/video-review-system/middleware"
)

func main() {
	ctx := context.Background()

	// ── Load configuration ──────────────────────────────────────────
	cfg := config.Load()

	// ── Connect to database ─────────────────────────────────────────
	pool, err := db.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		slog.Error("failed to connect to database", "error", err)
		os.Exit(1)
	}
	defer pool.Close()

	// ── Run migrations ──────────────────────────────────────────────
	if err := db.RunMigrations(ctx, cfg.DatabaseURL); err != nil {
		slog.Error("failed to run migrations", "error", err)
		os.Exit(1)
	}

	// ── Build dependency graph ──────────────────────────────────────
	healthRepo := health.NewRepository(pool)
	healthService := health.NewService(healthRepo)
	healthHandler := health.NewHandler(healthService)

	// ── Configure router ────────────────────────────────────────────
	r := chi.NewRouter()

	// Global middleware
	r.Use(middleware.CORS(cfg.AllowedOrigin))
	r.Use(middleware.Logger)

	// Mount domain routes
	r.Mount("/api/health", healthHandler.Routes())

	// ── Start server with graceful shutdown ──────────────────────────
	srv := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: r,
	}

	// Listen for shutdown signals in a separate goroutine
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		slog.Info("server starting", "port", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("server failed", "error", err)
			os.Exit(1)
		}
	}()

	<-quit
	slog.Info("shutting down server...")

	shutdownCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		slog.Error("server forced to shutdown", "error", err)
		os.Exit(1)
	}

	slog.Info("server stopped gracefully")
}
