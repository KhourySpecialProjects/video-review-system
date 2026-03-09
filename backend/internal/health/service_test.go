package health

import (
	"context"
	"errors"
	"testing"
)

// mockPinger is a test double that implements the Pinger interface.
type mockPinger struct {
	err error
}

func (m *mockPinger) Ping(_ context.Context) error {
	return m.err
}

func TestCheck_Healthy(t *testing.T) {
	svc := NewService(&mockPinger{err: nil})

	status, err := svc.Check(context.Background())

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if status.Status != "healthy" {
		t.Errorf("Status = %q, want %q", status.Status, "healthy")
	}
	if !status.DBConnected {
		t.Error("DBConnected = false, want true")
	}
}

func TestCheck_Unhealthy(t *testing.T) {
	svc := NewService(&mockPinger{err: errors.New("connection refused")})

	_, err := svc.Check(context.Background())

	if err == nil {
		t.Fatal("expected error, got nil")
	}
}
