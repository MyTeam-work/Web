// Admin: create / edit a product. Prices are plain Toman integers (the server derives Afghani from the rate).
// The product being edited is loaded with adminListProducts({ id }); error texts come from api.js (errorMessage / err.userMessage).
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, ImagePlus, Plus, Save, Trash2, X } from 'lucide-react';
import { adminListProducts, adminSaveProduct, adminUploadImage, errorMessage, prepareImage } from '../../api.js';
import Img from '../../components/Img.jsx';
import { ROUTES, haptic, loadHome, showToast, useHome } from '../../store.js';
import { formatNumber, parseNumber, toFaDigits } from '../../lib/fa.js';

const MAX_PHOTOS = 12;
const MAX_SIZES = 20;
const MAX_COLORS = 20;
const SIZE_PRESETS = ['S', 'M', 'L', 'XL', 'XXL', 'فری‌سایز'];
// Form fields that can show a server-side INVALID_INPUT message inline.
const INLINE_FIELDS = ['nameFa', 'categoryId', 'description', 'price', 'oldPrice', 'stock', 'colors'];

const inputCls = 'h-12 w-full rounded-xl border bg-white px-3 text-base text-ink outline-none transition-colors focus:border-navy-700';

const emptyForm = () => ({
  nameFa: '',
  categoryId: '',
  description: '',
  price: '',
  oldPrice: '',
  stock: '',
  sizes: [],
  colors: [],
  photos: [],
  isActive: true,
  isFeatured: false,
});

const fromProduct = (p) => ({
  nameFa: p.nameFa || '',
  categoryId: p.categoryId ? String(p.categoryId) : '',
  description: p.description || '',
  price: p.price ? String(p.price) : '',
  oldPrice: p.oldPrice ? String(p.oldPrice) : '',
  stock: String(p.stock ?? 0),
  sizes: Array.isArray(p.sizes) ? [...p.sizes] : [],
  colors: Array.isArray(p.colors) ? p.colors.map((c) => ({ name: c.name || '', hex: c.hex || '#0b1f4b' })) : [],
  photos: Array.isArray(p.photos) ? [...p.photos] : [],
  isActive: p.isActive !== false,
  isFeatured: p.isFeatured === true,
});

function Field({ id, label, error, hint, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-xs text-red" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1 text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

const borderOf = (err) => (err ? 'border-red' : 'border-black/10');

export default function AdminProductForm() {
  const { id: rawId } = useParams();
  const isNew = !rawId || rawId === 'new';
  const id = isNew ? null : Number(rawId);
  const navigate = useNavigate();
  const { categories } = useHome();

  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState(isNew ? 'ready' : 'loading'); // 'loading' | 'ready' | 'notfound' | 'error'
  const [loadError, setLoadError] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [sizeDraft, setSizeDraft] = useState('');
  const fileRef = useRef(null);

  // Load the product being edited (one request: adminListProducts { id }, inactive products included).
  useEffect(() => {
    if (isNew) return undefined;
    if (!Number.isInteger(id) || id < 1) {
      setStatus('notfound');
      return undefined;
    }
    let alive = true;
    setStatus('loading');
    adminListProducts({ id })
      .then((res) => {
        if (!alive) return;
        const hit = ((res && res.items) || []).find((x) => x.id === id);
        if (hit) {
          setForm(fromProduct(hit));
          setStatus('ready');
        } else {
          setStatus('notfound');
        }
      })
      .catch((err) => {
        if (!alive) return;
        setLoadError(errorMessage(err));
        setStatus('error');
      });
    return () => {
      alive = false;
    };
  }, [rawId]);

  // New product: preselect the first category once home data is loaded.
  useEffect(() => {
    if (isNew && !form.categoryId && categories[0]) setForm((f) => ({ ...f, categoryId: String(categories[0].id) }));
  }, [isNew, categories, form.categoryId]);

  const set = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  // ---- sizes ----
  const addSize = (raw) => {
    const t = String(raw).trim().slice(0, 20);
    if (!t) return;
    setForm((f) => (f.sizes.includes(t) || f.sizes.length >= MAX_SIZES ? f : { ...f, sizes: [...f.sizes, t] }));
    setSizeDraft('');
  };
  const toggleSize = (t) =>
    setForm((f) => {
      if (f.sizes.includes(t)) return { ...f, sizes: f.sizes.filter((x) => x !== t) };
      return f.sizes.length >= MAX_SIZES ? f : { ...f, sizes: [...f.sizes, t] };
    });

  // ---- colors ----
  const addColor = () => setForm((f) => (f.colors.length >= MAX_COLORS ? f : { ...f, colors: [...f.colors, { name: '', hex: '#0b1f4b' }] }));
  const patchColor = (i, patch) => {
    setForm((f) => ({ ...f, colors: f.colors.map((c, j) => (j === i ? { ...c, ...patch } : c)) }));
    if (errors.colors) setErrors((e) => ({ ...e, colors: undefined }));
  };
  const removeColor = (i) => setForm((f) => ({ ...f, colors: f.colors.filter((_, j) => j !== i) }));

  // ---- photos ----
  async function addPhotos(fileList) {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;
    const room = MAX_PHOTOS - form.photos.length;
    if (room <= 0) {
      showToast(`حداکثر ${toFaDigits(MAX_PHOTOS)} عکس مجاز است`);
      return;
    }
    if (files.length > room) showToast(`فقط ${toFaDigits(room)} عکس دیگر مجاز است`);
    setUploading((n) => n + 1);
    try {
      for (const file of files.slice(0, room)) {
        try {
          const img = await prepareImage(file, { maxSide: 1600, quality: 0.7 });
          const res = await adminUploadImage({ imageBase64: img.imageBase64, mime: img.mime });
          setForm((f) => (f.photos.length >= MAX_PHOTOS ? f : { ...f, photos: [...f.photos, res.image] }));
        } catch (err) {
          showToast(errorMessage(err));
          if (err && err.code === 'STORAGE_NOT_SET') break;
        }
      }
    } finally {
      setUploading((n) => n - 1);
    }
  }
  const movePhoto = (i, dir) =>
    setForm((f) => {
      const to = i + dir;
      if (to < 0 || to >= f.photos.length) return f;
      const list = [...f.photos];
      [list[i], list[to]] = [list[to], list[i]];
      return { ...f, photos: list };
    });
  const removePhoto = (i) => setForm((f) => ({ ...f, photos: f.photos.filter((_, j) => j !== i) }));

  // ---- save ----
  function validate() {
    const errs = {};
    if (form.nameFa.trim().length < 2) errs.nameFa = 'نام محصول باید حداقل ۲ حرف باشد.';
    if (!form.categoryId) errs.categoryId = 'یک دسته انتخاب کنید.';
    const price = parseNumber(form.price);
    if (!Number.isInteger(price) || price < 1) errs.price = 'قیمت را به تومان و به‌صورت عدد صحیح وارد کنید.';
    let oldPrice = null;
    if (String(form.oldPrice).trim() !== '') {
      const o = parseNumber(form.oldPrice);
      if (!Number.isInteger(o) || o < 1) errs.oldPrice = 'قیمت قبلی باید عدد صحیح باشد.';
      else oldPrice = o;
    }
    const stock = String(form.stock).trim() === '' ? NaN : parseNumber(form.stock);
    if (!Number.isInteger(stock) || stock < 0 || stock > 100000) errs.stock = 'موجودی باید عددی بین ۰ تا ۱۰۰٬۰۰۰ باشد.';
    const names = form.colors.map((c) => c.name.trim());
    if (names.some((n) => !n) || new Set(names).size !== names.length) errs.colors = 'هر رنگ باید نام داشته باشد و نام‌ها تکراری نباشند.';
    if (form.description.length > 2000) errs.description = 'توضیحات حداکثر ۲۰۰۰ حرف است.';
    return { errs, price, oldPrice, stock };
  }

  async function save() {
    if (saving || uploading > 0) return;
    const { errs, price, oldPrice, stock } = validate();
    setErrors(errs);
    const order = ['nameFa', 'categoryId', 'price', 'oldPrice', 'stock', 'colors', 'description'];
    const first = order.find((k) => errs[k]);
    if (first) {
      haptic('error');
      const node = document.getElementById(`pf-${first}`);
      if (node) {
        node.scrollIntoView({ block: 'center', behavior: 'smooth' });
        if (typeof node.focus === 'function') node.focus({ preventScroll: true });
      }
      return;
    }
    setSaving(true);
    try {
      await adminSaveProduct({
        ...(id ? { id } : {}),
        categoryId: Number(form.categoryId),
        nameFa: form.nameFa.trim(),
        description: form.description.trim(),
        price,
        oldPrice,
        stock,
        sizes: form.sizes,
        colors: form.colors.map((c) => ({ name: c.name.trim(), hex: c.hex })),
        photos: form.photos,
        isActive: form.isActive,
        isFeatured: form.isFeatured,
      });
      haptic('success');
      showToast('محصول ذخیره شد');
      loadHome({ force: true });
      navigate(ROUTES.adminProducts);
    } catch (err) {
      haptic('error');
      const message = errorMessage(err);
      if (err && err.code === 'INVALID_INPUT' && INLINE_FIELDS.includes(err.field)) {
        setErrors((e) => ({ ...e, [err.field]: message }));
      }
      showToast(message);
    } finally {
      setSaving(false);
    }
  }

  const header = (
    <div className="mb-4 flex items-center gap-3">
      <Link to={ROUTES.adminProducts} className="tap grid size-10 place-items-center rounded-full border border-black/10 bg-white" aria-label="بازگشت">
        <ArrowRight size={18} />
      </Link>
      <h1 className="text-xl font-extrabold text-ink">{isNew ? 'افزودن محصول' : 'ویرایش محصول'}</h1>
    </div>
  );

  if (status === 'loading') {
    return (
      <div className="shell py-4">
        {header}
        <div className="skeleton h-48 rounded-card" />
      </div>
    );
  }
  if (status === 'notfound' || status === 'error') {
    return (
      <div className="shell py-4">
        {header}
        <p className="mb-3 text-sm text-muted">{status === 'notfound' ? 'محصول پیدا نشد.' : loadError}</p>
        <Link to={ROUTES.adminProducts} className="btn btn-navy">
          بازگشت به محصولات
        </Link>
      </div>
    );
  }

  const priceHint = String(form.price).trim() && Number.isFinite(parseNumber(form.price)) ? `${formatNumber(parseNumber(form.price))} تومان` : 'قیمت پایه به تومان است؛ مبلغ افغانی از نرخ تنظیمات محاسبه می‌شود.';

  return (
    <div className="shell space-y-4 py-4 pb-safe lg:py-8">
      {header}

      <section className="card space-y-4 p-4">
        <h2 className="text-base font-extrabold text-ink">اطلاعات اصلی</h2>
        <Field id="pf-nameFa" label="نام محصول" error={errors.nameFa}>
          <input id="pf-nameFa" className={`${inputCls} ${borderOf(errors.nameFa)}`} maxLength={120} value={form.nameFa} onChange={(e) => set('nameFa', e.target.value)} />
        </Field>
        <Field id="pf-categoryId" label="دسته" error={errors.categoryId}>
          <select id="pf-categoryId" className={`${inputCls} ${borderOf(errors.categoryId)}`} value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
            <option value="">انتخاب کنید</option>
            {categories.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.nameFa}
              </option>
            ))}
          </select>
        </Field>
        <Field id="pf-description" label="توضیحات" error={errors.description}>
          <textarea
            id="pf-description"
            className={`${inputCls} h-auto min-h-28 py-2.5 ${borderOf(errors.description)}`}
            rows={4}
            maxLength={2000}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
          />
        </Field>
      </section>

      <section className="card space-y-4 p-4">
        <h2 className="text-base font-extrabold text-ink">قیمت و موجودی</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="pf-price" label="قیمت (تومان)" error={errors.price} hint={priceHint}>
            <input id="pf-price" className={`${inputCls} ${borderOf(errors.price)}`} inputMode="numeric" dir="ltr" value={form.price} onChange={(e) => set('price', e.target.value)} />
          </Field>
          <Field id="pf-oldPrice" label="قیمت قبل از تخفیف (اختیاری)" error={errors.oldPrice} hint="فقط وقتی بیشتر از قیمت فعلی باشد، تخفیف نمایش داده می‌شود.">
            <input id="pf-oldPrice" className={`${inputCls} ${borderOf(errors.oldPrice)}`} inputMode="numeric" dir="ltr" value={form.oldPrice} onChange={(e) => set('oldPrice', e.target.value)} />
          </Field>
        </div>
        <Field id="pf-stock" label="موجودی (تعداد)" error={errors.stock}>
          <input id="pf-stock" className={`${inputCls} ${borderOf(errors.stock)}`} inputMode="numeric" dir="ltr" value={form.stock} onChange={(e) => set('stock', e.target.value)} />
        </Field>
      </section>

      <section className="card space-y-3 p-4">
        <div>
          <h2 className="text-base font-extrabold text-ink">
            تصاویر ({toFaDigits(form.photos.length)} از {toFaDigits(MAX_PHOTOS)})
          </h2>
          <p className="mt-0.5 text-xs text-muted">عکس اول، تصویر اصلی محصول در فروشگاه است.</p>
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { addPhotos(e.target.files); e.target.value = ''; }} />
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {form.photos.map((photo, i) => (
            <div key={`${photo.full || photo.url}-${i}`} className="space-y-1">
              <div className="relative">
                <Img image={photo} alt={`تصویر ${toFaDigits(i + 1)}`} className="aspect-[4/5] rounded-photo" />
                {i === 0 && <span className="absolute start-1.5 top-1.5 rounded-full bg-ink px-2 py-0.5 text-[11px] font-bold text-white">اصلی</span>}
              </div>
              <div className="flex items-center justify-between">
                <button type="button" className="tap inline-flex items-center justify-center disabled:opacity-30" disabled={i === 0} onClick={() => movePhoto(i, -1)} aria-label="جلوتر">
                  <ChevronRight className="size-5" aria-hidden="true" />
                </button>
                <button type="button" className="tap inline-flex items-center justify-center text-red" onClick={() => removePhoto(i)} aria-label="حذف تصویر">
                  <Trash2 className="size-[18px]" aria-hidden="true" />
                </button>
                <button type="button" className="tap inline-flex items-center justify-center disabled:opacity-30" disabled={i === form.photos.length - 1} onClick={() => movePhoto(i, 1)} aria-label="عقب‌تر">
                  <ChevronLeft className="size-5" aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
          {form.photos.length < MAX_PHOTOS && (
            <button
              type="button"
              disabled={uploading > 0}
              onClick={() => fileRef.current && fileRef.current.click()}
              className="flex aspect-[4/5] flex-col items-center justify-center gap-1.5 rounded-photo border-2 border-dashed border-black/15 bg-page text-xs text-muted"
            >
              <ImagePlus className="size-6" aria-hidden="true" />
              {uploading > 0 ? 'در حال آپلود...' : 'افزودن عکس'}
            </button>
          )}
        </div>
      </section>

      <section className="card space-y-3 p-4">
        <div>
          <h2 className="text-base font-extrabold text-ink">سایزها</h2>
          <p className="mt-0.5 text-xs text-muted">اگر محصول سایز ندارد (مثل اکسسوری) خالی بگذارید.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {SIZE_PRESETS.map((t) => (
            <button key={t} type="button" className="chip" aria-pressed={form.sizes.includes(t)} onClick={() => toggleSize(t)}>
              {t}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            className={`${inputCls} border-black/10`}
            placeholder="سایز دلخواه، مثلاً ۴۲"
            maxLength={20}
            value={sizeDraft}
            aria-label="سایز دلخواه"
            onChange={(e) => setSizeDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addSize(sizeDraft);
              }
            }}
          />
          <button type="button" className="btn btn-outline shrink-0" onClick={() => addSize(sizeDraft)}>
            <Plus className="size-4" aria-hidden="true" />
            افزودن
          </button>
        </div>
        {form.sizes.filter((t) => !SIZE_PRESETS.includes(t)).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {form.sizes
              .filter((t) => !SIZE_PRESETS.includes(t))
              .map((t) => (
                <span key={t} className="chip chip-active gap-2">
                  {t}
                  <button type="button" onClick={() => toggleSize(t)} aria-label={`حذف سایز ${t}`}>
                    <X className="size-4" aria-hidden="true" />
                  </button>
                </span>
              ))}
          </div>
        )}
      </section>

      <section className="card space-y-3 p-4" id="pf-colors" tabIndex={-1}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold text-ink">رنگ‌ها</h2>
            <p className="mt-0.5 text-xs text-muted">نام هر رنگ باید یکتا باشد.</p>
          </div>
          <button type="button" className="btn btn-outline" disabled={form.colors.length >= MAX_COLORS} onClick={addColor}>
            <Plus className="size-4" aria-hidden="true" />
            افزودن رنگ
          </button>
        </div>
        {errors.colors && (
          <p className="text-xs text-red" role="alert">
            {errors.colors}
          </p>
        )}
        {form.colors.map((c, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="color"
              value={c.hex}
              onChange={(e) => patchColor(i, { hex: e.target.value })}
              aria-label={`انتخاب رنگ ${toFaDigits(i + 1)}`}
              className="size-12 shrink-0 cursor-pointer rounded-xl border border-black/10 bg-white p-1"
            />
            <input
              className={`${inputCls} border-black/10`}
              placeholder="نام رنگ، مثلاً سرمه‌ای"
              maxLength={40}
              value={c.name}
              aria-label={`نام رنگ ${toFaDigits(i + 1)}`}
              onChange={(e) => patchColor(i, { name: e.target.value })}
            />
            <button type="button" className="tap inline-flex shrink-0 items-center justify-center text-red" onClick={() => removeColor(i)} aria-label="حذف رنگ">
              <Trash2 className="size-[18px]" aria-hidden="true" />
            </button>
          </div>
        ))}
      </section>

      <section className="card space-y-3 p-4">
        <h2 className="text-base font-extrabold text-ink">نمایش</h2>
        <label className="flex min-h-11 items-center gap-3 text-sm text-ink">
          <input type="checkbox" className="size-5 accent-navy-700" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} />
          فعال (در فروشگاه نمایش داده شود)
        </label>
        <label className="flex min-h-11 items-center gap-3 text-sm text-ink">
          <input type="checkbox" className="size-5 accent-navy-700" checked={form.isFeatured} onChange={(e) => set('isFeatured', e.target.checked)} />
          محصول ویژه (نمایش در بخش پرفروش‌های صفحه اصلی)
        </label>
      </section>

      <div className="sticky bottom-3 z-20 flex gap-2">
        <button type="button" className="btn btn-navy flex-1 shadow-soft" disabled={saving || uploading > 0} onClick={save}>
          <Save className="size-[18px]" aria-hidden="true" />
          {saving ? 'در حال ذخیره...' : uploading > 0 ? 'منتظر پایان آپلود...' : 'ذخیره محصول'}
        </button>
        <Link to={ROUTES.adminProducts} className="btn btn-outline shadow-soft">
          انصراف
        </Link>
      </div>
    </div>
  );
}
