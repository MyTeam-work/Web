import { useState } from 'react';
import { ArrowLeft, CheckCircle2, MessageCircle, Send } from 'lucide-react';
import { errorMessage, sendSupport } from '../api.js';
import { haptic, openTelegramLink } from '../store.js';
import { toFaDigits } from '../lib/fa.js';

const MAX_LEN = 1000;
const BOT_URL = 'https://t.me/MiniShop_Afbot';
const CHANNEL_URL = 'https://t.me/shopafg';

export default function Support() {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const trimmed = text.trim();
  const canSend = trimmed.length > 0 && !sending;

  const send = async (e) => {
    e.preventDefault();
    if (!canSend) return;
    setSending(true);
    setError('');
    try {
      await sendSupport(trimmed);
      haptic('success');
      setText('');
      setSent(true);
    } catch (err) {
      haptic('error');
      setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="shell py-6 lg:py-10">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-extrabold lg:text-3xl">تماس با پشتیبانی</h1>
        <p className="mt-1 text-sm text-muted">
          پیام خود را بنویسید؛ پاسخ را در چت ربات دریافت می‌کنید.
        </p>

        {sent ? (
          <div className="card mt-6 flex flex-col items-center gap-3 p-8 text-center">
            <CheckCircle2 className="size-10 text-emerald-600" aria-hidden="true" />
            <p className="font-bold">پیام شما ارسال شد</p>
            <p className="text-sm text-muted">
              پاسخ پشتیبانی داخل چت ربات برای شما فرستاده می‌شود.
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                className="btn btn-navy"
                onClick={() => openTelegramLink(BOT_URL)}
              >
                باز کردن چت ربات
                <ArrowLeft className="size-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setSent(false)}
              >
                ارسال پیام جدید
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={send} className="card mt-6 flex flex-col gap-3 p-4 lg:p-6">
            <label htmlFor="support-text" className="text-sm font-bold">
              پیام شما
            </label>
            <textarea
              id="support-text"
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_LEN))}
              rows={6}
              maxLength={MAX_LEN}
              placeholder="سؤال یا مشکل خود را اینجا بنویسید…"
              className="w-full resize-y rounded-photo bg-page p-3 text-base text-ink outline-none ring-1 ring-black/5 focus:ring-navy-700"
            />
            <div className="flex items-center justify-between text-xs text-muted">
              <span>
                {toFaDigits(text.length)} از {toFaDigits(MAX_LEN)}
              </span>
            </div>
            {error && (
              <p role="alert" className="text-sm font-medium text-red">
                {error}
              </p>
            )}
            <button type="submit" className="btn btn-navy w-full" disabled={!canSend}>
              <Send className="size-4" aria-hidden="true" />
              {sending ? 'در حال ارسال…' : 'ارسال پیام'}
            </button>
          </form>
        )}

        <div className="card mt-4 flex items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-10 items-center justify-center rounded-full bg-navy-700/10 text-navy-700">
              <MessageCircle className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-bold">کانال فروشگاه</p>
              <p className="text-xs text-muted">اخبار و محصولات جدید</p>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => openTelegramLink(CHANNEL_URL)}
          >
            مشاهده
          </button>
        </div>
      </div>
    </section>
  );
}
