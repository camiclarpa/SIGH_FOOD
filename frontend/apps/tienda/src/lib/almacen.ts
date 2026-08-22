'use client';

// =============================================================================
// Lectura de localStorage compatible con renderizado en servidor
// =============================================================================
//
// El patrón habitual —leer en un useEffect y llamar a setState— provoca un
// render en cascada y React 19 lo señala: el efecto se ejecuta DESPUÉS de
// pintar, así que la primera pasada muestra el estado vacío y la segunda el
// real. En un carrito eso es un parpadeo de "no tienes nada" sobre algo que sí
// tiene.
//
// useSyncExternalStore existe para exactamente esto: da una instantánea para el
// servidor y otra para el cliente, y React sabe conciliarlas sin renders extra.
//
// De regalo, el `storage` event sincroniza pestañas: quien tenga la tienda
// abierta en dos sitios ve el mismo carrito en los dos.

import { useCallback, useSyncExternalStore } from 'react';

/** Suscriptores por clave, para no registrar un listener por componente. */
const oyentes = new Map<string, Set<() => void>>();

/**
 * Caché de la última cadena leída por clave.
 *
 * useSyncExternalStore exige que getSnapshot devuelva un valor ESTABLE mientras
 * no haya cambios. Sin esta caché, cada llamada a localStorage.getItem devuelve
 * una cadena nueva y React entra en un bucle de renders infinito.
 */
const cache = new Map<string, string | null>();

function avisar(clave: string) {
  cache.delete(clave);
  oyentes.get(clave)?.forEach((f) => f());
}

function suscribir(clave: string, alCambiar: () => void): () => void {
  if (!oyentes.has(clave)) oyentes.set(clave, new Set());
  oyentes.get(clave)!.add(alCambiar);

  // El evento `storage` solo lo disparan las OTRAS pestañas, nunca la propia.
  // Los cambios locales se avisan a mano desde escribir().
  const alStorage = (e: StorageEvent) => {
    if (e.key === clave || e.key === null) avisar(clave);
  };
  window.addEventListener('storage', alStorage);

  return () => {
    oyentes.get(clave)?.delete(alCambiar);
    window.removeEventListener('storage', alStorage);
  };
}

function leerCrudo(clave: string): string | null {
  if (cache.has(clave)) return cache.get(clave)!;
  let valor: string | null = null;
  try {
    valor = localStorage.getItem(clave);
  } catch {
    // Modo incógnito o almacenamiento bloqueado: se trata como "no hay nada".
  }
  cache.set(clave, valor);
  return valor;
}

/**
 * Lee un valor JSON de localStorage.
 *
 * En el servidor devuelve siempre `null`, que es lo que hace que el HTML del
 * servidor y el primer render del cliente coincidan.
 */
export function useAlmacen<T>(clave: string): T | null {
  const subscribe = useCallback((f: () => void) => suscribir(clave, f), [clave]);
  const snapshot = useCallback(() => leerCrudo(clave), [clave]);
  // Instantánea del servidor: no hay localStorage, así que no hay nada.
  const snapshotServidor = useCallback(() => null, []);

  const crudo = useSyncExternalStore(subscribe, snapshot, snapshotServidor);

  if (!crudo) return null;
  try {
    return JSON.parse(crudo) as T;
  } catch {
    // Contenido corrupto de una versión anterior: mejor ignorarlo que reventar.
    return null;
  }
}

/** Escribe y avisa a los suscriptores de esta pestaña. */
export function escribir(clave: string, valor: unknown): void {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    // Sin cuota: se sigue funcionando en memoria durante esta visita.
  }
  avisar(clave);
}
