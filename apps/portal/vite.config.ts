import { sveltekit } from '@sveltejs/kit/vite';
import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      sveltekit({
        preprocess: vitePreprocess(),
        adapter: adapter({ out: process.env.BUILD_DIRECTORY ?? '.output' })
        // NOTE: `paths.origin` intentionally omitted so that SvelteKit derives the
        // self-origin from the incoming request URL at runtime. This makes the app
        // work behind any reverse proxy (Caddy, etc.) without rebuilding for each
        // public URL. The CSRF check then compares the Origin header to the actual
        // host the user sees, not a hardcoded value baked in at build time.
      })
    ],
    build: { target: 'es2022', sourcemap: false },
    // The portal ships plain CSS; without an inline config Vite walks up to the
    // repository root and loads the Next.js PostCSS config (Tailwind) from there.
    css: { postcss: {} }
  };
});
