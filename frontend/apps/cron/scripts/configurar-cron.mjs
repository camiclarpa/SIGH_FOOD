// =============================================================================
// Configurar el secreto compartido del cron
// =============================================================================
//
// El reloj (bocazo-reloj) y el CRM (sighbocazo-crm) tienen que conocer el
// MISMO secreto: el reloj lo manda en la cabecera y el CRM lo comprueba. Si no
// coinciden, el cron dispara puntualmente todos los días y el CRM le contesta
// 401 — sin que nada avise, porque no hay nadie mirando a las diez de la mañana.
//
// POR QUÉ SE GENERA Y NO SE PIDE
// ------------------------------
// Esto no es una credencial de un tercero: es un secreto entre dos Workers
// nuestros. No hay ningún panel de donde copiarlo, así que pedírselo a una
// persona solo consigue que elija algo corto y memorizable. Se genera aquí con
// el generador criptográfico del sistema, se instala en los dos sitios, y nadie
// necesita verlo nunca.
//
// El valor viaja por stdin, jamás como argumento: los argumentos quedan visibles
// en la lista de procesos del sistema para cualquier otro usuario de la máquina.

import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const AQUI = dirname(fileURLToPath(import.meta.url));
const APP_CRON = resolve(AQUI, '..');
const APP_CRM = resolve(AQUI, '../../web');

const CLAVE = 'CRON_SECRETO';

/** Sube un secreto a un Worker pasando el valor por stdin. */
function subir(directorio, nombre, valor) {
  const p = spawnSync('npx', ['wrangler', 'secret', 'put', nombre], {
    cwd: directorio,
    input: valor,
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
    encoding: 'utf8',
  });

  const salida = `${p.stdout ?? ''}${p.stderr ?? ''}`;
  return { ok: p.status === 0, salida: salida.split('\n').filter(Boolean).slice(-3).join(' | ') };
}

console.log('Reloj del CRM — secreto compartido\n');

// 32 bytes son 256 bits. Para un secreto que solo se compara, es holgado y no
// cuesta nada de más.
const secreto = randomBytes(32).toString('hex');
console.log(`  Generado un secreto nuevo (${secreto.length} caracteres). No hace falta que lo veas ni lo guardes.\n`);

const destinos = [
  { nombre: 'bocazo-reloj    (el reloj)', dir: APP_CRON },
  { nombre: 'sighbocazo-crm  (el CRM)', dir: APP_CRM },
];

let todoBien = true;

for (const d of destinos) {
  process.stdout.write(`  ${d.nombre} ... `);
  const r = subir(d.dir, CLAVE, secreto);
  if (r.ok) {
    console.log('subido');
  } else {
    todoBien = false;
    console.log(`FALLÓ\n     ${r.salida}`);
  }
}

if (!todoBien) {
  console.log('\nAlgo no se subió. Los dos extremos tienen que tener el MISMO secreto,');
  console.log('así que vuelve a ejecutar esto entero en vez de subir solo el que falló:');
  console.log('cada ejecución genera un secreto nuevo y arreglar solo un lado los dejaría distintos.');
  process.exit(1);
}

console.log('\nListo. Los dos Workers comparten el secreto.');
console.log('\nAhora falta desplegar el reloj para que empiece a sonar:');
console.log('  cd apps/cron && npm run deploy');
console.log('\nY para comprobar que la cadena entera funciona sin esperar a mañana:');
console.log('  cd apps/cron && node scripts/probar-cron.mjs');
