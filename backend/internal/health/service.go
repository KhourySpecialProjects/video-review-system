package health

import (
	"context"

	"github.com/KhourySpecialProjects/video-review-system/internal/apperror"
)

// Pinger is the interface the service depends on for database health checks.
// The concrete Repository satisfies this interface, and tests can substitute a mock.
type Pinger interface {
	Ping(ctx context.Context) error
}

// Service contains business logic for health checks.
type Service struct {
	repo Pinger
}

// NewService creates a new Service with the given Pinger implementation.
func NewService(repo Pinger) *Service {
	return &Service{repo: repo}
}

// Check performs a health check by pinging the database.
// Returns an AppError if the database is unreachable.
func (s *Service) Check(ctx context.Context) (HealthStatus, error) {
	if err := s.repo.Ping(ctx); err != nil {
		return HealthStatus{}, apperror.Internal(err)
	}
	return HealthStatus{
		Status:      "healthy",
		DBConnected: true,
	}, nil
}
