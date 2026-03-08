package videos

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type VideoStatus string

const (
	StatusUploading  VideoStatus = "UPLOADING"
	StatusProcessing VideoStatus = "PROCESSING"
	StatusReady      VideoStatus = "READY"
	StatusFailed     VideoStatus = "FAILED"
)

type Video struct {
	ID               uuid.UUID   `json:"id"`
	PatientID        uuid.UUID   `json:"patient_id"`
	UploadedByUserID uuid.UUID   `json:"uploaded_by_user_id"`
	Status           VideoStatus `json:"status"`
	DurationSeconds  *int        `json:"duration_seconds"` // pointer = nullable
	CreatedAt        time.Time   `json:"created_at"`
	TakenAt          *time.Time  `json:"taken_at"`         // pointer = nullable
}

type CaregiverVideoMetadata struct {
	VideoID         uuid.UUID       `json:"video_id"`
	CaregiverUserID uuid.UUID      `json:"caregiver_user_id"`
	PrivateTitle    string          `json:"private_title"`
	PrivateNotes    string          `json:"private_notes"`
	Tags            json.RawMessage `json:"tags"`
}

/*
// should these line up with db fields?
type CreateVideoRequest struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Filename    string `json:"filename"`
	StoragePath string `json:"storage_path"`
	ContentType string `json:"content_type"`
	SizeBytes   int64  `json:"size_bytes"`
	SiteID      string `json:"site_id"`
}
*/


// VideoHandler handles HTTP requests for video resources
type VideoHandler struct {
	db *pgxpool.Pool
}

func NewVideoHandler(db *pgxpool.Pool) *VideoHandler {
	return &VideoHandler{db: db}
}

// Returns Router for video endpoints
func (h *VideoHandler) Routes() chi.Router {
	r := chi.NewRouter()
	r.Get("/", h.ListVideos)
	r.Post("/", h.CreateVideo)

	r.Route("/{videoID}", func(r chi.Router) {
		r.Get("/", h.GetVideo)
		r.Put("/", h.UpdateVideo)
		r.Delete("/", h.DeleteVideo)
	})

	return r
}

// GET request functionality
func (h *VideoHandler) GetVideo(w http.ResponseWriter, r *http.Request) {
	// get video ID from URL
	videoID, err := uuid.Parse(chi.URLParam(r, "videoID"))

	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid video ID")
		return
	}

	var v Video
	// query video from database, then update fields and return updated video info in response
	err = h.db.QueryRow(r.Context(),
		`SELECT id, patient_id, uploaded_by_user_id, status,
		        duration_seconds, created_at, taken_at
		 FROM videos WHERE id = $1`, videoID).
		Scan(&v.ID, &v.PatientID, &v.UploadedByUserID, &v.Status,
			&v.DurationSeconds, &v.CreatedAt, &v.TakenAt)

	if err == pgx.ErrNoRows {
		writeError(w, http.StatusNotFound, "video not found")
		return
	}

	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to get video")
		return
	}

	writeJSON(w, http.StatusOK, v)
}

// POST request functionality
func (h *VideoHandler) CreateVideo(w http.ResponseWriter, r *http.Request) {
	var req CreateVideoRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.PatientID == uuid.Nil || req.UploadedByUserID == uuid.Nil {
		writeError(w, http.StatusBadRequest, "patient_id and uploaded_by_user_id are required")
		return
	}

	uploadedBy := uuid.New()

	var v Video
	err := h.db.QueryRow(r.Context(),
		`INSERT INTO videos (patient_id, uploaded_by_user_id, status, duration_seconds, taken_at)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, patient_id, uploaded_by_user_id, status,
		           duration_seconds, created_at, taken_at`,
		req.PatientID, uploadedBy, StatusUploading, req.DurationSeconds, req.TakenAt).
		Scan(&v.ID, &v.PatientID, &v.UploadedByUserID, &v.Status,
			&v.DurationSeconds, &v.CreatedAt, &v.TakenAt)

	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create video")
		return
	}

	writeJSON(w, http.StatusCreated, v)
}

// GET request functionality for list of videos with pagination
func (h *VideoHandler) ListVideos(w http.ResponseWriter, r *http.Request) {


	// TODO: query all videos with pagination (LIMIT/OFFSET from query params)
	writeError(w, http.StatusNotImplemented, "not yet implemented")
}

func (h *VideoHandler) UpdateVideo(w http.ResponseWriter, r *http.Request) {
	// TODO: parse videoID, decode request body, run UPDATE query
	writeError(w, http.StatusNotImplemented, "not yet implemented")
}

func (h *VideoHandler) DeleteVideo(w http.ResponseWriter, r *http.Request) {
	// TODO: parse videoID, run DELETE query (or soft delete with deleted_at)
	writeError(w, http.StatusNotImplemented, "not yet implemented")
}


// helper that returns JSON response with given status code and data
func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

// helper that returns JSON error response with given status code and message
func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}