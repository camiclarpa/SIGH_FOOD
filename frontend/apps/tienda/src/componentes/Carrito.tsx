'use client';

// =============================================================================
// Carrito
// =============================================================================
//
// Vive en el navegador, no en el servidor. Un carrito de servidor exigiría
// sesión, y exigir sesión antes de comprar es la forma más eficaz de perder la
// mitad de las compras. Aquí se puede llenar el carrito sin dar un solo dato.
//
// Se guarda en localStorage para que sobreviva a cerrar la pestaña: en comida,
// la secuencia real es "lo veo, lo dejo a medias, vuelvo en la noche". Un
// carrito que se vacía al recargar obliga a empezar de cero justo cuando la
// persona ya había decidido.
//
// Lo que el carrito NO guarda es el precio como fuente de verdad. Guarda el que
// vio la persona para poder enseñar totales al instante, pero al crear el
// pedido el servidor vuelve a leerlos de la base — ver lib/pedidos.ts.

import { createContext, useCallback, useContext, useMemo } from 'react';
import { escribir, useAlmacen } from '@/lib/almacen';

export interface OpcionElegida {
  id: string;
  grupo: string;
  etiqueta: string;
  sobreprecioCOP: number;
}

export interface LineaCarrito {
  /** Producto + combinación de opciones. Dos configuraciones distintas del
      mismo cono son dos líneas, no una con cantidad 2. */
  clave: string;
  slug: string;
  nombre: string;
  imagen: string | null;
  precioCOP: number;
  cantidad: number;
  opciones: OpcionElegida[];
  notas?: string;
}

interface Contexto {
  lineas: LineaCarrito[];
  unidades: number;
  subtotalCOP: number;
  cargado: boolean;
  anadir: (linea: Omit<LineaCarrito, 'clave' | 'cantidad'>, cantidad?: number) => void;
  cambiarCantidad: (clave: string, cantidad: number) => void;
  quitar: (clave: string) => void;
  vaciar: () => void;
}

const CarritoContexto = createContext<Contexto | null>(null);

const ALMACEN = 'bocazo:carrito:v1';

/** Identifica una línea por producto + opciones, en orden estable. */
function claveDe(slug: string, opciones: OpcionElegida[]): string {
  const ids = opciones.map((o) => o.id).sort().join(',');
  return ids ? `${slug}::${ids}` : slug;
}

/** Precio de una línea con sus extras, por unidad. */
export function unitarioDe(linea: LineaCarrito): number {
  return linea.precioCOP + linea.opciones.reduce((s, o) => s + o.sobreprecioCOP, 0);
}

export function ProveedorCarrito({ children }: { children: React.ReactNode }) {
  // El carrito ES el contenido de localStorage, no una copia suya. Leerlo con
  // useSyncExternalStore evita el render en cascada del patrón "efecto +
  // setState", que además pintaba "tu carrito está vacío" durante un instante
  // sobre un carrito que sí tenía cosas.
  const guardadas = useAlmacen<LineaCarrito[]>(ALMACEN);
  const lineas = useMemo(() => (Array.isArray(guardadas) ? guardadas : []), [guardadas]);

  // En el servidor `guardadas` es null y aquí sigue siéndolo hasta la primera
  // lectura del cliente. Eso distingue "vacío" de "todavía no sé", que es lo
  // que evita el parpadeo.
  const cargado = typeof window !== 'undefined';

  const guardar = useCallback((siguientes: LineaCarrito[]) => escribir(ALMACEN, siguientes), []);

  const anadir = useCallback(
    (linea: Omit<LineaCarrito, 'clave' | 'cantidad'>, cantidad = 1) => {
      const clave = claveDe(linea.slug, linea.opciones);
      const i = lineas.findIndex((l) => l.clave === clave);

      if (i === -1) {
        guardar([...lineas, { ...linea, clave, cantidad }]);
        return;
      }
      const copia = [...lineas];
      copia[i] = { ...copia[i], cantidad: Math.min(20, copia[i].cantidad + cantidad) };
      guardar(copia);
    },
    [lineas, guardar]
  );

  const cambiarCantidad = useCallback(
    (clave: string, cantidad: number) => {
      guardar(
        cantidad <= 0
          ? lineas.filter((l) => l.clave !== clave)
          : lineas.map((l) => (l.clave === clave ? { ...l, cantidad: Math.min(20, cantidad) } : l))
      );
    },
    [lineas, guardar]
  );

  const quitar = useCallback(
    (clave: string) => guardar(lineas.filter((l) => l.clave !== clave)),
    [lineas, guardar]
  );

  const vaciar = useCallback(() => guardar([]), [guardar]);

  const valor = useMemo<Contexto>(
    () => ({
      lineas,
      unidades: lineas.reduce((s, l) => s + l.cantidad, 0),
      subtotalCOP: lineas.reduce((s, l) => s + unitarioDe(l) * l.cantidad, 0),
      cargado,
      anadir,
      cambiarCantidad,
      quitar,
      vaciar,
    }),
    [lineas, cargado, anadir, cambiarCantidad, quitar, vaciar]
  );

  return <CarritoContexto.Provider value={valor}>{children}</CarritoContexto.Provider>;
}

export function useCarrito(): Contexto {
  const c = useContext(CarritoContexto);
  if (!c) throw new Error('useCarrito debe usarse dentro de ProveedorCarrito');
  return c;
}
