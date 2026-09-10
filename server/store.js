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
    max: Number(process.env.DB_POOL_MAX || 5),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
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
      product_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
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

  await pool.query(`ALTER TABLE outfits ADD COLUMN IF NOT EXISTS product_ids JSONB NOT NULL DEFAULT '[]'::jsonb`);

  await pool.query(
    `INSERT INTO store_settings (id, phone, instagram, admin_pin)
     VALUES (1, $1, $2, $3)
     ON CONFLICT (id) DO NOTHING`,
    [defaultSettings.phone, defaultSettings.instagram, defaultSettings.adminPin],
  );

  await pool.query("SELECT 1");
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
    pool.query(`SELECT id, title, pieces, image, product_ids FROM outfits ORDER BY created_at DESC`),
    pool.query(`SELECT phone, instagram, admin_pin FROM store_settings WHERE id = 1`),
  ]);

  const settingsRow = settingsResult.rows[0];

  return {
    products: productsResult.rows.map(mapProductRow),
    outfits: outfitsResult.rows.map(mapOutfitRow),
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

export async function productExists(id) {
  if (!pool) {
    return readJsonStore().products.some((item) => item.id === id);
  }
  const result = await pool.query(`SELECT 1 FROM products WHERE id = $1`, [id]);
  return result.rowCount > 0;
}

export async function removeProduct(id) {
  if (!pool) {
    const store = readJsonStore();
    const before = store.products.length;
    store.products = store.products.filter((item) => item.id !== id);
    store.outfits = store.outfits.map((outfit) => ({
      ...outfit,
      productIds: normalizeIds(outfit.productIds).filter((productId) => productId !== id),
    }));
    writeJsonStore(store);
    return store.products.length !== before;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const deleted = await client.query(`DELETE FROM products WHERE id = $1 RETURNING id`, [id]);
    if (deleted.rowCount > 0) {
      await client.query(
        `UPDATE outfits
         SET product_ids = COALESCE((
           SELECT jsonb_agg(value)
           FROM jsonb_array_elements_text(product_ids) value
           WHERE value <> $1
         ), '[]'::jsonb), updated_at = NOW()
         WHERE product_ids ? $1`,
        [id],
      );
    }
    await client.query("COMMIT");
    return deleted.rowCount > 0;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function upsertOutfit(outfit) {
  if (!pool) {
    const store = readJsonStore();
    store.outfits = [outfit, ...store.outfits.filter((item) => item.id !== outfit.id)];
    writeJsonStore(store);
    return outfit;
  }

  const result = await pool.query(
    `INSERT INTO outfits (id, title, pieces, image, product_ids)
     VALUES ($1, $2, $3, $4, $5::jsonb)
     ON CONFLICT (id) DO UPDATE SET
       title = EXCLUDED.title,
       pieces = EXCLUDED.pieces,
       image = EXCLUDED.image,
       product_ids = EXCLUDED.product_ids,
       updated_at = NOW()
     RETURNING id, title, pieces, image, product_ids`,
    [outfit.id, outfit.title, outfit.pieces, outfit.image, JSON.stringify(outfit.productIds)],
  );

  return mapOutfitRow(result.rows[0]);
}

export async function outfitExists(id) {
  if (!pool) {
    return readJsonStore().outfits.some((item) => item.id === id);
  }
  const result = await pool.query(`SELECT 1 FROM outfits WHERE id = $1`, [id]);
  return result.rowCount > 0;
}

export async function removeOutfit(id) {
  if (!pool) {
    const store = readJsonStore();
    const before = store.outfits.length;
    store.outfits = store.outfits.filter((item) => item.id !== id);
    writeJsonStore(store);
    return store.outfits.length !== before;
  }

  const result = await pool.query(`DELETE FROM outfits WHERE id = $1 RETURNING id`, [id]);
  return result.rowCount > 0;
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

export async function closeStore() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

function readJsonStore() {
  if (!existsSync(jsonPath)) {
    writeJsonStore(emptyStore);
  }

  const parsed = JSON.parse(readFileSync(jsonPath, "utf8"));
  return {
    products: Array.isArray(parsed.products) ? parsed.products : [],
    outfits: Array.isArray(parsed.outfits)
      ? parsed.outfits.map((outfit) => ({ ...outfit, productIds: normalizeIds(outfit.productIds) }))
      : [],
    settings: { ...defaultSettings, ...(parsed.settings || {}) },
  };
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

function mapOutfitRow(row) {
  return {
    id: row.id,
    title: row.title,
    pieces: row.pieces,
    image: row.image,
    productIds: normalizeIds(row.product_ids),
  };
}

function normalizeIds(value) {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}
