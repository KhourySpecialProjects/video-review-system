package videos

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/KhourySpecialProjects/video-review-system/internal/apperror"
)

// mockVideoService is a test double that implements the VideoService interface.
type mockVideoService struct {
	getByIDFn func(ctx context.Context, id uuid.UUID) (Video, error)
	createFn  func(ctx context.Context, req CreateVideoRequest) (Video, error)
	listFn    func(ctx context.Context, limit, offset int) ([]Video, error)
	updateFn  func(ctx context.Context, id uuid.UUID, req CreateVideoRequest) (Video, error)
	deleteFn  func(ctx context.Context, id uuid.UUID) error
}

func (m *mockVideoService) GetByID(ctx context.Context, id uuid.UUID) (Video, error) {
	return m.getByIDFn(ctx, id)
}
func (m *mockVideoService) Create(ctx context.Context, req CreateVideoRequest) (Video, error) {
	return m.createFn(ctx, req)
}
func (m *mockVideoService) List(ctx context.Context, limit, offset int) ([]Video, error) {
	return m.listFn(ctx, limit, offset)
}
func (m *mockVideoService) Update(ctx context.Context, id uuid.UUID, req CreateVideoRequest) (Video, error) {
	return m.updateFn(ctx, id, req)
}
func (m *mockVideoService) Delete(ctx context.Context, id uuid.UUID) error {
	return m.deleteFn(ctx, id)
}

func TestHandler_GetVideo_Success(t *testing.T) {
	videoID := uuid.New()
	now := time.Now().Truncate(time.Second)

	h := NewHandler(&mockVideoService{
		getByIDFn: func(_ context.Context, id uuid.UUID) (Video, error) {
			return Video{
				ID:               id,
				PatientID:        uuid.New(),
				UploadedByUserID: uuid.New(),
				Status:           StatusReady,
				CreatedAt:        now,
			}, nil
		},
	})

	req := httptest.NewRequest(http.MethodGet, "/"+videoID.String(), nil)
	rec := httptest.NewRecorder()

	h.Routes().ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("status = %d, want %d", rec.Code, http.StatusOK)
	}

	var body Video
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if body.ID != videoID {
		t.Errorf("body.ID = %v, want %v", body.ID, videoID)
	}
	if body.Status != StatusReady {
		t.Errorf("body.Status = %q, want %q", body.Status, StatusReady)
	}
}

func TestHandler_GetVideo_InvalidID(t *testing.T) {
	h := NewHandler(&mockVideoService{})

	req := httptest.NewRequest(http.MethodGet, "/not-a-uuid", nil)
	rec := httptest.NewRecorder()

	h.Routes().ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want %d", rec.Code, http.StatusBadRequest)
	}
}

func TestHandler_GetVideo_NotFound(t *testing.T) {
	videoID := uuid.New()

	h := NewHandler(&mockVideoService{
		getByIDFn: func(_ context.Context, id uuid.UUID) (Video, error) {
			return Video{}, apperror.NotFound("video", id)
		},
	})

	req := httptest.NewRequest(http.MethodGet, "/"+videoID.String(), nil)
	rec := httptest.NewRecorder()

	h.Routes().ServeHTTP(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Errorf("status = %d, want %d", rec.Code, http.StatusNotFound)
	}

	var body map[string]string
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if body["error"] == "" {
		t.Error("expected error message in response body")
	}
}

func TestHandler_CreateVideo_Success(t *testing.T) {
	patientID := uuid.New()
	uploaderID := uuid.New()

	h := NewHandler(&mockVideoService{
		createFn: func(_ context.Context, req CreateVideoRequest) (Video, error) {
			return Video{
				ID:               uuid.New(),
				PatientID:        req.PatientID,
				UploadedByUserID: req.UploadedByUserID,
				Status:           StatusUploading,
				CreatedAt:        time.Now(),
			}, nil
		},
	})

	body := `{"patient_id":"` + patientID.String() + `","uploaded_by_user_id":"` + uploaderID.String() + `"}`
	req := httptest.NewRequest(http.MethodPost, "/", stringReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	h.Routes().ServeHTTP(rec, req)

	if rec.Code != http.StatusCreated {
		t.Errorf("status = %d, want %d", rec.Code, http.StatusCreated)
	}

	var v Video
	if err := json.NewDecoder(rec.Body).Decode(&v); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if v.PatientID != patientID {
		t.Errorf("PatientID = %v, want %v", v.PatientID, patientID)
	}
}

func TestHandler_CreateVideo_BadBody(t *testing.T) {
	h := NewHandler(&mockVideoService{})

	req := httptest.NewRequest(http.MethodPost, "/", stringReader("{invalid"))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	h.Routes().ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want %d", rec.Code, http.StatusBadRequest)
	}
}

func TestHandler_DeleteVideo_Success(t *testing.T) {
	videoID := uuid.New()

	h := NewHandler(&mockVideoService{
		deleteFn: func(_ context.Context, id uuid.UUID) error {
			return nil
		},
	})

	req := httptest.NewRequest(http.MethodDelete, "/"+videoID.String(), nil)
	rec := httptest.NewRecorder()

	h.Routes().ServeHTTP(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Errorf("status = %d, want %d", rec.Code, http.StatusNoContent)
	}
}

// stringReader is a helper that returns an io.Reader from a string.
func stringReader(s string) *strings.Reader {
	return strings.NewReader(s)
}
