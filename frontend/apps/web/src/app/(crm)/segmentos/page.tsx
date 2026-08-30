import Link from 'next/link';
import { segmentosConConteo, secuenciasActivas } from '@/lib/consultas-b2c';
import { etiquetaLinea } from '@/lib/fidelizacion';
import { puede, rolActual } from '@/lib/permisos';
import { LanzarCampana } from './LanzarCampana';
import { EditorSegmento } from './EditorSegmento';
import {
  AvisoDegradado,
  Etiqueta,
  Metrica,
  Tarjeta,
  Titulo,
  Vacio,
  moneda,
  numero,
} from '@/components/ui';

export const metadata = { title: 'Segmentos · SIGH_FOOD' };
export const dynamic = 'force-dynamic';

const NOMBRES_RFM: Record<string, string> = {
  campeon: 'es Campeón',
  leal: 'es Cliente leal',
  en_riesgo: 'está en riesgo',
  dormido: 'está dormido',
  nuevo: 'es nuevo',
  prometedor: 'es prometedor',
};

/**
 * Traduce la regla guardada a algo legible por una persona.
 *
 * ANTES le faltaban tres claves —minPedidos, minGasto, segmentoRfm— que sí
 * existen de verdad en la base (ver segmentacion.ts, que sí las evalúa todas).
 * El efecto no era solo un texto raro: "Alta frecuencia", "Alto ticket",
 * "Campeones", "Clientes leales", "Se están yendo" y "Ya se fueron" —seis de
 * los trece segmentos— mostraban "Sin condiciones" aunque su regla era
 * perfectamente válida.
 */
function describirRegla(regla: Record<string, unknown> | null): string[] {
  if (!regla) return ['Sin regla definida'];
  const partes: string[] = [];

  if (typeof regla.segmentoRfm === 'string') {
    partes.push(`Quien ${NOMBRES_RFM[regla.segmentoRfm] ?? regla.segmentoRfm} por valor (RFM)`);
  }
  if (typeof regla.minPedidos === 'number') {
    partes.push(`${regla.minPedidos} o más pedidos entregados`);
  }
  if (typeof regla.minGasto === 'number') {
    partes.push(`${moneda(regla.minGasto)} o más gastados`);
  }
  if (typeof regla.minEscaneos === 'number') {
    partes.push(`${regla.minEscaneos} o más momentos registrados`);
  }
  if (typeof regla.diasInactivo === 'number') {
    partes.push(`Más de ${regla.diasInactivo} días sin actividad`);
  }
  if (typeof regla.lineaProducto === 'string') {
    partes.push(`Ha probado ${etiquetaLinea(regla.lineaProducto)}`);
  }
  if (typeof regla.zona === 'string') {
    partes.push(`Consume en ${regla.zona}`);
  }
  if (typeof regla.franjaDesde === 'number' && typeof regla.franjaHasta === 'number') {
    partes.push(`Consume entre las ${regla.franjaDesde}h y las ${regla.franjaHasta}h`);
  }
  if (typeof regla.nivel === 'string') {
    partes.push(`Nivel ${regla.nivel}`);
  }

  return partes.length > 0 ? partes : ['Sin condiciones'];
}

/**
 * Filtros del directorio que más se acercan a la regla del segmento.
 *
 * No todos los criterios tienen filtro equivalente en /comensales —la franja
 * horaria, por ejemplo, no lo tiene— así que el enlace acerca al grupo, no lo
 * reproduce exactamente.
 */
function filtrosAproximados(regla: Record<string, unknown> | null): Record<string, string> {
  if (!regla) return {};
  if (typeof regla.lineaProducto === 'string') return { linea: regla.lineaProducto };
  if (typeof regla.zona === 'string') return { zona: regla.zona };
  if (typeof regla.diasInactivo === 'number') {
    return { actividad: regla.diasInactivo >= 45 ? 'dormidos' : 'riesgo' };
  }
  if (typeof regla.nivel === 'string') return { nivel: regla.nivel };
  return {};
}

export default async function PaginaSegmentos() {
  const [{ datos: segmentos, degradado, edadSegundos }, { datos: secuencias }, rol] = await Promise.all([
    segmentosConConteo(),
    secuenciasActivas(),
    rolActual(),
  ]);

  const puedeGestionar = puede(rol, 'segmentos.gestionar');
  const puedeDisparar = puede(rol, 'campanas.activar');

  const activos = segmentos.filter((s) => s.activo);
  const totalAlcance = activos.reduce((s, x) => s + x.comensales, 0);

  return (
    <>
      {degradado && <AvisoDegradado edadSegundos={edadSegundos} />}

      <Titulo accion={puedeGestionar ? <EditorSegmento /> : null}>Segmentos</Titulo>
      <p className="texto-suave -mt-2 mb-4 text-sm">
        Grupos de comensales que se recalculan solos. Un segmento guarda su regla, no la
        lista: quien deja de cumplirla sale del grupo sin que nadie lo toque.
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        <Metrica etiqueta="Segmentos activos" valor={numero(activos.length)} />
        <Metrica etiqueta="Definidos" valor={numero(segmentos.length)} />
        <Metrica
          etiqueta="Alcance sumado"
          valor={numero(totalAlcance)}
          detalle="un comensal puede estar en varios"
        />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {segmentos.length === 0 ? (
          <div className="md:col-span-2 xl:col-span-3">
            <Vacio>
              No hay segmentos definidos. Ejecuta{' '}
              <code className="cifras">node scripts/sembrar-b2c.mjs</code> para crear los iniciales.
            </Vacio>
          </div>
        ) : (
          segmentos.map((s) => (
            <Tarjeta key={s.id} className={s.activo ? '' : 'opacity-60'}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold">{s.nombre}</h2>
                  {s.descripcion && <p className="texto-suave mt-0.5 text-xs">{s.descripcion}</p>}
                </div>
                <Etiqueta tono={s.tipo === 'dinamico' ? 'info' : 'neutro'}>{s.tipo}</Etiqueta>
              </div>

              <p className="cifras mt-4 text-3xl font-semibold">{numero(s.comensales)}</p>
              <p className="texto-suave text-xs">
                comensal{s.comensales === 1 ? '' : 'es'} ahora mismo
              </p>

              {s.comensales > 0 && (
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
                  <span className="texto-suave">
                    LTV promedio <span className="cifras font-medium">{moneda(s.ltvPromedio)}</span>
                  </span>
                  {s.enRiesgo > 0 && (
                    <span className="text-amber-600 dark:text-amber-400">
                      {s.enRiesgo} en riesgo de fuga
                    </span>
                  )}
                </div>
              )}

              <ul className="texto-suave mt-3 space-y-1 border-t borde-tema pt-3 text-xs">
                {describirRegla(s.regla as Record<string, unknown> | null).map((linea) => (
                  <li key={linea}>· {linea}</li>
                ))}
              </ul>

              {s.comensales > 0 && (
                <Link
                  href={`/comensales?${new URLSearchParams(
                    filtrosAproximados(s.regla as Record<string, unknown> | null)
                  )}`}
                  className="mt-3 inline-block text-xs text-orange-600 hover:underline dark:text-orange-400"
                >
                  Ver comensales
                </Link>
              )}

              {puedeDisparar && (
                <LanzarCampana
                  segmentId={s.id}
                  segmentoNombre={s.nombre}
                  comensales={s.comensales}
                  secuencias={secuencias}
                />
              )}
            </Tarjeta>
          ))
        )}
      </div>
    </>
  );
}
