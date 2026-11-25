import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUp, ArrowDown, Trash2, Plus, ImagePlus, Save } from 'lucide-react';
import { call, errorMessage, prepareImage, getImage } from '../../api.js';
import { ROUTES, showToast, loadHome, useHome } from '../../store.js';
import { toEnDigits } from '../../lib/fa.js';

const MAX_SLIDES = 10;
const MAX_PROMOS = 2;
const MAX_STATS = 6;

const inputCls =
  'w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-navy-700';

const emptySlide = () => ({ image: null, eyebrow: '', title: '', subtitle: '', buttonText: '', linkType: '', linkValue: '' });
const emptyPromo = () => ({ theme: 'dark', image: null, eyebrow: '', title: '', text: '', buttonText: '', linkType: '', linkValue: '' });
const emptyStat = () => ({ value: '', label: '' });

const str = (v) => (v === undefined || v === null ? '' : String(v));
const fromLink = (link) => ({ linkType: link && link.type ? link.type : '', linkValue: str(link && link.value) });

function toLink(type, value) {
  if (!type) return null;
  const v = str(value).trim();
  return { type, value: type === 'url' ? v : Number(toEnDigits(v)) };
}

function toForm(d) {
  const irt = d.pay_irt || {};
  const afn = d.pay_afn || {};
  return {
    shop_name: str(d.shop_name),
    support_text: str(d.support_text),
    webapp_url: str(d.webapp_url),
    shipping_fee: str(d.shipping_fee || 0),
    default_currency: d.default_currency === 'AFN' ? 'AFN' : 'IRT',
    toman_per_afn: d.toman_per_afn ? str(d.toman_per_afn) : '',
    pay_irt: { number: str(irt.number), holder: str(irt.holder), bank: str(irt.bank) },
    pay_afn: { number: str(afn.number), holder: str(afn.holder), bank: str(afn.bank), note: str(afn.note) },
    slides: (d.slides || []).map((s) => ({
      image: s.image || null,
      eyebrow: str(s.eyebrow),
      title: str(s.title),
      subtitle: str(s.subtitle),
      buttonText: str(s.buttonText),
      ...fromLink(s.link),
    })),
    promos: (d.promos || []).map((p) => ({
      theme: p.theme === 'light' ? 'light' : 'dark',
      image: p.image || null,
      eyebrow: str(p.eyebrow),
      title: str(p.title),
      text: str(p.text),
      buttonText: str(p.buttonText),
      ...fromLink(p.link),
    })),
    hero_stats: (d.hero_stats || []).map((x) => ({ value: str(x.value), label: str(x.label) })),
  };
}

function toPayload(f) {
  const pay = (p, withNote) => {
    const number = toEnDigits(p.number).trim();
    if (!number) return null;
    const out = { number, holder: p.holder.trim(), bank: p.bank.trim() };
    if (withNote) out.note = p.note.trim();
    return out;
  };
  return {
    shop_name: f.shop_name.trim(),
    support_text: f.support_text.trim(),
    webapp_url: f.webapp_url.trim() || null,
    shipping_fee: Number(toEnDigits(f.shipping_fee)) || 0,
    default_currency: f.default_currency,
    toman_per_afn: f.toman_per_afn.trim() ? Number(toEnDigits(f.toman_per_afn)) : null,
    pay_irt: pay(f.pay_irt, false),
    pay_afn: pay(f.pay_afn, true),
    slides: f.slides.map((s) => ({
      image: s.image,
      eyebrow: s.eyebrow.trim(),
      title: s.title.trim(),
      subtitle: s.subtitle.trim(),
      buttonText: s.buttonText.trim(),
      link: toLink(s.linkType, s.linkValue),
    })),
    promos: f.promos.map((p) => ({
      theme: p.theme,
      image: p.image,
      eyebrow: p.eyebrow.trim(),
      title: p.title.trim(),
      text: p.text.trim(),
      buttonText: p.buttonText.trim(),
      link: toLink(p.linkType, p.linkValue),
    })),
    hero_stats: f.hero_stats
      .map((x) => ({ value: x.value.trim(), label: x.label.trim() }))
      .filter((x) => x.value && x.label),
  };
}

function Field({ label, hint, children }) {
  return (
    <label className='block'>
      <span className='mb-1 block text-xs font-medium text-muted'>{label}</span>
      {children}
      {hint ? <span className='mt-1 block text-[11px] text-muted'>{hint}</span> : null}
    </label>
  );
}

function TextInput({ label, value, onChange, hint, rows, ltr, placeholder, inputMode }) {
  return (
    <Field label={label} hint={hint}>
      {rows ? (
        <textarea className={inputCls} rows={rows} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input
          className={inputCls}
          dir={ltr ? 'ltr' : undefined}
          inputMode={inputMode}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </Field>
  );
}

function Section({ title, hint, action, children }) {
  return (
    <section className='card space-y-3 p-4'>
      <div className='flex items-start justify-between gap-3'>
        <div>
          <h2 className='text-base font-bold text-ink'>{title}</h2>
          {hint ? <p className='mt-0.5 text-xs text-muted'>{hint}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function ItemTools({ index, count, onMove, onRemove }) {
  const btn = 'tap grid size-9 place-items-center rounded-full border border-black/10 bg-white text-ink disabled:opacity-30';
  return (
    <div className='flex items-center gap-1.5'>
      <button type='button' className={btn} disabled={index === 0} onClick={() => onMove(-1)} aria-label='بالا'>
        <ArrowUp size={16} />
      </button>
      <button type='button' className={btn} disabled={index === count - 1} onClick={() => onMove(1)} aria-label='پایین'>
        <ArrowDown size={16} />
      </button>
      <button type='button' className={btn + ' text-red'} onClick={onRemove} aria-label='حذف'>
        <Trash2 size={16} />
      </button>
    </div>
  );
}

function ImagePicker({ value, onChange }) {
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);
  const key = value ? value.url || value.thumb || '' : '';

  useEffect(() => {
    let alive = true;
    setPreview(null);
    if (!value) return undefined;
    if (value.url) {
      setPreview(value.url);
      return undefined;
    }
    if (value.thumb) {
      getImage(value.thumb, 'thumb')
        .then((u) => {
          if (alive) setPreview(u);
        })
        .catch(() => {});
    }
    return () => {
      alive = false;
    };
  }, [key]);

  async function onPick(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const img = await prepareImage(file, { maxSide: 1600, quality: 0.7 });
      const res = await call('adminUploadImage', { imageBase64: img.imageBase64, mime: img.mime }, { timeout: 60000 });
      onChange(res.image);
    } catch (err) {
      showToast(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className='flex items-center gap-3'>
      <div className='grid h-24 w-20 shrink-0 place-items-center overflow-hidden rounded-xl bg-tile text-muted'>
        {preview ? <img src={preview} alt='' className='h-full w-full object-cover' /> : <ImagePlus size={22} />}
      </div>
      <div className='flex flex-wrap gap-2'>
        <input ref={inputRef} type='file' accept='image/*' className='hidden' onChange={onPick} />
        <button type='button' className='btn btn-outline' disabled={busy} onClick={() => inputRef.current && inputRef.current.click()}>
          {busy ? 'در حال آپلود...' : value ? 'تغییر تصویر' : 'انتخاب تصویر'}
        </button>
        {value ? (
          <button type='button' className='btn btn-outline' disabled={busy} onClick={() => onChange(null)}>
            حذف تصویر
          </button>
        ) : null}
      </div>
    </div>
  );
}

function LinkFields({ item, onChange, categories }) {
  return (
    <div className='grid grid-cols-2 gap-2'>
      <Field label='مقصد دکمه'>
        <select className={inputCls} value={item.linkType} onChange={(e) => onChange({ linkType: e.target.value, linkValue: '' })}>
          <option value=''>بدون لینک</option>
          <option value='category'>دسته‌بندی</option>
          <option value='product'>محصول</option>
          <option value='url'>آدرس اینترنتی</option>
        </select>
      </Field>
      {item.linkType === 'category' ? (
        <Field label='دسته'>
          <select className={inputCls} value={item.linkValue} onChange={(e) => onChange({ linkValue: e.target.value })}>
            <option value=''>انتخاب کنید</option>
            {(categories || []).map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.nameFa}
              </option>
            ))}
          </select>
        </Field>
      ) : item.linkType === 'product' ? (
        <TextInput label='شناسه محصول' ltr inputMode='numeric' value={item.linkValue} onChange={(v) => onChange({ linkValue: v })} />
      ) : item.linkType === 'url' ? (
        <TextInput label='آدرس (https)' ltr placeholder='https://' value={item.linkValue} onChange={(v) => onChange({ linkValue: v })} />
      ) : (
        <div />
      )}
    </div>
  );
}

export default function AdminSettings() {
  const { categories } = useHome();
  const [form, setForm] = useState(null);
  const [state, setState] = useState('loading');
  const [errorText, setErrorText] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    setState('loading');
    try {
      const data = await call('adminGetSettings', {});
      setForm(toForm(data || {}));
      setState('ready');
    } catch (err) {
      setErrorText(errorMessage(err));
      setState('error');
    }
  }

  useEffect(() => {
    load();
  }, []);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const setPay = (key, field, value) => setForm((f) => ({ ...f, [key]: { ...f[key], [field]: value } }));
  const patchItem = (key, index, patch) =>
    setForm((f) => ({ ...f, [key]: f[key].map((it, i) => (i === index ? { ...it, ...patch } : it)) }));
  const addItem = (key, make, max) =>
    setForm((f) => (f[key].length >= max ? f : { ...f, [key]: [...f[key], make()] }));
  const removeItem = (key, index) => setForm((f) => ({ ...f, [key]: f[key].filter((_, i) => i !== index) }));
  const moveItem = (key, index, dir) =>
    setForm((f) => {
      const list = [...f[key]];
      const to = index + dir;
      if (to < 0 || to >= list.length) return f;
      [list[index], list[to]] = [list[to], list[index]];
      return { ...f, [key]: list };
    });

  async function save() {
    if (saving || !form) return;
    setSaving(true);
    try {
      await call('adminSaveSettings', toPayload(form), { timeout: 30000 });
      showToast('تنظیمات ذخیره شد');
      loadHome({ force: true });
    } catch (err) {
      showToast(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const header = (
    <div className='mb-4 flex items-center gap-3'>
      <Link to={ROUTES.admin} className='tap grid size-10 place-items-center rounded-full border border-black/10 bg-white' aria-label='بازگشت'>
        <ArrowRight size={18} />
      </Link>
      <h1 className='text-xl font-extrabold text-ink'>تنظیمات فروشگاه</h1>
    </div>
  );

  if (state === 'loading') {
    return (
      <div className='shell py-4'>
        {header}
        <div className='skeleton h-40 rounded-card' />
      </div>
    );
  }

  if (state === 'error' || !form) {
    return (
      <div className='shell py-4'>
        {header}
        <p className='mb-3 text-sm text-muted'>{errorText || 'خطا در دریافت تنظیمات'}</p>
        <button type='button' className='btn btn-navy' onClick={load}>
          تلاش دوباره
        </button>
      </div>
    );
  }

  const noRate = !form.toman_per_afn.trim();

  return (
    <div className='shell space-y-4 py-4 pb-safe'>
      {header}

      <Section title='عمومی'>
        <TextInput label='نام فروشگاه' value={form.shop_name} onChange={(v) => set('shop_name', v)} />
        <TextInput label='متن پشتیبانی' rows={2} value={form.support_text} onChange={(v) => set('support_text', v)} />
        <TextInput
          label='آدرس Mini App'
          ltr
          placeholder='https://app123.tgcloud.ai/'
          hint='بعد از اولین deploy در لاگ چاپ می‌شود. دکمه ورود به فروشگاه در ربات از همین می‌آید.'
          value={form.webapp_url}
          onChange={(v) => set('webapp_url', v)}
        />
        <TextInput label='هزینه ارسال (تومان)' ltr inputMode='numeric' value={form.shipping_fee} onChange={(v) => set('shipping_fee', v)} />
      </Section>

      <Section title='ارز' hint='قیمت پایه همه محصولات به تومان است.'>
        <Field label='ارز پیش‌فرض'>
          <select className={inputCls} value={form.default_currency} onChange={(e) => set('default_currency', e.target.value)}>
            <option value='IRT'>تومان</option>
            <option value='AFN'>افغانی</option>
          </select>
        </Field>
        <TextInput
          label='نرخ: هر ۱ افغانی چند تومان؟'
          ltr
          inputMode='decimal'
          hint='بدون نرخ، قیمت افغانی نمایش داده نمی‌شود. مبلغ افغانی به بالا و به مضرب ۱۰ گرد می‌شود.'
          value={form.toman_per_afn}
          onChange={(v) => set('toman_per_afn', v)}
        />
        {noRate && form.default_currency === 'AFN' ? (
          <p className='text-xs text-red'>ارز پیش‌فرض افغانی است ولی نرخی ثبت نشده است.</p>
        ) : null}
      </Section>

      <Section title='مقصد پرداخت — تومان' hint='شماره کارت یا حسابی که مشتری تومانی به آن واریز می‌کند.'>
        <TextInput label='شماره کارت' ltr inputMode='numeric' value={form.pay_irt.number} onChange={(v) => setPay('pay_irt', 'number', v)} />
        <TextInput label='نام دارنده' value={form.pay_irt.holder} onChange={(v) => setPay('pay_irt', 'holder', v)} />
        <TextInput label='بانک' value={form.pay_irt.bank} onChange={(v) => setPay('pay_irt', 'bank', v)} />
      </Section>

      <Section title='مقصد پرداخت — افغانی' hint='شماره حساب، کیف پول یا شماره‌ای که مشتری افغانی به آن پرداخت می‌کند.'>
        <TextInput label='شماره حساب / کیف پول' ltr value={form.pay_afn.number} onChange={(v) => setPay('pay_afn', 'number', v)} />
        <TextInput label='نام دارنده' value={form.pay_afn.holder} onChange={(v) => setPay('pay_afn', 'holder', v)} />
        <TextInput label='بانک یا سرویس' value={form.pay_afn.bank} onChange={(v) => setPay('pay_afn', 'bank', v)} />
        <TextInput label='توضیح اضافه (اختیاری)' rows={2} value={form.pay_afn.note} onChange={(v) => setPay('pay_afn', 'note', v)} />
      </Section>

      <Section
        title={`اسلایدهای صفحه اصلی (${form.slides.length} از ${MAX_SLIDES})`}
        hint='ترتیب نمایش همان ترتیب این لیست است. هر اسلاید باید تصویر یا عنوان داشته باشد.'
        action={
          <button type='button' className='btn btn-navy' disabled={form.slides.length >= MAX_SLIDES} onClick={() => addItem('slides', emptySlide, MAX_SLIDES)}>
            <Plus size={16} /> افزودن
          </button>
        }
      >
        {form.slides.length === 0 ? <p className='text-sm text-muted'>اسلایدی ثبت نشده؛ یک اسلاید پیش‌فرض با نام فروشگاه نمایش داده می‌شود.</p> : null}
        {form.slides.map((s, i) => (
          <div key={i} className='space-y-3 rounded-2xl border border-black/10 p-3'>
            <div className='flex items-center justify-between'>
              <span className='text-sm font-bold text-ink'>اسلاید {i + 1}</span>
              <ItemTools index={i} count={form.slides.length} onMove={(d) => moveItem('slides', i, d)} onRemove={() => removeItem('slides', i)} />
            </div>
            <ImagePicker value={s.image} onChange={(img) => patchItem('slides', i, { image: img })} />
            <TextInput label='برچسب کوچک (مثلاً کلکسیون جدید)' value={s.eyebrow} onChange={(v) => patchItem('slides', i, { eyebrow: v })} />
            <TextInput label='عنوان' value={s.title} onChange={(v) => patchItem('slides', i, { title: v })} />
            <TextInput label='زیرعنوان' rows={2} value={s.subtitle} onChange={(v) => patchItem('slides', i, { subtitle: v })} />
            <TextInput label='متن دکمه' value={s.buttonText} onChange={(v) => patchItem('slides', i, { buttonText: v })} />
            <LinkFields item={s} categories={categories} onChange={(p) => patchItem('slides', i, p)} />
          </div>
        ))}
      </Section>

      <Section
        title={`بنرهای تبلیغاتی (${form.promos.length} از ${MAX_PROMOS})`}
        hint='دو بنر پایین صفحه اصلی. اگر بنری نگذارید این بخش نمایش داده نمی‌شود.'
        action={
          <button type='button' className='btn btn-navy' disabled={form.promos.length >= MAX_PROMOS} onClick={() => addItem('promos', emptyPromo, MAX_PROMOS)}>
            <Plus size={16} /> افزودن
          </button>
        }
      >
        {form.promos.map((p, i) => (
          <div key={i} className='space-y-3 rounded-2xl border border-black/10 p-3'>
            <div className='flex items-center justify-between'>
              <span className='text-sm font-bold text-ink'>بنر {i + 1}</span>
              <ItemTools index={i} count={form.promos.length} onMove={(d) => moveItem('promos', i, d)} onRemove={() => removeItem('promos', i)} />
            </div>
            <Field label='رنگ‌بندی'>
              <select className={inputCls} value={p.theme} onChange={(e) => patchItem('promos', i, { theme: e.target.value })}>
                <option value='dark'>سرمه‌ای</option>
                <option value='light'>روشن</option>
              </select>
            </Field>
            <ImagePicker value={p.image} onChange={(img) => patchItem('promos', i, { image: img })} />
            <TextInput label='برچسب کوچک' value={p.eyebrow} onChange={(v) => patchItem('promos', i, { eyebrow: v })} />
            <TextInput label='عنوان' value={p.title} onChange={(v) => patchItem('promos', i, { title: v })} />
            <TextInput label='متن' rows={2} value={p.text} onChange={(v) => patchItem('promos', i, { text: v })} />
            <TextInput label='متن دکمه' value={p.buttonText} onChange={(v) => patchItem('promos', i, { buttonText: v })} />
            <LinkFields item={p} categories={categories} onChange={(q) => patchItem('promos', i, q)} />
          </div>
        ))}
      </Section>

      <Section
        title='آمار زیر اسلاید (اختیاری)'
        hint='فقط آمار واقعی بنویسید. اگر خالی بماند نمایش داده نمی‌شود.'
        action={
          <button type='button' className='btn btn-outline' disabled={form.hero_stats.length >= MAX_STATS} onClick={() => addItem('hero_stats', emptyStat, MAX_STATS)}>
            <Plus size={16} /> افزودن
          </button>
        }
      >
        {form.hero_stats.map((x, i) => (
          <div key={i} className='flex items-end gap-2'>
            <div className='w-28'>
              <TextInput label='مقدار' value={x.value} onChange={(v) => patchItem('hero_stats', i, { value: v })} />
            </div>
            <div className='flex-1'>
              <TextInput label='عنوان' value={x.label} onChange={(v) => patchItem('hero_stats', i, { label: v })} />
            </div>
            <button type='button' className='tap grid size-10 place-items-center rounded-full border border-black/10 bg-white text-red' onClick={() => removeItem('hero_stats', i)} aria-label='حذف'>
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </Section>

      <div className='sticky bottom-20 z-20 lg:bottom-4'>
        <button type='button' className='btn btn-navy w-full shadow-soft' disabled={saving} onClick={save}>
          <Save size={18} /> {saving ? 'در حال ذخیره...' : 'ذخیره تنظیمات'}
        </button>
      </div>
    </div>
  );
}
