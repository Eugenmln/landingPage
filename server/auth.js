import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const COOKIE_NAME = "kenza_admin";
const isProduction = process.env.NODE_ENV === "production";
const adminEmail = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
const adminPassword = String(process.env.ADMIN_PASSWORD || "");
const authSecret = String(process.env.AUTH_SECRET || "");
const sessionHours = Number(process.env.AUTH_SESSION_HOURS || 8);

let passwordHash = null;

export async function initializeAuth() {
  const missing = [];
  if (!adminEmail) missing.push("ADMIN_EMAIL");
  if (!adminPassword) missing.push("ADMIN_PASSWORD");
  if (!authSecret || authSecret.length < 32) missing.push("AUTH_SECRET (minimum 32 characters)");

  if (missing.length > 0) {
    throw new Error(`Missing authentication configuration: ${missing.join(", ")}.`);
  }

  passwordHash = await bcrypt.hash(adminPassword, 12);
}

export async function loginAdmin(email, password) {
  if (!passwordHash) {
    throw new Error("Authentication is not initialized.");
  }

  const normalizedEmail = String(email || "").trim().toLowerCase();
  const suppliedPassword = String(password || "");

  const emailMatches = normalizedEmail === adminEmail;
  const passwordMatches = await bcrypt.compare(suppliedPassword, passwordHash);

  if (!emailMatches || !passwordMatches) {
    return null;
  }

  const token = jwt.sign(
    { sub: adminEmail, role: "admin" },
    authSecret,
    {
      expiresIn: `${sessionHours}h`,
      issuer: "kenza-api",
      audience: "kenza-admin",
    },
  );

  return { token, email: adminEmail };
}

export function authenticateAdminRequest(req) {
  const token = readCookie(req.headers.cookie, COOKIE_NAME);
  if (!token) return null;

  try {
    const payload = jwt.verify(token, authSecret, {
      issuer: "kenza-api",
      audience: "kenza-admin",
    });

    if (payload?.role !== "admin" || payload?.sub !== adminEmail) {
      return null;
    }

    return { email: payload.sub };
  } catch {
    return null;
  }
}

export function setAdminSessionCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "strict" : "lax",
    path: "/",
    maxAge: sessionHours * 60 * 60 * 1000,
  });
}

export function clearAdminSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "strict" : "lax",
    path: "/",
  });
}

function readCookie(header, name) {
  if (!header) return null;

  for (const part of header.split(";")) {
    const [rawKey, ...rest] = part.trim().split("=");
    if (rawKey === name) {
      return decodeURIComponent(rest.join("="));
    }
  }

  return null;
}
