import { Link } from 'react-router-dom';
import { ROUTES, openTelegramLink, useHome } from '../store.js';
import { toFaDigits } from '../lib/fa.js';

const CHANNEL_URL = 'https://t.me/shopafg';

const LINK =
  'tap inline-flex min-h-11 items-center text-sm text-white/65 ' +
  'transition-colors hover:text-white';

// Current Jalali year, e.g. "۱۴۰۵".
function jalaliYear() {
  try {
    const parts = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      year: 'numeric',
    }).formatToParts(new Date());
    const year = parts.find((p) => p.type === 'year');
    return year ? toFaDigits(year.value) : '';
  } catch {
    return '';
  }
}

export default function Footer() {
  const { shopName } = useHome();
  const name = shopName || 'فروشگاه';
  const year = jalaliYear();

  return (
    <footer className="bg-footer pb-[calc(5.5rem+var(--safe-bottom))] pt-6 lg:pb-6">
      <div className="shell flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        {/* Right side (RTL start): brand + copyright */}
        <div className="flex flex-col gap-0.5">
          <span className="text-base font-extrabold text-white">{name}</span>
          <span className="text-xs text-white/50">
            © {year} {name}. همه حقوق محفوظ است.
          </span>
        </div>

        {/* Left side (RTL end): links */}
        <nav aria-label="پیوندهای فوتر" className="flex flex-wrap items-center gap-x-5">
          <button
            type="button"
            className={LINK}
            onClick={() => openTelegramLink(CHANNEL_URL)}
          >
            کانال فروشگاه
          </button>
          <Link to={ROUTES.orders} className={LINK}>
            سفارش‌های من
          </Link>
          <Link to={ROUTES.support} className={LINK}>
            تماس با ما
          </Link>
        </nav>
      </div>
    </footer>
  );
}
