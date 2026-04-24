/*
  Warnings:

  - The values [PROCESSING,READY] on the enum `video_status` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `duration_ms` on the `annotations` table. All the data in the column will be lost.
  - You are about to drop the column `timestamp_ms` on the `annotations` table. All the data in the column will be lost.
  - The primary key for the `caregiver_patient` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `caregiver_id` on the `caregiver_patient` table. All the data in the column will be lost.
  - You are about to drop the column `patient_id` on the `caregiver_patient` table. All the data in the column will be lost.
  - You are about to drop the column `tags` on the `caregiver_video_metadata` table. All the data in the column will be lost.
  - The primary key for the `user_permissions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `resource_id` on the `user_permissions` table. All the data in the column will be lost.
  - You are about to drop the column `resource_type` on the `user_permissions` table. All the data in the column will be lost.
  - You are about to drop the column `end_time_ms` on the `video_clips` table. All the data in the column will be lost.
  - You are about to drop the column `start_time_ms` on the `video_clips` table. All the data in the column will be lost.
  - You are about to drop the column `video_review_comments` on the `videos` table. All the data in the column will be lost.
  - You are about to drop the `patient` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `duration_S` to the `annotations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `site_id` to the `annotations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `study_id` to the `annotations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `timestamp_S` to the `annotations` table without a default value. This is not possible if the table is not empty.
  - Made the column `payload` on table `annotations` required. This step will fail if there are existing NULL values in that column.
  - Made the column `actor_user_id` on table `audit_logs` required. This step will fail if there are existing NULL values in that column.
  - Made the column `entity_id` on table `audit_logs` required. This step will fail if there are existing NULL values in that column.
  - Made the column `site_id` on table `audit_logs` required. This step will fail if there are existing NULL values in that column.
  - Made the column `old_values` on table `audit_logs` required. This step will fail if there are existing NULL values in that column.
  - Made the column `new_values` on table `audit_logs` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `study_id` to the `caregiver_patient` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `caregiver_patient` table without a default value. This is not possible if the table is not empty.
  - Made the column `private_title` on table `caregiver_video_metadata` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `site_id` to the `stiched_sequences` table without a default value. This is not possible if the table is not empty.
  - Added the required column `video_id` to the `stiched_sequences` table without a default value. This is not possible if the table is not empty.
  - Made the column `title` on table `stiched_sequences` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `role` to the `user` table without a default value. This is not possible if the table is not empty.
  - Added the required column `site_id` to the `user` table without a default value. This is not possible if the table is not empty.
  - Added the required column `end_time_S` to the `video_clips` table without a default value. This is not possible if the table is not empty.
  - Added the required column `site_id` to the `video_clips` table without a default value. This is not possible if the table is not empty.
  - Added the required column `start_time_S` to the `video_clips` table without a default value. This is not possible if the table is not empty.
  - Added the required column `study_id` to the `video_clips` table without a default value. This is not possible if the table is not empty.
  - Made the column `title` on table `video_clips` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `s3_key` to the `videos` table without a default value. This is not possible if the table is not empty.
  - Made the column `duration_seconds` on table `videos` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "study_status" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'FINISHED');

-- CreateEnum
CREATE TYPE "review_status" AS ENUM ('NOT_REVIEWED', 'IN_REVIEW', 'REVIEWED');

-- AlterEnum
ALTER TYPE "action_type" ADD VALUE 'DOWNLOAD';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "annotation_type" ADD VALUE 'drawing_circle';
ALTER TYPE "annotation_type" ADD VALUE 'tag';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "entity_type" ADD VALUE 'CLIP';
ALTER TYPE "entity_type" ADD VALUE 'SITE';
ALTER TYPE "entity_type" ADD VALUE 'PERMISSIONS';

-- AlterEnum
BEGIN;
CREATE TYPE "video_status_new" AS ENUM ('UPLOADING', 'UPLOADED', 'FAILED');
ALTER TABLE "public"."videos" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "videos" ALTER COLUMN "status" TYPE "video_status_new" USING ("status"::text::"video_status_new");
ALTER TYPE "video_status" RENAME TO "video_status_old";
ALTER TYPE "video_status_new" RENAME TO "video_status";
DROP TYPE "public"."video_status_old";
ALTER TABLE "videos" ALTER COLUMN "status" SET DEFAULT 'UPLOADING';
COMMIT;

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_actor_user_id_fkey";

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_site_id_fkey";

-- DropForeignKey
ALTER TABLE "caregiver_patient" DROP CONSTRAINT "caregiver_patient_caregiver_id_fkey";

-- DropForeignKey
ALTER TABLE "caregiver_patient" DROP CONSTRAINT "caregiver_patient_patient_id_fkey";

-- DropForeignKey
ALTER TABLE "patient" DROP CONSTRAINT "patient_site_id_fkey";

-- DropForeignKey
ALTER TABLE "patient" DROP CONSTRAINT "patient_study_id_fkey";

-- DropForeignKey
ALTER TABLE "videos" DROP CONSTRAINT "videos_patient_id_fkey";

-- AlterTable
ALTER TABLE "annotations" DROP COLUMN "duration_ms",
DROP COLUMN "timestamp_ms",
ADD COLUMN     "duration_S" INTEGER NOT NULL,
ADD COLUMN     "site_id" UUID NOT NULL,
ADD COLUMN     "study_id" UUID NOT NULL,
ADD COLUMN     "timestamp_S" INTEGER NOT NULL,
ALTER COLUMN "payload" SET NOT NULL;

-- AlterTable
ALTER TABLE "audit_logs" ALTER COLUMN "actor_user_id" SET NOT NULL,
ALTER COLUMN "entity_id" SET NOT NULL,
ALTER COLUMN "site_id" SET NOT NULL,
ALTER COLUMN "old_values" SET NOT NULL,
ALTER COLUMN "new_values" SET NOT NULL;

-- AlterTable
ALTER TABLE "caregiver_patient" DROP CONSTRAINT "caregiver_patient_pkey",
DROP COLUMN "caregiver_id",
DROP COLUMN "patient_id",
ADD COLUMN     "study_id" UUID NOT NULL,
ADD COLUMN     "user_id" TEXT NOT NULL,
ADD CONSTRAINT "caregiver_patient_pkey" PRIMARY KEY ("study_id", "user_id");

-- AlterTable
ALTER TABLE "caregiver_video_metadata" DROP COLUMN "tags",
ALTER COLUMN "private_title" SET NOT NULL;

-- AlterTable
ALTER TABLE "stiched_sequences" ADD COLUMN     "site_id" UUID NOT NULL,
ADD COLUMN     "video_id" UUID NOT NULL,
ALTER COLUMN "title" SET NOT NULL;

-- AlterTable
ALTER TABLE "studies" ADD COLUMN     "status" "study_status" NOT NULL DEFAULT 'NOT_STARTED';

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "caregiver_id" TEXT,
ADD COLUMN     "is_deactivated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "role" "user_role" NOT NULL,
ADD COLUMN     "site_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "user_permissions" DROP CONSTRAINT "user_permissions_pkey",
DROP COLUMN "resource_id",
DROP COLUMN "resource_type",
ADD COLUMN     "id" UUID NOT NULL DEFAULT gen_random_uuid(),
ADD COLUMN     "site_id" UUID,
ADD COLUMN     "study_id" UUID,
ADD COLUMN     "video_id" UUID,
ADD CONSTRAINT "user_permissions_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "video_clips" DROP COLUMN "end_time_ms",
DROP COLUMN "start_time_ms",
ADD COLUMN     "end_time_S" INTEGER NOT NULL,
ADD COLUMN     "site_id" UUID NOT NULL,
ADD COLUMN     "start_time_S" INTEGER NOT NULL,
ADD COLUMN     "study_id" UUID NOT NULL,
ALTER COLUMN "title" SET NOT NULL;

-- AlterTable
ALTER TABLE "videos" DROP COLUMN "video_review_comments",
ADD COLUMN     "s3_key" TEXT NOT NULL,
ALTER COLUMN "duration_seconds" SET NOT NULL;

-- DropTable
DROP TABLE "patient";

-- DropEnum
DROP TYPE "resource_type";

-- CreateTable
CREATE TABLE "video_study" (
    "study_id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "video_id" UUID NOT NULL,
    "comment_overview" TEXT,
    "review_status" "review_status" NOT NULL DEFAULT 'NOT_REVIEWED',

    CONSTRAINT "video_study_pkey" PRIMARY KEY ("study_id","video_id","site_id")
);

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caregiver_patient" ADD CONSTRAINT "caregiver_patient_study_id_fkey" FOREIGN KEY ("study_id") REFERENCES "studies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caregiver_patient" ADD CONSTRAINT "caregiver_patient_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_study_id_fkey" FOREIGN KEY ("study_id") REFERENCES "studies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_study" ADD CONSTRAINT "video_study_study_id_fkey" FOREIGN KEY ("study_id") REFERENCES "studies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_study" ADD CONSTRAINT "video_study_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_study" ADD CONSTRAINT "video_study_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "annotations" ADD CONSTRAINT "annotations_study_id_fkey" FOREIGN KEY ("study_id") REFERENCES "studies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "annotations" ADD CONSTRAINT "annotations_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_clips" ADD CONSTRAINT "video_clips_study_id_fkey" FOREIGN KEY ("study_id") REFERENCES "studies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_clips" ADD CONSTRAINT "video_clips_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stiched_sequences" ADD CONSTRAINT "stiched_sequences_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stiched_sequences" ADD CONSTRAINT "stiched_sequences_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
