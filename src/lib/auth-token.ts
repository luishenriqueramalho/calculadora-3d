export const SESSION_COOKIE = "printlab_session";

type SessionPayload = {
  userId: string;
  exp: number;
};

function base64UrlEncode(value: string | Uint8Array) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function signature(value: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET não configurado.");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)));
}

export async function createSessionToken(userId: string) {
  const payload: SessionPayload = { userId, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 };
  const encoded = base64UrlEncode(JSON.stringify(payload));
  return `${encoded}.${base64UrlEncode(await signature(encoded))}`;
}

export async function verifySessionToken(token?: string | null): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const [encoded, providedSignature] = token.split(".");
    if (!encoded || !providedSignature) return null;
    const expected = await signature(encoded);
    const provided = base64UrlDecode(providedSignature);
    if (expected.length !== provided.length) return null;
    let difference = 0;
    expected.forEach((byte, index) => { difference |= byte ^ provided[index]; });
    if (difference !== 0) return null;
    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(encoded))) as SessionPayload;
    return payload.userId && payload.exp > Date.now() ? payload : null;
  } catch {
    return null;
  }
}
