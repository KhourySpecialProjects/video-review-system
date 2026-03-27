package videos

import (
	"context"

	"github.com/google/uuid"

	"github.com/KhourySpecialProjects/video-review-system/internal/apperror"
)

// Store is the interface the service depends on for video persistence.
// The concrete Repository satisfies this interface, and tests can substitute a mock.
type Store interface {
	GetByID(ctx context.Context, id uuid.UUID) (Video, error)
	Create(ctx context.Context, req CreateVideoRequest) (Video, error)
	List(ctx context.Context, limit, offset int) ([]Video, error)
	Update(ctx context.Context, id uuid.UUID, req CreateVideoRequest) (Video, error)
	Delete(ctx context.Context, id uuid.UUID) error
}

// Service contains business logic for video operations.
type Service struct {
	repo Store
}

// NewService creates a new Service with the given Store implementation.
func NewService(repo Store) *Service {
	return &Service{repo: repo}
}

// GetByID retrieves a single video by its ID.
func (s *Service) GetByID(ctx context.Context, id uuid.UUID) (Video, error) {
	return s.repo.GetByID(ctx, id)
}

// Create validates the request and creates a new video.
func (s *Service) Create(ctx context.Context, req CreateVideoRequest) (Video, error) {
	if req.PatientID == uuid.Nil {
		return Video{}, apperror.BadRequest("patient_id is required")
	}
	if req.UploadedByUserID == uuid.Nil {
		return Video{}, apperror.BadRequest("uploaded_by_user_id is required")
	}
	return s.repo.Create(ctx, req)
}

// List returns a paginated list of videos.
func (s *Service) List(ctx context.Context, limit, offset int) ([]Video, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}
	return s.repo.List(ctx, limit, offset)
}

// Update modifies an existing video.
func (s *Service) Update(ctx context.Context, id uuid.UUID, req CreateVideoRequest) (Video, error) {
	return s.repo.Update(ctx, id, req)
}

// Delete removes a video by its ID.
func (s *Service) Delete(ctx context.Context, id uuid.UUID) error {
	return s.repo.Delete(ctx, id)
}
