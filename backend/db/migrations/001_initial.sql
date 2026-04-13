-- +goose Up
CREATE TABLE IF NOT EXISTS health_checks (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- ENUMS — moved before auth tables so user_role is available
-- ============================================================

CREATE TYPE permission_level AS ENUM ('READ', 'WRITE', 'EXPORT', 'ADMIN');
CREATE TYPE video_status     AS ENUM ('UPLOADING', 'PROCESSING', 'READY', 'FAILED');
CREATE TYPE study_status     AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'FINISHED');
CREATE TYPE review_status    AS ENUM ('NOT_REVIEWED', 'IN_REVIEW', 'REVIEWED');
CREATE TYPE annotation_type  AS ENUM ('text_comment', 'drawing_box', 'freehand_drawing', 'tag');
CREATE TYPE action_type      AS ENUM ('CREATE', 'READ', 'UPDATE', 'DELETE', 'DOWNLOAD', 'LOGIN');
CREATE TYPE entity_type      AS ENUM ('VIDEO', 'ANNOTATION', 'USER', 'STUDY', 'SEQUENCE', 'CLIP', 'SITE', 'PERMISSIONS');
CREATE TYPE user_role        AS ENUM ('CAREGIVER', 'CLINICAL_REVIEWER', 'SITE_COORDINATOR', 'SYSADMIN');


-- ============================================================
-- AUTH — Better Auth tables (camelCase columns, text PKs)
-- ============================================================

CREATE TABLE IF NOT EXISTS "user" (
    "id"             text        NOT NULL PRIMARY KEY,
    "name"           text        NOT NULL,
    "email"          text        NOT NULL UNIQUE,
    "emailVerified"  boolean     NOT NULL,
    "image"          text,
    "createdAt"      timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    role             user_role,
    caregiver_id     TEXT,
    is_deactivated   BOOLEAN     NOT NULL DEFAULT FALSE
    -- site_id added after sites table is created below
);

CREATE TABLE IF NOT EXISTS "session" (
    "id"          text        NOT NULL PRIMARY KEY,
    "expiresAt"   timestamptz NOT NULL,
    "token"       text        NOT NULL UNIQUE,
    "createdAt"   timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   timestamptz NOT NULL,
    "ipAddress"   text,
    "userAgent"   text,
    "userId"      text        NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "account" (
    "id"                     text        NOT NULL PRIMARY KEY,
    "accountId"              text        NOT NULL,
    "providerId"             text        NOT NULL,
    "userId"                 text        NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
    "accessToken"            text,
    "refreshToken"           text,
    "idToken"                text,
    "accessTokenExpiresAt"   timestamptz,
    "refreshTokenExpiresAt"  timestamptz,
    "scope"                  text,
    "password"               text,
    "createdAt"              timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"              timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS "verification" (
    "id"          text        NOT NULL PRIMARY KEY,
    "identifier"  text        NOT NULL,
    "value"       text        NOT NULL,
    "expiresAt"   timestamptz NOT NULL,
    "createdAt"   timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "session_userId_idx"         ON "session"      ("userId");
CREATE INDEX IF NOT EXISTS "account_userId_idx"         ON "account"      ("userId");
CREATE INDEX IF NOT EXISTS "verification_identifier_idx" ON "verification" ("identifier");


-- ============================================================
-- HIERARCHY & ACCESS CONTROL
-- ============================================================

CREATE TABLE IF NOT EXISTS sites (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR     NOT NULL,
    created_at  TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS studies (
    id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR       NOT NULL,
    status      study_status  NOT NULL DEFAULT 'NOT_STARTED',
    created_at  TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- Add site FK to user now that sites exists
ALTER TABLE "user" ADD COLUMN site_id UUID REFERENCES sites(id);

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

-- Caregiver-to-study membership (replaces previous patient-level link)
CREATE TABLE IF NOT EXISTS caregiver_patient (
    study_id    UUID    NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
    user_id     TEXT    NOT NULL REFERENCES "user"(id)  ON DELETE CASCADE,
    PRIMARY KEY (study_id, user_id)
);

-- Explicit per-resource permissions (study / site / video scoped)
CREATE TABLE IF NOT EXISTS user_permissions (
    id               UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          TEXT              NOT NULL REFERENCES "user"(id)   ON DELETE CASCADE,
    study_id         UUID              REFERENCES studies(id) ON DELETE CASCADE,
    site_id          UUID              REFERENCES sites(id)   ON DELETE CASCADE,
    video_id         UUID,             -- FK to videos added after that table is created
    permission_level permission_level  NOT NULL
);

CREATE TABLE IF NOT EXISTS user_roles (
    user_id     TEXT        NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    role        user_role   NOT NULL,
    PRIMARY KEY (user_id, role)
);


-- ============================================================
-- VIDEO STORAGE & PRIVATE METADATA
-- ============================================================

CREATE TABLE IF NOT EXISTS videos (
    id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id            UUID          NOT NULL REFERENCES patient(id) ON DELETE CASCADE,
    uploaded_by_user_id   TEXT          NOT NULL REFERENCES "user"(id),
    s3_key                VARCHAR,
    status                video_status  NOT NULL DEFAULT 'UPLOADING',
    duration_seconds      INTEGER,
    created_at            TIMESTAMP     NOT NULL DEFAULT NOW(),
    taken_at              TIMESTAMP,
    video_review_comments TEXT
);

-- Now that videos exists, add the FK constraint to user_permissions
ALTER TABLE user_permissions
    ADD CONSTRAINT user_permissions_video_id_fkey
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS caregiver_video_metadata (
    video_id            UUID    NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    caregiver_user_id   TEXT    NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    private_title       VARCHAR,
    private_notes       TEXT,
    tags                JSONB,
    PRIMARY KEY (video_id, caregiver_user_id)
);


-- ============================================================
-- VIDEO STUDY — clinical reviewer link between video, study, site
-- ============================================================

CREATE TABLE IF NOT EXISTS video_study (
    study_id         UUID          NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
    site_id          UUID          NOT NULL REFERENCES sites(id)   ON DELETE CASCADE,
    video_id         UUID          NOT NULL REFERENCES videos(id)  ON DELETE CASCADE,
    comment_overview VARCHAR,
    review_status    review_status NOT NULL DEFAULT 'NOT_REVIEWED',
    PRIMARY KEY (study_id, video_id, site_id)
);


-- ============================================================
-- ANNOTATIONS, CLIPS & SEQUENCES
-- ============================================================

CREATE TABLE IF NOT EXISTS annotations (
    id              UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id        UUID                NOT NULL REFERENCES videos(id)  ON DELETE CASCADE,
    author_user_id  TEXT                NOT NULL REFERENCES "user"(id),
    study_id        UUID                NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
    site_id         UUID                NOT NULL REFERENCES sites(id)   ON DELETE CASCADE,
    type            annotation_type     NOT NULL,
    timestamp_ms    INTEGER             NOT NULL,
    duration_ms     INTEGER,
    payload         JSONB,
    created_at      TIMESTAMP           NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS video_clips (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    source_video_id     UUID        NOT NULL REFERENCES videos(id)  ON DELETE CASCADE,
    created_by_user_id  TEXT        NOT NULL REFERENCES "user"(id),
    study_id            UUID        NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
    site_id             UUID        NOT NULL REFERENCES sites(id)   ON DELETE CASCADE,
    title               VARCHAR,
    start_time_ms       INTEGER     NOT NULL,
    end_time_ms         INTEGER     NOT NULL,
    created_at          TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stiched_sequences (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    study_id            UUID        NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
    site_id             UUID        NOT NULL REFERENCES sites(id)   ON DELETE CASCADE,
    video_id            UUID        NOT NULL REFERENCES videos(id)  ON DELETE CASCADE,
    created_by_user_id  TEXT        NOT NULL REFERENCES "user"(id),
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
    actor_user_id   TEXT            REFERENCES "user"(id) ON DELETE SET NULL,
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
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS sequence_items;
DROP TABLE IF EXISTS stiched_sequences;
DROP TABLE IF EXISTS video_clips;
DROP TABLE IF EXISTS annotations;
DROP TABLE IF EXISTS video_study;
DROP TABLE IF EXISTS caregiver_video_metadata;
DROP TABLE IF EXISTS user_permissions;
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS videos;
DROP TABLE IF EXISTS caregiver_patient;
DROP TABLE IF EXISTS patient;
DROP TABLE IF EXISTS sites_studies;
DROP TABLE IF EXISTS "verification";
DROP TABLE IF EXISTS "account";
DROP TABLE IF EXISTS "session";
DROP TABLE IF EXISTS "user";
DROP TABLE IF EXISTS studies;
DROP TABLE IF EXISTS sites;
DROP TABLE IF EXISTS health_checks;
DROP TYPE IF EXISTS user_role;
DROP TYPE IF EXISTS entity_type;
DROP TYPE IF EXISTS action_type;
DROP TYPE IF EXISTS annotation_type;
DROP TYPE IF EXISTS review_status;
DROP TYPE IF EXISTS study_status;
DROP TYPE IF EXISTS video_status;
DROP TYPE IF EXISTS permission_level;
