import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION || "us-east-1",
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
  },
});

const BUCKET = process.env.S3_BUCKET || "mohallamitr";
const PUBLIC_BASE_URL = process.env.S3_PUBLIC_BASE_URL || `http://localhost:9000/${BUCKET}`;

const MAX_PROOF_BYTES = 5 * 1024 * 1024;

/**
 * Persist a delivery-proof (or any) image. Accepts either a pass-through
 * https:// URL, or a base64 data URL which gets uploaded to S3-compatible
 * storage. Mirrors the Firebase Storage Admin-SDK upload previously done
 * server-side in delivery.ts.
 */
export async function resolveImageUpload(
  pathPrefix: string,
  proof: string,
  maxBytes: number = MAX_PROOF_BYTES
): Promise<string> {
  const trimmed = proof.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  let contentType = "image/jpeg";
  let base64Payload = trimmed;
  const dataUrlMatch = trimmed.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]+)$/);
  if (dataUrlMatch) {
    contentType = dataUrlMatch[1];
    base64Payload = dataUrlMatch[2];
  } else if (!/^[A-Za-z0-9+/=\s]+$/.test(trimmed.slice(0, 80))) {
    throw new Error("Image must be an https URL or a base64 image data URL");
  }

  const buffer = Buffer.from(base64Payload.replace(/\s/g, ""), "base64");
  if (!buffer.length) throw new Error("Image payload is empty");
  if (buffer.length > maxBytes) throw new Error(`Image must be under ${Math.round(maxBytes / 1024 / 1024)}MB`);

  const ext = contentType.includes("png") ? "png" : "jpg";
  const objectKey = `${pathPrefix}/${randomUUID()}.${ext}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: objectKey,
      Body: buffer,
      ContentType: contentType,
    })
  );

  return `${PUBLIC_BASE_URL}/${objectKey}`;
}
