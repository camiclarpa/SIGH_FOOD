// =============================================================================
// Comprobar la cadena del cron SIN mandar mensajes
// =============================================================================
//
// Aquí no se ejecuta la campaña de verdad, y es deliberado: la ruta del CRM
// MANDA WHATSAPP A PERSONAS REALES. Una prueba que gasta cupo de Meta y escribe
// a clientes para confirmar que un cron está bien puesto es peor que no probar.
//
// Lo que sí se puede comprobar sin efectos:
//   1. Que el reloj está desplegado y respondiendo.
//   2. Que la ruta del CRM existe y FALLA CERRADA: rechaza a quien no trae el
//      secreto, y no cuenta por qué.
//   3. Que la hora programada cae donde debe en Bogotá.
//
// Lo único que no se puede verificar desde fuera es que los dos secretos
// coincidan: por definición, este script no los conoce. De eso se encarga
// configurar-cron.mjs, que instala el mismo valor en los dos Workers de una vez.

const URL_RELOJ = 'https://bocazo-reloj.camiloriverac0.workers.dev';
const URL_CRON_CRM = 'https://sighbocazo-crm.camiloriverac0.workers.dev/api/cron/secuencias';

const res = [];
const ok = (n, c, d = '') => { res.push(c); console.log(`${c ? 'OK   ' : 'FALLO'} ${n}${d ? '  ' + d : ''}`); };

console.log('===== 1) EL RELOJ ESTA DESPLEGADO =====');
try {
  const r = await fetch(URL_RELOJ);
  const texto = await r.text();
  ok('bocazo-reloj responde', r.status === 200, `${r.status}`);
  ok('y se identifica', /reloj/i.test(texto), texto.trim().slice(0, 60));
  // Su fetch es solo una señal de vida: no debe ejecutar nada.
  ok('su fetch no dispara la campaña', !/enviad|secuencias ejecutad/i.test(texto));
} catch (e) {
  ok('bocazo-reloj responde', false, e.message);
  ok('y se identifica', false);
  ok('su fetch no dispara la campaña', false);
}

console.log('\n===== 2) LA RUTA DEL CRM FALLA CERRADA =====');
const sinSecreto = await fetch(URL_CRON_CRM, {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}',
});
ok('rechaza una llamada sin secreto', sinSecreto.status === 401, `${sinSecreto.status}`);

const secretoMalo = await fetch(URL_CRON_CRM, {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-cron-secreto': 'no-soy-el-secreto' },
  body: '{}',
});
ok('rechaza un secreto que no es', secretoMalo.status === 401, `${secretoMalo.status}`);

// Distinguir "no hay secreto configurado" de "no coincide" le confirma a quien
// sondea como esta protegida la ruta.
const cuerpo = await secretoMalo.text();
ok('no da pistas de como esta protegida',
   !/configurad|falta|header|cabecera/i.test(cuerpo), cuerpo.slice(0, 80));

console.log('\n===== 3) UN GET NO EJECUTA NADA =====');
const conGet = await fetch(URL_CRON_CRM);
ok('el GET no dispara la campana', [401, 404, 405].includes(conGet.status), `${conGet.status}`);

console.log('\n===== 4) LA HORA CAE DONDE DEBE =====');
// 15:00 UTC. Colombia es UTC-5 y no cambia la hora en todo el ano.
const enBogota = new Date(Date.UTC(2026, 0, 1, 15, 0))
  .toLocaleString('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit' });
ok('las 15:00 UTC son media manana en Bogota', enBogota.startsWith('10'), enBogota);

console.log(`\n${res.filter(Boolean).length}/${res.length} comprobaciones correctas`);
console.log('\nLo que esto NO comprueba: que los dos secretos coincidan.');
console.log('No se puede desde fuera, y forzarlo mandaria mensajes de verdad.');
console.log('\nEl primer disparo real sera manana a las 10:00 de Bogota.');
console.log('Para verlo cuando ocurra:  cd apps/cron && npm run tail');
if (res.some((x) => !x)) process.exitCode = 1;
