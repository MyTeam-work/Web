// getImage: returns a stored Telegram image as a data URL (SPEC section 5, spike S1).
// Fallback decision if S1 shows that base64 responses do not fit: products and slides use { url }.
import { api, db, BotApiError, EndpointError } from 'sdk';
import { isAdmin } from '../lib/auth.js';

// Conservative caps until spike S1 measures the real response limit (bytes of the raw image).
const MAX_BYTES = { thumb: 512 * 1024, full: 3 * 1024 * 1024 };
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function fail(code, extra) {
  return new EndpointError(code, { code, ...(extra || {}) });
}

// No Buffer and no btoa guarantee in the runtime: encode by hand.
function toBase64(bytes) {
  const parts = [];
  let chunk = '';
  const len = bytes.length;
  let i = 0;
  for (; i + 2 < len; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    chunk += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + B64[(n >> 6) & 63] + B64[n & 63];
    if (chunk.length >= 8192) {
      parts.push(chunk);
      chunk = '';
    }
  }
  const rest = len - i;
  if (rest === 1) {
    const n = bytes[i] << 16;
    chunk += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + '==';
  } else if (rest === 2) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8);
    chunk += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + B64[(n >> 6) & 63] + '=';
  }
  parts.push(chunk);
  return parts.join('');
}

function sniffMime(b) {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8) return 'image/jpeg';
  if (b.length > 4 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b.length > 12 && b[0] === 0x52 && b[1] === 0x49 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp';
  return 'image/jpeg';
}

// Only files that belong to an active product, a slide or a promo may be served (admins may preview anything).
async function isPublicFile(fileId) {
  const esc = fileId.replace(/_/g, '\\_');
  const pat = `%"${esc}"%`;
  const hitProduct = await db.get(
    "SELECT 1 AS ok FROM products WHERE is_active = 1 AND photos LIKE :p ESCAPE '\\' LIMIT 1",
    { ':p': pat },
  );
  if (hitProduct) return true;
  const hitSetting = await db.get(
    "SELECT 1 AS ok FROM settings WHERE key IN ('slides', 'promos') AND value LIKE :p ESCAPE '\\' LIMIT 1",
    { ':p': pat },
  );
  return Boolean(hitSetting);
}

export default async function (input, ctx) {
  const inp = input && typeof input === 'object' ? input : {};
  const fileId = inp.fileId;
  if (typeof fileId !== 'string' || fileId.length < 10 || fileId.length > 200 || !/^[A-Za-z0-9_-]+$/.test(fileId)) {
    throw fail('NOT_FOUND');
  }
  const size = inp.size === 'full' ? 'full' : 'thumb';

  let admin = false;
  try {
    admin = (await isAdmin(ctx)) === true;
  } catch (e) {
    admin = false;
  }
  if (!admin && !(await isPublicFile(fileId))) throw fail('NOT_FOUND');

  let bytes;
  try {
    bytes = await api.getFileContent(fileId);
  } catch (e) {
    if (e instanceof BotApiError) throw fail('NOT_FOUND');
    throw e;
  }
  if (!bytes || !bytes.length) throw fail('NOT_FOUND');
  if (bytes.length > MAX_BYTES[size]) throw fail('TOO_LARGE', { size, bytes: bytes.length });

  const dataUrl = `data:${sniffMime(bytes)};base64,${toBase64(bytes)}`;
  console.info(`getImage size=${size} bytes=${bytes.length} dataUrlChars=${dataUrl.length}`);
  return { dataUrl };
}
