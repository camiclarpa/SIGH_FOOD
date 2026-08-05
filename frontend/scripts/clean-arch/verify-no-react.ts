/**
 * ============================================================================
 * VERIFY NO REACT — Capítulo 32: Los Frameworks Son Detalles
 * ============================================================================
 * 
 * PROPÓSITO: Verificar automáticamente que el dominio de SIGH_FOOD no importa
 * React, Next.js, ni ningún framework de UI — cumpliendo el principio de que
 * los frameworks son detalles intercambiables.
 * 
 * CONCEPTO VERIFICADO (Capítulo 32):
 * ──────────────────────────────────────────────────────────────────────────
 * Uncle Bob generaliza la advertencia a cualquier framework (no solo web o de
 * base de datos): un framework debe tratarse como una herramienta, nunca como
 * la arquitectura misma del sistema — el error común que el libro señala es
 * cuando los desarrolladores "se casan" con un framework, estructurando todo
 * su código alrededor de las convenciones de ese framework en vez de alrededor
 * de las reglas de negocio.
 * 
 * SEÑALES DE ALERTA (ausentes en SIGH_FOOD):
 *   • Lógica de negocio dentro de un useEffect
 *   • Validación de formulario acoplada a una librería específica de forms
 *   • Llamadas directas al SDK de HubSpot desde un componente de UI
 * 
 * REFERENCIAS DEL LIBRO:
 *   • Capítulo 32: Los Frameworks Son Detalles
 *   • Capítulo 31: La Web Es un Detalle
 * ============================================================================
 */

import * as fs from 'fs';
import * as path from 'path';

const domainPath = path.join(__dirname, '../packages/sighfood-domain');

function getAllTsFiles(dir: string): string[] {
  const files: string[] = [];
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory() && item !== 'node_modules') {
      files.push(...getAllTsFiles(fullPath));
    } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }

  return files;
}

function verifyNoFrameworkImports(): void {
  const domainFiles = getAllTsFiles(domainPath);
  let violations = 0;

  const forbiddenImports = [
    /from\s+['"]react['"]/,
    /from\s+['"]react-dom['"]/,
    /from\s+['"]next['"]/,
    /from\s+['"]@sighfood\/ui['"]/,
    /from\s+['"]@sighfood\/crm-adapter['"]/,
  ];

  for (const file of domainFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    const relativePath = path.relative(process.cwd(), file);

    for (const pattern of forbiddenImports) {
      if (pattern.test(content)) {
        console.error(`✗ VIOLACIÓN: ${relativePath} importa framework prohibido`);
        violations++;
      }
    }
  }

  if (violations === 0) {
    console.log('✓ VERIFICADO: El dominio no importa ningún framework');
    console.log('  • No importa react');
    console.log('  • No importa next');
    console.log('  • No importa @sighfood/ui');
    console.log('  • No importa @sighfood/crm-adapter');
    console.log('');
    console.log('Los frameworks son, efectivamente, detalles intercambiables.');
  } else {
    console.error(`✗ ${violations} violaciones encontradas`);
    process.exit(1);
  }
}

verifyNoFrameworkImports();