import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Shared S3 client instance.
 * Uses AWS_REGION from environment. Credentials are resolved automatically
 * from environment variables, IAM roles, or AWS config files.
 */
export const s3 = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
});

/**
 * Generates a presigned URL for downloading/streaming a file from S3.
 * The URL is temporary and expires after the specified duration.
 *
 * @param key - The S3 object key (e.g., "videos/abc-123/original.mp4")
 * @param expiresIn - URL lifetime in seconds (default: 3600 = 1 hour)
 * 
 * @returns A signed URL string that grants temporary access to the file
 */
export async function generatePresignedUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
  });

  const url = await getSignedUrl(s3, command, { expiresIn });
  return url;
}