// Zonas de cobertura de domicilio.
//
// DATOS DE EJEMPLO: cambia nombres, costes y tiempos por los tuyos. Los alias
// son las palabras con las que la gente escribe esa zona en una direccion —
// nunca escriben el nombre oficial del barrio.
//
// Uso: node scripts/sembrar-zonas.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const RAIZ = path.resolve(import.meta.dirname, '..');
const postgres = createRequire(path.join(RAIZ, 'package.json'))('postgres');

function urlBaseDeDatos() {
  for (const f of ['apps/web/.env.local', '.env.local', '.env']) {
    const p = path.join(RAIZ, f);
    if (!fs.existsSync(p)) continue;
    const m = fs.readFileSync(p, 'utf8').match(/^DATABASE_URL=(.+)$/m);
    if (m) return m[1].trim();
  }
  throw new Error('No se encontro DATABASE_URL');
}

const sql = postgres(urlBaseDeDatos(), { max: 1, connect_timeout: 30 });

const ZONAS = [
  { nombre: 'Chapinero', costo: 5000, minutos: '20 a 30', minimo: 32000, orden: 1,
    alias: ['chapinero alto', 'chapinero', 'lourdes', 'marly'] },
  { nombre: 'Zona T', costo: 6000, minutos: '25 a 35', minimo: 32000, orden: 2,
    alias: ['zona t', 'zona rosa', 'calle 82', 'parque 93'] },
  { nombre: 'Chico', costo: 7000, minutos: '30 a 40', minimo: 45000, orden: 3,
    alias: ['chico', 'chico norte', 'calle 94', 'calle 100'] },
  { nombre: 'Usaquen', costo: 9000, minutos: '35 a 50', minimo: 60000, orden: 4,
    alias: ['usaquen', 'santa barbara', 'calle 116', 'calle 127'] },
];

try {
  for (const z of ZONAS) {
    await sql`
      INSERT INTO zonas_envio (nombre, costo_cop, minutos_estimados, minimo_cop, alias, orden)
      VALUES (${z.nombre}, ${z.costo}, ${z.minutos}, ${z.minimo}, ${sql.json(z.alias)}, ${z.orden})
      ON CONFLICT (nombre) DO UPDATE SET
        costo_cop = EXCLUDED.costo_cop,
        minutos_estimados = EXCLUDED.minutos_estimados,
        minimo_cop = EXCLUDED.minimo_cop,
        alias = EXCLUDED.alias,
        orden = EXCLUDED.orden`;
    console.log(`  ${z.nombre.padEnd(12)} $${z.costo.toLocaleString('es-CO')}  ${z.minutos} min  (${z.alias.length} alias)`);
  }
  const [{ n }] = await sql`SELECT count(*)::int n FROM zonas_envio WHERE activa = true`;
  console.log(`\n  ${n} zonas activas`);
} finally {
  await sql.end({ timeout: 10 });
}
