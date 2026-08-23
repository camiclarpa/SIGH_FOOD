// =============================================================================
// Service worker de Bocazo
// =============================================================================
//
// Su único trabajo es recibir notificaciones y abrir la app al tocarlas. NO
// cachea nada.
//
// POR QUÉ NO CACHEA
// -----------------
// Un service worker que guarda páginas en caché es la forma más rápida de servir
// un menú con precios viejos o un producto agotado como disponible. En una
// tienda de comida eso no es un detalle de rendimiento: es un pedido que no se
// puede preparar y una discusión en la puerta.
//
// La app ya es rápida por otras vías. Aquí solo hacen falta notificaciones.
//
// POR QUÉ ESTE ARCHIVO ESTÁ EN public/ Y NO EN src/
// -------------------------------------------------
// Un service worker solo controla lo que cuelga de SU ruta. Servido desde
// /sw.js controla el sitio entero; si lo generara el empaquetador y acabara en
// /_next/static/sw.js, solo controlaría esa carpeta y las notificaciones no
// llegarían nunca. Por eso es un archivo suelto, sin compilar.

// -----------------------------------------------------------------------------
// Instalación
// -----------------------------------------------------------------------------

self.addEventListener('install', () => {
  // skipWaiting: la versión nueva toma el control sin esperar a que se cierren
  // las pestañas viejas. Sin esto, un arreglo aquí tarda días en llegar a quien
  // deja la app abierta en el móvil.
  self.skipWaiting();
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(self.clients.claim());
});

// -----------------------------------------------------------------------------
// Notificaciones
// -----------------------------------------------------------------------------

self.addEventListener('push', (evento) => {
  /*
    El contenido viene cifrado y el navegador ya lo descifró: aquí llega en
    claro. Aun así puede llegar VACÍO —hay servicios que mandan un aviso sin
    cuerpo para despertar al worker—, así que nunca se asume que hay datos.

    Si el JSON no se puede leer, se enseña un aviso genérico en vez de no enseñar
    nada: el navegador PENALIZA a los sitios que reciben un push y no muestran
    notificación, y puede llegar a revocar el permiso.
  */
  let datos = {};
  try {
    datos = evento.data ? evento.data.json() : {};
  } catch {
    datos = {};
  }

  const titulo = datos.titulo || 'Bocazo';
  const opciones = {
    body: datos.cuerpo || 'Tienes una novedad.',
    icon: '/conos/spicy-volcano-480.webp',
    badge: '/conos/spicy-volcano-480.webp',
    // La etiqueta agrupa: tres avisos del mismo pedido se sustituyen en vez de
    // apilar tres tarjetas en la pantalla bloqueada.
    tag: datos.etiqueta || 'bocazo',
    renotify: true,
    data: { url: datos.url || '/' },
    lang: 'es-CO',
  };

  // waitUntil mantiene vivo el worker hasta que la notificación se muestra. Sin
  // esto el navegador puede matarlo antes y el aviso no aparece.
  evento.waitUntil(self.registration.showNotification(titulo, opciones));
});

self.addEventListener('notificationclick', (evento) => {
  evento.notification.close();

  const destino = (evento.notification.data && evento.notification.data.url) || '/';

  evento.waitUntil(
    (async () => {
      const ventanas = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      /*
        Si la tienda ya está abierta, se REUTILIZA esa ventana en vez de abrir
        otra. Abrir siempre una nueva deja al comensal con cuatro pestañas de
        Bocazo tras cuatro avisos, y además pierde lo que tuviera en el carrito.
      */
      for (const ventana of ventanas) {
        const url = new URL(ventana.url);
        if (url.origin === self.location.origin) {
          await ventana.focus();
          if ('navigate' in ventana) await ventana.navigate(destino);
          return;
        }
      }

      await self.clients.openWindow(destino);
    })()
  );
});

// -----------------------------------------------------------------------------
// Renovación de la suscripción
// -----------------------------------------------------------------------------

self.addEventListener('pushsubscriptionchange', (evento) => {
  /*
    El navegador puede rotar la suscripción por su cuenta. Cuando lo hace, la
    dirección que tenemos guardada deja de funcionar y esa persona simplemente
    deja de recibir avisos — sin error visible en ninguna parte.

    Aquí se vuelve a suscribir con la misma clave y se avisa al servidor.
  */
  evento.waitUntil(
    (async () => {
      try {
        const anterior = evento.oldSubscription || (await self.registration.pushManager.getSubscription());
        const clave = anterior && anterior.options && anterior.options.applicationServerKey;
        if (!clave) return;

        const nueva = await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: clave,
        });

        await fetch('/api/push/suscribir', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            suscripcion: nueva.toJSON(),
            anterior: anterior ? anterior.endpoint : null,
          }),
        });
      } catch {
        // Sin nada que hacer: si falla, la persona deja de recibir avisos hasta
        // que vuelva a entrar a la tienda y se resuscriba.
      }
    })()
  );
});
