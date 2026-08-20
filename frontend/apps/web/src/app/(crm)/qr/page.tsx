import Link from 'next/link';
import { codigosQr } from '@/lib/consultas';
import { AvisoDegradado, Etiqueta, Metrica, Tarjeta, Titulo, Vacio, fecha, numero } from '@/components/ui';

export const metadata = { title: 'Códigos QR · SIGH_FOOD' };
export const dynamic = 'force-dynamic';

export default async function PaginaQr() {
  const { datos: codigos, degradado, edadSegundos } = await codigosQr(500);

  const activos = codigos.filter((c) => c.activo).length;
  const locales = new Set(codigos.map((c) => c.cuentaId)).size;

  // Agrupados por local: la lista plana de mesas de 1000 clientes no dice nada;
  // lo que se consulta es "qué mesas tiene este bar".
  const porLocal = new Map<string, typeof codigos>();
  for (const c of codigos) {
    const lista = porLocal.get(c.cuentaId) ?? [];
    lista.push(c);
    porLocal.set(c.cuentaId, lista);
  }

  return (
    <>
      {degradado && <AvisoDegradado edadSegundos={edadSegundos} />}

      <Titulo>Códigos QR</Titulo>

      <div className="grid gap-4 sm:grid-cols-3">
        <Metrica etiqueta="Códigos" valor={numero(codigos.length)} detalle={`${activos} activos`} />
        <Metrica etiqueta="Locales con QR" valor={numero(locales)} />
        <Metrica
          etiqueta="Mesas por local"
          valor={locales === 0 ? '0' : (codigos.length / locales).toFixed(1)}
          detalle="promedio"
        />
      </div>

      {codigos.length === 0 ? (
        <div className="mt-6"><Vacio>No hay códigos QR generados.</Vacio></div>
      ) : (
        <div className="mt-6 space-y-4">
          {[...porLocal.entries()].map(([cuentaId, mesas]) => {
            const primera = mesas[0];
            return (
              <Tarjeta key={cuentaId}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <Link href={`/clientes/${cuentaId}`} className="font-medium hover:underline">
                      {primera.cuenta}
                    </Link>
                    <p className="texto-suave text-xs">{primera.zona}</p>
                  </div>
                  <span className="texto-suave cifras text-sm">
                    {numero(primera.escaneosCuenta)} escaneos · {mesas.length} mesas
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {mesas.map((m) => (
                    <span
                      key={m.id}
                      className="superficie inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm"
                      title={`Alta: ${fecha(m.creado)}`}
                    >
                      Mesa {m.mesa}
                      <Etiqueta tono={m.activo ? 'exito' : 'neutro'}>
                        {m.activo ? 'activo' : 'inactivo'}
                      </Etiqueta>
                    </span>
                  ))}
                </div>
              </Tarjeta>
            );
          })}
        </div>
      )}
    </>
  );
}
