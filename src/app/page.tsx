import HeroSection from '@/components/organisms/HeroSection';
import ProductGrid from '@/components/organisms/ProductGrid';
import PortalPreview from '@/components/organisms/PortalPreview';
import ConsignacionSection from '@/components/organisms/ConsignacionSection';
import LeadForm from '@/components/organisms/LeadForm';

// Nota: Si ya creaste ROICalculator.tsx, descomenta la siguiente línea:
// import ROICalculator from '@/components/organisms/ROICalculator';

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <HeroSection />
      <ProductGrid />
      
      {/* Descomenta esto cuando tengas el archivo ROICalculator.tsx */}
      {/* <div id="calculadora"><ROICalculator /></div> */}
      
      <PortalPreview />
      <ConsignacionSection />
      <LeadForm />

      <footer className="bg-gray-950 text-white text-center py-12">
        <div className="max-w-4xl mx-auto px-6">
          <h3 className="text-2xl font-bold mb-4">SIGH_FOOD</h3>
          <p className="text-gray-400 mb-6">Transformando barras en máquinas de hacer dinero en menos de 20 segundos.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
            <div>
              <h4 className="font-semibold mb-2">Contacto</h4>
              <p className="text-gray-400">ventas@sighfood.com</p>
              <p className="text-gray-400">+57 300 123 4567</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Legal</h4>
              <p className="text-gray-400">Términos y Condiciones</p>
              <p className="text-gray-400">Política de Privacidad</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Síguenos</h4>
              <p className="text-gray-400">Instagram</p>
              <p className="text-gray-400">LinkedIn</p>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800">
            <p className="text-gray-500">© 2026 SIGH_FOOD. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
