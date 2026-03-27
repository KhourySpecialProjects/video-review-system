-- CreateEnum
CREATE TYPE "resource_type" AS ENUM ('SITE', 'STUDY', 'VIDEO');

-- CreateEnum
CREATE TYPE "permission_level" AS ENUM ('READ', 'WRITE', 'EXPORT', 'ADMIN');

-- CreateEnum
CREATE TYPE "video_status" AS ENUM ('UPLOADING', 'PROCESSING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "annotation_type" AS ENUM ('text_comment', 'drawing_box', 'freehand_drawing');

-- CreateEnum
CREATE TYPE "action_type" AS ENUM ('CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN');

-- CreateEnum
CREATE TYPE "entity_type" AS ENUM ('VIDEO', 'ANNOTATION', 'USER', 'STUDY', 'SEQUENCE');

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('CAREGIVER', 'CLINICAL_REVIEWER', 'SITE_COORDINATOR', 'SYSADMIN');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "role" "user_role" NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sites" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "studies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "studies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sites_studies" (
    "study_id" UUID NOT NULL,
    "site_id" UUID NOT NULL,

    CONSTRAINT "sites_studies_pkey" PRIMARY KEY ("study_id","site_id")
);

-- CreateTable
CREATE TABLE "patient" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "study_id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "identifier" TEXT,

    CONSTRAINT "patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "caregiver_patient" (
    "patient_id" UUID NOT NULL,
    "caregiver_id" TEXT NOT NULL,

    CONSTRAINT "caregiver_patient_pkey" PRIMARY KEY ("patient_id","caregiver_id")
);

-- CreateTable
CREATE TABLE "user_permissions" (
    "user_id" TEXT NOT NULL,
    "resource_id" UUID NOT NULL,
    "permission_level" "permission_level" NOT NULL,
    "resource_type" "resource_type" NOT NULL,

    CONSTRAINT "user_permissions_pkey" PRIMARY KEY ("user_id","resource_id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "user_id" TEXT NOT NULL,
    "role" "user_role" NOT NULL,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id","role")
);

-- CreateTable
CREATE TABLE "videos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patient_id" UUID NOT NULL,
    "uploaded_by_user_id" TEXT NOT NULL,
    "status" "video_status" NOT NULL DEFAULT 'UPLOADING',
    "duration_seconds" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "taken_at" TIMESTAMP(3),

    CONSTRAINT "videos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "caregiver_video_metadata" (
    "video_id" UUID NOT NULL,
    "caregiver_user_id" TEXT NOT NULL,
    "private_title" TEXT,
    "private_notes" TEXT,
    "tags" JSONB,

    CONSTRAINT "caregiver_video_metadata_pkey" PRIMARY KEY ("video_id","caregiver_user_id")
);

-- CreateTable
CREATE TABLE "annotations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "video_id" UUID NOT NULL,
    "author_user_id" TEXT NOT NULL,
    "type" "annotation_type" NOT NULL,
    "timestamp_ms" INTEGER NOT NULL,
    "duration_ms" INTEGER,
    "payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "annotations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_clips" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source_video_id" UUID NOT NULL,
    "created_by_user_id" TEXT NOT NULL,
    "title" TEXT,
    "start_time_ms" INTEGER NOT NULL,
    "end_time_ms" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "video_clips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stiched_sequences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "study_id" UUID NOT NULL,
    "created_by_user_id" TEXT NOT NULL,
    "title" TEXT,

    CONSTRAINT "stiched_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sequence_items" (
    "clip_id" UUID NOT NULL,
    "sequence_id" UUID NOT NULL,
    "play_order" INTEGER NOT NULL,

    CONSTRAINT "sequence_items_pkey" PRIMARY KEY ("clip_id","sequence_id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actor_user_id" TEXT,
    "action_type" "action_type" NOT NULL,
    "entity_type" "entity_type" NOT NULL,
    "entity_id" UUID,
    "site_id" UUID,
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE INDEX "invitations_token_hash_idx" ON "invitations"("token_hash");

-- CreateIndex
CREATE INDEX "patient_identifier_idx" ON "patient"("identifier");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sites_studies" ADD CONSTRAINT "sites_studies_study_id_fkey" FOREIGN KEY ("study_id") REFERENCES "studies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sites_studies" ADD CONSTRAINT "sites_studies_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient" ADD CONSTRAINT "patient_study_id_fkey" FOREIGN KEY ("study_id") REFERENCES "studies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient" ADD CONSTRAINT "patient_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caregiver_patient" ADD CONSTRAINT "caregiver_patient_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caregiver_patient" ADD CONSTRAINT "caregiver_patient_caregiver_id_fkey" FOREIGN KEY ("caregiver_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "videos" ADD CONSTRAINT "videos_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "videos" ADD CONSTRAINT "videos_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caregiver_video_metadata" ADD CONSTRAINT "caregiver_video_metadata_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caregiver_video_metadata" ADD CONSTRAINT "caregiver_video_metadata_caregiver_user_id_fkey" FOREIGN KEY ("caregiver_user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "annotations" ADD CONSTRAINT "annotations_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "annotations" ADD CONSTRAINT "annotations_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_clips" ADD CONSTRAINT "video_clips_source_video_id_fkey" FOREIGN KEY ("source_video_id") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_clips" ADD CONSTRAINT "video_clips_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stiched_sequences" ADD CONSTRAINT "stiched_sequences_study_id_fkey" FOREIGN KEY ("study_id") REFERENCES "studies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stiched_sequences" ADD CONSTRAINT "stiched_sequences_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sequence_items" ADD CONSTRAINT "sequence_items_clip_id_fkey" FOREIGN KEY ("clip_id") REFERENCES "video_clips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sequence_items" ADD CONSTRAINT "sequence_items_sequence_id_fkey" FOREIGN KEY ("sequence_id") REFERENCES "stiched_sequences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;
