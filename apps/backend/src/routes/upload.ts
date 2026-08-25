import { Router } from "express";
import multer from "multer";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { requireAuth, AuthedRequest } from "../middleware/auth";

const router = Router();

// --- S3 configuration (reuses the same env vars as lib/storage.ts) ---

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
const PUBLIC_BASE_URL =
  process.env.S3_PUBLIC_BASE_URL || `http://localhost:9000/${BUCKET}`;

// --- Multer setup (in-memory storage for streaming to S3) ---

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

// --- POST /upload/profile ---

router.post(
  "/profile",
  requireAuth,
  upload.single("image"),
  async (req: AuthedRequest, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ success: false, error: "No image file provided" });
      }

      const userId = req.uid;
      const timestamp = Date.now();
      const ext = file.mimetype.includes("png") ? "png" : "jpg";
      const objectKey = `users/${userId}/profile/profile_${userId}_${timestamp}.${ext}`;

      await s3.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: objectKey,
          Body: file.buffer,
          ContentType: file.mimetype,
        })
      );

      const url = `${PUBLIC_BASE_URL}/${objectKey}`;
      return res.json({ success: true, data: { url } });
    } catch (error: any) {
      console.error("Error uploading profile image:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }
);

// --- POST /upload/delete ---

router.post("/delete", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ success: false, error: "Missing url in request body" });
    }

    // Extract the object key from the public URL
    const objectKey = url.replace(`${PUBLIC_BASE_URL}/`, "");
    if (!objectKey || objectKey === url) {
      return res.status(400).json({ success: false, error: "Invalid S3 URL" });
    }

    await s3.send(
      new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: objectKey,
      })
    );

    return res.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting image:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
