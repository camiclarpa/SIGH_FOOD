// =============================================================================
// El reloj
// =============================================================================
//
// Un Worker diminuto cuyo único trabajo es despertar al CRM a una hora fija.
//
// POR QUÉ NO VIVE DENTRO DEL CRM
// ------------------------------
// Un disparador cron de Cloudflare invoca el manejador `scheduled()` del
// Worker. El Worker del CRM lo genera @opennextjs/cloudflare a partir de la
// aplicación de Next, y su plantilla solo exporta `fetch`: un cron apuntado
// allí se ejecutaría y no encontraría a quién llamar, fallando en silencio.
//
// Así que el reloj se separa. Son veinte líneas, se despliega aparte y deja el
// CRM intacto.
//
// LO QUE NO HACE
// --------------
// No decide nada. No sabe qué es una secuencia ni a quién hay que escribirle.
// Solo llama. Toda la lógica vive en el CRM, donde está la base y donde se
// puede probar; si el reloj empezara a razonar, habría dos sitios que cambiar
// cada vez que cambie una regla.

/*
  Los dos tipos del entorno de Workers que se usan aquí, declarados a mano.

  La alternativa era añadir @cloudflare/workers-types al proyecto, y no compensa
  arrastrar una dependencia entera —y su mantenimiento— por dos formas que caben
  en seis líneas. Si este Worker creciera, se instala y se borran.
*/
interface ScheduledController {
  /** Marca de tiempo de la ejecución programada, en milisegundos. */
  readonly scheduledTime: number;
  readonly cron: string;
}

interface ExecutionContext {
  waitUntil(promesa: Promise<unknown>): void;
  passThroughOnException(): void;
}

export interface Env {
  /** URL completa del endpoint del CRM. */
  CRM_CRON_URL: string;
  /** Secreto compartido con el CRM. Se sube con `wrangler secret put`. */
  CRON_SECRETO: string;
}

export default {
  async scheduled(evento: ScheduledController, env: Env, ctx: ExecutionContext) {
    // waitUntil: `scheduled` puede devolver antes de que termine la petición, y
    // sin esto Cloudflare cortaría el Worker a mitad del envío.
    ctx.waitUntil(despertarAlCrm(evento, env));
  },

  /*
    Un fetch mínimo para poder comprobar que el Worker está vivo sin esperar a
    la hora del cron. No dispara nada: si respondiera ejecutando, cualquiera con
    la URL podría lanzar los envíos a mano.
  */
  async fetch(): Promise<Response> {
    return new Response('Reloj de secuencias de SIGH_FOOD. Se ejecuta solo.\n', {
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  },
};

async function despertarAlCrm(evento: ScheduledController, env: Env): Promise<void> {
  if (!env.CRM_CRON_URL || !env.CRON_SECRETO) {
    console.error('Falta CRM_CRON_URL o CRON_SECRETO: el reloj no puede llamar a nadie.');
    return;
  }

  try {
    const respuesta = await fetch(env.CRM_CRON_URL, {
      method: 'POST',
      headers: {
        'x-cron-secreto': env.CRON_SECRETO,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ programado: evento.scheduledTime }),
    });

    const cuerpo = await respuesta.text();

    // Se registra el resultado SIEMPRE, no solo el fallo. Una automatización
    // que deja de mandar sin avisar es peor que no tenerla: el panel de
    // Cloudflare enseña estas líneas y es donde se descubre que lleva un mes
    // sin enviar nada.
    if (respuesta.ok) {
      console.log(`Secuencias ejecutadas: ${cuerpo.slice(0, 500)}`);
    } else {
      console.error(`El CRM respondió ${respuesta.status}: ${cuerpo.slice(0, 300)}`);
    }
  } catch (e) {
    console.error('No se pudo llamar al CRM:', e instanceof Error ? e.message : e);
  }
}
