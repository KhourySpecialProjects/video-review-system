package videos

import (
	"context"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/KhourySpecialProjects/video-review-system/internal/apperror"
	"github.com/KhourySpecialProjects/video-review-system/internal/request"
	"github.com/KhourySpecialProjects/video-review-system/internal/respond"
)

// VideoService is the interface the handler depends on for video operations.
// The concrete Service satisfies this interface, and tests can substitute a mock.
type VideoService interface {
	GetByID(ctx context.Context, id uuid.UUID) (Video, error)
	Create(ctx context.Context, req CreateVideoRequest) (Video, error)
	List(ctx context.Context, limit, offset int) ([]Video, error)
	Update(ctx context.Context, id uuid.UUID, req CreateVideoRequest) (Video, error)
	Delete(ctx context.Context, id uuid.UUID) error
}

// Handler handles HTTP requests for video resources.
type Handler struct {
	service VideoService
}

// NewHandler creates a new Handler with the given VideoService implementation.
func NewHandler(service VideoService) *Handler {
	return &Handler{service: service}
}

// Routes returns a chi.Router with all video routes registered.
func (h *Handler) Routes() chi.Router {
	r := chi.NewRouter()
	r.Get("/", h.list)
	r.Post("/", h.create)

	r.Route("/{videoID}", func(r chi.Router) {
		r.Get("/", h.get)
		r.Put("/", h.update)
		r.Delete("/", h.remove)
	})

	return r
}

// get handles GET /api/videos/{videoID}.
func (h *Handler) get(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "videoID"))
	if err != nil {
		apperror.Write(w, apperror.BadRequest("invalid video ID"))
		return
	}

	video, err := h.service.GetByID(r.Context(), id)
	if err != nil {
		apperror.Write(w, err)
		return
	}

	respond.JSON(w, http.StatusOK, video)
}

// create handles POST /api/videos.
func (h *Handler) create(w http.ResponseWriter, r *http.Request) {
	var req CreateVideoRequest
	if err := request.DecodeJSON(r, &req); err != nil {
		apperror.Write(w, apperror.BadRequest(err.Error()))
		return
	}

	video, err := h.service.Create(r.Context(), req)
	if err != nil {
		apperror.Write(w, err)
		return
	}

	respond.JSON(w, http.StatusCreated, video)
}

// list handles GET /api/videos.
func (h *Handler) list(w http.ResponseWriter, r *http.Request) {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

	videos, err := h.service.List(r.Context(), limit, offset)
	if err != nil {
		apperror.Write(w, err)
		return
	}

	respond.JSON(w, http.StatusOK, videos)
}

// update handles PUT /api/videos/{videoID}.
func (h *Handler) update(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "videoID"))
	if err != nil {
		apperror.Write(w, apperror.BadRequest("invalid video ID"))
		return
	}

	var req CreateVideoRequest
	if err := request.DecodeJSON(r, &req); err != nil {
		apperror.Write(w, apperror.BadRequest(err.Error()))
		return
	}

	video, err := h.service.Update(r.Context(), id, req)
	if err != nil {
		apperror.Write(w, err)
		return
	}

	respond.JSON(w, http.StatusOK, video)
}

// remove handles DELETE /api/videos/{videoID}.
func (h *Handler) remove(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "videoID"))
	if err != nil {
		apperror.Write(w, apperror.BadRequest("invalid video ID"))
		return
	}

	if err := h.service.Delete(r.Context(), id); err != nil {
		apperror.Write(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
