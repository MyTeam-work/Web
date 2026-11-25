// Image component: supports { full, thumb } (file_ids served by getImage) and { url }.
// - In-memory LRU cache of data URLs (shared by the whole app) + in-flight de-duplication
// - At most MAX_PARALLEL getImage calls at the same time
// - Lazy: file images load when near the viewport (or immediately with `eager`)
import { memo, useEffect, useRef, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { getImage } from '../api.js';

const MAX_PARALLEL = 4;
const MAX_ENTRIES = 80;
const MAX_CHARS = 36_000_000; // total data URL characters kept in memory

const cache = new Map(); // key -> dataUrl (insertion order = LRU order)
const inflight = new Map(); // key -> Promise<dataUrl>
let cacheChars = 0;

const queue = [];
let active = 0;

function peek(key) {
  return cache.get(key);
}

function remember(key, url) {
  if (cache.has(key)) {
    cacheChars -= cache.get(key).length;
    cache.delete(key);
  }
  cache.set(key, url);
  cacheChars += url.length;
  while ((cache.size > MAX_ENTRIES || cacheChars > MAX_CHARS) && cache.size > 1) {
    const [oldKey, oldUrl] = cache.entries().next().value;
    cache.delete(oldKey);
    cacheChars -= oldUrl.length;
  }
}

function pump() {
  while (active < MAX_PARALLEL && queue.length > 0) {
    const job = queue.shift();
    active += 1;
    job
      .task()
      .then(job.resolve, job.reject)
      .finally(() => {
        active -= 1;
        pump();
      });
  }
}

function enqueue(task, priority) {
  return new Promise((resolve, reject) => {
    const job = { task, resolve, reject };
    if (priority) queue.unshift(job);
    else queue.push(job);
    pump();
  });
}

/** Resolves with a data URL for a stored file id (cached). */
export function loadImageData(fileId, size = 'thumb', priority = false) {
  const key = `${size}:${fileId}`;
  const hit = peek(key);
  if (hit) return Promise.resolve(hit);
  if (inflight.has(key)) return inflight.get(key);
  const promise = enqueue(() => getImage(fileId, size), priority)
    .then((url) => {
      remember(key, url);
      return url;
    })
    .finally(() => {
      inflight.delete(key);
    });
  inflight.set(key, promise);
  return promise;
}

function sourceOf(image, size) {
  if (!image) return null;
  if (typeof image === 'string') {
    return /^https?:\/\//i.test(image) ? { kind: 'url', value: image } : null;
  }
  if (typeof image !== 'object') return null;
  if (typeof image.url === 'string' && image.url) return { kind: 'url', value: image.url };
  const id = size === 'full' ? image.full || image.thumb : image.thumb || image.full;
  if (typeof id === 'string' && id) return { kind: 'file', value: id };
  return null;
}

const TONES = { tile: 'bg-tile', navy: 'bg-navy-900', none: '' };

/**
 * Props: image ({ full, thumb } | { url } | null), size ('thumb' | 'full'), alt, className (wrapper:
 * give it the aspect ratio / size), fit ('cover' | 'contain'), position (CSS object-position),
 * eager (load now, high priority), tone ('tile' | 'navy' | 'none'), dim (faded, e.g. out of stock).
 */
function Img({ image, size = 'thumb', alt = '', className = '', fit = 'cover', position, eager = false, tone = 'tile', dim = false }) {
  const source = sourceOf(image, size);
  const sKey = source ? `${source.kind}:${source.value}:${size}` : '';
  const cacheKey = source && source.kind === 'file' ? `${size}:${source.value}` : '';

  const wrapRef = useRef(null);
  const [visible, setVisible] = useState(eager);
  const [loaded, setLoaded] = useState({ key: '', src: '', failed: false });
  const [readyKey, setReadyKey] = useState('');

  useEffect(() => {
    if (eager) setVisible(true);
  }, [eager]);

  // Lazy start: only when the wrapper gets close to the viewport.
  useEffect(() => {
    if (visible || eager) return undefined;
    const node = wrapRef.current;
    if (!node) return undefined;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: '300px' },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [visible, eager]);

  // Fetch file images through getImage (cached).
  useEffect(() => {
    if (!source || source.kind !== 'file' || !(visible || eager)) return undefined;
    if (peek(cacheKey)) return undefined;
    let cancelled = false;
    loadImageData(source.value, size, eager)
      .then((url) => {
        if (!cancelled) setLoaded({ key: sKey, src: url, failed: false });
      })
      .catch(() => {
        if (!cancelled) setLoaded({ key: sKey, src: '', failed: true });
      });
    return () => {
      cancelled = true;
    };
  }, [sKey, visible, eager]);

  const entry = loaded.key === sKey ? loaded : null;
  const failed = !source || Boolean(entry && entry.failed);
  let src = '';
  if (source && !failed) {
    if (source.kind === 'url') src = source.value;
    else src = (entry && entry.src) || peek(cacheKey) || '';
  }
  const shown = Boolean(src) && readyKey === sKey;

  return (
    <div ref={wrapRef} className={`relative overflow-hidden ${TONES[tone] ?? TONES.tile} ${className}`}>
      {!shown && !failed && <div className="skeleton absolute inset-0" aria-hidden="true" />}
      {failed && (
        <div className="absolute inset-0 flex items-center justify-center text-muted/50" role="img" aria-label={alt || 'تصویر در دسترس نیست'}>
          <ImageOff className="size-1/4 min-h-5 min-w-5 max-h-10 max-w-10" aria-hidden="true" />
        </div>
      )}
      {src && !failed && (
        <img
          key={sKey}
          src={src}
          alt={alt}
          decoding="async"
          draggable={false}
          loading={eager ? 'eager' : 'lazy'}
          onLoad={() => setReadyKey(sKey)}
          onError={() => setLoaded({ key: sKey, src: '', failed: true })}
          style={position ? { objectPosition: position } : undefined}
          className={`absolute inset-0 size-full select-none transition-opacity duration-300 ${
            fit === 'contain' ? 'object-contain' : 'object-cover'
          } ${shown ? (dim ? 'opacity-40' : 'opacity-100') : 'opacity-0'}`}
        />
      )}
    </div>
  );
}

export default memo(Img);
