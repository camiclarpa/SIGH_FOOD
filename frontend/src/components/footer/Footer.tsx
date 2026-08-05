/**
 * FOOTER — Pie de página del landing
 * RFC-001: Capa Edge — Contenido estático SSG
 */

export default function Footer() {
  return (
    <footer className="bg-[#0f0f0f] py-12 px-6 border-t border-gray-800">
      <div className="max-w-6xl mx-auto text-center text-gray-500">
        <p className="text-sm">
          © {new Date().getFullYear()} SIGH_FOOD. Todos los derechos reservados.
        </p>
        <p className="text-xs mt-2">
          20 segundos, sin cambiar nada.
        </p>
      </div>
    </footer>
  );
}