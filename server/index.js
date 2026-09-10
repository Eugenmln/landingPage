import cors from "cors";
import express from "express";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import multer from "multer";
import { starterOutfits, starterProducts } from "../src/data.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const dataDir = path.join(__dirname, "data");
const uploadDir = path.join(root, "public", "uploads");
const dbPath = path.join(dataDir, "store.json");
const port = Number(process.env.PORT || 4000);

mkdirSync(dataDir, { recursive: true });
mkdirSync(uploadDir, { recursive: true });

const initialStore = {
  products: starterProducts,
  outfits: starterOutfits,
  settings: {
    phone: "5493764000000",
    instagram: "kenza.posadas",
    adminPin: process.env.ADMIN_PIN || "1234",
  },
};

function readStore() {
  if (!existsSync(dbPath)) {
    writeStore(initialStore);
    return initialStore;
  }

  return JSON.parse(readFileSync(dbPath, "utf8"));
}

function writeStore(store) {
  writeFileSync(dbPath, JSON.stringify(store, null, 2));
}

function requireAdmin(req, res, next) {
  const store = readStore();
  const expected = process.env.ADMIN_PIN || store.settings.adminPin;
  if (req.header("x-admin-pin") !== expected) {
    return res.status(401).json({ message: "Clave de administrador incorrecta." });
  }

  next();
}

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    cb(null, `${Date.now()}-${randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, file.mimetype.startsWith("image/"));
  },
});

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use("/uploads", express.static(uploadDir));

app.get("/api/store", (_req, res) => {
  const store = readStore();
  res.json({
    products: store.products,
    outfits: store.outfits,
    settings: {
      phone: store.settings.phone,
      instagram: store.settings.instagram,
    },
  });
});

app.post("/api/products", requireAdmin, (req, res) => {
  const store = readStore();
  const product = normalizeProduct(req.body);
  store.products = [product, ...store.products];
  writeStore(store);
  res.status(201).json(product);
});

app.put("/api/products/:id", requireAdmin, (req, res) => {
  const store = readStore();
  const product = normalizeProduct({ ...req.body, id: req.params.id });
  store.products = store.products.map((item) => (item.id === req.params.id ? product : item));
  writeStore(store);
  res.json(product);
});

app.delete("/api/products/:id", requireAdmin, (req, res) => {
  const store = readStore();
  store.products = store.products.filter((item) => item.id !== req.params.id);
  writeStore(store);
  res.json({ ok: true });
});

app.post("/api/outfits", requireAdmin, (req, res) => {
  const store = readStore();
  const outfit = normalizeOutfit(req.body);
  store.outfits = [outfit, ...store.outfits];
  writeStore(store);
  res.status(201).json(outfit);
});

app.put("/api/outfits/:id", requireAdmin, (req, res) => {
  const store = readStore();
  const outfit = normalizeOutfit({ ...req.body, id: req.params.id });
  store.outfits = store.outfits.map((item) => (item.id === req.params.id ? outfit : item));
  writeStore(store);
  res.json(outfit);
});

app.delete("/api/outfits/:id", requireAdmin, (req, res) => {
  const store = readStore();
  store.outfits = store.outfits.filter((item) => item.id !== req.params.id);
  writeStore(store);
  res.json({ ok: true });
});

app.put("/api/settings", requireAdmin, (req, res) => {
  const store = readStore();
  store.settings = {
    ...store.settings,
    phone: String(req.body.phone || store.settings.phone).replace(/[^\d]/g, ""),
    instagram: String(req.body.instagram || store.settings.instagram).replace("@", ""),
    adminPin: String(req.body.adminPin || store.settings.adminPin),
  };
  writeStore(store);
  res.json({
    phone: store.settings.phone,
    instagram: store.settings.instagram,
  });
});

app.post("/api/uploads", requireAdmin, upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Subí una imagen válida." });
  }

  res.status(201).json({ url: `/uploads/${req.file.filename}` });
});

app.use(express.static(path.join(root, "dist")));
app.get(/.*/, (_req, res) => {
  res.sendFile(path.join(root, "dist", "index.html"));
});

app.listen(port, () => {
  console.log(`Kenza API running on http://localhost:${port}`);
});

function normalizeProduct(input) {
  return {
    id: input.id || randomUUID(),
    name: String(input.name || "").trim(),
    category: String(input.category || "Remeras"),
    price: Number(input.price || 0),
    sizes: Array.isArray(input.sizes)
      ? input.sizes
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
