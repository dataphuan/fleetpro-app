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
      minify: 'esbuild',
      target: 'es2020',
      chunkSizeWarningLimit: 2000,
      outDir: 'dist',
      rollupOptions: {
        output: {
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              if (id.includes('firebase')) return 'firebase';
              if (id.includes('react')) return 'vendor';
              if (id.includes('lucide')) return 'ui';
              return 'vendor';
            }
            if (id.includes('pages')) {
              const match = id.match(/pages\/([^/]+)/);
              if (match) return `page-${match[1]}`;
            }
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