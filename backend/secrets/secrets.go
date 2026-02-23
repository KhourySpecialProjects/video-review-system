package secrets

import (
	"context"
	"encoding/json"
	"fmt"
	"os"

	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/secretsmanager"
)

type AppSecrets struct {
	DatabaseURL   string `json:"DATABASE_URL"`
	AllowedOrigin string `json:"ALLOWED_ORIGIN"`
}

func Load(ctx context.Context) (*AppSecrets, error) {
	secretName := os.Getenv("SECRET_NAME")
	if secretName == "" {
		return nil, fmt.Errorf("SECRET_NAME must be set")
	}

	cfg, err := config.LoadDefaultConfig(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to load AWS config: %w", err)
	}

	client := secretsmanager.NewFromConfig(cfg)
	result, err := client.GetSecretValue(ctx, &secretsmanager.GetSecretValueInput{
		SecretId: &secretName,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to get secret: %w", err)
	}

	var s AppSecrets
	if err := json.Unmarshal([]byte(*result.SecretString), &s); err != nil {
		return nil, fmt.Errorf("failed to parse secret JSON: %w", err)
	}

	return &s, nil
}
