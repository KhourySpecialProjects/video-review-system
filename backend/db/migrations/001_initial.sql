-- +goose Up
CREATE TABLE IF NOT EXISTS health_checks (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- AUTH
-- ============================================================

CREATE TABLE IF NOT EXISTS "user" (
    "id" text not null primary key,
    "name" text not null,
    "email" text not null unique,
    "emailVerified" boolean not null,
    "image" text,
    "createdAt" timestamptz default CURRENT_TIMESTAMP not null,
    "updatedAt" timestamptz default CURRENT_TIMESTAMP not null
);

CREATE TABLE IF NOT EXISTS "session" (
    "id" text not null primary key,
    "expiresAt" timestamptz not null,
    "token" text not null unique,
    "createdAt" timestamptz default CURRENT_TIMESTAMP not null,
    "updatedAt" timestamptz not null,
    "ipAddress" text,
    "userAgent" text,
    "userId" text not null references "user" ("id") on delete cascade
);

CREATE TABLE IF NOT EXISTS "account" (
    "id" text not null primary key,
    "accountId" text not null,
    "providerId" text not null,
    "userId" text not null references "user" ("id") on delete cascade,
    "accessToken" text,
    "refreshToken" text,
    "idToken" text,
    "accessTokenExpiresAt" timestamptz,
    "refreshTokenExpiresAt" timestamptz,
    "scope" text,
    "password" text,
    "createdAt" timestamptz default CURRENT_TIMESTAMP not null,
    "updatedAt" timestamptz not null
);

CREATE TABLE IF NOT EXISTS "verification" (
    "id" text not null primary key,
    "identifier" text not null,
    "value" text not null,
    "expiresAt" timestamptz not null,
    "createdAt" timestamptz default CURRENT_TIMESTAMP not null,
    "updatedAt" timestamptz default CURRENT_TIMESTAMP not null
);

CREATE INDEX IF NOT EXISTS "session_userId_idx" ON "session" ("userId");

CREATE INDEX IF NOT EXISTS "account_userId_idx" ON "account" ("userId");

CREATE INDEX IF NOT EXISTS "verification_identifier_idx" ON "verification" ("identifier");

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE resource_type    AS ENUM ('SITE', 'STUDY', 'VIDEO');
CREATE TYPE permission_level AS ENUM ('READ', 'WRITE', 'EXPORT', 'ADMIN');
CREATE TYPE video_status     AS ENUM ('UPLOADING', 'PROCESSING', 'READY', 'FAILED');
CREATE TYPE annotation_type  AS ENUM ('text_comment', 'drawing_box', 'freehand_drawing');
CREATE TYPE action_type      AS ENUM ('CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN');
CREATE TYPE entity_type      AS ENUM ('VIDEO', 'ANNOTATION', 'USER', 'STUDY', 'SEQUENCE');
CREATE TYPE user_role        AS ENUM ('CAREGIVER', 'CLINICAL_REVIEWER', 'SITE_COORDINATOR', 'SYSADMIN');


-- ============================================================
-- HIERARCHY & ACCESS CONTROL
-- ============================================================

CREATE TABLE IF NOT EXISTS sites (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR     NOT NULL,
    created_at  TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS studies (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR     NOT NULL,
    created_at  TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sites_studies (
    study_id    UUID    NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
    site_id     UUID    NOT NULL REFERENCES sites(id)   ON DELETE CASCADE,
    PRIMARY KEY (study_id, site_id)
);

CREATE TABLE IF NOT EXISTS patient (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    study_id    UUID        NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
    site_id     UUID        NOT NULL REFERENCES sites(id)   ON DELETE CASCADE,
    identifier  VARCHAR
);

CREATE INDEX idx_patient_identifier ON patient(identifier);

CREATE TABLE IF NOT EXISTS caregiver_patient (
    patient_id      UUID    NOT NULL REFERENCES patient(id) ON DELETE CASCADE,
    caregiver_id    TEXT    NOT NULL REFERENCES "user"(id)  ON DELETE CASCADE,  -- TEXT: Better Auth id
    PRIMARY KEY (patient_id, caregiver_id)
);

CREATE TABLE IF NOT EXISTS user_permissions (
    user_id          TEXT              NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    resource_id      UUID              NOT NULL,
    permission_level permission_level  NOT NULL,
    resource_type    resource_type     NOT NULL,
    PRIMARY KEY (user_id, resource_id)
);

CREATE TABLE IF NOT EXISTS user_roles (
    user_id          TEXT              NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    role             user_role         NOT NULL,
    PRIMARY KEY (user_id, role)
);


-- ============================================================
-- VIDEO STORAGE & PRIVATE METADATA
-- ============================================================

CREATE TABLE IF NOT EXISTS videos (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id          UUID            NOT NULL REFERENCES patient(id) ON DELETE CASCADE,
    uploaded_by_user_id TEXT            NOT NULL REFERENCES "user"(id),  -- TEXT: Better Auth id
    status              video_status    NOT NULL DEFAULT 'UPLOADING',
    duration_seconds    INTEGER,
    created_at          TIMESTAMP       NOT NULL DEFAULT NOW(),
    taken_at            TIMESTAMP
);

CREATE TABLE IF NOT EXISTS caregiver_video_metadata (
    video_id            UUID    NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    caregiver_user_id   TEXT    NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,  -- TEXT: Better Auth id
    private_title       VARCHAR,
    private_notes       TEXT,
    tags                JSONB,
    PRIMARY KEY (video_id, caregiver_user_id)
);


-- ============================================================
-- ANNOTATIONS, CLIPS & SEQUENCES
-- ============================================================

CREATE TABLE IF NOT EXISTS annotations (
    id              UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id        UUID                NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    author_user_id  TEXT                NOT NULL REFERENCES "user"(id),  -- TEXT: Better Auth id
    type            annotation_type     NOT NULL,
    timestamp_ms    INTEGER             NOT NULL,
    duration_ms     INTEGER,
    payload         JSONB,
    created_at      TIMESTAMP           NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS video_clips (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    source_video_id     UUID        NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    created_by_user_id  TEXT        NOT NULL REFERENCES "user"(id),  -- TEXT: Better Auth id
    title               VARCHAR,
    start_time_ms       INTEGER     NOT NULL,
    end_time_ms         INTEGER     NOT NULL,
    created_at          TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stiched_sequences (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    study_id            UUID        NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
    created_by_user_id  TEXT        NOT NULL REFERENCES "user"(id),  -- TEXT: Better Auth id
    title               VARCHAR
);

CREATE TABLE IF NOT EXISTS sequence_items (
    clip_id         UUID    NOT NULL REFERENCES video_clips(id)       ON DELETE CASCADE,
    sequence_id     UUID    NOT NULL REFERENCES stiched_sequences(id) ON DELETE CASCADE,
    play_order      INTEGER NOT NULL,
    PRIMARY KEY (clip_id, sequence_id)
);


-- ============================================================
-- AUDITS
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id   TEXT            REFERENCES "user"(id) ON DELETE SET NULL,  -- TEXT: Better Auth id
    action_type     action_type     NOT NULL,
    entity_type     entity_type     NOT NULL,
    entity_id       UUID,
    site_id         UUID            REFERENCES sites(id) ON DELETE SET NULL,
    old_values      JSONB,
    new_values      JSONB,
    ip_address      VARCHAR,
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW()
);

-- +goose Down
DROP TABLE IF EXISTS health_checks;
DROP TABLE IF EXISTS "user";
DROP TABLE IF EXISTS "session";
DROP TABLE IF EXISTS "account";
DROP TABLE IF EXISTS "verification";
DROP TABLE IF EXISTS sites;
DROP TABLE IF EXISTS studies;
DROP TABLE IF EXISTS sites_studies;
DROP TABLE IF EXISTS patient;
DROP TABLE IF EXISTS caregiver_patient;
DROP TABLE IF EXISTS user_permissions;
DROP TABLE IF EXISTS videos;
DROP TABLE IF EXISTS caregiver_video_metadata;
DROP TABLE IF EXISTS annotations;
DROP TABLE IF EXISTS video_clips;
DROP TABLE IF EXISTS stiched_sequences;
DROP TABLE IF EXISTS sequence_items;
DROP TABLE IF EXISTS audit_logs;
