// handlers/callback_query.js — admin inline buttons: ord:<a|r|p|s|c>:<orderId>.
import { api, BotApiError, EndpointError } from 'sdk';
import { isAdminId } from '../lib/auth.js';
import { applyAction, getOrder } from '../lib/orders.js';
import { adminOrderKeyboard, parseOrderCallback } from '../lib/keyboards.js';
import { statusText } from '../lib/format.js';
import { notifyUserStatus } from '../lib/notify.js';

// Own Persian strings.
const FA = {
  forbidden: 'این دکمه‌ها فقط برای مدیر فعال است.',
  badState: 'وضعیت این سفارش قبلاً تغییر کرده است.',
  notFound: 'سفارش پیدا نشد.',
  error: 'خطایی رخ داد. لطفاً دوباره تلاش کنید.',
};

function logFail(where, err) {
  const name = (err && err.name) || 'Error';
  const code = err && err.code !== undefined ? ` ${err.code}` : '';
  console.error(`callback_query.${where} failed: ${name}${code}`);
}

function isNotModified(err) {
  return (
    err instanceof BotApiError &&
    Number(err.code) === 400 &&
    /not modified/i.test(String(err.description || ''))
  );
}

// Replace the buttons of the admin message (empty keyboard when there are none).
async function refreshButtons(message, order) {
  if (!message || !message.chat || !message.message_id) return;
  const markup = adminOrderKeyboard(order) || { inline_keyboard: [] };
  try {
    await api.editMessageReplyMarkup({
      chat_id: message.chat.id,
      message_id: message.message_id,
      reply_markup: markup,
    });
  } catch (err) {
    if (!isNotModified(err)) logFail('editMarkup', err);
  }
}

export default async function (callbackQuery, ctx) {
  let answered = false;
  // Exactly one answerCallbackQuery per update.
  const answer = async (extra = {}) => {
    if (answered || !callbackQuery || !callbackQuery.id) return;
    answered = true;
    try {
      await api.answerCallbackQuery({ callback_query_id: callbackQuery.id, ...extra });
    } catch (err) {
      logFail('answer', err);
    }
  };

  try {
    const parsed = parseOrderCallback(callbackQuery && callbackQuery.data);
    if (!parsed) return; // not ours: ignore (answered in finally)

    const fromId = callbackQuery.from && callbackQuery.from.id;
    if (!(await isAdminId(fromId))) {
      await answer({ text: FA.forbidden, show_alert: true });
      return;
    }

    const { action, orderId } = parsed;
    let result;
    try {
      result = await applyAction(orderId, action, {});
    } catch (err) {
      const code = err instanceof EndpointError && err.parameters ? err.parameters.code : null;
      if (code === 'BAD_STATE') {
        // Show the current buttons so the admin sees the real state.
        try {
          const current = await getOrder(orderId);
          if (current) await refreshButtons(callbackQuery.message, current);
        } catch (e) {
          logFail('refresh', e);
        }
        await answer({ text: FA.badState, show_alert: true });
        return;
      }
      if (code === 'NOT_FOUND') {
        await answer({ text: FA.notFound, show_alert: true });
        return;
      }
      throw err;
    }

    const order = { ...result.order, status: result.to || (result.order && result.order.status) };
    await refreshButtons(callbackQuery.message, order);
    await answer({ text: statusText(order.status) });
    await notifyUserStatus(orderId); // never throws
  } catch (err) {
    logFail('handler', err);
    await answer({ text: FA.error, show_alert: true });
  } finally {
    await answer(); // safety net: no-op when already answered
  }
}
