// =============================================================================
// Control de acceso por rol (RBAC)
// =============================================================================
//
// Hasta ahora el rol se guardaba en la sesión y se pintaba bajo el nombre del
// usuario, pero no impedía nada: cualquiera con sesión podía hacer cualquier
// cosa. Daba igual mientras el CRM solo leía. Deja de dar igual en cuanto puede
// mover puntos, canjear premios o enviar mensajes a personas reales.
//
// El modelo es de lista blanca: un permiso que no aparezca aquí no lo tiene
// nadie. Añadir una capacidad exige nombrarla, y eso obliga a pensar quién
// debería poder usarla.

import { auth } from '@/auth';

export type Rol = 'admin' | 'comercial' | 'lectura';

export type Permiso =
  // Fidelización
  | 'premios.gestionar'      // crear y editar el catálogo
  | 'canjes.emitir'          // gastar puntos de un comensal
  | 'canjes.entregar'        // marcar un canje como entregado en la mesa
  | 'canjes.anular'          // revertir un canje y devolver los puntos
  | 'puntos.ajustar'         // sumar o restar puntos a mano
  | 'desafios.gestionar'
  // Comensales
  | 'comensales.editar'
  | 'consentimientos.revocar'
  | 'resenas.moderar'
  // Mensajería
  | 'campanas.editar'
  | 'campanas.activar'       // empieza a enviar a personas reales
  | 'campanas.probar'
  // QR
  | 'qr.gestionar'
  | 'qr.redirigir'
  // Agente IA
  | 'agente.aprobar'
  | 'agente.calibrar'
  | 'agente.sandbox'
  // Sistema
  | 'datos.exportar'
  | 'usuarios.gestionar';

/**
 * Qué puede hacer cada rol.
 *
 * `comercial` opera el día a día pero no toca la configuración del agente ni
 * los usuarios: calibrar un umbral o activar una campaña cambia el
 * comportamiento del sistema para todos, no solo para un comensal.
 *
 * `lectura` no escribe nada. Ni siquiera exporta: un CSV con los WhatsApp de
 * todos los comensales es exactamente el dato que no debe salir sin control.
 */
const PERMISOS_POR_ROL: Record<Rol, readonly Permiso[]> = {
  admin: [
    'premios.gestionar', 'canjes.emitir', 'canjes.entregar', 'canjes.anular',
    'puntos.ajustar', 'desafios.gestionar',
    'comensales.editar', 'consentimientos.revocar', 'resenas.moderar',
    'campanas.editar', 'campanas.activar', 'campanas.probar',
    'qr.gestionar', 'qr.redirigir',
    'agente.aprobar', 'agente.calibrar', 'agente.sandbox',
    'datos.exportar', 'usuarios.gestionar',
  ],
  comercial: [
    'canjes.emitir', 'canjes.entregar',
    'comensales.editar', 'consentimientos.revocar', 'resenas.moderar',
    'campanas.editar', 'campanas.probar',
    'qr.gestionar',
    'datos.exportar',
  ],
  lectura: [],
};

export function rolValido(valor: unknown): Rol {
  return valor === 'admin' || valor === 'comercial' ? valor : 'lectura';
}

export function puede(rol: Rol, permiso: Permiso): boolean {
  return PERMISOS_POR_ROL[rol].includes(permiso);
}

export function permisosDe(rol: Rol): readonly Permiso[] {
  return PERMISOS_POR_ROL[rol];
}

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

/** Se lanza cuando falta un permiso. La capturan las Server Actions. */
export class SinPermiso extends Error {
  constructor(public readonly permiso: Permiso, public readonly rol: Rol) {
    super(`El rol "${rol}" no puede "${permiso}"`);
    this.name = 'SinPermiso';
  }
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

export const ETIQUETAS_ROL: Record<Rol, string> = {
  admin: 'Administrador',
  comercial: 'Comercial',
  lectura: 'Solo lectura',
};
