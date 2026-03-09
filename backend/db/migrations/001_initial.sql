-- +goose Up
CREATE TABLE IF NOT EXISTS health_checks (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- +goose Down
DROP TABLE IF EXISTS health_checks;
