// =============================================================================
// Contenido y activaciones
// =============================================================================
//
// Las dos mitades de la misma pregunta: qué publicamos para que la gente nos
// conozca, y dónde la ponemos delante del producto.
//
// Van en una sola pantalla y no en dos secciones porque se planifican juntas —un
// pop-up sin contenido que lo anuncie no llena, y un reel de un evento se graba
// en el evento—, y separarlas obligaría a saltar entre pantallas para preparar
// la misma semana.

import { listarContenidos, listarActivaciones, qrParaActivaciones } from '@/lib/consultas-contenido';
import { puede, rolActual } from '@/lib/permisos';
import { etiquetaLinea } from '@/lib/catalogo-b2c';
import { EditorContenido, TIPOS, CANALES, ESTADOS } from './EditorContenido';
import { EditorActivacion, TIPOS_ACTIVACION, ESTADOS_ACTIVACION } from './EditorActivacion';
import { Etiqueta, Metrica, Tarjeta, Titulo, Vacio, desde, numero } from '@/components/ui';

export const metadata = { title: 'Contenido · SIGH_FOOD' };
export const dynamic = 'force-dynamic';

function pesos(cop: number | null): string {
  return cop === null ? '—' : `$${cop.toLocaleString('es-CO')}`;
}

const texto = (lista: Array<{ valor: string; texto: string }>, valor: string) =>
  lista.find((x) => x.valor === valor)?.texto ?? valor;

const TONO_ESTADO: Record<string, 'exito' | 'aviso' | 'info' | 'neutro' | 'riesgo'> = {
  publicado: 'exito',
  listo: 'info',
  produccion: 'aviso',
  idea: 'neutro',
  archivado: 'neutro',
  realizada: 'exito',
  confirmada: 'info',
  planificada: 'aviso',
  cancelada: 'riesgo',
};

export default async function PaginaContenido() {
  const [biblioteca, eventos, qr, rol] = await Promise.all([
    listarContenidos(),
    listarActivaciones(),
    qrParaActivaciones(),
    rolActual(),
  ]);

  const puedeContenido = puede(rol, 'contenido.gestionar');
  const puedeActivaciones = puede(rol, 'activaciones.gestionar');

  const publicadas = biblioteca.porEstado.find((e) => e.estado === 'publicado')?.total ?? 0;
  const enMarcha = biblioteca.porEstado
    .filter((e) => e.estado === 'produccion' || e.estado === 'listo')
    .reduce((s, e) => s + e.total, 0);

  const t = eventos.totales;
  // Retorno solo si hay coste registrado: dividir por cero da Infinity, y un
  // "∞% de retorno" en pantalla es peor que no enseñar nada.
  const retorno = t && t.coste > 0 ? Math.round(((t.ventas - t.coste) / t.coste) * 100) : null;

  return (
    <>
      <Titulo>Contenido y activaciones</Titulo>
      <p className="texto-suave -mt-2 mb-4 max-w-3xl text-sm">
        Lo que se publica para que te conozcan, y dónde pones el producto delante de la gente.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metrica etiqueta="Piezas publicadas" valor={numero(publicadas)} detalle="en la biblioteca" />
        <Metrica
          etiqueta="En marcha"
          valor={numero(enMarcha)}
          detalle="en producción o listas"
          tono={enMarcha > 0 ? 'marca' : 'neutro'}
        />
        <Metrica
          etiqueta="Comensales nuevos"
          valor={numero(t?.nuevos ?? 0)}
          detalle="captados en activaciones"
          tono={(t?.nuevos ?? 0) > 0 ? 'exito' : 'neutro'}
        />
        <Metrica
          etiqueta="Retorno de activaciones"
          valor={retorno === null ? '—' : `${retorno > 0 ? '+' : ''}${retorno}%`}
          detalle={
            retorno === null
              ? 'sin costes registrados todavía'
              : `${pesos(t.ventas)} vendidos · ${pesos(t.coste)} gastados`
          }
          tono={retorno === null ? 'neutro' : retorno >= 0 ? 'exito' : 'riesgo'}
        />
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Activaciones                                                      */}
      {/* ---------------------------------------------------------------- */}
      <div className="mt-6">
        <Tarjeta
          titulo="Activaciones presenciales"
          accion={puedeActivaciones ? <EditorActivacion qrDisponibles={qr} /> : undefined}
        >
          {eventos.filas.length === 0 ? (
            <Vacio>
              Todavía no hay activaciones. Un pop-up o una degustación con su propio QR es la forma
              más barata de convertir a quien prueba el producto en alguien que está en tu base.
            </Vacio>
          ) : (
            <ul className="divide-y borde-tema">
              {eventos.filas.map((a) => (
                <li key={a.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{a.nombre}</span>
                      <Etiqueta tono={TONO_ESTADO[a.estado] ?? 'neutro'}>
                        {texto(ESTADOS_ACTIVACION, a.estado)}
                      </Etiqueta>
                      <Etiqueta tono="info">{texto(TIPOS_ACTIVACION, a.tipo)}</Etiqueta>
                      {a.qrMesa && <Etiqueta tono="info">QR {a.qrMesa}</Etiqueta>}
                    </div>
                    <p className="texto-suave mt-0.5 truncate text-xs">
                      {a.lugar} · {new Date(a.fecha).toLocaleString('es-CO')}
                    </p>
                    {a.estado === 'realizada' && (
                      <p className="texto-suave cifras mt-1 text-xs">
                        {numero(a.asistentes ?? 0)} asistentes ·{' '}
                        {numero(a.comensalesNuevos ?? 0)} comensales nuevos ·{' '}
                        {pesos(a.ventasCOP)} vendidos · {pesos(a.costeCOP)} de coste
                      </p>
                    )}
                  </div>
                  {puedeActivaciones && (
                    <EditorActivacion
                      activacion={{
                        id: a.id,
                        nombre: a.nombre,
                        tipo: a.tipo,
                        estado: a.estado,
                        lugar: a.lugar,
                        fecha: a.fecha,
                        qrCodeId: a.qrCodeId,
                        aforoEstimado: a.aforoEstimado,
                        asistentes: a.asistentes,
                        comensalesNuevos: a.comensalesNuevos,
                        ventasCOP: a.ventasCOP,
                        costeCOP: a.costeCOP,
                        notas: a.notas,
                      }}
                      qrDisponibles={qr}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Biblioteca                                                        */}
      {/* ---------------------------------------------------------------- */}
      <div className="mt-4">
        <Tarjeta
          titulo="Biblioteca de contenido sensorial"
          accion={puedeContenido ? <EditorContenido /> : undefined}
        >
          {biblioteca.filas.length === 0 ? (
            <Vacio>
              La biblioteca está vacía. Empieza por lo que ya sabes que funciona en la mesa: la
              reacción de alguien al primer bocado es el mejor guion que vas a encontrar.
            </Vacio>
          ) : (
            <ul className="divide-y borde-tema">
              {biblioteca.filas.map((c) => (
                <li key={c.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {c.url ? (
                        <a
                          href={c.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="text-sm font-medium hover:underline"
                        >
                          {c.titulo}
                        </a>
                      ) : (
                        <span className="text-sm font-medium">{c.titulo}</span>
                      )}
                      <Etiqueta tono={TONO_ESTADO[c.estado] ?? 'neutro'}>
                        {texto(ESTADOS, c.estado)}
                      </Etiqueta>
                      <Etiqueta tono="info">{texto(CANALES, c.canal)}</Etiqueta>
                    </div>
                    {c.gancho && <p className="texto-suave mt-0.5 truncate text-xs italic">«{c.gancho}»</p>}
                    <p className="texto-suave mt-0.5 truncate text-xs">
                      {texto(TIPOS, c.tipo)}
                      {c.lineaProducto ? ` · ${etiquetaLinea(c.lineaProducto)}` : ' · transversal'}
                      {c.publicadoEn ? ` · publicado ${desde(c.publicadoEn)}` : ''}
                      {c.alcance !== null ? ` · ${numero(c.alcance)} de alcance` : ''}
                      {c.interacciones !== null ? ` · ${numero(c.interacciones)} interacciones` : ''}
                    </p>
                  </div>
                  {puedeContenido && (
                    <EditorContenido
                      pieza={{
                        id: c.id,
                        titulo: c.titulo,
                        tipo: c.tipo,
                        canal: c.canal,
                        lineaProducto: c.lineaProducto,
                        estado: c.estado,
                        gancho: c.gancho,
                        notas: c.notas,
                        url: c.url,
                        alcance: c.alcance,
                        interacciones: c.interacciones,
                      }}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>
      </div>
    </>
  );
}
