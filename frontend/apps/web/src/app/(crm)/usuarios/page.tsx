import { redirect } from 'next/navigation';
import { listarUsuarios } from '@/lib/consultas-b2c';
import { actorActual, ETIQUETAS_ROL, permisosDe, puede, type Rol } from '@/lib/permisos';
import { NuevoUsuario, ControlesUsuario } from './GestionUsuarios';
import {
  AvisoDegradado,
  Etiqueta,
  Tarjeta,
  Titulo,
  Vacio,
  desde,
  fecha,
} from '@/components/ui';

export const metadata = { title: 'Usuarios · SIGH_FOOD' };
export const dynamic = 'force-dynamic';

const TONO_ROL: Record<Rol, 'marca' | 'info' | 'neutro'> = {
  admin: 'marca',
  comercial: 'info',
  lectura: 'neutro',
};

export default async function PaginaUsuarios() {
  const actor = await actorActual();

  // Se comprueba aquí y no solo en el menú: la URL es adivinable, y esta
  // pantalla enseña quién tiene acceso al sistema.
  if (!actor || !puede(actor.rol, 'usuarios.gestionar')) {
    redirect('/panel');
  }

  const { datos: usuarios, degradado, edadSegundos } = await listarUsuarios();

  const admins = usuarios.filter((u) => u.rol === 'admin' && u.activo).length;

  return (
    <>
      {degradado && <AvisoDegradado edadSegundos={edadSegundos} />}

      <Titulo accion={<NuevoUsuario />}>Usuarios</Titulo>
      <p className="texto-suave -mt-2 mb-4 text-sm">
        Quién puede entrar al CRM y qué puede hacer.
      </p>

      {admins === 1 && (
        <div
          role="status"
          className="mb-4 rounded-md border border-amber-700/50 bg-amber-950/30 px-4 py-3 text-sm text-amber-200"
        >
          <strong className="font-semibold">Solo hay un administrador.</strong> Si pierde el
          acceso, nadie podrá gestionar usuarios ni calibrar el agente. Conviene tener un segundo.
        </div>
      )}

      <Tarjeta>
        {usuarios.length === 0 ? (
          <Vacio>No hay usuarios. Algo va mal: al menos deberías estar tú.</Vacio>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] text-sm">
              <thead className="texto-suave border-b borde-tema text-left text-xs uppercase tracking-wide">
                <tr>
                  <th className="pb-2 pr-3 font-medium">Usuario</th>
                  <th className="pb-2 pr-3 font-medium">Rol</th>
                  <th className="pb-2 pr-3 font-medium">Último acceso</th>
                  <th className="pb-2 pr-3 font-medium">Alta</th>
                  <th className="pb-2 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y borde-tema">
                {usuarios.map((u) => (
                  <tr key={u.id} className={u.activo ? '' : 'opacity-50'}>
                    <td className="py-2.5 pr-3">
                      <p className="font-medium">
                        {u.nombre}
                        {u.id === actor.id && <span className="texto-suave ml-2 text-xs">(tú)</span>}
                      </p>
                      <p className="texto-suave text-xs">{u.email}</p>
                    </td>
                    <td className="py-2.5 pr-3">
                      <Etiqueta tono={TONO_ROL[u.rol as Rol] ?? 'neutro'}>
                        {ETIQUETAS_ROL[u.rol as Rol] ?? u.rol}
                      </Etiqueta>
                      {!u.activo && <Etiqueta tono="neutro">inactivo</Etiqueta>}
                    </td>
                    <td className="texto-suave py-2.5 pr-3 text-xs">
                      {u.ultimoAcceso ? desde(u.ultimoAcceso) : 'nunca'}
                    </td>
                    <td className="texto-suave py-2.5 pr-3 text-xs">{fecha(u.alta)}</td>
                    <td className="py-2.5">
                      <ControlesUsuario
                        id={u.id}
                        rol={u.rol as Rol}
                        activo={u.activo}
                        esUnoMismo={u.id === actor.id}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>

      {/* Qué implica cada rol, para que elegir uno sea una decisión informada. */}
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {(['admin', 'comercial', 'lectura'] as Rol[]).map((r) => {
          const permisos = permisosDe(r);
          return (
            <Tarjeta key={r} titulo={ETIQUETAS_ROL[r]}>
              {permisos.length === 0 ? (
                <p className="texto-suave text-xs">
                  Solo consulta. No puede escribir nada ni exportar datos: un CSV con el
                  WhatsApp de todos los comensales no debe salir sin control.
                </p>
              ) : (
                <ul className="texto-suave space-y-1 text-xs">
                  {permisos.map((p) => (
                    <li key={p}>· {p.replace('.', ': ').replace(/_/g, ' ')}</li>
                  ))}
                </ul>
              )}
            </Tarjeta>
          );
        })}
      </div>
    </>
  );
}
