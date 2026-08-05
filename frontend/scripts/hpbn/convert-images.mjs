/**
 * ============================================================================
 * SCRIPT DE CONVERSIÓN DE IMÁGENES AVIF + WebP (RFC-HPBN, Capítulo 14)
 * ============================================================================
 * 
 * FUNCIÓN: Convertir la imagen hero a formatos AVIF y WebP con múltiples
 * tamaños para srcset responsive.
 * 
 * PRINCIPIO APLICADO (Cap. 14):
 * ───────────────────────────────────────────────────────────────────────────
 * Killelea compara formatos de imagen de la época (JPEG, GIF, PNG) según su
 * tamaño y calidad para distintos tipos de contenido. En 2026, AVIF ofrece
 * la mejor compresión (30-50% menor que JPEG a igual calidad), con WebP
 * como fallback universal.
 * 
 * CONFIGURACIÓN:
 *   • Formatos: AVIF (primario) + WebP (fallback)
 *   • Tamaños: 640, 750, 828, 1080, 1200px (srcset responsive)
 *   • Calidad: 80% (balance entre "Bits Are Cost" y calidad visual)
 *   • Fuente: imagen original en public/assets/images/hero/hero-cono-original.png
 * 
 * REFERENCIAS DEL RFC-HPBN:
 *   • Capítulo 14: Content
 *   • Principio 5.1.14: Bits Are Cost
 *   • Author's Tip #4: Mantener el contenido lo más pequeño posible
 * 
 * DEPENDENCIAS:
 *   • sharp (npm install sharp)
 * ============================================================================
 */

import sharp from 'sharp';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuración de conversión
const config = {
  input: join(__dirname, '../../public/assets/images/hero/hero-cono-original.png'),
  outputDir: join(__dirname, '../../public/assets/images/hero'),
  sizes: [640, 750, 828, 1080, 1200],
  quality: 80,
  formats: ['avif', 'webp'],
};

async function convertImages() {
  console.log('🚀 Iniciando conversión de imágenes hero...');
  console.log(`📁 Input: ${config.input}`);
  console.log(`📂 Output: ${config.outputDir}`);
  console.log(`📐 Tamaños: ${config.sizes.join(', ')}px`);
  console.log(` Formatos: ${config.formats.join(', ')}`);
  console.log(`✨ Calidad: ${config.quality}%`);
  console.log('');

  for (const size of config.sizes) {
    console.log(` Procesando ${size}px...`);
    
    for (const format of config.formats) {
      const outputPath = join(
        config.outputDir,
        `hero-cono-${size}.${format}`
      );

      try {
        await sharp(config.input)
          .resize(size, size, {
            fit: 'cover',
            position: 'center',
          })
          [format]({
            quality: config.quality,
            effort: 6, // AVIF: 0-9 (mayor = mejor compresión, más lento)
          })
          .toFile(outputPath);

        console.log(`  ✓ ${format.toUpperCase()} ${size}px creado`);
      } catch (error) {
        console.error(`  ✗ Error al crear ${format} ${size}px:`, error.message);
      }
    }
  }

  console.log('');
  console.log('✅ Conversión completada. Archivos generados:');
  config.sizes.forEach(size => {
    config.formats.forEach(format => {
      console.log(`  • hero-cono-${size}.${format}`);
    });
  });
}

convertImages().catch(console.error);