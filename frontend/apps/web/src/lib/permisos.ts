// =============================================================================
// Control de acceso: la parte que necesita la sesión
// =============================================================================
//
// La tabla de roles y permisos vive en lib/roles.ts, que no importa nada del
// servidor. Aquí solo está lo que necesita leer la sesión —y por tanto arrastra
// `@/auth` y con él postgres.js—.
//
// La separación no es estética: un componente cliente que importara este archivo
// para pintar la etiqueta de un rol metía el driver de Postgres entero en el
// bundle del navegador, y el build de Workers lo rechaza.

import { auth } from '@/auth';
import { rolValido, type Rol } from '@/lib/roles';

export {
  ETIQUETAS_ROL,
  SinPermiso,
  puede,
  permisosDe,
  rolValido,
  type Permiso,
  type Rol,
} from '@/lib/roles';

import { puede, SinPermiso, type Permiso } from '@/lib/roles';

/** Rol de la sesión actual. `lectura` si no hay sesión: cerrado por defecto. */
export async function rolActual(): Promise<Rol> {
  const sesion = await auth();
  return rolValido((sesion?.user as { role?: string } | undefined)?.role);
}

export interface Actor {
  id: string;
  email: string;
  rol: Rol;
}

/** Quién está haciendo la acción, o null si no hay sesión. */
export async function actorActual(): Promise<Actor | null> {
  const sesion = await auth();
  if (!sesion?.user) return null;
  const u = sesion.user as { id?: string; email?: string | null; role?: string };
  return {
    id: u.id ?? '',
    email: u.email ?? 'desconocido',
    rol: rolValido(u.role),
  };
}

/**
 * Exige un permiso y devuelve quién actúa.
 *
 * Toda escritura empieza por aquí. Comprobarlo solo en la interfaz —ocultando
 * un botón— no protege nada: la Server Action sigue siendo invocable, y quien
 * sepa hacerlo la invoca igual.
 */
export async function exigir(permiso: Permiso): Promise<Actor> {
  const actor = await actorActual();
  if (!actor) throw new SinPermiso(permiso, 'lectura');
  if (!puede(actor.rol, permiso)) throw new SinPermiso(permiso, actor.rol);
  return actor;
}
