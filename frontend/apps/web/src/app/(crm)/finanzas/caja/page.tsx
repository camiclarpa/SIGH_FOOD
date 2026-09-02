import { redirect } from 'next/navigation';
import { actorActual, puede } from '@/lib/permisos';
import { sesionAbierta, historialCaja } from '@/lib/consultas-caja';
import { AvisoDegradado, Etiqueta, Tarjeta, Titulo, Vacio, desde, moneda } from '@/components/ui';
import { AbrirCaja } from './AbrirCaja';
import { CerrarCaja } from './CerrarCaja';

export const metadata = { title: 'Caja · SIGH_FOOD' };
export const dynamic = 'force-dynamic';

export default async function PaginaCaja() {
  const actor = await actorActual();
  if (!actor || !puede(actor.rol, 'caja.ver')) {
    redirect('/panel');
  }

  const [{ datos: sesion, degradado, edadSegundos }, { datos: historial }] = await Promise.all([
    sesionAbierta(),
    historialCaja(20),
  ]);

  const puedeAbrir = puede(actor.rol, 'caja.abrir');
  const puedeCerrar = puede(actor.rol, 'caja.cerrar');

  return (
    <>
      {degradado && <AvisoDegradado edadSegundos={edadSegundos} />}

      <Titulo>Caja</Titulo>
      <p className="texto-suave -mt-2 mb-4 text-sm">
        Abre la caja con el efectivo con el que empiezas el turno; el sistema calcula solo cuánto debería
        haber en cualquier momento a partir de los pedidos pagados en efectivo. Al cerrar, cuentas el
        efectivo real y ves la diferencia.
      </p>

      <Tarjeta titulo={sesion ? 'Sesión abierta' : 'Sin sesión abierta'}>
        {sesion ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <p className="texto-suave text-xs">Monto inicial</p>
                <p className="cifras text-lg font-medium">{moneda(sesion.montoInicialCOP)}</p>
              </div>
              <div>
                <p className="texto-suave text-xs">Efectivo esperado ahora</p>
                <p className="cifras text-lg font-medium">{moneda(sesion.efectivoEsperadoEnVivo)}</p>
              </div>
              <div>
                <p className="texto-suave text-xs">Abierta</p>
                <p className="text-sm">{desde(sesion.abiertaEn)}</p>
              </div>
            </div>
            {puedeCerrar ? (
              <CerrarCaja id={sesion.id} efectivoEsperadoEnVivo={sesion.efectivoEsperadoEnVivo} />
            ) : (
              <p className="texto-suave text-xs">No tienes permiso para cerrar caja.</p>
            )}
          </div>
        ) : puedeAbrir ? (
          <AbrirCaja />
        ) : (
          <Vacio>No hay ninguna caja abierta.</Vacio>
        )}
      </Tarjeta>

      <div className="mt-6">
        <Tarjeta titulo="Historial de cierres">
          {historial.length === 0 ? (
            <Vacio>Todavía no se ha cerrado ninguna caja.</Vacio>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[40rem] text-sm">
                <thead className="texto-suave border-b borde-tema text-left text-xs uppercase tracking-wide">
                  <tr>
                    <th className="pb-2 pr-3 font-medium">Cerrada</th>
                    <th className="pb-2 pr-3 font-medium">Abrió</th>
                    <th className="pb-2 pr-3 font-medium">Cerró</th>
                    <th className="pb-2 pr-3 text-right font-medium">Esperado</th>
                    <th className="pb-2 pr-3 text-right font-medium">Contado</th>
                    <th className="pb-2 text-right font-medium">Diferencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y borde-tema">
                  {historial.map((s) => {
                    const diferencia = Number(s.diferenciaCOP ?? 0);
                    return (
                      <tr key={s.id}>
                        <td className="py-2 pr-3">{desde(s.cerradaEn)}</td>
                        <td className="py-2 pr-3">{s.abiertaPorNombre ?? '—'}</td>
                        <td className="py-2 pr-3">{s.cerradaPorNombre ?? '—'}</td>
                        <td className="cifras py-2 pr-3 text-right">{moneda(s.efectivoEsperadoCOP)}</td>
                        <td className="cifras py-2 pr-3 text-right">{moneda(s.efectivoContadoCOP)}</td>
                        <td className="py-2 text-right">
                          <Etiqueta tono={diferencia === 0 ? 'exito' : diferencia > 0 ? 'info' : 'riesgo'}>
                            {moneda(diferencia)}
                          </Etiqueta>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Tarjeta>
      </div>
    </>
  );
}
