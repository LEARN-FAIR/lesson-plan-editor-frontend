import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'

// Standalone SPA build (deployed to Cloudflare Pages).
// The API base URL is provided at build time via VITE_API_URL.
// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
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
    },
})
