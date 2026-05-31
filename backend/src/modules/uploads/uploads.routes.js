const express = require("express");
const path = require("path");
const multer = require("multer");
const { requireAuth } = require("../../middlewares/auth");
const { HttpError } = require("../../lib/http");
const { uploadFile, isS3Enabled } = require("../../lib/storage");

const router = express.Router();
const allowedPurposes = new Set(["report", "resolution", "avatar"]);
const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function safeExtension(file) {
  const fromName = path.extname(file.originalname || "").toLowerCase();
  if ([".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(fromName)) {
    return fromName;
  }

  if (file.mimetype === "image/png") return ".png";
  if (file.mimetype === "image/webp") return ".webp";
  if (file.mimetype === "image/gif") return ".gif";
  return ".jpg";
}

function cryptoRandom() {
  return Math.random().toString(36).slice(2, 10);
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter(_req, file, callback) {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(
        new HttpError(
          415,
          "File harus berupa gambar JPG, PNG, WebP, atau GIF.",
          null,
          "INVALID_UPLOAD_TYPE",
        ),
      );
      return;
    }

    callback(null, true);
  },
});

router.post("/", requireAuth, (req, res, next) => {
  upload.single("file")(req, res, async (error) => {
    if (error) {
      if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
        next(
          new HttpError(
            413,
            "Ukuran gambar maksimal 5MB.",
            null,
            "UPLOAD_TOO_LARGE",
          ),
        );
        return;
      }

      next(error);
      return;
    }

    if (!req.file) {
      next(new HttpError(400, "File gambar wajib diunggah.", null, "UPLOAD_REQUIRED"));
      return;
    }

    const purpose = req.body?.purpose || "report";
    if (!allowedPurposes.has(purpose)) {
      next(
        new HttpError(
          400,
          "Tujuan upload tidak valid.",
          { allowedPurposes: Array.from(allowedPurposes) },
          "INVALID_UPLOAD_PURPOSE",
        ),
      );
      return;
    }

    try {
      const filename = `${Date.now()}-${cryptoRandom()}${safeExtension(req.file)}`;
      const key = `${purpose}/${filename}`;
      const result = await uploadFile(key, req.file.buffer, req.file.mimetype);

      const imageUrl = isS3Enabled()
        ? result.url
        : `${req.protocol}://${req.get("host")}/uploads/${result.storageKey}`;

      res.status(201).json({
        data: {
          imageUrl,
          storageKey: result.storageKey,
          alt: req.body?.alt || req.file.originalname || "Gambar CommunityMap",
        },
      });
    } catch (uploadError) {
      next(uploadError);
    }
  });
});

module.exports = { uploadsRouter: router };
