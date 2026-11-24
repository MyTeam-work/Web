// sendSupport { text } -> { ok: true }
// Relays the customer's message to the admin (same code as the bot chat).
import { EndpointError } from 'sdk';
import { getUser } from '../lib/auth.js';
import { relayUserMessage } from '../lib/support.js';

const MAX_LEN = 1000;

const fail = (message, code, extra = {}) =>
  new EndpointError(message, { code, ...extra });

export default async function (input, ctx) {
  const user = getUser(ctx);
  const text =
    input && typeof input.text === 'string' ? input.text.trim() : '';
  if (!text || text.length > MAX_LEN) {
    throw fail('Invalid text', 'INVALID_INPUT', { field: 'text' });
  }
  const res = await relayUserMessage({ tgUser: user, text });
  if (res.ok) return { ok: true };
  if (res.reason === 'rate') throw fail('Too many messages', 'RATE_LIMIT');
  if (res.reason === 'empty') {
    throw fail('Invalid text', 'INVALID_INPUT', { field: 'text' });
  }
  throw fail('Support is unavailable', 'SUPPORT_UNAVAILABLE');
}
