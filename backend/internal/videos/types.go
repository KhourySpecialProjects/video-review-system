package videos

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// VideoStatus represents the processing state of a video.
type VideoStatus string

const (
	StatusUploading  VideoStatus = "UPLOADING"
	StatusProcessing VideoStatus = "PROCESSING"
	StatusReady      VideoStatus = "READY"
	StatusFailed     VideoStatus = "FAILED"
)

// Video represents a video record in the system.
type Video struct {
	ID               uuid.UUID   `json:"id"`
	PatientID        uuid.UUID   `json:"patient_id"`
	UploadedByUserID uuid.UUID   `json:"uploaded_by_user_id"`
	Status           VideoStatus `json:"status"`
	DurationSeconds  *int        `json:"duration_seconds"`
	CreatedAt        time.Time   `json:"created_at"`
	TakenAt          *time.Time  `json:"taken_at"`
}

// CaregiverVideoMetadata holds metadata a caregiver attaches to a video.
type CaregiverVideoMetadata struct {
	VideoID         uuid.UUID       `json:"video_id"`
	CaregiverUserID uuid.UUID       `json:"caregiver_user_id"`
	PrivateTitle    string          `json:"private_title"`
	PrivateNotes    string          `json:"private_notes"`
	Tags            json.RawMessage `json:"tags"`
}

// CreateVideoRequest is the payload for creating a new video.
type CreateVideoRequest struct {
	PatientID        uuid.UUID  `json:"patient_id"`
	UploadedByUserID uuid.UUID  `json:"uploaded_by_user_id"`
	DurationSeconds  *int       `json:"duration_seconds"`
	TakenAt          *time.Time `json:"taken_at"`
}
