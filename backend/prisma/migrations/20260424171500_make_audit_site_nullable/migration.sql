ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_site_id_fkey";

ALTER TABLE "audit_logs" ALTER COLUMN "site_id" DROP NOT NULL;

ALTER TABLE "audit_logs"
ADD CONSTRAINT "audit_logs_site_id_fkey"
FOREIGN KEY ("site_id") REFERENCES "sites"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
