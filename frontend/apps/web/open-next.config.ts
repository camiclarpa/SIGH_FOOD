import { defineCloudflareConfig } from '@opennextjs/cloudflare';

// OJO: NO activar `default.minify` aquí. Se probó y rompe en producción el
// mecanismo interno de Next para cargar el "instrumentation hook" (falla con
// "An error occurred while loading the instrumentation hook" en TODAS las
// rutas, aunque el proyecto no tiene instrumentation.ts) — la minificación de
// OpenNext reescribe el registro de módulos que Next usa en runtime para eso.
// La minificación real que resuelve el tamaño del Worker va en wrangler.jsonc
// (`"minify": true`), que opera sobre el bundle ya compuesto y no toca esa
// tabla interna.
export default defineCloudflareConfig();
