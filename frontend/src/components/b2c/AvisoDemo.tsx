/**
 * ============================================================================
 * Aviso de contenido de ejemplo
 * ============================================================================
 *
 * Solo aparece con MODO_DEMO activo, y existe por un motivo concreto: esta
 * página YA está publicada. Cualquiera puede entrar hoy, leer una reseña que
 * nadie escribió y creérsela — o presentarse en una dirección que no existe.
 *
 * Con el aviso, la estructura se puede revisar entera sin que eso pase. Es una
 * franja fina, arriba del todo, que no estorba para juzgar el diseño.
 *
 * Cuando los datos sean reales: MODO_DEMO a `false` en datos.ts y esto
 * desaparece solo.
 */

import { MODO_DEMO } from './datos';

export default function AvisoDemo() {
  if (!MODO_DEMO) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[60] bg-[#d97325] px-4 py-1.5 text-center text-xs font-medium text-[#12100e]">
      Vista previa · La dirección, los horarios, los domicilios y las reseñas son
      datos de ejemplo
    </div>
  );
}
