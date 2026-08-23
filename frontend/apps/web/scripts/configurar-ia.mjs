// =============================================================================
// Sube al Worker las llaves de IA y el secreto del cron
// =============================================================================
//
// POR QUÉ HACE FALTA
// ------------------
// Estas llaves funcionaban en producción sin estar configuradas como secretos,
// y eso NO era una buena noticia: funcionaban porque Next las leía de .env.local
// al construir y @opennextjs/cloudflare serializaba todo process.env dentro del
// paquete. Es decir, estaban en claro dentro del Worker desplegado.
//
// Eso ya se corrigió (el archivo se renombró y hay un limpiador entre build y
// deploy), y el efecto es que ahora el Worker NO tiene las llaves. Este script
// las sube por la vía correcta.
//
// CÓMO SE PASAN LOS VALORES
// -------------------------
// Por stdin, nunca como argumento. Un argumento queda visible en la lista de
// procesos del sistema y, en muchos shells, en el historial.
//
// El script LEE las llaves de apps/web/.env.development.local y no las pide por
// teclado: ya están ahí, y volver a teclearlas solo añade ocasiones de
// equivocarse. Nunca se imprimen: solo los cuatro últimos caracteres, para
// poder comprobar que subió la correcta.
//
//   node scripts/configurar-ia.mjs

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const APP_CRM = path.resolve(AQUI, '..');
const APP_RELOJ = path.resolve(APP_CRM, '../cron');
const ENV = path.join(APP_CRM, '.env.development.local');

/** Llaves de proveedores de IA. Sin al menos una, el agente no redacta nada. */
const LLAVES_IA = ['GROQ_API_KEY', 'GOOGLE_AI_API_KEY', 'DEEPSEEK_API_KEY'];

function leerEnv() {
  if (!fs.existsSync(ENV)) {
    console.error(`No encuentro ${ENV}.`);
    console.error('Sin ese archivo no hay de dónde sacar las llaves.');
    process.exit(1);
  }
  const texto = fs.readFileSync(ENV, 'utf8');
  return (clave) => (texto.match(new RegExp(`^${clave}=(.*)$`, 'm')) ?? [])[1]?.trim() ?? '';
}

/** Sube un secreto a un Worker. El valor va por stdin. */
function subir(clave, valor, cwd, nombreWorker) {
  const p = spawnSync('npx', ['wrangler', 'secret', 'put', clave], {
    cwd,
    input: valor,
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
    encoding: 'utf8',
  });

  const cola = `${p.stdout ?? ''}${p.stderr ?? ''}`.split('\n').filter(Boolean).slice(-2).join(' | ');
  if (p.status === 0) {
    console.log(`  OK    ${clave} → ${nombreWorker}  (…${valor.slice(-4)})`);
    return true;
  }
  console.log(`  FALLO ${clave} → ${nombreWorker}: ${cola}`);
  return false;
}

const leer = leerEnv();
let bien = 0;
let mal = 0;

console.log('===== 1) LLAVES DE IA → CRM =====');
let algunaLlave = false;
for (const clave of LLAVES_IA) {
  const valor = leer(clave);
  if (!valor) {
    console.log(`  --    ${clave}: no está en el archivo, se omite`);
    continue;
  }
  algunaLlave = true;
  if (subir(clave, valor, APP_CRM, 'sighbocazo-crm')) bien++;
  else mal++;
}

if (!algunaLlave) {
  console.log('\n  Ninguna llave de IA en el archivo: el borrador de respuesta no va a funcionar.');
}

console.log('\n===== 2) SECRETO DEL CRON =====');
console.log('  Protege /api/cron/secuencias, que MANDA WHATSAPP REAL.');
console.log('  Sin él, cualquiera con la URL podría vaciar el cupo del negocio.\n');

/*
  Se genera aquí y se sube a los dos Workers en la misma ejecución: si se
  pidiera al usuario que lo inventara, acabaría siendo algo adivinable, y si se
  subiera en dos pasos distintos es fácil que queden distintos y el cron falle
  con un 401 que no dice por qué.

  Si ya existía uno, este lo reemplaza en ambos lados a la vez, así que siguen
  cuadrando.
*/
const secretoCron = crypto.randomBytes(32).toString('base64url');

if (subir('CRON_SECRETO', secretoCron, APP_CRM, 'sighbocazo-crm')) bien++;
else mal++;

if (fs.existsSync(path.join(APP_RELOJ, 'wrangler.jsonc'))) {
  if (subir('CRON_SECRETO', secretoCron, APP_RELOJ, 'bocazo-reloj')) bien++;
  else mal++;
} else {
  console.log('  --    bocazo-reloj no está desplegado todavía; súbelo después con:');
  console.log('        cd apps/cron && npx wrangler deploy');
  console.log('        y vuelve a ejecutar este script.');
}

// Se guarda también en el archivo local para poder llamar al endpoint a mano al
// depurar. El archivo está en .gitignore.
if (!leer('CRON_SECRETO')) {
  fs.appendFileSync(ENV, `\nCRON_SECRETO=${secretoCron}\n`, 'utf8');
  console.log('  OK    CRON_SECRETO guardado también en .env.development.local');
}

console.log(`\n${bien} secreto(s) subidos, ${mal} fallo(s).`);
console.log('\nOJO: los secretos solo se aplican al Worker YA DESPLEGADO.');
console.log('Si acabas de cambiar código, despliega después con `npm run deploy`.');
if (mal > 0) process.exitCode = 1;
