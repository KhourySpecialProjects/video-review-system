package health

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/KhourySpecialProjects/video-review-system/internal/apperror"
)

// mockChecker is a test double that implements the Checker interface.
type mockChecker struct {
	status HealthStatus
	err    error
}

func (m *mockChecker) Check(_ context.Context) (HealthStatus, error) {
	return m.status, m.err
}

func TestHandler_Healthy(t *testing.T) {
	h := NewHandler(&mockChecker{
		status: HealthStatus{Status: "healthy", DBConnected: true},
		err:    nil,
	})

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()

	h.Routes().ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("status = %d, want %d", rec.Code, http.StatusOK)
	}

	var body HealthStatus
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if body.Status != "healthy" {
		t.Errorf("body.Status = %q, want %q", body.Status, "healthy")
	}
	if !body.DBConnected {
		t.Error("body.DBConnected = false, want true")
	}
}

func TestHandler_Unhealthy(t *testing.T) {
	h := NewHandler(&mockChecker{
		status: HealthStatus{},
		err:    apperror.Internal(errors.New("db down")),
	})

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()

	h.Routes().ServeHTTP(rec, req)

	if rec.Code != http.StatusInternalServerError {
		t.Errorf("status = %d, want %d", rec.Code, http.StatusInternalServerError)
	}

	var body map[string]string
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	// Should return the safe generic message, not the actual error.
	if body["error"] != "internal server error" {
		t.Errorf("body[error] = %q, want %q", body["error"], "internal server error")
	}
}
