import cors from "cors";
import express from "express";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import multer from "multer";
import {
  getStore,
  initializeStore,
  removeOutfit,
  removeProduct,
  updateSettings,
  upsertOutfit,
  upsertProduct,
  usingPostgres,
} from "./store.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const uploadDir = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(root, "public", "uploads");
const port = Number(process.env.PORT || 4000);
const isProduction = process.env.NODE_ENV === "production";
const configuredOrigins = String(process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

if (isProduction && !process.env.ADMIN_PIN) {
  throw new Error("ADMIN_PIN is required when NODE_ENV=production.");
}

mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, file, cb) => {
    const ext = safeImageExtension(file);
    cb(null, `${Date.now()}-${randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Solo se permiten archivos de imagen."));
      return;
    }
    cb(null, true);
  },
});

const app = express();

app.disable("x-powered-by");
app.use(cors({ origin: buildCorsOrigin() }));
app.use(express.json({ limit: "1mb" }));
app.use("/uploads", express.static(uploadDir, { fallthrough: false, maxAge: isProduction ? "7d" : 0 }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, storage: usingPostgres() ? "postgres" : "json" });
});

app.get("/api/store", asyncHandler(async (_req, res) => {
  const store = await getStore();
  res.json({
    products: store.products,
    outfits: store.outfits,
    settings: {
      phone: store.settings.phone,
      instagram: store.settings.instagram,
    },
  });
}));

app.post("/api/products", requireAdmin, asyncHandler(async (req, res) => {
  const product = normalizeProduct(req.body);
  validateProduct(product);
  const saved = await upsertProduct(product);
  res.status(201).json(saved);
}));

app.put("/api/products/:id", requireAdmin, asyncHandler(async (req, res) => {
  const product = normalizeProduct({ ...req.body, id: req.params.id });
  validateProduct(product);
  const saved = await upsertProduct(product);
  res.json(saved);
}));

app.delete("/api/products/:id", requireAdmin, asyncHandler(async (req, res) => {
  await removeProduct(req.params.id);
  res.json({ ok: true });
}));

app.post("/api/outfits", requireAdmin, asyncHandler(async (req, res) => {
  const outfit = normalizeOutfit(req.body);
  validateOutfit(outfit);
  const saved = await upsertOutfit(outfit);
  res.status(201).json(saved);
}));

app.put("/api/outfits/:id", requireAdmin, asyncHandler(async (req, res) => {
  const outfit = normalizeOutfit({ ...req.body, id: req.params.id });
  validateOutfit(outfit);
  const saved = await upsertOutfit(outfit);
  res.json(saved);
}));

app.delete("/api/outfits/:id", requireAdmin, asyncHandler(async (req, res) => {
  await removeOutfit(req.params.id);
  res.json({ ok: true });
}));

app.put("/api/settings", requireAdmin, asyncHandler(async (req, res) => {
  const current = await getStore();
  const settings = {
    phone: String(req.body.phone || current.settings.phone).replace(/[^\d]/g, ""),
    instagram: String(req.body.instagram || current.settings.instagram).replace(/^@/, "").trim(),
    adminPin: process.env.ADMIN_PIN || String(req.body.adminPin || current.settings.adminPin),
  };

  if (!settings.phone) {
    return res.status(400).json({ message: "Ingresá un número de WhatsApp válido." });
  }

  const saved = await updateSettings(settings);
  res.json({ phone: saved.phone, instagram: saved.instagram });
}));

app.post("/api/uploads", requireAdmin, (req, res, next) => {
  upload.single("image")(req, res, (error) => {
    if (error) {
      next(error);
      return;
    }

    if (!req.file) {
      res.status(400).json({ message: "Subí una imagen válida." });
      return;
    }

    res.status(201).json({ url: `/uploads/${req.file.filename}` });
  });
});

app.use(express.static(path.join(root, "dist")));
app.get(/.*/, (_req, res, next) => {
  res.sendFile(path.join(root, "dist", "index.html"), (error) => {
    if (error) next(error);
  });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ message: "La imagen no puede superar los 8 MB." });
  }
  if (error?.message === "Solo se permiten archivos de imagen.") {
    return res.status(400).json({ message: error.message });
  }
  res.status(error.status || 500).json({ message: error.status ? error.message : "Ocurrió un error en el servidor." });
});

await initializeStore();

app.listen(port, () => {
  console.log(`Kenza API running on http://localhost:${port} (${usingPostgres() ? "PostgreSQL" : "JSON local"})`);
});

function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

async function requireAdmin(req, res, next) {
  try {
    const store = await getStore();
    const expected = process.env.ADMIN_PIN || store.settings.adminPin;
    const supplied = req.header("x-admin-pin");

    if (!supplied || supplied !== expected) {
      return res.status(401).json({ message: "Clave de administrador incorrecta." });
    }

    next();
  } catch (error) {
    next(error);
  }
}

function buildCorsOrigin() {
  if (configuredOrigins.length === 0) {
    return true;
  }

  return (origin, callback) => {
    if (!origin || configuredOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error("Origen no permitido por CORS."));
  };
}

function safeImageExtension(file) {
  const mimeExtensions = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
  };
  return mimeExtensions[file.mimetype] || ".img";
}

function normalizeProduct(input) {
  return {
    id: input.id || randomUUID(),
    name: String(input.name || "").trim(),
    category: String(input.category || "Remeras").trim(),
    price: Number(input.price || 0),
    sizes: Array.isArray(input.sizes)
      ? input.sizes.map((size) => String(size).trim()).filter(Boolean)
      : String(input.sizes || "Único")
          .split(",")
          .map((size) => size.trim())
          .filter(Boolean),
    badge: String(input.badge || "").trim(),
    image: String(input.image || "").trim(),
  };
}

function normalizeOutfit(input) {
  return {
    id: input.id || randomUUID(),
    title: String(input.title || "").trim(),
    pieces: String(input.pieces || "").trim(),
    image: String(input.image || "").trim(),
  };
}

function validateProduct(product) {
  if (!product.name) {
    throw badRequest("Ingresá el nombre de la prenda.");
  }
  if (!Number.isFinite(product.price) || product.price < 0) {
    throw badRequest("Ingresá un precio válido.");
  }
  if (!product.category) {
    throw badRequest("Seleccioná una categoría.");
  }
}

function validateOutfit(outfit) {
  if (!outfit.title) {
    throw badRequest("Ingresá un nombre para el outfit.");
  }
  if (!outfit.image) {
    throw badRequest("Subí una imagen para el outfit.");
  }
}

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}
