import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "data");
const jsonPath = path.join(dataDir, "store.json");
const databaseUrl = process.env.DATABASE_URL?.trim();

const defaultSettings = {
  phone: "5493764000000",
  instagram: "kenza.posadas",
  adminPin: process.env.ADMIN_PIN || "1234",
};

const emptyStore = {
  products: [],
  outfits: [],
  settings: defaultSettings,
};

let pool = null;

export async function initializeStore() {
  if (!databaseUrl) {
    mkdirSync(dataDir, { recursive: true });
    if (!existsSync(jsonPath)) {
      writeJsonStore(emptyStore);
    }
    return;
  }

  pool = new Pool({
    connectionString: databaseUrl,
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price NUMERIC(12, 2) NOT NULL DEFAULT 0,
      sizes JSONB NOT NULL DEFAULT '[]'::jsonb,
      badge TEXT NOT NULL DEFAULT '',
      image TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS outfits (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      pieces TEXT NOT NULL DEFAULT '',
      image TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS store_settings (
      id SMALLINT PRIMARY KEY CHECK (id = 1),
      phone TEXT NOT NULL,
      instagram TEXT NOT NULL,
      admin_pin TEXT NOT NULL
    );
  `);

  await pool.query(
    `INSERT INTO store_settings (id, phone, instagram, admin_pin)
     VALUES (1, $1, $2, $3)
     ON CONFLICT (id) DO NOTHING`,
    [defaultSettings.phone, defaultSettings.instagram, defaultSettings.adminPin],
  );
}

export function usingPostgres() {
  return Boolean(pool);
}

export async function getStore() {
  if (!pool) {
    return readJsonStore();
  }

  const [productsResult, outfitsResult, settingsResult] = await Promise.all([
    pool.query(`SELECT id, name, category, price, sizes, badge, image FROM products ORDER BY created_at DESC`),
    pool.query(`SELECT id, title, pieces, image FROM outfits ORDER BY created_at DESC`),
    pool.query(`SELECT phone, instagram, admin_pin FROM store_settings WHERE id = 1`),
  ]);

  const settingsRow = settingsResult.rows[0];

  return {
    products: productsResult.rows.map(mapProductRow),
    outfits: outfitsResult.rows,
    settings: {
      phone: settingsRow?.phone || defaultSettings.phone,
      instagram: settingsRow?.instagram || defaultSettings.instagram,
      adminPin: settingsRow?.admin_pin || defaultSettings.adminPin,
    },
  };
}

export async function upsertProduct(product) {
  if (!pool) {
    const store = readJsonStore();
    store.products = [product, ...store.products.filter((item) => item.id !== product.id)];
    writeJsonStore(store);
    return product;
  }

  const result = await pool.query(
    `INSERT INTO products (id, name, category, price, sizes, badge, image)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       category = EXCLUDED.category,
       price = EXCLUDED.price,
       sizes = EXCLUDED.sizes,
       badge = EXCLUDED.badge,
       image = EXCLUDED.image,
       updated_at = NOW()
     RETURNING id, name, category, price, sizes, badge, image`,
    [product.id, product.name, product.category, product.price, JSON.stringify(product.sizes), product.badge, product.image],
  );

  return mapProductRow(result.rows[0]);
}

export async function removeProduct(id) {
  if (!pool) {
    const store = readJsonStore();
    store.products = store.products.filter((item) => item.id !== id);
    writeJsonStore(store);
    return;
  }

  await pool.query(`DELETE FROM products WHERE id = $1`, [id]);
}

export async function upsertOutfit(outfit) {
  if (!pool) {
    const store = readJsonStore();
    store.outfits = [outfit, ...store.outfits.filter((item) => item.id !== outfit.id)];
    writeJsonStore(store);
    return outfit;
  }

  const result = await pool.query(
    `INSERT INTO outfits (id, title, pieces, image)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO UPDATE SET
       title = EXCLUDED.title,
       pieces = EXCLUDED.pieces,
       image = EXCLUDED.image,
       updated_at = NOW()
     RETURNING id, title, pieces, image`,
    [outfit.id, outfit.title, outfit.pieces, outfit.image],
  );

  return result.rows[0];
}

export async function removeOutfit(id) {
  if (!pool) {
    const store = readJsonStore();
    store.outfits = store.outfits.filter((item) => item.id !== id);
    writeJsonStore(store);
    return;
  }

  await pool.query(`DELETE FROM outfits WHERE id = $1`, [id]);
}

export async function updateSettings(settings) {
  if (!pool) {
    const store = readJsonStore();
    store.settings = { ...store.settings, ...settings };
    writeJsonStore(store);
    return store.settings;
  }

  const result = await pool.query(
    `UPDATE store_settings
     SET phone = $1, instagram = $2, admin_pin = $3
     WHERE id = 1
     RETURNING phone, instagram, admin_pin`,
    [settings.phone, settings.instagram, settings.adminPin],
  );

  return {
    phone: result.rows[0].phone,
    instagram: result.rows[0].instagram,
    adminPin: result.rows[0].admin_pin,
  };
}

function readJsonStore() {
  if (!existsSync(jsonPath)) {
    writeJsonStore(emptyStore);
  }

  return JSON.parse(readFileSync(jsonPath, "utf8"));
}

function writeJsonStore(store) {
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(jsonPath, JSON.stringify(store, null, 2));
}

function mapProductRow(row) {
  return {
    ...row,
    price: Number(row.price),
    sizes: Array.isArray(row.sizes) ? row.sizes : [],
  };
}
