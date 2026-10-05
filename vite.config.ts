import { defineConfig } from 'vite';

// Relative base so the build works from any path, including https://<user>.github.io/tennis/.
export default defineConfig({ base: './' });
