'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { B2B_ACTIVO } from '@/lib/modulos';

/**
 * Menú agrupado por lo que alguien viene a HACER, no por cuándo se construyó
 * cada pantalla.
 *
 * Antes eran 18 enlaces sueltos en un solo bloque sin título: para alguien
 * que no conoce el CRM de memoria, esa lista no dice nada — no hay forma de
 * saber si "Segmentos" es una tarea de hoy o una que se toca una vez al mes.
 * Agrupar con título fijo (no colapsable) resuelve el desorden sin esconder
 * nada detrás de un clic que alguien nuevo no sabe que tiene que dar.
 *
 * El canal B2B sigue aparte —pipeline comercial y consignación de stock—
 * porque es otro negocio dentro del mismo CRM, no una tarea del día a día
 * del B2C.
 */
const GRUPOS = [
  {
    titulo: 'Operación diaria',
    enlaces: [
      { href: '/panel', texto: 'Panel', icono: '◱' },
      // Va segundo, justo debajo del panel: es la pantalla que se mira cada pocos
      // minutos con el local abierto. Estuvo escrita con la clave `etiqueta` en
      // vez de `texto` y sin icono, así que el menú pintaba un enlace en blanco y
      // la cola de cocina quedaba inalcanzable con pedidos ya pagados dentro.
      { href: '/pedidos', texto: 'Pedidos', icono: '▤' },
      { href: '/finanzas/caja', texto: 'Caja', icono: '⛁' },
    ],
  },
  {
    titulo: 'Clientes y fidelización',
    enlaces: [
      { href: '/comensales', texto: 'Comensales', icono: '☺' },
      { href: '/fidelizacion', texto: 'Fidelización', icono: '★' },
      { href: '/premios', texto: 'Premios', icono: '◆' },
      { href: '/momentos', texto: 'Momentos', icono: '◉' },
      { href: '/resenas', texto: 'Reseñas', icono: '✎' },
    ],
  },
  {
    titulo: 'Marketing y contenido',
    enlaces: [
      { href: '/segmentos', texto: 'Segmentos', icono: '◒' },
      { href: '/qr', texto: 'Códigos QR', icono: '⊞' },
      // Contenido y embajadores van juntos: son lo que trae gente nueva.
      { href: '/contenido', texto: 'Contenido', icono: '▦' },
      { href: '/embajadores', texto: 'Embajadores', icono: '✦' },
    ],
  },
  {
    titulo: 'Inventario y finanzas',
    enlaces: [
      { href: '/finanzas/inventario', texto: 'Inventario', icono: '▣' },
      { href: '/finanzas', texto: 'Finanzas', icono: '$' },
    ],
  },
  {
    titulo: 'Sistema y comunicación',
    enlaces: [
      { href: '/bandeja', texto: 'Bandeja', icono: '✉' },
      { href: '/mensajeria', texto: 'Mensajería', icono: '✈' },
      { href: '/agente', texto: 'Agente IA', icono: '◈' },
      { href: '/usuarios', texto: 'Usuarios', icono: '⚿' },
    ],
  },
  // Solo aparece si B2B_ACTIVO. Está pausado mientras el foco es B2C; se
  // reactiva cambiando esa constante en lib/modulos.ts.
  {
    titulo: 'Canal B2B',
    soloSi: B2B_ACTIVO,
    enlaces: [
      { href: '/clientes', texto: 'Bares', icono: '☰' },
      { href: '/pipeline', texto: 'Pipeline', icono: '⇉' },
      { href: '/consignacion', texto: 'Consignación', icono: '⇄' },
    ],
  },
].filter((g) => g.soloSi !== false);

export function Navegacion({
  usuario,
  rol,
  cerrarSesion,
}: {
  usuario: string;
  rol: string;
  /** Server Action: un POST suelto a /api/auth/signout lo rechaza Auth.js por CSRF. */
  cerrarSesion: () => Promise<void>;
}) {
  const ruta = usePathname();
  const [abierto, setAbierto] = useState(false);

  const todosLosHrefs = GRUPOS.flatMap((g) => g.enlaces.map((e) => e.href));

  /**
   * Una ruta está activa si es la actual o si la actual cuelga de ella, para
   * que /clientes siga marcado dentro de /clientes/<id>. Comparar por igualdad
   * exacta apagaba el menú entero en las fichas de detalle.
   *
   * Pero con /finanzas, /finanzas/caja y /finanzas/inventario como enlaces
   * hermanos, ese mismo criterio marcaba "Finanzas" Y "Caja" a la vez estando
   * en /finanzas/caja: /finanzas/caja también cuelga de /finanzas. Si hay un
   * enlace más específico que ya cubre la ruta actual, ese gana y este no se
   * marca.
   */
  const activo = (href: string) => {
    if (ruta === href) return true;
    if (!ruta.startsWith(`${href}/`)) return false;
    const hayMasEspecifico = todosLosHrefs.some(
      (h) => h !== href && h.startsWith(`${href}/`) && (ruta === h || ruta.startsWith(`${h}/`))
    );
    return !hayMasEspecifico;
  };

  const enlaces = (
    <>
      {GRUPOS.map((grupo, i) => (
        <div key={grupo.titulo ?? 'principal'} className={i > 0 ? 'mt-5' : ''}>
          {grupo.titulo && (
            <p className="texto-suave mb-1 px-3 text-[11px] font-medium uppercase tracking-wider">
              {grupo.titulo}
            </p>
          )}
          <div className="flex flex-col gap-1">
            {grupo.enlaces.map((e) => (
              <Link
                key={e.href}
                href={e.href}
                onClick={() => setAbierto(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  activo(e.href)
                    ? 'bg-indigo-600 font-medium text-white'
                    : 'hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                <span aria-hidden className="w-4 text-center">{e.icono}</span>
                {e.texto}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </>
  );

  return (
    <>
      {/* Barra superior: solo en móvil */}
      <header className="superficie sticky top-0 z-30 flex items-center justify-between border-b px-4 py-3 lg:hidden">
        <span className="font-semibold">SIGH_FOOD</span>
        <button
          onClick={() => setAbierto((v) => !v)}
          className="rounded-lg border borde-tema px-3 py-1.5 text-sm"
          aria-expanded={abierto}
          aria-label="Menú"
        >
          {abierto ? 'Cerrar' : 'Menú'}
        </button>
      </header>

      {abierto && (
        <nav className="superficie border-b p-3 lg:hidden">
          <div>{enlaces}</div>
        </nav>
      )}

      {/* Lateral: solo en escritorio */}
      <aside className="superficie sticky top-0 hidden h-screen w-60 shrink-0 border-r p-4 lg:flex lg:flex-col">
        <Link href="/panel" className="mb-6 block">
          <span className="text-lg font-semibold tracking-tight">SIGH_FOOD</span>
          <span className="texto-suave block text-xs">CRM</span>
        </Link>

        <nav className="flex-1 overflow-y-auto">{enlaces}</nav>

        <div className="mt-4 border-t borde-tema pt-4">
          <p className="truncate text-sm font-medium" title={usuario}>{usuario}</p>
          <p className="texto-suave text-xs capitalize">{rol}</p>
          <form action={cerrarSesion} className="mt-3">
            <button
              type="submit"
              className="w-full rounded-lg border borde-tema px-3 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
