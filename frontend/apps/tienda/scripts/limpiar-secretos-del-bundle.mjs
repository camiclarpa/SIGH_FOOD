#!/usr/bin/env node
// =============================================================================
// Sacar los secretos del bundle antes de desplegar
// =============================================================================
//
// EL PROBLEMA
// -----------
// `opennextjs-cloudflare` serializa TODO process.env dentro de
// .open-next/cloudflare/next-env.mjs, y ese archivo viaja al Worker. Cualquier
// variable que exista al compilar acaba en texto plano en el paquete
// desplegado.
//
// Se descubrió en este proyecto: los tres Workers llevaban dentro DATABASE_URL
// con la contraseña de Neon, AUTH_SECRET, el token de Meta y las claves de
// media docena de servicios. Eso hacía decorativo todo el `wrangler secret put`
// que se había hecho — el secreto estaba en el bundle igualmente.
//
// LO QUE YA SE ARREGLÓ EN EL ORIGEN
// ---------------------------------
// Los secretos propios de esta aplicación viven en `.env.development.local`,
// que Next SOLO lee con NODE_ENV=development. Al compilar para producción no
// existen, así que no se hornean. En el Worker llegan por `wrangler secret put`,
// que es para lo que está.
//
// LO QUE ARREGLA ESTE SCRIPT
// --------------------------
// Quedan variables que vienen del `.env` de la RAÍZ del monorepo — las de la
// landing: Twilio, Resend, Pipedrive, UploadThing, Stripe. OpenNext detecta el
// monorepo y las hereda aunque esta aplicación no use ninguna.
//
// Moverlas de sitio arreglaría el origen, pero rompería el build de la landing,
// que sí las usa en tiempo de ejecución y no las tiene como secretos del
// Worker. Eso es una decisión que no corresponde tomar desde aquí.
//
// Así que esta aplicación se limpia lo suyo: borra del bundle las claves que NO
// necesita. Si alguna hiciera falta algún día, se sube con `wrangler secret put`
// y llega por el binding, como debe ser.
//
// Uso (lo llama `npm run deploy` automáticamente):
//   node scripts/limpiar-secretos-del-bundle.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const ARCHIVO = path.resolve(AQUI, '..', '.open-next', 'cloudflare', 'next-env.mjs');

/**
 * Qué se considera sensible.
 *
 * Por patrón de nombre y no por lista cerrada: una lista se queda corta en
 * cuanto alguien añade una integración, y el fallo sería silencioso — que es
 * exactamente cómo llegó a pasar esto.
 */
const PATRONES_NOMBRE = [
  /SECRET/i,
  /TOKEN/i,
  /_KEY$/i,
  /_KEY_/i,
  /PASSWORD/i,
  /DATABASE_URL/i,
  /_DSN$/i,
  /CONNECTION_STRING/i,
];

/**
 * Detección por la FORMA del valor, no solo por el nombre.
 *
 * Hizo falta: la contraseña de Neon se colaba dentro de
 * CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE, un nombre que no
 * contiene ninguna de las palabras de arriba. Fiarse solo del nombre deja
 * pasar exactamente lo que no debe, y en silencio.
 */
const PATRONES_VALOR = [
  // Cadena de conexión con credenciales: protocolo://usuario:clave@host
  /^[a-z][a-z0-9+.-]*:\/\/[^\s:/@]+:[^\s@]+@/i,
  // Claves con prefijo reconocible de proveedor.
  /^(sk|pk|rk)_(live|test)_[A-Za-z0-9]{16,}/,
  /^(gsk|re|phc)_[A-Za-z0-9_-]{20,}/,
  /^EAA[A-Za-z0-9]{40,}/,
  // JWT.
  /^ey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\./,
];

/**
 * Lo que esta aplicación SÍ necesita y debe conservar si estuviera presente.
 *
 * Está vacío a propósito: la tienda no necesita ninguna variable sensible en el
 * bundle. Todas sus credenciales llegan por binding en tiempo de ejecución.
 * Si algún día hiciera falta una que no se pueda resolver así, va aquí — y con
 * un comentario que explique por qué no puede ser un secreto del Worker.
 */
const CONSERVAR = new Set([]);

/** Las NEXT_PUBLIC_ ya son públicas por definición: van al navegador igual. */
function esSensible(clave, valor) {
  if (CONSERVAR.has(clave)) return false;
  // Las NEXT_PUBLIC_ ya son públicas por definición: el navegador las recibe
  // igualmente, así que sacarlas del bundle no protege nada y sí rompe cosas.
  if (clave.startsWith('NEXT_PUBLIC_')) return false;

  const v = String(valor ?? '');
  if (v.length < 8) return false;

  return PATRONES_NOMBRE.some((p) => p.test(clave)) || PATRONES_VALOR.some((p) => p.test(v));
}

function main() {
  if (!fs.existsSync(ARCHIVO)) {
    console.log('  No hay bundle que limpiar. ¿Falta compilar?');
    process.exit(0);
  }

  const original = fs.readFileSync(ARCHIVO, 'utf8');
  let limpiado = original;
  const borradas = new Set();

  // Cada bloque exportado (production, development, test) se procesa aparte:
  // el de desarrollo también viaja dentro del Worker.
  for (const bloque of ['production', 'development', 'test']) {
    const re = new RegExp(`export const ${bloque} = (\\{.*?\\});`, 's');
    const m = limpiado.match(re);
    if (!m) continue;

    let datos;
    try {
      datos = JSON.parse(m[1]);
    } catch {
      console.log(`  No se pudo leer el bloque "${bloque}". Se deja como está.`);
      continue;
    }

    for (const [clave, valor] of Object.entries(datos)) {
      if (esSensible(clave, valor)) {
        // Se vacía en lugar de borrar la clave: si algún código hiciera
        // `process.env.X` esperando una cadena, con undefined revienta y con ''
        // falla de forma controlada — y la comprobación de "¿está configurado?"
        // que ya existe en cada integración lo detecta y lo dice.
        datos[clave] = '';
        borradas.add(clave);
      }
    }

    limpiado = limpiado.replace(re, `export const ${bloque} = ${JSON.stringify(datos)};`);
  }

  if (borradas.size === 0) {
    console.log('  El bundle ya estaba limpio.');
    return;
  }

  fs.writeFileSync(ARCHIVO, limpiado, 'utf8');

  console.log(`  ${borradas.size} credenciales sacadas del bundle:`);
  for (const c of [...borradas].sort()) console.log(`    ${c}`);
  console.log('\n  Llegan al Worker por binding, no dentro del paquete.');
}

main();
