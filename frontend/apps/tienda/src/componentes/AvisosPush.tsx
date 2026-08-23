'use client';

// =============================================================================
// Pedir permiso para avisar
// =============================================================================
//
// LA REGLA QUE GOBIERNA TODO ESTE ARCHIVO
// ---------------------------------------
// El permiso de notificaciones se pide UNA vez en la vida. Si la persona dice
// que no, el navegador no vuelve a preguntar nunca — ni hoy, ni dentro de un
// mes, ni aunque cambie de opinión. Recuperarlo exige entrar en la configuración
// del navegador, que no hace nadie.
//
// Por eso NO se lanza el diálogo del navegador al entrar. Un aviso que aparece
// antes de que la persona sepa qué es esto se rechaza casi siempre, y con ese
// rechazo se pierde el canal para siempre.
//
// Se pide después de algo que salió bien: acaba de hacer un pedido, o acaba de
// ver sus puntos. En ese momento "avísame cuando esté listo" tiene sentido, y la
// pregunta se entiende.
//
// EL PASO INTERMEDIO
// ------------------
// Primero se enseña una tarjeta NUESTRA explicando para qué sirve. Solo si
// acepta ahí se lanza el diálogo del navegador. Así, quien no lo quiere cierra
// nuestra tarjeta —que se puede volver a enseñar mañana— en vez de gastar el
// único permiso que da el navegador.

import { useEffect, useState } from 'react';

/** Cuándo tiene sentido preguntar. Cada uno es un momento distinto. */
export type Motivo = 'pedido' | 'puntos';

const TEXTOS: Record<Motivo, { titulo: string; cuerpo: string; boton: string }> = {
  pedido: {
    titulo: '¿Te avisamos cuando esté listo?',
    cuerpo:
      'Te llega una notificación cuando tu pedido entre a la cocina y cuando salga para tu casa. Sin tener que dejar esta página abierta.',
    boton: 'Sí, avísenme',
  },
  puntos: {
    titulo: 'Te avisamos cuando subas de nivel',
    cuerpo:
      'Cuando ganes una insignia o tengas puntos para canjear, te lo decimos. Nada más: no mandamos publicidad.',
    boton: 'Activar avisos',
  },
};

/** La clave pública VAPID va en base64url y el navegador la quiere en bytes. */
function aBytes(base64url: string): Uint8Array {
  const normal = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const relleno = normal + '='.repeat((4 - (normal.length % 4)) % 4);
  const binario = atob(relleno);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return bytes;
}

/** iOS solo permite notificaciones si la web está instalada en la pantalla de inicio. */
function esIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function estaInstalada(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // Safari usa una propiedad propia que no está en el estándar.
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** Para no volver a enseñar la tarjeta el mismo día si la cerró. */
const CLAVE_APLAZADO = 'bocazo_avisos_aplazado';
const DIAS_DE_ESPERA = 7;

export function AvisosPush({ motivo, claveVapid }: { motivo: Motivo; claveVapid: string }) {
  const [visible, setVisible] = useState(false);
  const [estado, setEstado] = useState<'preguntando' | 'trabajando' | 'listo' | 'instalar'>(
    'preguntando'
  );

  useEffect(() => {
    // Sin clave configurada no se enseña nada: preguntar y luego no poder
    // suscribir gasta el permiso a cambio de nada.
    if (!claveVapid) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (typeof Notification === 'undefined') return;

    // Ya decidió, en un sentido o en otro. No se insiste.
    if (Notification.permission !== 'default') return;

    const aplazado = Number(localStorage.getItem(CLAVE_APLAZADO) ?? 0);
    if (Date.now() - aplazado < DIAS_DE_ESPERA * 86_400_000) return;

    /*
      iPhone sin instalar: el permiso ni siquiera se puede conceder.

      Lanzar el diálogo aquí no haría nada, y la persona se quedaría pensando que
      lo activó. Se le explica el paso que falta en vez de fingir que funciona.
    */
    if (esIOS() && !estaInstalada()) {
      setEstado('instalar');
      setVisible(true);
      return;
    }

    setVisible(true);
  }, [claveVapid]);

  async function activar() {
    setEstado('trabajando');

    try {
      const permiso = await Notification.requestPermission();
      if (permiso !== 'granted') {
        // Dijo que no. Se cierra sin insistir: el navegador ya no dejará
        // preguntar otra vez.
        setVisible(false);
        return;
      }

      const registro = await navigator.serviceWorker.register('/sw.js');
      // Esperar a que esté activo: suscribirse contra un worker que todavía se
      // está instalando falla de forma intermitente y difícil de reproducir.
      await navigator.serviceWorker.ready;

      const suscripcion = await registro.pushManager.subscribe({
        // Obligatorio: promete que cada push mostrará algo visible. Sin esto el
        // navegador rechaza la suscripción.
        userVisibleOnly: true,
        applicationServerKey: aBytes(claveVapid) as BufferSource,
      });

      const r = await fetch('/api/push/suscribir', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ suscripcion: suscripcion.toJSON() }),
      });

      if (!r.ok) {
        // El navegador ya nos tiene suscritos pero el servidor no se enteró.
        // Se deshace para que no quede una suscripción que nadie va a usar.
        await suscripcion.unsubscribe();
        setVisible(false);
        return;
      }

      setEstado('listo');
      setTimeout(() => setVisible(false), 2500);
    } catch {
      setVisible(false);
    }
  }

  function aplazar() {
    localStorage.setItem(CLAVE_APLAZADO, String(Date.now()));
    setVisible(false);
  }

  if (!visible) return null;

  const t = TEXTOS[motivo];

  return (
    <div
      role="dialog"
      aria-labelledby="avisos-titulo"
      className="fixed inset-x-3 bottom-3 z-50 rounded-2xl border border-white/10 bg-[#1b1613] p-4 shadow-2xl sm:left-auto sm:right-4 sm:w-80"
    >
      {estado === 'instalar' ? (
        <>
          <h2 id="avisos-titulo" className="text-base font-semibold text-white">
            Añade Bocazo a tu pantalla
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-white/70">
            En iPhone las notificaciones solo funcionan con la app instalada. Toca{' '}
            <span className="font-medium text-white">Compartir</span> y luego{' '}
            <span className="font-medium text-white">Añadir a pantalla de inicio</span>.
          </p>
          <button
            onClick={aplazar}
            className="mt-3 w-full rounded-xl border border-white/15 py-2 text-sm text-white/80"
          >
            Entendido
          </button>
        </>
      ) : estado === 'listo' ? (
        <p className="text-sm text-white">Listo. Te avisamos por aquí.</p>
      ) : (
        <>
          <h2 id="avisos-titulo" className="text-base font-semibold text-white">
            {t.titulo}
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-white/70">{t.cuerpo}</p>

          <div className="mt-3 flex gap-2">
            <button
              onClick={activar}
              disabled={estado === 'trabajando'}
              className="flex-1 rounded-xl bg-orange-500 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {estado === 'trabajando' ? 'Un momento…' : t.boton}
            </button>
            <button
              onClick={aplazar}
              className="rounded-xl border border-white/15 px-3 py-2 text-sm text-white/70"
            >
              Ahora no
            </button>
          </div>
        </>
      )}
    </div>
  );
}
