// adminUploadImage: admin uploads a product/slide image (base64). It is stored in the storage channel
// and the file_ids of the small and large size are returned as an Image. Spike S2 covers the size limits.
import { api, InputFile, BotApiError, EndpointError } from 'sdk';
import { requireAdmin } from '../lib/auth.js';
import { getSetting } from '../lib/settings.js';

// Conservative cap on the decoded image until spike S2 measures the real request limit.
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_BASE64_CHARS = Math.ceil((MAX_BYTES * 4) / 3) + 8;
const MIMES = ['image/jpeg', 'image/png', 'image/webp'];
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const B64_INDEX = new Uint8Array(128);
for (let i = 0; i < B64.length; i++) B64_INDEX[B64.charCodeAt(i)] = i;

function fail(code, extra) {
  return new EndpointError(code, { code, ...(extra || {}) });
}

function decodeBase64(input) {
  let s = input;
  const m = /^data:[^;,]+;base64,/.exec(s);
  if (m) s = s.slice(m[0].length);
  if (s.length === 0 || s.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(s)) return null;
  const pad = s.endsWith('==') ? 2 : s.endsWith('=') ? 1 : 0;
  const outLen = (s.length / 4) * 3 - pad;
  const out = new Uint8Array(outLen);
  let o = 0;
  for (let i = 0; i < s.length; i += 4) {
    const n =
      (B64_INDEX[s.charCodeAt(i)] << 18) |
      (B64_INDEX[s.charCodeAt(i + 1)] << 12) |
      (B64_INDEX[s.charCodeAt(i + 2)] << 6) |
      B64_INDEX[s.charCodeAt(i + 3)];
    if (o < outLen) out[o++] = (n >> 16) & 255;
    if (o < outLen) out[o++] = (n >> 8) & 255;
    if (o < outLen) out[o++] = n & 255;
  }
  return out;
}

function sniffMime(b) {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b.length > 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp';
  return null;
}

// Message.photo has several sizes (about 90, 320, 800, 1280 px). full = largest, thumb = largest up to 400 px.
function pickSizes(photoArr) {
  const list = Array.isArray(photoArr) ? photoArr.filter((p) => p && typeof p.file_id === 'string') : [];
  if (!list.length) return null;
  const sorted = [...list].sort((a, b) => (a.width || 0) * (a.height || 0) - (b.width || 0) * (b.height || 0));
  const small = sorted.filter((p) => Math.max(p.width || 0, p.height || 0) <= 400);
  const full = sorted[sorted.length - 1].file_id;
  const thumb = (small.length ? small[small.length - 1] : sorted[0]).file_id;
  return { full, thumb };
}

export default async function (input, ctx) {
  await requireAdmin(ctx);
  const inp = input && typeof input === 'object' && !Array.isArray(input) ? input : {};

  if (typeof inp.mime !== 'string' || !MIMES.includes(inp.mime)) throw fail('INVALID_INPUT', { field: 'mime' });
  if (typeof inp.imageBase64 !== 'string' || inp.imageBase64.length === 0) throw fail('INVALID_INPUT', { field: 'imageBase64' });
  if (inp.imageBase64.length > MAX_BASE64_CHARS + 64) throw fail('TOO_LARGE');

  const storageId = Number(await getSetting('storage_chat_id'));
  if (!Number.isFinite(storageId) || storageId === 0) throw fail('STORAGE_NOT_SET');

  const bytes = decodeBase64(inp.imageBase64);
  if (!bytes) throw fail('INVALID_INPUT', { field: 'imageBase64' });
  if (bytes.length > MAX_BYTES) throw fail('TOO_LARGE');
  const mime = sniffMime(bytes);
  if (!mime) throw fail('INVALID_INPUT', { field: 'imageBase64' });
  console.info(`adminUploadImage bytes=${bytes.length} base64Chars=${inp.imageBase64.length}`);

  const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
  let image = null;
  try {
    const msg = await api.sendPhoto({
      chat_id: storageId,
      photo: new InputFile(bytes, `upload.${ext}`, { type: mime }),
    });
    image = pickSizes(msg && msg.photo);
  } catch (e) {
    if (e instanceof BotApiError) throw fail('STORAGE_ERROR');
    throw e;
  }
  if (!image) throw fail('STORAGE_ERROR');

  return { image };
}
