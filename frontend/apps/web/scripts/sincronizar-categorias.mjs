// =============================================================================
// Traer de Meta la categoría de cada plantilla
// =============================================================================
//
// POR QUÉ HAY QUE EJECUTARLO CADA CIERTO TIEMPO
// ---------------------------------------------
// Meta RECLASIFICA plantillas por su cuenta y sin avisar. Una aprobada como
// UTILITY puede pasar a MARKETING meses después si su texto deriva hacia lo
// promocional — basta con que alguien la edite y añada una oferta.
//
// A partir de ese momento los envíos empiezan a fallar con el error 131042 y en
// el CRM no hay nada que lo explique: la secuencia sigue diciendo "activa", el
// panel sigue contando elegibles, y no llega ningún mensaje.
//
// Este script pregunta a Meta cómo tiene clasificada cada plantilla y lo guarda
// en `automation_sequences.categoria_meta`, que es lo que mira lib/canal.ts para
// decidir si algo puede salir por WhatsApp o tiene que ir por Web Push.
//
// LO QUE HACE CON LAS QUE CAMBIAN
// -------------------------------
// Nada automático. Si una secuencia pasa a marketing, se avisa y se guarda el
// dato: a partir de ahí sale por push a quien lo tenga activado. NO se pausa la
// secuencia sola, porque apagar una campaña sin que nadie lo pida es una
// decisión de negocio, no de un script.

import fs from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, '../../..');
const require = createRequire(`${RAIZ}/package.json`);
const postgres = require('postgres');

function leerEnv(ruta) {
  if (!fs.existsSync(ruta)) return {};
  const texto = fs.readFileSync(ruta, 'utf8');
  const salida = {};
  for (const linea of texto.split(/\r?\n/)) {
    // El final NO se ancla: estos archivos se escriben en Windows y llevan \r.
    // Con /$/ no se leía ni una variable y el script decía que faltaban
    // credenciales que sí estaban — un error que apuntaba al sitio equivocado.
    const m = linea.match(/^([A-Z0-9_]+)=(.*)/);
    if (m) salida[m[1]] = m[2].trim();
  }
  return salida;
}

const env = {
  ...leerEnv(resolve(RAIZ, 'apps/web/.env.development.local')),
  ...leerEnv(resolve(RAIZ, 'apps/tienda/.env.development.local')),
};

const TOKEN = env.WHATSAPP_ACCESS_TOKEN;
const WABA = env.WHATSAPP_BUSINESS_ACCOUNT_ID;
const VERSION = env.META_API_VERSION || 'v19.0';

if (!TOKEN || !WABA) {
  console.log('Faltan WHATSAPP_ACCESS_TOKEN o WHATSAPP_BUSINESS_ACCOUNT_ID en .env.development.local');
  process.exit(1);
}

const sql = postgres(env.DATABASE_URL, { max: 1, connect_timeout: 60 });

/** Cómo llama Meta a cada categoría, y cómo la llamamos nosotros. */
const TRADUCCION = {
  UTILITY: 'utilidad',
  AUTHENTICATION: 'autenticacion',
  MARKETING: 'marketing',
};

try {
  console.log('Preguntando a Meta por las plantillas…\n');

  const url =
    `https://graph.facebook.com/${VERSION}/${WABA}/message_templates` +
    '?fields=name,category,status,language&limit=200';

  const respuesta = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
  const cuerpo = await respuesta.json();

  if (!respuesta.ok || cuerpo.error) {
    console.log(`Meta respondió ${respuesta.status}: ${cuerpo.error?.message ?? 'error'}`);
    process.exit(1);
  }

  const plantillas = cuerpo.data ?? [];
  console.log(`  ${plantillas.length} plantillas en la cuenta:\n`);

  for (const p of plantillas) {
    const nuestra = TRADUCCION[p.category?.toUpperCase()] ?? '(desconocida)';
    const marca = nuestra === 'marketing' ? '  <-- se cobra, no sale por WhatsApp' : '';
    console.log(`  ${p.name.padEnd(32)} ${p.status.padEnd(10)} ${nuestra}${marca}`);
  }

  console.log('\n=== ACTUALIZANDO LAS SECUENCIAS ===');

  const secuencias = await sql`
    SELECT id, name, meta_template_name, categoria_meta
      FROM automation_sequences
     WHERE meta_template_name IS NOT NULL AND meta_template_name <> ''`;

  if (secuencias.length === 0) {
    console.log('  Ninguna secuencia tiene plantilla de Meta configurada.');
    console.log('  Con Web Push eso ya no es un problema: saldrán por notificación.');
  }

  let cambiadas = 0;

  for (const s of secuencias) {
    const enMeta = plantillas.find((p) => p.name === s.meta_template_name);

    if (!enMeta) {
      // Que Meta no la conozca es más grave que un cambio de categoría: significa
      // que la secuencia apunta a una plantilla que no existe.
      console.log(`  ${s.name}: Meta no conoce "${s.meta_template_name}"`);
      if (s.categoria_meta !== null) {
        await sql`UPDATE automation_sequences SET categoria_meta = NULL WHERE id = ${s.id}`;
        cambiadas++;
      }
      continue;
    }

    const nueva = TRADUCCION[enMeta.category?.toUpperCase()] ?? null;

    if (nueva === s.categoria_meta) {
      console.log(`  ${s.name}: sin cambios (${nueva ?? 'desconocida'})`);
      continue;
    }

    await sql`UPDATE automation_sequences SET categoria_meta = ${nueva} WHERE id = ${s.id}`;
    cambiadas++;

    const antes = s.categoria_meta ?? 'sin averiguar';
    console.log(`  ${s.name}: ${antes} -> ${nueva ?? 'desconocida'}`);

    if (nueva === 'marketing') {
      console.log('       Esta ya NO puede salir por WhatsApp. Irá por Web Push');
      console.log('       a quien tenga los avisos activados.');
    }
  }

  console.log(`\n${cambiadas} secuencia(s) actualizada(s).`);
} finally {
  await sql.end({ timeout: 10 });
}
