import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

/**
 * Configuración de Vitest.
 *
 * Sin este archivo las suites fallaban antes de ejecutarse: no se resolvían
 * los alias `@/` ni `@sighfood/*`, no había DOM para los tests de componentes
 * y las APIs globales (`describe`, `beforeEach`) no estaban definidas.
 */
export default defineConfig({
  test: {
    // Los tests usan describe/it/expect/beforeEach sin importarlos.
    globals: true,
    // Varias suites tocan document, localStorage y navigator.
    environment: 'jsdom',
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
    exclude: [
      'node_modules/**',
      // Scripts de carga de k6: no corren bajo Vitest.
      'tests/load/**',
      'tests/load-test*.js',
    ],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@sighfood/domain': fileURLToPath(new URL('./packages/sighfood-domain', import.meta.url)),
      '@sighfood/ui': fileURLToPath(new URL('./packages/sighfood-ui', import.meta.url)),
      '@sighfood/crm-adapter': fileURLToPath(new URL('./packages/sighfood-crm-adapter', import.meta.url)),
    },
  },
});
