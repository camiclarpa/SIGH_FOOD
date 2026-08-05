# Flujo de Trabajo: Lighthouse hasta 100/100

## PASO 1: Ejecutar Iteración Inicial

\\\powershell
.\\scripts\\26-Iterate-Lighthouse.ps1 -DeploymentUrl https://sighfood.vercel.app
\\\

Este script:
- Ejecuta Lighthouse
- Analiza resultados
- Identifica audits fallidos
- Genera reporte HTML

## PASO 2: Revisar Reporte

Abre el reporte HTML generado en \lighthouse-reports/\:

\\\powershell
start .\\lighthouse-reports\\report-iter1_*.html
\\\

Revisa:
- Puntuaciones por categoría
- Audits fallidos (en rojo)
- Oportunidades de mejora
- Diagnósticos específicos

## PASO 3: Aplicar Ajustes

Usa el checklist \FASE5-LIGHTHOUSE-CHECKLIST.md\ para guiar los ajustes.

Ejemplos comunes:

### Optimizar imagen LCP:
\\\	sx
<Image
  src="/hero.webp"
  alt="Hero"
  priority={true}
  quality={85}
  sizes="100vw"
/>
\\\

### Deferir script de analytics:
\\\	sx
import Script from 'next/script'

<Script
  src="https://analytics.example.com/script.js"
  strategy="lazyOnload"
/>
\\\

### Code split de componente pesado:
\\\	sx
import dynamic from 'next/dynamic'

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <p>Loading...</p>,
  ssr: false,
})
\\\

## PASO 4: Desplegar y Re-ejecutar

\\\powershell
vercel --prod
.\\scripts\\26-Iterate-Lighthouse.ps1 -DeploymentUrl https://sighfood.vercel.app
\\\

## PASO 5: Repetir hasta 100/100

Continúa iterando hasta alcanzar 100/100 en todas las categorías.

## PASO 6: Generar Reporte Final

\\\powershell
.\\scripts\\27-Generate-Final-Report.ps1 -DeploymentUrl https://sighfood.vercel.app
\\\

Esto genera:
- \FASE5-SEMANA1-REPORTE-FINAL.md\
- \lighthouse-final.html\
- \lighthouse-final.json\

## METAS

| Categoría | Objetivo |
|-----------|----------|
| Performance | 100/100 |
| Accessibility | 100/100 |
| Best Practices | 100/100 |
| SEO | 100/100 |
| LCP | < 2.5s |
| CLS | < 0.1 |
| TBT | < 200ms |

════════════════════════════════════════════════════════════