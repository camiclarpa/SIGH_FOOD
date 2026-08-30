// =============================================================================
// Datos iniciales del programa B2C
// =============================================================================
//
// Un motor de fidelización sin insignias ni segmentos definidos no hace nada:
// las pantallas salen vacías y no hay forma de saber si funciona. Esto siembra
// el catálogo inicial, pensado para el producto real (líneas sensoriales, bares,
// horarios de consumo), no como relleno.
//
// Es idempotente: se puede ejecutar las veces que haga falta.
//
//   node scripts/sembrar-b2c.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, '../../..');
const require = createRequire(path.join(RAIZ, 'package.json'));
const postgres = require('postgres');

const env = fs.readFileSync(path.join(AQUI, '..', '.env.local'), 'utf8');
const url = env.match(/^DATABASE_URL=(.+)$/m)[1].trim();

// -----------------------------------------------------------------------------
// Insignias
// -----------------------------------------------------------------------------
const INSIGNIAS = [
  {
    codigo: 'primer_bocazo', nombre: 'Primer Bocazo', icono: '1',
    descripcion: 'Registraste tu primer momento sensorial.',
    criterio: 'escaneos_totales', umbral: 1, puntos: 50,
  },
  {
    codigo: 'habitual', nombre: 'Habitual', icono: '5',
    descripcion: 'Cinco momentos sensoriales registrados.',
    criterio: 'escaneos_totales', umbral: 5, puntos: 100,
  },
  {
    codigo: 'catador_leyenda', nombre: 'Catador Leyenda', icono: 'L',
    descripcion: 'Veinte momentos. Ya eres parte del paisaje.',
    criterio: 'escaneos_totales', umbral: 20, puntos: 500,
  },
  {
    codigo: 'paladar_curioso', nombre: 'Paladar Curioso', icono: '3',
    descripcion: 'Probaste tres líneas sensoriales distintas.',
    criterio: 'lineas_distintas', umbral: 3, puntos: 150,
  },
  {
    codigo: 'paladar_completo', nombre: 'Paladar Completo', icono: '5',
    descripcion: 'Probaste las cinco líneas. Nada se te escapa.',
    criterio: 'lineas_distintas', umbral: 5, puntos: 400,
  },
  {
    codigo: 'trotabares', nombre: 'Trotabares', icono: 'T',
    descripcion: 'Consumiste en tres bares distintos.',
    criterio: 'bares_distintos', umbral: 3, puntos: 200,
  },
  {
    codigo: 'explorador_urbano', nombre: 'Explorador Urbano', icono: 'E',
    descripcion: 'Cinco bares distintos. Conoces la ciudad.',
    criterio: 'bares_distintos', umbral: 5, puntos: 350,
  },
  {
    codigo: 'ave_nocturna', nombre: 'Ave Nocturna', icono: 'N',
    // La franja cruza la medianoche: valorDelCriterio lo contempla.
    descripcion: 'Tres momentos entre las 10 de la noche y las 4 de la madrugada.',
    criterio: 'escaneos_en_franja', umbral: 3, parametro: '22-4', puntos: 150,
  },
  {
    codigo: 'del_almuerzo', nombre: 'Del Almuerzo', icono: 'A',
    descripcion: 'Tres momentos entre las 12 y las 3 de la tarde.',
    criterio: 'escaneos_en_franja', umbral: 3, parametro: '12-15', puntos: 150,
  },
  {
    codigo: 'embajador', nombre: 'Embajador', icono: 'R',
    descripcion: 'Tres amigos tuyos escanearon por tu recomendación.',
    criterio: 'referidos_convertidos', umbral: 3, puntos: 500,
  },
];

// -----------------------------------------------------------------------------
// Segmentos dinámicos
// -----------------------------------------------------------------------------
//
// Guardan la REGLA, no la lista de comensales: si guardaran la lista, alguien
// que deja de cumplirla seguiría recibiendo campañas para siempre.
const SEGMENTOS = [
  {
    nombre: 'Noctámbulos', color: 'indigo',
    descripcion: 'Consumen de noche, entre las 22h y las 4h.',
    regla: { franjaDesde: 22, franjaHasta: 4 },
  },
  {
    nombre: 'Del almuerzo', color: 'amber',
    descripcion: 'Consumen a mediodía, entre las 12h y las 15h.',
    regla: { franjaDesde: 12, franjaHasta: 15 },
  },
  {
    nombre: 'Amantes del picante', color: 'red',
    descripcion: 'Su línea dominante es Spicy Volcano.',
    regla: { lineaProducto: 'spicy_volcano' },
  },
  {
    nombre: 'Perfil dulce', color: 'pink',
    descripcion: 'Su línea dominante es Sweet Craft.',
    regla: { lineaProducto: 'sweet_craft' },
  },
  {
    nombre: 'Recurrentes', color: 'emerald',
    descripcion: 'Cinco o más momentos registrados.',
    regla: { minEscaneos: 5 },
  },
  {
    nombre: 'En riesgo de olvido', color: 'orange',
    // El corazón del re-engagement: 15 días sin escanear.
    descripcion: 'Llevan más de 15 días sin registrar un momento.',
    regla: { diasInactivo: 15 },
  },
  {
    nombre: 'Dormidos', color: 'slate',
    descripcion: 'Más de 45 días sin actividad.',
    regla: { diasInactivo: 45 },
  },
];

// -----------------------------------------------------------------------------
// Secuencias de mensajería
// -----------------------------------------------------------------------------
const SECUENCIAS = [
  {
    name: 'Encuesta post-consumo',
    trigger: 'first_purchase',
    channel: 'whatsapp',
    delayHours: 1,
    status: 'draft',
    targetSegment: null,
    template:
      'Hola {{nombre}}, gracias por probar {{linea}} en {{bar}}. ' +
      'En 10 segundos: del 1 al 5, ¿qué tal estuvo? Responde con el número y te damos 20 puntos.',
  },
  {
    name: 'Reactivación 15 días',
    trigger: 'inactive_30_days',
    channel: 'whatsapp',
    delayHours: 0,
    status: 'draft',
    targetSegment: 'En riesgo de olvido',
    template:
      'Hola {{nombre}}, hace {{dias}} días que no nos vemos. ' +
      'Hoy hay {{linea}} en bares cerca de {{zona}}. Tienes {{puntos}} puntos esperándote.',
  },
  {
    name: 'Bienvenida al programa',
    trigger: 'signup',
    channel: 'whatsapp',
    delayHours: 0,
    status: 'draft',
    targetSegment: null,
    template:
      'Bienvenido a SIGH_FOOD, {{nombre}}. Acabas de ganar tu primera insignia y {{puntos}} puntos. ' +
      'Cada momento sensorial que registres suma.',
  },
  {
    name: 'Subida de nivel',
    trigger: 'referral_conversion',
    channel: 'whatsapp',
    delayHours: 0,
    status: 'draft',
    targetSegment: null,
    template: 'Subiste a {{nivel}}, {{nombre}}. Te faltan {{faltan}} momentos para el siguiente.',
  },
];

// -----------------------------------------------------------------------------

const sql = postgres(url, { max: 1, idle_timeout: 10, connect_timeout: 20 });

try {
  console.log('=== INSIGNIAS ===');
  let nuevas = 0;
  for (const i of INSIGNIAS) {
    const r = await sql`
      INSERT INTO badges (codigo, nombre, descripcion, icono, criterio, umbral, parametro, puntos_otorgados, activa)
      VALUES (${i.codigo}, ${i.nombre}, ${i.descripcion}, ${i.icono}, ${i.criterio}::badge_criterio,
              ${i.umbral}, ${i.parametro ?? null}, ${i.puntos}, true)
      ON CONFLICT (codigo) DO NOTHING
      RETURNING codigo
    `;
    if (r.length) { nuevas++; console.log(`  + ${i.nombre}`); }
  }
  console.log(`  ${nuevas} nuevas, ${INSIGNIAS.length - nuevas} ya existían`);

  console.log('\n=== SEGMENTOS ===');
  nuevas = 0;
  for (const s of SEGMENTOS) {
    const r = await sql`
      INSERT INTO segments (nombre, descripcion, tipo, regla, color, activo)
      VALUES (${s.nombre}, ${s.descripcion}, 'dinamico'::segmento_tipo,
              ${sql.json(s.regla)}, ${s.color}, true)
      ON CONFLICT (nombre) DO NOTHING
      RETURNING nombre
    `;
    if (r.length) { nuevas++; console.log(`  + ${s.nombre}`); }
  }
  console.log(`  ${nuevas} nuevos, ${SEGMENTOS.length - nuevas} ya existían`);

  console.log('\n=== SECUENCIAS DE MENSAJERIA ===');
  nuevas = 0;
  for (const s of SECUENCIAS) {
    const existe = await sql`SELECT 1 FROM automation_sequences WHERE name = ${s.name}`;
    if (existe.length) continue;
    await sql`
      INSERT INTO automation_sequences (name, trigger, channel, status, template, delay_hours, target_segment)
      VALUES (${s.name}, ${s.trigger}::automation_trigger, ${s.channel}::automation_channel,
              ${s.status}::automation_status, ${s.template}, ${s.delayHours}, ${s.targetSegment})
    `;
    nuevas++;
    console.log(`  + ${s.name}  (${s.channel}, ${s.trigger})`);
  }
  console.log(`  ${nuevas} nuevas, ${SECUENCIAS.length - nuevas} ya existían`);
  console.log('\n  Se crean en estado borrador a propósito: activarlas empieza a');
  console.log('  enviar mensajes reales a comensales reales.');

  const [{ n: nb }] = await sql`SELECT count(*)::int n FROM badges`;
  const [{ n: ns }] = await sql`SELECT count(*)::int n FROM segments`;
  const [{ n: nq }] = await sql`SELECT count(*)::int n FROM automation_sequences`;
  console.log(`\nTotal: ${nb} insignias, ${ns} segmentos, ${nq} secuencias.`);
} finally {
  await sql.end({ timeout: 10 });
}
