// =============================================================================
// Roles y permisos: la parte que también vale en el navegador
// =============================================================================
//
// Vive separada de permisos.ts porque aquel importa `@/auth` para leer la
// sesión, y `@/auth` arrastra postgres.js. Un componente cliente que solo
// quisiera la etiqueta de un rol acababa metiendo el driver de Postgres entero
// en el bundle del navegador, y el build de Workers lo rechaza.
//
// Aquí no hay nada que toque la sesión ni la base: solo la tabla de qué puede
// hacer cada rol, que es información estática.

export type Rol = 'admin' | 'comercial' | 'lectura';

export type Permiso =
  // Fidelización
  | 'premios.gestionar'
  | 'canjes.emitir'
  | 'canjes.entregar'
  | 'canjes.anular'
  | 'puntos.ajustar'
  | 'desafios.gestionar'
  // Comensales
  | 'comensales.editar'
  | 'consentimientos.revocar'
  | 'resenas.moderar'
  // Mensajería
  | 'campanas.editar'
  | 'campanas.activar'
  | 'campanas.probar'
  | 'segmentos.gestionar'
  // Pedidos de la tienda
  | 'pedidos.ver'
  | 'pedidos.avanzar'
  | 'productos.gestionar'
  // QR
  | 'qr.gestionar'
  | 'qr.redirigir'
  // Contenido, activaciones y embajadores
  | 'contenido.gestionar'
  | 'activaciones.gestionar'
  | 'embajadores.gestionar'
  // Agente IA
  | 'agente.aprobar'
  | 'agente.calibrar'
  | 'agente.sandbox'
  // Sistema
  | 'datos.exportar'
  | 'usuarios.gestionar'
  // Motor financiero
  | 'caja.abrir'
  | 'caja.cerrar'
  | 'caja.ver'
  | 'inventario.ver'
  | 'inventario.gestionar'
  | 'finanzas.ver';

/**
 * Qué puede hacer cada rol.
 *
 * `comercial` opera el día a día pero no toca la configuración del agente ni
 * los usuarios: calibrar un umbral o activar una campaña cambia el
 * comportamiento del sistema para todos, no solo para un comensal.
 *
 * Tampoco da de alta embajadores, aunque sí publica contenido y monta
 * activaciones. La diferencia es económica: dar de alta a un embajador fija una
 * recompensa que se paga en cada pedido que traiga, indefinidamente. Publicar
 * un reel no compromete dinero futuro.
 *
 * `lectura` no escribe nada. Ni siquiera exporta: un CSV con los WhatsApp de
 * todos los comensales es exactamente el dato que no debe salir sin control.
 *
 * Del motor financiero, `comercial` solo abre y cierra caja —opera el
 * mostrador— pero no ve costos, márgenes ni redefine fichas técnicas: son
 * decisiones económicas y el dato más sensible del negocio, mismo criterio
 * que ya excluye a `comercial` de `embajadores.gestionar`.
 */
const PERMISOS_POR_ROL: Record<Rol, readonly Permiso[]> = {
  admin: [
    'pedidos.ver', 'pedidos.avanzar', 'productos.gestionar',
    'premios.gestionar', 'canjes.emitir', 'canjes.entregar', 'canjes.anular',
    'puntos.ajustar', 'desafios.gestionar',
    'comensales.editar', 'consentimientos.revocar', 'resenas.moderar',
    'campanas.editar', 'campanas.activar', 'campanas.probar', 'segmentos.gestionar',
    'qr.gestionar', 'qr.redirigir',
    'contenido.gestionar', 'activaciones.gestionar', 'embajadores.gestionar',
    'agente.aprobar', 'agente.calibrar', 'agente.sandbox',
    'datos.exportar', 'usuarios.gestionar',
    'caja.abrir', 'caja.cerrar', 'caja.ver', 'inventario.ver', 'inventario.gestionar', 'finanzas.ver',
  ],
  comercial: [
    'pedidos.ver', 'pedidos.avanzar',
    'canjes.emitir', 'canjes.entregar',
    'comensales.editar', 'consentimientos.revocar', 'resenas.moderar',
    'campanas.editar', 'campanas.probar',
    'qr.gestionar',
    'contenido.gestionar', 'activaciones.gestionar',
    'datos.exportar',
    'caja.abrir', 'caja.cerrar', 'caja.ver',
  ],
  lectura: [],
};

/** Cualquier valor que no sea un rol conocido se trata como `lectura`. */
export function rolValido(valor: unknown): Rol {
  return valor === 'admin' || valor === 'comercial' ? valor : 'lectura';
}

export function puede(rol: Rol, permiso: Permiso): boolean {
  return PERMISOS_POR_ROL[rol].includes(permiso);
}

export function permisosDe(rol: Rol): readonly Permiso[] {
  return PERMISOS_POR_ROL[rol];
}

export const ETIQUETAS_ROL: Record<Rol, string> = {
  admin: 'Administrador',
  comercial: 'Comercial',
  lectura: 'Solo lectura',
};

/** Se lanza cuando falta un permiso. La capturan las Server Actions. */
export class SinPermiso extends Error {
  constructor(public readonly permiso: Permiso, public readonly rol: Rol) {
    super(`El rol "${rol}" no puede "${permiso}"`);
    this.name = 'SinPermiso';
  }
}
