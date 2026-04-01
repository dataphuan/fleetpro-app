import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode }) => {
  return {
    base: '/',
    server: {
      host: "::",
      port: 5173,
      hmr: {
        overlay: false,
      },
    },
    build: {
      sourcemap: false,
      minify: false,
      target: 'es2015', // Try different target
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            firebase: ['firebase/app', 'firebase/firestore', 'firebase/auth'],
            ui: ['lucide-react', 'date-fns', 'zod', 'react-hook-form', '@tanstack/react-query']
          }
        }
      }
    },
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});