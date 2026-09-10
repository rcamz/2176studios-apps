import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { ROUTES, TARGET } from 'virtual:app-routes';

// Restores the top of the page on navigation, except when the link carried a
// hash — the footer's About / Contact / Privacy links all point at anchors on
// one page, and scrolling to the top would land on the wrong section. The
// element does not exist until the new route has rendered, so this runs after
// paint and falls back to the top if the id is not found.
function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) { window.scrollTo(0, 0); return; }
    const el = document.getElementById(hash.slice(1));
    if (el) el.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        {ROUTES.map(({ path, Component }) => (
          <Route key={path} path={path} element={<Component />} />
        ))}
        {/* A standalone app has no index to fall back to, and a WebView can
            be handed a deep link for a route this build does not contain. */}
        {TARGET && <Route path="*" element={<Navigate to="/" replace />} />}
      </Routes>
    </BrowserRouter>
  );
}
