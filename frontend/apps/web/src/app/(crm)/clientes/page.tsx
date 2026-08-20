import Link from 'next/link';
import { listarCuentas, listarZonas, ETAPAS_PIPELINE, type CampoOrden } from '@/lib/consultas';
import { redirect } from 'next/navigation';
import { B2B_ACTIVO } from '@/lib/modulos';
import {
  ETAPAS,
  EtiquetaEtapa,
  EtiquetaRiesgo,
  Tarjeta,
  Titulo,
  Vacio,
  desde,
  numero,
  AvisoDegradado,
} from '@/components/ui';

export const metadata = { title: 'Clientes · SIGH_FOOD' };
export const dynamic = 'force-dynamic';

type Busqueda = {
  pagina?: string;
  buscar?: string;
  etapa?: string;
  zona?: string;
  riesgo?: string;
  orden?: string;
  dir?: string;
};

const ORDENES: CampoOrden[] = ['nombre', 'zona', 'creado', 'actividad', 'churn', 'stock'];

export default async function PaginaClientes({
  searchParams,
}: {
  searchParams: Promise<Busqueda>;
}) {
  // El canal B2B está pausado (ver lib/modulos.ts). Se redirige en vez de
  // ocultar solo el menú: un enlace guardado llevaría a una pantalla activa de
  // un módulo que se decidió no operar, y eso confunde más que un redirect.
  if (!B2B_ACTIVO) redirect('/panel');

  const p = await searchParams;

  // Los parámetros llegan de la URL, así que se validan antes de usarlos:
  // `?orden=;drop` no debe llegar nunca a la cláusula de ordenación.
  const orden = ORDENES.includes(p.orden as CampoOrden) ? (p.orden as CampoOrden) : 'creado';
  const dir = p.dir === 'asc' ? 'asc' : 'desc';
  const pagina = Math.max(1, Number(p.pagina) || 1);

  const [cuentas, listaZonas] = await Promise.all([
    listarCuentas({
      pagina,
      limite: 25,
      buscar: p.buscar?.trim() || undefined,
      etapa: p.etapa || undefined,
      zona: p.zona || undefined,
      riesgo: p.riesgo || undefined,
      orden,
      dir,
    }),
    listarZonas(),
  ]);

  const { filas, paginacion } = cuentas.datos;
  const zonas = listaZonas.datos;
  // Basta con que una de las dos venga del respaldo para avisar: la pantalla
  // mezcla ambas y sería engañoso presentarla como si estuviera al día.
  const degradado = cuentas.degradado || listaZonas.degradado;
  const edadSegundos = cuentas.edadSegundos ?? listaZonas.edadSegundos;

  /** Conserva los filtros al cambiar de página. */
  const enlacePagina = (n: number) => {
    const q = new URLSearchParams();
    if (p.buscar) q.set('buscar', p.buscar);
    if (p.etapa) q.set('etapa', p.etapa);
    if (p.zona) q.set('zona', p.zona);
    if (p.riesgo) q.set('riesgo', p.riesgo);
    q.set('orden', orden);
    q.set('dir', dir);
    q.set('pagina', String(n));
    return `/clientes?${q}`;
  };

  return (
    <>
      {degradado && <AvisoDegradado edadSegundos={edadSegundos} />}

      <Titulo
        accion={
          <span className="texto-suave cifras text-sm">
            {numero(paginacion.total)} {paginacion.total === 1 ? 'cliente' : 'clientes'}
          </span>
        }
      >
        Clientes
      </Titulo>

      {/* GET y no un formulario con estado: así los filtros quedan en la URL y
          la vista filtrada se puede compartir o guardar en marcadores. */}
      <form method="get" className="superficie mb-5 grid gap-3 rounded-xl border p-4 sm:grid-cols-2 lg:grid-cols-5">
        <input
          type="search"
          name="buscar"
          defaultValue={p.buscar ?? ''}
          placeholder="Nombre, email o contacto"
          className="superficie rounded-lg border px-3 py-2 text-sm lg:col-span-2"
        />
        <select name="etapa" defaultValue={p.etapa ?? ''} className="superficie rounded-lg border px-3 py-2 text-sm">
          <option value="">Todas las etapas</option>
          {ETAPAS_PIPELINE.map((e) => (
            <option key={e} value={e}>{ETAPAS[e]?.texto ?? e}</option>
          ))}
        </select>
        <select name="zona" defaultValue={p.zona ?? ''} className="superficie rounded-lg border px-3 py-2 text-sm">
          <option value="">Todas las zonas</option>
          {zonas.map((z) => (
            <option key={z} value={z}>{z}</option>
          ))}
        </select>
        <div className="flex gap-2">
          <select name="riesgo" defaultValue={p.riesgo ?? ''} className="superficie flex-1 rounded-lg border px-3 py-2 text-sm">
            <option value="">Todo riesgo</option>
            <option value="low">Bajo</option>
            <option value="medium">Medio</option>
            <option value="high">Alto</option>
            <option value="critical">Crítico</option>
          </select>
          <button type="submit" className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600">
            Filtrar
          </button>
        </div>
      </form>

      {filas.length === 0 ? (
        <Vacio>No hay clientes que coincidan con estos filtros.</Vacio>
      ) : (
        <Tarjeta className="overflow-hidden !p-0">
          {/* overflow-x-auto: la tabla es ancha y debe desplazarse dentro de su
              contenedor, no empujar el ancho de la página en móvil. */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="texto-suave border-b borde-tema text-left text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Zona</th>
                  <th className="px-4 py-3 font-medium">Etapa</th>
                  <th className="px-4 py-3 text-right font-medium">Stock</th>
                  <th className="px-4 py-3 font-medium">Riesgo</th>
                  <th className="px-4 py-3 font-medium">Actividad</th>
                </tr>
              </thead>
              <tbody className="divide-y borde-tema">
                {filas.map((c) => {
                  const bajoStock = (c.stock ?? 0) <= (c.umbralAlerta ?? 0);
                  return (
                    <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-3">
                        <Link href={`/clientes/${c.id}`} className="font-medium hover:underline">
                          {c.nombre}
                        </Link>
                        <p className="texto-suave text-xs">{c.contacto}</p>
                      </td>
                      <td className="texto-suave px-4 py-3">{c.zona}</td>
                      <td className="px-4 py-3"><EtiquetaEtapa etapa={c.etapa} /></td>
                      <td className={`cifras px-4 py-3 text-right ${bajoStock ? 'font-semibold text-red-600 dark:text-red-400' : ''}`}>
                        {numero(c.stock)}
                      </td>
                      <td className="px-4 py-3"><EtiquetaRiesgo riesgo={c.riesgoChurn} /></td>
                      <td className="texto-suave px-4 py-3 text-xs">{desde(c.ultimaActividad)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Tarjeta>
      )}

      {paginacion.paginas > 1 && (
        <nav className="mt-4 flex items-center justify-between gap-3 text-sm">
          {pagina > 1 ? (
            <Link href={enlacePagina(pagina - 1)} className="superficie rounded-lg border px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800">
              Anterior
            </Link>
          ) : (
            <span />
          )}
          <span className="texto-suave cifras">
            Página {pagina} de {paginacion.paginas}
          </span>
          {pagina < paginacion.paginas ? (
            <Link href={enlacePagina(pagina + 1)} className="superficie rounded-lg border px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800">
              Siguiente
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </>
  );
}
