import { sveltekit } from '@sveltejs/kit/vite';
import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      sveltekit({
        preprocess: vitePreprocess(),
        adapter: adapter({ out: process.env.BUILD_DIRECTORY ?? '.output' }),
        paths: { origin: process.env.ORIGIN ?? 'http://127.0.0.1:5180' }
      })
    ],
    build: { target: 'es2022', sourcemap: false }
  };
});
