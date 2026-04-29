import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const proxyTarget = process.env.VITE_PROXY_TARGET || 'http://localhost:8000';

const proxiedPaths = [
  '/health',
  '/livez',
  '/hiring',
  '/loan',
  '/social',
  '/feedback',
  '/insights',
  '/files',
  '/mitigation',
  '/shap',
  '/models',
];

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: Object.fromEntries(
      proxiedPaths.map((path) => [
        path,
        {
          target: proxyTarget,
          changeOrigin: true,
        },
      ])
    ),
  },
});
