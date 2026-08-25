/// <reference types="node" />
import "dotenv/config";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

async function main() {
  const client = new S3Client({
    region: process.env.S3_REGION || "us-east-1",
    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
    },
  });
  const bucket = process.env.S3_BUCKET;
  if (!bucket) {
    console.error("S3_BUCKET is not set");
    process.exit(1);
  }

  try {
    const res = await client.send(new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 5 }));
    console.log("S3 connection successful. Bucket:", bucket);
    console.log("Keys found:", res.Contents?.map((c) => c.Key) ?? []);
  } catch (err) {
    console.error("S3 connection failed:", err);
    process.exit(1);
  }
}

main();
