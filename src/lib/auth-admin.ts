/**
 * Admin session: signed cookie (HMAC-SHA256).
 * Create runs in Node (API route); verify runs in Edge (middleware) and Node (API routes).
 */

const COOKIE_NAME = "admin_session";
const MAX_AGE_SEC = 24 * 60 * 60; // 24 hours

export type CookiePayload = { admin: true; exp: number };

function encodeBase64Url(b: Uint8Array): string {
  return Buffer.from(b).toString("base64url");
}

function decodeBase64Url(s: string): Uint8Array {
  return new Uint8Array(Buffer.from(s, "base64url"));
}

/** Base64URL decode to string; works in Edge (atob) and Node (Buffer). */
function base64UrlDecodeToStr(s: string): string {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4;
  const padded = pad ? b64 + "=".repeat(4 - pad) : b64;
  if (typeof globalThis.atob !== "undefined") {
    return globalThis.atob(padded);
  }
  return Buffer.from(padded, "base64").toString("utf8");
}

/** Base64URL decode to bytes; works in Edge and Node. */
function base64UrlDecodeToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4;
  const padded = pad ? b64 + "=".repeat(4 - pad) : b64;
  const str =
    typeof globalThis.atob !== "undefined"
      ? globalThis.atob(padded)
      : Buffer.from(padded, "base64").toString("latin1");
  return Uint8Array.from(str, (c) => c.charCodeAt(0));
}

/** Constant-time comparison for password check (Node). */
export function constantTimeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return require("crypto").timingSafeEqual(bufA, bufB);
}

/**
 * Create signed cookie value and Set-Cookie header (Node only).
 * Used in POST /api/auth/admin-login.
 */
export function createSignedCookie(secret: string): { value: string; header: string } {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SEC;
  const payload: CookiePayload = { admin: true, exp };
  const payloadStr = JSON.stringify(payload);
  const payloadB64 = Buffer.from(payloadStr, "utf8").toString("base64url");
  const crypto = require("crypto");
  const sig = crypto.createHmac("sha256", secret).update(payloadB64).digest("base64url");
  const value = `${payloadB64}.${sig}`;
  const isProd = process.env.NODE_ENV === "production";
  const header = `${COOKIE_NAME}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE_SEC}${isProd ? "; Secure" : ""}`;
  return { value, header };
}

/**
 * Verify admin cookie from cookie header string.
 * Works in Edge (middleware) and Node; uses Web Crypto for Edge compatibility.
 */
export async function verifyAdminCookie(
  cookieHeader: string | null,
  secret: string
): Promise<{ valid: true; payload: CookiePayload } | { valid: false }> {
  if (!cookieHeader || !secret) return { valid: false };
  const match = cookieHeader.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]+)`));
  const raw = match?.[1]?.trim();
  if (!raw) return { valid: false };
  const dot = raw.indexOf(".");
  if (dot === -1) return { valid: false };
  const payloadB64 = raw.slice(0, dot);
  const sigB64 = raw.slice(dot + 1);
  let payload: CookiePayload;
  try {
    const payloadStr = base64UrlDecodeToStr(payloadB64);
    payload = JSON.parse(payloadStr) as CookiePayload;
  } catch {
    return { valid: false };
  }
  if (!payload?.admin || typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) {
    return { valid: false };
  }
  const key = await importHmacKey(secret);
  const payloadBytes = new TextEncoder().encode(payloadB64);
  const sigBytes = base64UrlDecodeToBytes(sigB64);
  const expectedSig = await signHmac(key, payloadBytes);
  if (sigBytes.length !== expectedSig.length || !timingSafeEqual(sigBytes, expectedSig)) {
    return { valid: false };
  }
  return { valid: true, payload };
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  const keyData = new TextEncoder().encode(secret);
  return globalThis.crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

async function signHmac(key: CryptoKey, data: Uint8Array): Promise<Uint8Array> {
  const sig = await globalThis.crypto.subtle.sign("HMAC", key, data as BufferSource);
  return new Uint8Array(sig);
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a[i]! ^ b[i]!;
  return out === 0;
}

function stripEnvQuotes(s: string): string {
  const t = (s || "").trim();
  if (t.length >= 2 && t.startsWith('"') && t.endsWith('"')) return t.slice(1, -1);
  return t;
}

export function getAdminSessionSecret(): string {
  return stripEnvQuotes(process.env.ADMIN_SESSION_SECRET || "");
}

export function getAdminCookieName(): string {
  return COOKIE_NAME;
}

export function clearAdminCookieHeader(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

/**
 * Use in API route handlers: if session invalid, returns a 401 NextResponse to return; otherwise null.
 */
export async function requireAdminResponse(
  request: Request
): Promise<Response | null> {
  const secret = getAdminSessionSecret();
  const isProd = process.env.NODE_ENV === "production";
  if (!secret) {
    if (isProd) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    return null; // dev: allow when not configured
  }
  const cookieHeader = request.headers.get("cookie");
  const result = await verifyAdminCookie(cookieHeader, secret);
  if (!result.valid) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }
  return null;
}
