import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import path from "node:path";
import { randomUUID } from "node:crypto";

const cloudinaryConfigured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET,
);

if (cloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export function usingCloudinary() {
  return cloudinaryConfigured;
}

export function buildUploadMiddleware(uploadDir) {
  const storage = cloudinaryConfigured
    ? multer.memoryStorage()
    : multer.diskStorage({
        destination: uploadDir,
        filename: (_req, file, cb) => {
          cb(null, `${Date.now()}-${randomUUID()}${safeImageExtension(file)}`);
        },
      });

  return multer({
    storage,
    limits: { fileSize: 8 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, cb) => {
      if (!allowedMimeTypes.has(file.mimetype)) {
        cb(new Error("Solo se permiten imágenes JPG, PNG, WEBP, GIF, HEIC o HEIF."));
        return;
      }
      cb(null, true);
    },
  });
}

export async function persistUploadedImage(file) {
  if (!cloudinaryConfigured) {
    return {
      url: `/uploads/${file.filename}`,
      provider: "local",
    };
  }

  const result = await uploadBuffer(file.buffer);
  return {
    url: result.secure_url,
    provider: "cloudinary",
    publicId: result.public_id,
    width: result.width,
    height: result.height,
    format: result.format,
  };
}

function uploadBuffer(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: process.env.CLOUDINARY_FOLDER || "kenza",
        resource_type: "image",
        overwrite: false,
        unique_filename: true,
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      },
    );

    stream.end(buffer);
  });
}

function safeImageExtension(file) {
  const mimeExtensions = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/heic": ".heic",
    "image/heif": ".heif",
  };

  return mimeExtensions[file.mimetype] || path.extname(file.originalname).toLowerCase() || ".img";
}

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);
