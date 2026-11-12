// Admin session: an HMAC-signed cookie holding only an expiry. Works in the proxy (edge) and in server actions.
export const ADMIN_COOKIE = 'pghub_admin';
const enc = new TextEncoder();

async function key() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error('ADMIN_SESSION_SECRET missing');
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
const b64 = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export async function signAdmin(hours = 12) {
  const payload = `admin.${Date.now() + hours * 3600_000}`;
  return `${payload}.${b64(await crypto.subtle.sign('HMAC', await key(), enc.encode(payload)))}`;
}

export async function verifyAdmin(token?: string | null) {
  if (!token) return false;
  const i = token.lastIndexOf('.');
  if (i < 0) return false;
  const payload = token.slice(0, i);
  const exp = Number(payload.split('.')[1]);
  if (!exp || exp < Date.now()) return false;
  const expected = b64(await crypto.subtle.sign('HMAC', await key(), enc.encode(payload)));
  const got = token.slice(i + 1);
  if (expected.length !== got.length) return false;
  let diff = 0;
  for (let k = 0; k < got.length; k++) diff |= expected.charCodeAt(k) ^ got.charCodeAt(k);
  return diff === 0;
}

// constant-time string compare for the login form
export function safeEqual(a: string, b: string) {
  const x = enc.encode(a), y = enc.encode(b);
  let diff = x.length ^ y.length;
  for (let k = 0; k < Math.max(x.length, y.length); k++) diff |= (x[k] ?? 0) ^ (y[k] ?? 0);
  return diff === 0;
}
