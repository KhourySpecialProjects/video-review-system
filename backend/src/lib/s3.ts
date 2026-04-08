import {
  S3Client,
  GetObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  ListPartsCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/** Part size for S3 multipart upload (10 MB). */
export const PART_SIZE = 10 * 1024 * 1024;

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
export async function generatePresignedGetUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
  });

  return await getSignedUrl(s3, command, { expiresIn });
}

/**
 * Initiates a multipart upload and returns the upload ID.
 *
 * @param key - The S3 object key where the file will be stored
 * @param contentType - MIME type of the file (e.g., "video/mp4")
 *
 * @returns The S3 upload ID used to identify this multipart upload
 */
export async function initiateMultipartUpload(
  key: string,
  contentType: string
): Promise<string> {
  const command = new CreateMultipartUploadCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  const response = await s3.send(command);

  if (!response.UploadId) {
    throw new Error("S3 did not return an UploadId");
  }

  return response.UploadId;
}

/**
 * Generates presigned URLs for uploading specific parts of a multipart upload.
 * The frontend uses these URLs to PUT each chunk directly to S3,
 * tracking per-chunk progress via XHR/fetch upload events.
 *
 * @param key - The S3 object key
 * @param uploadId - The multipart upload ID from initiateMultipartUpload
 * @param partNumbers - Which part numbers to generate URLs for
 * @param expiresIn - URL lifetime in seconds (default: 3600 = 1 hour)
 *
 * @returns Array of { partNumber, url } for each requested part
 */
export async function generatePresignedPartUrls(
  key: string,
  uploadId: string,
  partNumbers: number[],
  expiresIn: number = 3600
): Promise<{ partNumber: number; url: string }[]> {
  return await Promise.all(
    partNumbers.map(async (partNumber) => {
      const command = new UploadPartCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key,
        UploadId: uploadId,
        PartNumber: partNumber,
      });

      const url = await getSignedUrl(s3, command, { expiresIn });
      return { partNumber, url };
    })
  );
}

/**
 * Lists parts that have already been uploaded for a multipart upload.
 * Used when resuming an upload to determine which parts still need uploading.
 * The frontend uses the returned sizes to calculate how many bytes are
 * already uploaded and show accurate resume progress.
 *
 * @param key - The S3 object key
 * @param uploadId - The multipart upload ID
 *
 * @returns Array of { partNumber, etag, size } for each uploaded part
 */
export async function listUploadedParts(
  key: string,
  uploadId: string
): Promise<{ partNumber: number; etag: string; size: number }[]> {
  const parts: { partNumber: number; etag: string; size: number }[] = [];
  let partNumberMarker: string | undefined;

  // S3 paginates ListParts at 1000 parts — loop until done
  while (true) {
    const command = new ListPartsCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
      UploadId: uploadId,
      ...(partNumberMarker !== undefined && { PartNumberMarker: partNumberMarker }),
    });

    const response = await s3.send(command);

    for (const part of response.Parts ?? []) {
      if (part.PartNumber != null && part.ETag && part.Size != null) {
        parts.push({
          partNumber: part.PartNumber,
          etag: part.ETag,
          size: part.Size,
        });
      }
    }

    if (!response.IsTruncated) break;
    partNumberMarker = response.NextPartNumberMarker;
  }

  return parts;
}

/**
 * Completes a multipart upload by assembling the uploaded parts.
 *
 * @param key - The S3 object key
 * @param uploadId - The multipart upload ID
 * @param parts - Array of { partNumber, etag } for each uploaded part
 */
export async function completeMultipartUpload(
  key: string,
  uploadId: string,
  parts: { partNumber: number; etag: string }[]
): Promise<void> {
  const command = new CompleteMultipartUploadCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    UploadId: uploadId,
    MultipartUpload: {
      Parts: parts
        .sort((a, b) => a.partNumber - b.partNumber)
        .map((p) => ({
          PartNumber: p.partNumber,
          ETag: p.etag,
        })),
    },
  });

  await s3.send(command);
}
