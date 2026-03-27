package config

import "os"

// Config holds all configuration values for the application.
type Config struct {
	DatabaseURL   string
	AllowedOrigin string
	Port          string
}

// Load reads configuration from environment variables.
// Sensible defaults are provided for local development.
func Load() *Config {
	return &Config{
		DatabaseURL:   getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/angelman?sslmode=disable"),
		AllowedOrigin: getEnv("ALLOWED_ORIGIN", "http://localhost:5173"),
		Port:          getEnv("PORT", "8080"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
