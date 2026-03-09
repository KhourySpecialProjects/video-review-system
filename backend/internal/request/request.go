package request

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
)

// maxBodySize is the maximum allowed request body size (1 MB).
const maxBodySize = 1 << 20 // 1 MB

// DecodeJSON reads the request body and decodes it into dst.
// It enforces a max body size and rejects unknown JSON fields.
func DecodeJSON(r *http.Request, dst any) error {
	// Limit request body size to prevent abuse.
	r.Body = http.MaxBytesReader(nil, r.Body, maxBodySize)

	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()

	if err := dec.Decode(dst); err != nil {
		var syntaxErr *json.SyntaxError
		var unmarshalTypeErr *json.UnmarshalTypeError
		var maxBytesErr *http.MaxBytesError

		switch {
		case errors.As(err, &syntaxErr):
			return fmt.Errorf("malformed JSON at position %d", syntaxErr.Offset)

		case errors.As(err, &unmarshalTypeErr):
			return fmt.Errorf("invalid type for field %q: expected %s", unmarshalTypeErr.Field, unmarshalTypeErr.Type)

		case errors.As(err, &maxBytesErr):
			return fmt.Errorf("request body must not exceed %d bytes", maxBodySize)

		case errors.Is(err, io.EOF):
			return errors.New("request body is empty")

		case strings.HasPrefix(err.Error(), "json: unknown field"):
			fieldName := strings.TrimPrefix(err.Error(), "json: unknown field ")
			return fmt.Errorf("unknown field %s", fieldName)

		default:
			return fmt.Errorf("failed to decode request body: %w", err)
		}
	}

	return nil
}
