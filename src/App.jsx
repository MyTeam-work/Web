import { Component, Suspense, lazy, useEffect } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { ROUTES, tg, useHome, useToast } from './store.js';

// Pages are discovered by glob so the app builds regardless of which files exist yet.
const pageModules = import.meta.glob('./pages/**/*.jsx');
const layoutModules = import.meta.glob('./components/{Header,Footer,BottomNav}.jsx', { eager: true });

const Header = layoutModules['./components/Header.jsx']?.default;
const Footer = layoutModules['./components/Footer.jsx']?.default;
const BottomNav = layoutModules['./components/BottomNav.jsx']?.default;

// File name -> route patterns. Unknown files fall back to '/<lowercase name>'.
const ROUTE_PATTERNS = {
  Home: ['/'],
  Product: ['/product/:id'],
  Cart: ['/cart'],
  Checkout: ['/checkout'],
  Orders: ['/orders'],
  Support: ['/support'],
  AdminDashboard: ['/admin'],
  AdminProducts: ['/admin/products'],
  AdminProductForm: ['/admin/products/new', '/admin/products/:id'],
  AdminOrders: ['/admin/orders'],
  AdminOrderDetail: ['/admin/orders/:id'],
  AdminSettings: ['/admin/settings'],
};

const PAGES = Object.entries(pageModules).flatMap(([path, loader]) => {
  const name = path.split('/').pop().replace(/\.jsx$/, '');
  const admin = path.includes('/pages/admin/');
  const patterns = ROUTE_PATTERNS[name] ?? [`/${name.toLowerCase()}`];
  const Page = lazy(loader);
  return patterns.map((pattern) => ({ pattern, Page, admin, name }));
});

const HAS_SUPPORT = PAGES.some((p) => p.name === 'Support');

function PageSpinner() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-label="در حال بارگذاری">
      <span className="size-9 animate-spin rounded-full border-4 border-navy-700/15 border-t-navy-700" />
    </div>
  );
}

function NotFound() {
  return (
    <div className="shell py-20 text-center">
      <p className="text-lg font-bold">صفحه پیدا نشد</p>
      <p className="mt-2 text-muted">آدرس درخواستی وجود ندارد یا هنوز آماده نشده است.</p>
      <Link to={ROUTES.home} className="btn btn-navy mt-6">
        بازگشت به خانه
      </Link>
    </div>
  );
}

// UI guard only; real security is enforced by requireAdmin in the endpoints.
function AdminGate({ children }) {
  const { isAdmin, loading } = useHome();
  if (loading) return <PageSpinner />;
  if (!isAdmin) return <Navigate to={ROUTES.home} replace />;
  return children;
}

class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error('UI error', error && error.message);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="shell py-20 text-center">
        <p className="text-lg font-bold">مشکلی در نمایش صفحه پیش آمد</p>
        <button type="button" className="btn btn-navy mt-6" onClick={() => window.location.reload()}>
          تلاش دوباره
        </button>
      </div>
    );
  }
}

// Telegram BackButton: visible everywhere except the plain home page.
function useBackButton() {
  const location = useLocation();
  const navigate = useNavigate();
  const atRoot = location.pathname === '/' && !location.search;

  useEffect(() => {
    const back = tg() && tg().BackButton;
    if (!back) return undefined;
    const handler = () => {
      const idx = window.history.state && window.history.state.idx;
      if (typeof idx === 'number' && idx > 0) navigate(-1);
      else navigate(ROUTES.home, { replace: true });
    };
    back.onClick(handler);
    return () => back.offClick(handler);
  }, [navigate]);

  useEffect(() => {
    const back = tg() && tg().BackButton;
    if (!back) return;
    if (atRoot) back.hide();
    else back.show();
  }, [atRoot]);
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

// Floating "contact us" button (DESIGN.md section 4, item 9). Bottom-left in RTL = end side.
function FloatingSupport() {
  const { pathname } = useLocation();
  if (!HAS_SUPPORT) return null;
  if (pathname.startsWith('/support') || pathname.startsWith('/checkout') || pathname.startsWith('/admin')) {
    return null;
  }
  const offset = BottomNav ? 'bottom-[calc(5rem_+_var(--safe-bottom))]' : 'bottom-[calc(1.25rem_+_var(--safe-bottom))]';
  return (
    <Link
      to={ROUTES.support}
      aria-label="تماس با ما"
      className={`fixed end-4 z-40 inline-flex h-12 items-center gap-2 rounded-full bg-navy-700 px-3.5 text-sm font-bold text-white shadow-soft ring-2 ring-white active:scale-95 ${offset} lg:bottom-6`}
    >
      <MessageCircle size={20} aria-hidden="true" />
      <span className="hidden sm:inline">تماس با ما</span>
    </Link>
  );
}

function Toast() {
  const toast = useToast();
  if (!toast) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 lg:bottom-8">
      <div key={toast.id} role="status" aria-live="polite" className="rounded-full bg-ink px-4 py-2.5 text-sm text-white shadow-soft">
        {toast.message}
      </div>
    </div>
  );
}

export default function App() {
  const location = useLocation();
  const { shopName } = useHome();
  useBackButton();

  useEffect(() => {
    document.title = shopName || 'فروشگاه';
  }, [shopName]);

  return (
    <div className="flex min-h-dvh flex-col bg-page text-ink">
      <ScrollToTop />
      {Header ? <Header /> : null}
      <main className={`flex-1 ${BottomNav ? 'pb-24 lg:pb-10' : 'pb-10'}`}>
        <ErrorBoundary key={location.pathname}>
          <Suspense fallback={<PageSpinner />}>
            <Routes>
              {PAGES.map(({ pattern, Page, admin, name }) => (
                <Route
                  key={`${name}:${pattern}`}
                  path={pattern}
                  element={
                    admin ? (
                      <AdminGate>
                        <Page />
                      </AdminGate>
                    ) : (
                      <Page />
                    )
                  }
                />
              ))}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>
      {Footer ? <Footer /> : null}
      {BottomNav ? <BottomNav /> : null}
      <FloatingSupport />
      <Toast />
    </div>
  );
}
