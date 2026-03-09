package respond

import (
	"encoding/json"
	"log/slog"
	"net/http"
)

// JSON writes a JSON response with the given status code and payload.
// If marshaling fails, it logs the error and returns a 500 plain text response.
func JSON(w http.ResponseWriter, statusCode int, payload any) {
	data, err := json.Marshal(payload)
	if err != nil {
		slog.Error("respond.JSON: failed to marshal payload", "error", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	w.Write(data)
}

// errorResponse is the consistent error envelope sent to clients.
type errorResponse struct {
	Error string `json:"error"`
}

// Error writes a JSON error response with the given status code and message.
func Error(w http.ResponseWriter, statusCode int, message string) {
	JSON(w, statusCode, errorResponse{Error: message})
}
