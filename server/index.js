import cors from "cors";
import express from "express";
import helmet from "helmet";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import multer from "multer";
import {
  closeStore,
  getStore,
  initializeStore,
  outfitExists,
  productExists,
  removeOutfit,
  removeProduct,
  updateSettings,
  upsertOutfit,
  upsertProduct,
  usingPostgres,
} from "./store.js";
import {
  buildUploadMiddleware,
  persistUploadedImage,
  usingCloudinary,
} from "./imageStorage.js";

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

if (!usingCloudinary()) {
  mkdirSync(uploadDir, { recursive: true });
}

const upload = buildUploadMiddleware(uploadDir);
const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false,
}));
app.use(cors({ origin: buildCorsOrigin() }));
app.use(express.json({ limit: "1mb" }));

if (!usingCloudinary()) {
  app.use("/uploads", express.static(uploadDir, {
    fallthrough: false,
    maxAge: isProduction ? "7d" : 0,
  }));
}

app.get("/api/health", asyncHandler(async (_req, res) => {
  const store = await getStore();
  res.json({
    ok: true,
    database: usingPostgres() ? "postgres" : "json",
    images: usingCloudinary() ? "cloudinary" : "local",
    products: store.products.length,
    outfits: store.outfits.length,
  });
}));

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
  if (!(await productExists(req.params.id))) {
    throw notFound("La prenda no existe.");
  }
  const product = normalizeProduct({ ...req.body, id: req.params.id });
  validateProduct(product);
  const saved = await upsertProduct(product);
  res.json(saved);
}));

app.delete("/api/products/:id", requireAdmin, asyncHandler(async (req, res) => {
  const deleted = await removeProduct(req.params.id);
  if (!deleted) {
    throw notFound("La prenda no existe.");
  }
  res.json({ ok: true });
}));

app.post("/api/outfits", requireAdmin, asyncHandler(async (req, res) => {
  const outfit = normalizeOutfit(req.body);
  validateOutfit(outfit);
  await validateOutfitProducts(outfit.productIds);
  const saved = await upsertOutfit(outfit);
  res.status(201).json(saved);
}));

app.put("/api/outfits/:id", requireAdmin, asyncHandler(async (req, res) => {
  if (!(await outfitExists(req.params.id))) {
    throw notFound("El outfit no existe.");
  }
  const outfit = normalizeOutfit({ ...req.body, id: req.params.id });
  validateOutfit(outfit);
  await validateOutfitProducts(outfit.productIds);
  const saved = await upsertOutfit(outfit);
  res.json(saved);
}));

app.delete("/api/outfits/:id", requireAdmin, asyncHandler(async (req, res) => {
  const deleted = await removeOutfit(req.params.id);
  if (!deleted) {
    throw notFound("El outfit no existe.");
  }
  res.json({ ok: true });
}));

app.put("/api/settings", requireAdmin, asyncHandler(async (req, res) => {
  const current = await getStore();
  const settings = {
    phone: String(req.body.phone || current.settings.phone).replace(/[^\d]/g, ""),
    instagram: String(req.body.instagram || current.settings.instagram).replace(/^@/, "").trim(),
    adminPin: process.env.ADMIN_PIN || String(req.body.adminPin || current.settings.adminPin),
  };

  if (!settings.phone || settings.phone.length < 10 || settings.phone.length > 15) {
    throw badRequest("Ingresá un número de WhatsApp válido con código de país y área.");
  }
  if (!settings.instagram) {
    throw badRequest("Ingresá el usuario de Instagram.");
  }

  const saved = await updateSettings(settings);
  res.json({ phone: saved.phone, instagram: saved.instagram });
}));

app.post("/api/uploads", requireAdmin, (req, res, next) => {
  upload.single("image")(req, res, async (error) => {
    if (error) {
      next(error);
      return;
    }

    try {
      if (!req.file) {
        throw badRequest("Subí una imagen válida.");
      }

      const uploaded = await persistUploadedImage(req.file);
      res.status(201).json(uploaded);
    } catch (uploadError) {
      next(uploadError);
    }
  });
});

app.use(express.static(path.join(root, "dist"), {
  maxAge: isProduction ? "1h" : 0,
  index: false,
}));

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

  if (error?.message?.startsWith("Solo se permiten imágenes")) {
    return res.status(400).json({ message: error.message });
  }

  if (error?.message === "Origen no permitido por CORS.") {
    return res.status(403).json({ message: error.message });
  }

  const status = Number(error.status) || 500;
  res.status(status).json({
    message: status >= 500 ? "Ocurrió un error en el servidor." : error.message,
  });
});

await initializeStore();

const server = app.listen(port, () => {
  console.log(
    `Kenza API running on http://localhost:${port} (${usingPostgres() ? "PostgreSQL" : "JSON local"}, ${usingCloudinary() ? "Cloudinary" : "local images"})`,
  );
});

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, async () => {
    console.log(`${signal} received. Closing server...`);
    server.close(async () => {
      try {
        await closeStore();
      } finally {
        process.exit(0);
      }
    });
  });
}

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

function normalizeProduct(input) {
  return {
    id: input.id || randomUUID(),
    name: String(input.name || "").trim(),
    category: String(input.category || "Remeras").trim(),
    price: Number(input.price),
    sizes: Array.isArray(input.sizes)
      ? [...new Set(input.sizes.map((size) => String(size).trim()).filter(Boolean))]
      : [...new Set(
          String(input.sizes || "Único")
            .split(",")
            .map((size) => size.trim())
            .filter(Boolean),
        )],
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
    productIds: Array.isArray(input.productIds)
      ? [...new Set(input.productIds.map(String).map((id) => id.trim()).filter(Boolean))]
      : [],
  };
}

function validateProduct(product) {
  if (!product.name || product.name.length > 120) {
    throw badRequest("Ingresá un nombre de prenda de hasta 120 caracteres.");
  }
  if (!Number.isFinite(product.price) || product.price < 0 || product.price > 999999999) {
    throw badRequest("Ingresá un precio válido.");
  }
  if (!product.category || product.category.length > 60) {
    throw badRequest("Seleccioná una categoría válida.");
  }
  if (product.sizes.length === 0 || product.sizes.length > 20) {
    throw badRequest("Ingresá entre 1 y 20 talles.");
  }
  if (product.image && !isValidImageReference(product.image)) {
    throw badRequest("La imagen de la prenda no es válida.");
  }
}

function validateOutfit(outfit) {
  if (!outfit.title || outfit.title.length > 120) {
    throw badRequest("Ingresá un nombre para el outfit de hasta 120 caracteres.");
  }
  if (outfit.pieces.length > 500) {
    throw badRequest("La descripción del outfit no puede superar 500 caracteres.");
  }
  if (!outfit.image || !isValidImageReference(outfit.image)) {
    throw badRequest("Subí una imagen válida para el outfit.");
  }
  if (outfit.productIds.length > 30) {
    throw badRequest("Un outfit no puede vincular más de 30 prendas.");
  }
}

async function validateOutfitProducts(ids) {
  for (const id of ids) {
    if (!(await productExists(id))) {
      throw badRequest(`La prenda vinculada ${id} no existe.`);
    }
  }
}

function isValidImageReference(value) {
  if (value.startsWith("/uploads/")) {
    return true;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" || (!isProduction && url.protocol === "http:");
  } catch {
    return value.startsWith("/");
  }
}

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function notFound(message) {
  const error = new Error(message);
  error.status = 404;
  return error;
}
