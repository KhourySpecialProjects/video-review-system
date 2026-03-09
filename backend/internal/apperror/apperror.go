package apperror

import (
	"fmt"
	"log/slog"
	"net/http"

	"github.com/KhourySpecialProjects/video-review-system/internal/respond"
)

// AppError represents a domain error that maps to an HTTP status code.
// Message is sent to the client. Err (if present) is logged but never exposed.
type AppError struct {
	StatusCode int    // HTTP status code
	Message    string // Human-readable message sent to the client
	Err        error  // Wrapped error for logging (never sent to client)
}

// Error implements the error interface.
func (e *AppError) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("%s: %v", e.Message, e.Err)
	}
	return e.Message
}

// Unwrap supports errors.Is() and errors.As() for the wrapped error.
func (e *AppError) Unwrap() error {
	return e.Err
}

// --- Constructors ---

// NotFound creates a 404 error for a missing resource.
func NotFound(resource string, id any) *AppError {
	return &AppError{
		StatusCode: http.StatusNotFound,
		Message:    fmt.Sprintf("%s %v not found", resource, id),
	}
}

// BadRequest creates a 400 error for invalid client input.
func BadRequest(message string) *AppError {
	return &AppError{
		StatusCode: http.StatusBadRequest,
		Message:    message,
	}
}

// Conflict creates a 409 error for resource conflicts.
func Conflict(message string) *AppError {
	return &AppError{
		StatusCode: http.StatusConflict,
		Message:    message,
	}
}

// Unauthorized creates a 401 error for missing or invalid authentication.
func Unauthorized(message string) *AppError {
	return &AppError{
		StatusCode: http.StatusUnauthorized,
		Message:    message,
	}
}

// Forbidden creates a 403 error for insufficient permissions.
func Forbidden(message string) *AppError {
	return &AppError{
		StatusCode: http.StatusForbidden,
		Message:    message,
	}
}

// Internal creates a 500 error that wraps an unexpected error.
// The wrapped error is logged but a generic message is sent to the client.
func Internal(err error) *AppError {
	return &AppError{
		StatusCode: http.StatusInternalServerError,
		Message:    "internal server error",
		Err:        err,
	}
}

// --- Response Writer ---

// Write inspects err and writes the appropriate HTTP response.
// If err is an *AppError, it uses the status code and message from it.
// If err is any other error, it logs the error and returns a safe 500.
func Write(w http.ResponseWriter, err error) {
	if appErr, ok := err.(*AppError); ok {
		if appErr.Err != nil {
			slog.Error("request error",
				"status", appErr.StatusCode,
				"message", appErr.Message,
				"cause", appErr.Err,
			)
		}
		respond.Error(w, appErr.StatusCode, appErr.Message)
		return
	}

	// Unexpected error — log it, return a safe 500.
	slog.Error("unexpected error", "error", err)
	respond.Error(w, http.StatusInternalServerError, "internal server error")
}
