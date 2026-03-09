package apperror

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestNotFound(t *testing.T) {
	err := NotFound("video", 42)

	if err.StatusCode != http.StatusNotFound {
		t.Errorf("StatusCode = %d, want %d", err.StatusCode, http.StatusNotFound)
	}
	if err.Message != "video 42 not found" {
		t.Errorf("Message = %q, want %q", err.Message, "video 42 not found")
	}
	if err.Error() != "video 42 not found" {
		t.Errorf("Error() = %q, want %q", err.Error(), "video 42 not found")
	}
}

func TestBadRequest(t *testing.T) {
	err := BadRequest("title is required")

	if err.StatusCode != http.StatusBadRequest {
		t.Errorf("StatusCode = %d, want %d", err.StatusCode, http.StatusBadRequest)
	}
	if err.Message != "title is required" {
		t.Errorf("Message = %q, want %q", err.Message, "title is required")
	}
}

func TestConflict(t *testing.T) {
	err := Conflict("email already exists")

	if err.StatusCode != http.StatusConflict {
		t.Errorf("StatusCode = %d, want %d", err.StatusCode, http.StatusConflict)
	}
}

func TestUnauthorized(t *testing.T) {
	err := Unauthorized("invalid token")

	if err.StatusCode != http.StatusUnauthorized {
		t.Errorf("StatusCode = %d, want %d", err.StatusCode, http.StatusUnauthorized)
	}
}

func TestForbidden(t *testing.T) {
	err := Forbidden("insufficient permissions")

	if err.StatusCode != http.StatusForbidden {
		t.Errorf("StatusCode = %d, want %d", err.StatusCode, http.StatusForbidden)
	}
}

func TestInternal(t *testing.T) {
	cause := errors.New("connection refused")
	err := Internal(cause)

	if err.StatusCode != http.StatusInternalServerError {
		t.Errorf("StatusCode = %d, want %d", err.StatusCode, http.StatusInternalServerError)
	}
	// The message should be generic — never expose internal details.
	if err.Message != "internal server error" {
		t.Errorf("Message = %q, want %q", err.Message, "internal server error")
	}
	// The original error should be wrapped for logging.
	if !errors.Is(err, cause) {
		t.Error("Unwrap should return the wrapped cause")
	}
}

func TestWrite_AppError(t *testing.T) {
	rec := httptest.NewRecorder()

	Write(rec, NotFound("video", 42))

	if rec.Code != http.StatusNotFound {
		t.Errorf("status = %d, want %d", rec.Code, http.StatusNotFound)
	}

	var body map[string]string
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatalf("failed to decode body: %v", err)
	}
	if body["error"] != "video 42 not found" {
		t.Errorf("body[error] = %q, want %q", body["error"], "video 42 not found")
	}
}

func TestWrite_UnexpectedError(t *testing.T) {
	rec := httptest.NewRecorder()

	Write(rec, errors.New("something broke"))

	// Unexpected errors should always return 500 with a safe message.
	if rec.Code != http.StatusInternalServerError {
		t.Errorf("status = %d, want %d", rec.Code, http.StatusInternalServerError)
	}

	var body map[string]string
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatalf("failed to decode body: %v", err)
	}
	// Should NOT leak the actual error message.
	if body["error"] != "internal server error" {
		t.Errorf("body[error] = %q, want %q", body["error"], "internal server error")
	}
}
