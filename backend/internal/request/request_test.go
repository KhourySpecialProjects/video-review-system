package request

import (
	"net/http/httptest"
	"strings"
	"testing"
)

type testPayload struct {
	Name  string `json:"name"`
	Email string `json:"email"`
}

func TestDecodeJSON_Valid(t *testing.T) {
	body := `{"name": "Kyle", "email": "kyle@example.com"}`
	r := httptest.NewRequest("POST", "/", strings.NewReader(body))

	var payload testPayload
	if err := DecodeJSON(r, &payload); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if payload.Name != "Kyle" {
		t.Errorf("Name = %q, want %q", payload.Name, "Kyle")
	}
	if payload.Email != "kyle@example.com" {
		t.Errorf("Email = %q, want %q", payload.Email, "kyle@example.com")
	}
}

func TestDecodeJSON_EmptyBody(t *testing.T) {
	r := httptest.NewRequest("POST", "/", strings.NewReader(""))

	var payload testPayload
	err := DecodeJSON(r, &payload)

	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if !strings.Contains(err.Error(), "empty") {
		t.Errorf("error = %q, want it to mention 'empty'", err.Error())
	}
}

func TestDecodeJSON_UnknownField(t *testing.T) {
	body := `{"name": "Kyle", "unknown_field": "value"}`
	r := httptest.NewRequest("POST", "/", strings.NewReader(body))

	var payload testPayload
	err := DecodeJSON(r, &payload)

	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if !strings.Contains(err.Error(), "unknown field") {
		t.Errorf("error = %q, want it to mention 'unknown field'", err.Error())
	}
}

func TestDecodeJSON_MalformedJSON(t *testing.T) {
	body := `{"name": "Kyle",}`
	r := httptest.NewRequest("POST", "/", strings.NewReader(body))

	var payload testPayload
	err := DecodeJSON(r, &payload)

	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if !strings.Contains(err.Error(), "malformed JSON") {
		t.Errorf("error = %q, want it to mention 'malformed JSON'", err.Error())
	}
}

func TestDecodeJSON_WrongType(t *testing.T) {
	body := `{"name": 123}`
	r := httptest.NewRequest("POST", "/", strings.NewReader(body))

	var payload testPayload
	err := DecodeJSON(r, &payload)

	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if !strings.Contains(err.Error(), "invalid type") {
		t.Errorf("error = %q, want it to mention 'invalid type'", err.Error())
	}
}

func TestDecodeJSON_OversizedBody(t *testing.T) {
	// Create a body that exceeds 1 MB.
	huge := strings.Repeat("x", 1<<20+1)
	body := `{"name": "` + huge + `"}`
	r := httptest.NewRequest("POST", "/", strings.NewReader(body))

	var payload testPayload
	err := DecodeJSON(r, &payload)

	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if !strings.Contains(err.Error(), "exceed") {
		t.Errorf("error = %q, want it to mention 'exceed'", err.Error())
	}
}
