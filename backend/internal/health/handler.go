package health

import (
	"context"
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/KhourySpecialProjects/video-review-system/internal/apperror"
	"github.com/KhourySpecialProjects/video-review-system/internal/respond"
)

// Checker is the interface the handler depends on for health checks.
// The concrete Service satisfies this interface, and tests can substitute a mock.
type Checker interface {
	Check(ctx context.Context) (HealthStatus, error)
}

// Handler handles HTTP requests for health checks.
type Handler struct {
	service Checker
}

// NewHandler creates a new Handler with the given Checker implementation.
func NewHandler(service Checker) *Handler {
	return &Handler{service: service}
}

// Routes returns a chi.Router with all health check routes registered.
func (h *Handler) Routes() chi.Router {
	r := chi.NewRouter()
	r.Get("/", h.check)
	return r
}

// check handles GET /api/health.
func (h *Handler) check(w http.ResponseWriter, r *http.Request) {
	status, err := h.service.Check(r.Context())
	if err != nil {
		apperror.Write(w, err)
		return
	}
	respond.JSON(w, http.StatusOK, status)
}
