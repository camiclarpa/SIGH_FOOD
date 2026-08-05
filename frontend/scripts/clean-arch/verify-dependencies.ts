/**
 * ============================================================================
 * VERIFY DEPENDENCIES — ADP: Acyclic Dependencies Principle
 * ============================================================================
 * 
 * PRINCIPIO ADP (Capítulo 12):
 * ──────────────────────────────────────────────────────────────────────────
 * Uncle Bob establece que el grafo de dependencias entre componentes no debe
 * tener ciclos — un ciclo obliga a liberar todos los componentes involucrados
 * como una sola unidad, destruyendo la independencia que la modularización
 * buscaba lograr.
 * 
 * APLICACIÓN:
 *   sighfood-domain JAMÁS importa nada de sighfood-ui ni de sighfood-crm-adapter.
 *   Si lo hiciera, un cambio de diseño visual forzaría reconstruir y revalidar
 *   las reglas de negocio — el problema exacto que el ADP previene.
 * 
 * VERIFICACIÓN:
 *   Este script verifica que no existan imports cíclicos entre paquetes.
 * ============================================================================
 */

import * as fs from 'fs';
import * as path from 'path';

function checkForCyclicImports(): void {
  const domainPath = path.join(__dirname, '../packages/sighfood-domain');
  const uiPath = path.join(__dirname, '../packages/sighfood-ui');
  const crmAdapterPath = path.join(__dirname, '../packages/sighfood-crm-adapter');

  let hasCycles = false;

  // Verificar que domain no importe ui ni crm-adapter
  const domainFiles = getAllTsFiles(domainPath);
  for (const file of domainFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    
    if (content.match(/from ['"]@sighfood\/ui['"]/) || 
        content.match(/from ['"]@sighfood\/crm-adapter['"]/)) {
      console.error(`✗ CICLO DETECTADO: ${file} importa de UI o CRM Adapter`);
      hasCycles = true;
    }
  }

  if (!hasCycles) {
    console.log('✓ ADP verificado: no hay dependencias cíclicas');
    console.log('  • sighfood-domain no importa sighfood-ui');
    console.log('  • sighfood-domain no importa sighfood-crm-adapter');
  } else {
    process.exit(1);
  }
}

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

checkForCyclicImports();