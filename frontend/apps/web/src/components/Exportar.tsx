// =============================================================================
// Botón de exportación a CSV
// =============================================================================
//
// Es un enlace normal, no un fetch: el navegador ya sabe descargar un archivo
// cuando el servidor manda Content-Disposition, y hacerlo con JavaScript
// obligaría a montar un Blob y una URL temporal para conseguir lo mismo peor.

import type { TablaExportable } from '@/app/api/exportar/route';

export function Exportar({
  tabla,
  puedeExportar,
  texto = 'Exportar CSV',
}: {
  tabla: TablaExportable;
  puedeExportar: boolean;
  texto?: string;
}) {
  if (!puedeExportar) return null;

  return (
    <a
      href={`/api/exportar?tabla=${tabla}`}
      // `download` es una pista para el navegador; el nombre real lo fija el
      // servidor en la cabecera, que es donde debe estar.
      download
      className="texto-suave rounded-md border borde-tema px-3 py-1.5 text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
    >
      {texto}
    </a>
  );
}
