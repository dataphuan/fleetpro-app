import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ErrorBoundary } from "./components/shared/ErrorBoundary";

createRoot(document.getElementById("root")!).render(
    <ErrorBoundary>
        <App />
    </ErrorBoundary>
);

if ('serviceWorker' in navigator) {
    if (import.meta.env.PROD) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js').catch(() => {
                // Silent failure: app should still work even when SW registration fails.
            });
        });
    } else {
        // Prevent stale caches/service workers from interfering with Vite HMR in local dev.
        navigator.serviceWorker.getRegistrations().then((regs) => {
            regs.forEach((reg) => {
                reg.unregister().catch(() => {
                    // Best effort cleanup only.
                });
            });
        });

        if ('caches' in window) {
            caches.keys().then((keys) => {
                keys.forEach((key) => {
                    caches.delete(key).catch(() => {
                        // Best effort cleanup only.
                    });
                });
            });
        }
    }
}
