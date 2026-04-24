/*
  Warnings:

  - You are about to drop the column `patient_id` on the `videos` table. All the data in the column will be lost.
  - You are about to drop the `user_roles` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `site_id` to the `invitations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `file_size` to the `videos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `total_parts` to the `videos` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "user_roles" DROP CONSTRAINT "user_roles_user_id_fkey";

-- AlterTable
ALTER TABLE "invitations" ADD COLUMN     "site_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "videos" DROP COLUMN "patient_id",
ADD COLUMN     "file_size" BIGINT NOT NULL,
ADD COLUMN     "s3_upload_id" TEXT,
ADD COLUMN     "total_parts" INTEGER NOT NULL;

-- DropTable
DROP TABLE "user_roles";

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
