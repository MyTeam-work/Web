// endpoints/adminReviewOrder.js — admin changes an order status and the customer is notified.
// Input: { orderId, action: 'approve'|'reject'|'processing'|'shipped'|'cancel', note? }
// Output: { status, from, notified }
import { EndpointError } from 'sdk';
import { requireAdmin } from '../lib/auth.js';
import { cleanText, toInt } from '../lib/ids.js';
import { ACTIONS, applyAction } from '../lib/orders.js';
import { notifyUserStatus } from '../lib/notify.js';

const MAX_ID = 2147483647;
const MAX_NOTE = 500;

const invalid = (field) => new EndpointError('Invalid input', { code: 'INVALID_INPUT', field });

export default async function (input, ctx) {
  await requireAdmin(ctx);
  const data = input && typeof input === 'object' && !Array.isArray(input) ? input : {};

  const orderId = toInt(data.orderId, 1, MAX_ID);
  if (orderId === null) throw invalid('orderId');
  if (typeof data.action !== 'string' || !Object.hasOwn(ACTIONS, data.action)) throw invalid('action');
  if (data.note !== undefined && data.note !== null && typeof data.note !== 'string') throw invalid('note');
  const note = cleanText(data.note, MAX_NOTE);

  // Transition rules, stock handling and BAD_STATE / NOT_FOUND errors live in lib/orders.js.
  const result = await applyAction(orderId, data.action, note ? { note } : {});

  // Never throws; false means the customer could not be reached (for example, blocked the bot).
  const notified = await notifyUserStatus(orderId, note ? { note } : {});

  return { status: result.to, from: result.from, notified };
}
