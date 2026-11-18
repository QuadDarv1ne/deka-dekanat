import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      out: process.env.BUILD_DIRECTORY ?? '.output'
    }),
    paths: {
      origin: process.env.ORIGIN ?? 'http://127.0.0.1:5180'
    }
  }
};

export default config;
