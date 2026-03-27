package health

// HealthStatus represents the result of a health check.
type HealthStatus struct {
	Status      string `json:"status"`
	DBConnected bool   `json:"db_connected"`
}
