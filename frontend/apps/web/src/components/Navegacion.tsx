'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { B2B_ACTIVO } from '@/lib/modulos';

/**
 * Menú en dos bloques.
 *
 * El CRM se reorientó a B2C: el sujeto es el comensal, no la cuenta. Lo B2B
 * —pipeline comercial y consignación de stock— no se borra, porque los bares
 * siguen siendo dónde ocurre el consumo y esos datos alimentan el resto, pero
 * baja a una sección secundaria para que deje de competir por la atención.
 */
const GRUPOS = [
  {
    titulo: null,
    enlaces: [
      { href: '/panel', texto: 'Panel', icono: '◱' },
      { href: '/comensales', texto: 'Comensales', icono: '☺' },
      { href: '/momentos', texto: 'Momentos', icono: '◉' },
      { href: '/fidelizacion', texto: 'Fidelización', icono: '★' },
      { href: '/premios', texto: 'Premios', icono: '◆' },
      { href: '/resenas', texto: 'Reseñas', icono: '✎' },
      { href: '/segmentos', texto: 'Segmentos', icono: '◒' },
      { href: '/qr', texto: 'Códigos QR', icono: '⊞' },
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

  /**
   * Una ruta está activa si es la actual o si la actual cuelga de ella, para
   * que /clientes siga marcado dentro de /clientes/<id>. Comparar por igualdad
   * exacta apagaba el menú entero en las fichas de detalle.
   */
  const activo = (href: string) => ruta === href || ruta.startsWith(`${href}/`);

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
                    ? 'bg-orange-500 font-medium text-white'
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
      <aside className="superficie hidden w-60 shrink-0 border-r p-4 lg:flex lg:flex-col">
        <Link href="/panel" className="mb-6 block">
          <span className="text-lg font-semibold tracking-tight">SIGH_FOOD</span>
          <span className="texto-suave block text-xs">CRM</span>
        </Link>

        <nav className="flex-1">{enlaces}</nav>

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
