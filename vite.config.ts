import path from 'node:path'
import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Standalone SPA build (deployed to Cloudflare Pages).
// The API base URL is provided at build time via VITE_API_URL.
// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src/js'),
        },
    },
    // gray-matter (and its dependencies) expect a Node-style `global`.
    define: {
        global: 'globalThis',
    },
    optimizeDeps: {
        include: ['buffer'],
    },
    build: {
        outDir: 'dist',
        sourcemap: true,
    },
    server: {
        port: 5173,
        // In dev, proxy the API through the dev server so the frontend and backend
        // share one origin (http://localhost:5173) — mirroring production, where
        // editor. and api.editor.fairdata.education are same-site. This makes the
        // GitHub session cookie first-party, so /api/auth/status is authenticated.
        // Set VITE_API_URL=/api (see .env.development) so requests are relative.
        proxy: {
            '/api': {
                target: 'https://localhost',
                changeOrigin: true,
                // The local backend uses a self-signed certificate.
                secure: false,
            },
        },
    },
})
