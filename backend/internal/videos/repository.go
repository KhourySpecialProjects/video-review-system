package videos

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/KhourySpecialProjects/video-review-system/internal/apperror"
)

// Repository handles database operations for videos.
type Repository struct {
	pool *pgxpool.Pool
}

// NewRepository creates a new Repository with the given connection pool.
func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

// GetByID returns a single video by its ID.
func (r *Repository) GetByID(ctx context.Context, id uuid.UUID) (Video, error) {
	var v Video
	err := r.pool.QueryRow(ctx,
		`SELECT id, patient_id, uploaded_by_user_id, status,
		        duration_seconds, created_at, taken_at
		 FROM videos WHERE id = $1`, id).
		Scan(&v.ID, &v.PatientID, &v.UploadedByUserID, &v.Status,
			&v.DurationSeconds, &v.CreatedAt, &v.TakenAt)

	if err == pgx.ErrNoRows {
		return Video{}, apperror.NotFound("video", id)
	}
	if err != nil {
		return Video{}, apperror.Internal(err)
	}
	return v, nil
}

// Create inserts a new video and returns the created record.
func (r *Repository) Create(ctx context.Context, req CreateVideoRequest) (Video, error) {
	var v Video
	err := r.pool.QueryRow(ctx,
		`INSERT INTO videos (patient_id, uploaded_by_user_id, status, duration_seconds, taken_at)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, patient_id, uploaded_by_user_id, status,
		           duration_seconds, created_at, taken_at`,
		req.PatientID, req.UploadedByUserID, StatusUploading, req.DurationSeconds, req.TakenAt).
		Scan(&v.ID, &v.PatientID, &v.UploadedByUserID, &v.Status,
			&v.DurationSeconds, &v.CreatedAt, &v.TakenAt)

	if err != nil {
		return Video{}, apperror.Internal(err)
	}
	return v, nil
}

// List returns a paginated list of videos.
func (r *Repository) List(ctx context.Context, limit, offset int) ([]Video, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, patient_id, uploaded_by_user_id, status,
		        duration_seconds, created_at, taken_at
		 FROM videos
		 ORDER BY created_at DESC
		 LIMIT $1 OFFSET $2`, limit, offset)
	if err != nil {
		return nil, apperror.Internal(err)
	}
	defer rows.Close()

	var videos []Video
	for rows.Next() {
		var v Video
		if err := rows.Scan(&v.ID, &v.PatientID, &v.UploadedByUserID, &v.Status,
			&v.DurationSeconds, &v.CreatedAt, &v.TakenAt); err != nil {
			return nil, apperror.Internal(err)
		}
		videos = append(videos, v)
	}
	return videos, nil
}

// Update modifies an existing video and returns the updated record.
func (r *Repository) Update(ctx context.Context, id uuid.UUID, req CreateVideoRequest) (Video, error) {
	var v Video
	err := r.pool.QueryRow(ctx,
		`UPDATE videos
		 SET patient_id = $2, uploaded_by_user_id = $3, duration_seconds = $4, taken_at = $5
		 WHERE id = $1
		 RETURNING id, patient_id, uploaded_by_user_id, status,
		           duration_seconds, created_at, taken_at`,
		id, req.PatientID, req.UploadedByUserID, req.DurationSeconds, req.TakenAt).
		Scan(&v.ID, &v.PatientID, &v.UploadedByUserID, &v.Status,
			&v.DurationSeconds, &v.CreatedAt, &v.TakenAt)

	if err == pgx.ErrNoRows {
		return Video{}, apperror.NotFound("video", id)
	}
	if err != nil {
		return Video{}, apperror.Internal(err)
	}
	return v, nil
}

// Delete removes a video by its ID.
func (r *Repository) Delete(ctx context.Context, id uuid.UUID) error {
	result, err := r.pool.Exec(ctx, `DELETE FROM videos WHERE id = $1`, id)
	if err != nil {
		return apperror.Internal(err)
	}
	if result.RowsAffected() == 0 {
		return apperror.NotFound("video", id)
	}
	return nil
}
