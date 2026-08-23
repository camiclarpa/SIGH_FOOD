// =============================================================================
// Generar e instalar las claves de Web Push (VAPID)
// =============================================================================
//
// Se ejecuta UNA VEZ en la vida del proyecto.
//
// POR QUÉ NO SE PUEDEN ROTAR DESPUÉS
// ----------------------------------
// El navegador ata cada suscripción a la clave pública con la que se creó.
// Cambiarla no "renueva" nada: invalida TODAS las suscripciones existentes de
// golpe, y el servicio de push empieza a responder 403 a cada envío.
//
// Es decir, generar claves nuevas equivale a perder a todos los suscriptores sin
// forma de avisarles — porque el canal para avisarles es justo el que se rompió.
// Por eso el script se niega a sobrescribir claves que ya existen.
//
// DÓNDE VA CADA UNA
// -----------------
//   · La PÚBLICA va al navegador, dentro del código de la tienda. No es secreta:
//     su único uso es que el navegador sepa a quién autorizar. Como Next la
//     incrusta en la compilación, tiene que estar en el archivo .env ANTES de
//     compilar — no sirve subirla como secreto del Worker.
//
//   · La PRIVADA firma cada envío y solo la necesita el CRM, que es quien manda.
//     Va como secreto del Worker y NUNCA al archivo .env de la tienda: ese se
//     hornea en el paquete al compilar, que es exactamente el problema de
//     seguridad que ya arreglamos una vez.

import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { webcrypto } from 'node:crypto';

const AQUI = dirname(fileURLToPath(import.meta.url));
const APP_CRM = resolve(AQUI, '..');
const APP_TIENDA = resolve(AQUI, '../../tienda');
const ENV_TIENDA = resolve(APP_TIENDA, '.env.development.local');

const crypto = webcrypto;

function aBase64Url(bytes) {
  return Buffer.from(bytes).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function subirSecreto(directorio, nombre, valor) {
  const p = spawnSync('npx', ['wrangler', 'secret', 'put', nombre], {
    cwd: directorio,
    input: valor,
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
    encoding: 'utf8',
  });
  const salida = `${p.stdout ?? ''}${p.stderr ?? ''}`;
  return { ok: p.status === 0, salida: salida.split('\n').filter(Boolean).slice(-2).join(' | ') };
}

console.log('Web Push — claves VAPID\n');

// -----------------------------------------------------------------------------
// 1. No pisar unas claves que ya existan
// -----------------------------------------------------------------------------

const envActual = fs.existsSync(ENV_TIENDA) ? fs.readFileSync(ENV_TIENDA, 'utf8') : '';
const yaHay = envActual.match(/^NEXT_PUBLIC_VAPID_PUBLIC_KEY=(.+)$/m);

if (yaHay && yaHay[1].trim() && !process.argv.includes('--rehacer')) {
  console.log('  Ya hay una clave pública configurada.\n');
  console.log('  Generar unas nuevas INVALIDARÍA todas las suscripciones existentes:');
  console.log('  cada navegador ató la suya a la clave actual y el servicio de push');
  console.log('  empezaría a rechazar los envíos con 403. No hay forma de avisar a');
  console.log('  quien se quede fuera, porque el aviso iría justo por el canal roto.\n');
  console.log('  Si de verdad quieres rehacerlas:  node scripts/configurar-push.mjs --rehacer');
  process.exit(0);
}

// -----------------------------------------------------------------------------
// 2. Generar
// -----------------------------------------------------------------------------

const par = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
  'sign',
  'verify',
]);

const publica = aBase64Url(new Uint8Array(await crypto.subtle.exportKey('raw', par.publicKey)));
const jwk = await crypto.subtle.exportKey('jwk', par.privateKey);
const privada = jwk.d;

console.log(`  Par generado. Clave pública: ${publica.slice(0, 12)}…${publica.slice(-6)}\n`);

// -----------------------------------------------------------------------------
// 3. La pública, al archivo de la tienda (se incrusta al compilar)
// -----------------------------------------------------------------------------

let nuevoEnv = envActual;
const linea = `NEXT_PUBLIC_VAPID_PUBLIC_KEY=${publica}`;

if (/^NEXT_PUBLIC_VAPID_PUBLIC_KEY=.*$/m.test(nuevoEnv)) {
  nuevoEnv = nuevoEnv.replace(/^NEXT_PUBLIC_VAPID_PUBLIC_KEY=.*$/m, linea);
} else {
  nuevoEnv = `${nuevoEnv.replace(/\n*$/, '')}\n${linea}\n`;
}

fs.writeFileSync(ENV_TIENDA, nuevoEnv);
console.log('  tienda/.env.development.local ... clave pública escrita');

// -----------------------------------------------------------------------------
// 4. Las dos, como secretos del CRM (es quien envía)
// -----------------------------------------------------------------------------
//
// La pública también va como secreto del Worker aunque no sea secreta: el CRM la
// manda en la cabecera de cada envío, y necesita leerla en tiempo de ejecución.

for (const [nombre, valor] of [
  ['VAPID_PUBLIC_KEY', publica],
  ['VAPID_PRIVATE_KEY', privada],
]) {
  process.stdout.write(`  CRM · ${nombre} ... `);
  const r = subirSecreto(APP_CRM, nombre, valor);
  console.log(r.ok ? 'subido' : `FALLÓ — ${r.salida}`);
}

console.log('\nListo.\n');
console.log('Falta un paso, y sin él la tienda no pedirá el permiso:');
console.log('la clave pública se incrusta AL COMPILAR, así que hay que volver a desplegar:');
console.log('  cd apps/tienda && npm run deploy');
console.log('\nY el contacto de VAPID, si quieres cambiar el de por defecto:');
console.log('  cd apps/web && npx wrangler secret put VAPID_CONTACTO');
console.log('  (un mailto:, es a donde escribe el servicio de push si hay problemas)');
