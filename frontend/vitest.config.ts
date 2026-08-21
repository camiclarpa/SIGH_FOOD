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
    // El orden importa: Vite compara los alias en secuencia con startsWith, así
    // que las entradas más específicas tienen que ir ANTES que `@`.
    alias: {
      // La landing y el CRM son dos aplicaciones distintas que usan el mismo
      // prefijo `@/` para su propio `src`. Con un solo config de Vitest, `@`
      // solo puede apuntar a una — la landing, por historia.
      //
      // Estas dos entradas desambiguan lo justo para poder probar código del
      // CRM: `@crm/...` para importarlo desde los tests, y la ruta concreta que
      // los módulos del CRM usan entre sí. No hay conflicto porque la landing
      // no tiene un `src/lib/cloudflare`.
      '@/lib/cloudflare': fileURLToPath(new URL('./apps/web/src/lib/cloudflare.ts', import.meta.url)),
      // Mismo caso que cloudflare: lo importan módulos del CRM entre sí, y la
      // landing no tiene ningún `src/lib/fidelizacion` con el que chocar.
      '@/lib/fidelizacion': fileURLToPath(new URL('./apps/web/src/lib/fidelizacion.ts', import.meta.url)),
      '@crm': fileURLToPath(new URL('./apps/web/src', import.meta.url)),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // A `src`, igual que el tsconfig del CRM. Antes apuntaba a la raíz del
      // paquete, así que `@sighfood/domain/lib/observabilidad` se resolvía a
      // `packages/sighfood-domain/lib/...`, donde no hay nada. No lo notaba
      // nadie porque ningún test importaba el paquete todavía.
      '@sighfood/domain': fileURLToPath(new URL('./packages/sighfood-domain/src', import.meta.url)),
      '@sighfood/ui': fileURLToPath(new URL('./packages/sighfood-ui', import.meta.url)),
      '@sighfood/crm-adapter': fileURLToPath(new URL('./packages/sighfood-crm-adapter', import.meta.url)),
    },
  },
});
