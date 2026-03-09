package videos

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
)

// mockStore is a test double that implements the Store interface.
type mockStore struct {
	getByIDFn func(ctx context.Context, id uuid.UUID) (Video, error)
	createFn  func(ctx context.Context, req CreateVideoRequest) (Video, error)
	listFn    func(ctx context.Context, limit, offset int) ([]Video, error)
	updateFn  func(ctx context.Context, id uuid.UUID, req CreateVideoRequest) (Video, error)
	deleteFn  func(ctx context.Context, id uuid.UUID) error
}

func (m *mockStore) GetByID(ctx context.Context, id uuid.UUID) (Video, error) {
	return m.getByIDFn(ctx, id)
}
func (m *mockStore) Create(ctx context.Context, req CreateVideoRequest) (Video, error) {
	return m.createFn(ctx, req)
}
func (m *mockStore) List(ctx context.Context, limit, offset int) ([]Video, error) {
	return m.listFn(ctx, limit, offset)
}
func (m *mockStore) Update(ctx context.Context, id uuid.UUID, req CreateVideoRequest) (Video, error) {
	return m.updateFn(ctx, id, req)
}
func (m *mockStore) Delete(ctx context.Context, id uuid.UUID) error {
	return m.deleteFn(ctx, id)
}

func TestService_GetByID_Success(t *testing.T) {
	expected := Video{ID: uuid.New(), Status: StatusReady}

	svc := NewService(&mockStore{
		getByIDFn: func(_ context.Context, _ uuid.UUID) (Video, error) {
			return expected, nil
		},
	})

	video, err := svc.GetByID(context.Background(), expected.ID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if video.ID != expected.ID {
		t.Errorf("ID = %v, want %v", video.ID, expected.ID)
	}
}

func TestService_GetByID_Error(t *testing.T) {
	svc := NewService(&mockStore{
		getByIDFn: func(_ context.Context, _ uuid.UUID) (Video, error) {
			return Video{}, errors.New("db error")
		},
	})

	_, err := svc.GetByID(context.Background(), uuid.New())
	if err == nil {
		t.Fatal("expected error, got nil")
	}
}

func TestService_Create_MissingPatientID(t *testing.T) {
	svc := NewService(&mockStore{})

	_, err := svc.Create(context.Background(), CreateVideoRequest{
		UploadedByUserID: uuid.New(),
	})
	if err == nil {
		t.Fatal("expected error for missing patient_id, got nil")
	}
}

func TestService_Create_MissingUploaderID(t *testing.T) {
	svc := NewService(&mockStore{})

	_, err := svc.Create(context.Background(), CreateVideoRequest{
		PatientID: uuid.New(),
	})
	if err == nil {
		t.Fatal("expected error for missing uploaded_by_user_id, got nil")
	}
}

func TestService_Create_Success(t *testing.T) {
	patientID := uuid.New()
	uploaderID := uuid.New()

	svc := NewService(&mockStore{
		createFn: func(_ context.Context, req CreateVideoRequest) (Video, error) {
			return Video{
				ID:               uuid.New(),
				PatientID:        req.PatientID,
				UploadedByUserID: req.UploadedByUserID,
				Status:           StatusUploading,
			}, nil
		},
	})

	video, err := svc.Create(context.Background(), CreateVideoRequest{
		PatientID:        patientID,
		UploadedByUserID: uploaderID,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if video.PatientID != patientID {
		t.Errorf("PatientID = %v, want %v", video.PatientID, patientID)
	}
}

func TestService_List_DefaultsLimit(t *testing.T) {
	var capturedLimit int

	svc := NewService(&mockStore{
		listFn: func(_ context.Context, limit, offset int) ([]Video, error) {
			capturedLimit = limit
			return []Video{}, nil
		},
	})

	_, err := svc.List(context.Background(), 0, 0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if capturedLimit != 20 {
		t.Errorf("default limit = %d, want 20", capturedLimit)
	}
}

func TestService_List_CapsLimit(t *testing.T) {
	var capturedLimit int

	svc := NewService(&mockStore{
		listFn: func(_ context.Context, limit, offset int) ([]Video, error) {
			capturedLimit = limit
			return []Video{}, nil
		},
	})

	_, err := svc.List(context.Background(), 500, 0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if capturedLimit != 100 {
		t.Errorf("capped limit = %d, want 100", capturedLimit)
	}
}
