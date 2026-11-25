import { useRef, useState } from 'react';
import { Copy, Upload } from 'lucide-react';
import { errorMessage, prepareImage, submitReceipt } from '../api.js';
import { copyText, haptic, showToast } from '../store.js';
import { formatDateFa, formatPrice, toFaDigits } from '../lib/fa.js';

const TONES = {
  navy: 'bg-navy-700/10 text-navy-700',
  green: 'bg-emerald-100 text-emerald-800',
  red: 'bg-red/10 text-red',
};

// Same keys as lib/orders.js STATUS_LABEL_FA.
const STATUS = {
  awaiting_receipt: {
    label: 'در انتظار رسید',
    tone: 'navy',
    hint: 'پس از پرداخت، عکس رسید را ارسال کنید.',
  },
  receipt_review: {
    label: 'در حال بررسی پرداخت',
    tone: 'navy',
    hint: 'رسید شما دریافت شد و در حال بررسی است.',
  },
  paid: {
    label: 'پرداخت تأیید شد',
    tone: 'green',
    hint: 'پرداخت شما تأیید شد. سفارش به‌زودی پردازش می‌شود.',
  },
  rejected: {
    label: 'رسید رد شد',
    tone: 'red',
    hint: 'رسید شما تأیید نشد. لطفاً رسید درست را دوباره بفرستید.',
  },
  processing: {
    label: 'در حال پردازش',
    tone: 'navy',
    hint: 'سفارش شما در حال آماده‌سازی است.',
  },
  shipped: {
    label: 'ارسال شد',
    tone: 'green',
    hint: 'سفارش شما ارسال شد.',
  },
  cancelled: {
    label: 'لغو شد',
    tone: 'red',
    hint: 'این سفارش لغو شده است.',
  },
};

export default function OrderCard({ order, onChanged }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const info = STATUS[order.status] || {
    label: order.status,
    tone: 'navy',
    hint: '',
  };
  const canUpload =
    order.status === 'awaiting_receipt' || order.status === 'rejected';
  const total =
    formatPrice(order.total, order.currency) ||
    formatPrice(order.total, 'IRT');
  const date = formatDateFa(order.createdAt);

  const onPick = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file || busy) return;
    setBusy(true);
    try {
      const img = await prepareImage(file);
      await submitReceipt({
        orderId: order.id,
        imageBase64: img.imageBase64,
        mime: img.mime,
      });
      haptic('success');
      showToast('رسید ارسال شد و در حال بررسی است');
      if (onChanged) onChanged();
    } catch (err) {
      haptic('error');
      showToast(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="card flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted">کد سفارش</p>
          <button
            type="button"
            onClick={() => copyText(order.code, 'کد سفارش کپی شد')}
            className="tap -ms-1 inline-flex min-h-11 items-center gap-1.5 rounded-full px-1 text-base font-extrabold"
            aria-label="کپی کد سفارش"
          >
            <span dir="ltr">{order.code}</span>
            <Copy className="size-4 text-muted" aria-hidden="true" />
          </button>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${TONES[info.tone]}`}
        >
          {info.label}
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-3 rounded-photo bg-page p-3 text-sm">
        <div>
          <dt className="text-xs text-muted">مبلغ کل</dt>
          <dd className="font-bold">{total || '-'}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">تعداد اقلام</dt>
          <dd className="font-bold">{toFaDigits(order.itemsCount || 0)}</dd>
        </div>
        {date && (
          <div className="col-span-2">
            <dt className="text-xs text-muted">تاریخ ثبت</dt>
            <dd className="font-medium">{date}</dd>
          </div>
        )}
      </dl>

      {info.hint && <p className="text-sm text-muted">{info.hint}</p>}

      {canUpload && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onPick}
          />
          <button
            type="button"
            className="btn btn-navy w-full"
            disabled={busy}
            onClick={() => inputRef.current && inputRef.current.click()}
          >
            <Upload className="size-4" aria-hidden="true" />
            {busy
              ? 'در حال ارسال…'
              : order.status === 'rejected'
                ? 'ارسال دوباره رسید'
                : 'ارسال رسید پرداخت'}
          </button>
        </>
      )}
    </article>
  );
}
