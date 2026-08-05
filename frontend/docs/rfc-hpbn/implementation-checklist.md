# Checklist de Implementación — RFC-HPBN

**Fecha de creación:** 2026-08-04  
**Versión:** 1.0  
**Estado:** En progreso

---

## Checklist — Parte I (Preliminary Considerations)

- [ ] Configurar \
ext.config.js\ con formatos AVIF/WebP y compresión Brotli
  - **Herramienta:** \
ext.config.js\
  - **Métrica:** Page Weight < 1.5MB
  - **Prioridad:** Crítico

- [ ] Calcular bandwidth requerido para los 3 escenarios de volumen (Sección 2.2)
  - **Herramienta:** Hoja de cálculo con la fórmula de Killelea
  - **Métrica:** Presupuesto de facturación Edge conocido de antemano
  - **Prioridad:** Alto

- [ ] Integrar Lighthouse CI en el pipeline de CI/CD
  - **Herramienta:** GitHub Actions + Lighthouse CI
  - **Métrica:** Ningún PR se mergea con regresión de Core Web Vitals
  - **Prioridad:** Alto

- [ ] Documentar los 4 casos de estudio adaptados como runbook de diagnóstico
  - **Herramienta:** Documento interno del equipo
  - **Métrica:** Tiempo de diagnóstico ante un incidente real < 15 minutos
  - **Prioridad:** Medio

---

## Checklist — Parte II (Tuning in Depth)

- [ ] Implementar \preload\ / \preconnect\ / \dns-prefetch\ en el \<head>\
  - **Herramienta:** \PerformanceHead.tsx\ o \
ext/head\
  - **Métrica:** LCP < 1.2s
  - **Prioridad:** Crítico

- [ ] Implementar carga adaptativa por tipo de conexión (\
avigator.connection\)
  - **Herramienta:** TypeScript, Network Information API
  - **Métrica:** TTI < 2.0s en conexión 3G simulada
  - **Prioridad:** Alto

- [ ] Configurar headers \Cache-Control\ agresivos en assets estáticos
  - **Herramienta:** \
ext.config.js headers()\
  - **Métrica:** Cache Hit Ratio > 95%
  - **Prioridad:** Crítico

- [ ] Implementar la Edge Function del formulario con respuesta 202 y cola Upstash
  - **Herramienta:** Vercel Edge Runtime + \@upstash/redis\
  - **Métrica:** Form submission response < 50ms
  - **Prioridad:** Crítico

- [ ] Configurar ISR con \evalidate\ apropiado
  - **Herramienta:** Next.js App Router (\export const revalidate = 3600\)
  - **Métrica:** Balance entre frescura de contenido y Cache Hit Ratio
  - **Prioridad:** Medio

- [ ] Implementar idempotency key en la cola de formulario
  - **Herramienta:** Upstash Redis \SET\/\GET\ con TTL
  - **Métrica:** Cero duplicados en el CRM ante reintentos de red
  - **Prioridad:** Alto

---

## Checklist — Parte III (Appendixes)

- [ ] Confirmar que no existe ninguna resolución DNS inversa en el camino crítico
  - **Herramienta:** Revisión de código de las Edge Functions
  - **Métrica:** TTFB < 100ms
  - **Prioridad:** Alto

- [ ] Desactivar \productionBrowserSourceMaps\ y features de desarrollo en producción
  - **Herramienta:** \
ext.config.js\
  - **Métrica:** Page Weight reducido
  - **Prioridad:** Medio

- [ ] Documentar explícitamente que los parámetros de Solaris/\
dd\ no son accionables en este stack
  - **Herramienta:** Este RFC (capacity-planning.md)
  - **Métrica:** Ningún ingeniero pierde tiempo buscando configuración TCP inexistente en el proveedor Edge
  - **Prioridad:** Bajo

---

## Checklist — Parte IV (Author's Tips)

- [ ] Verificar que el framework esté en su versión más reciente estable antes de cada release de campaña
  - **Herramienta:** \package.json\ + Dependabot
  - **Métrica:** Sin versiones con más de 2 minor releases de atraso
  - **Prioridad:** Medio

- [ ] Configurar \	railingSlash\ de forma explícita y consistente
  - **Herramienta:** \
ext.config.js\ (\	railingSlash: false\)
  - **Métrica:** Cero redirecciones 308 innecesarias
  - **Prioridad:** Bajo

---

## Progreso

| Parte | Total | Completados | Pendientes |
|-------|-------|-------------|------------|
| Parte I | 4 | 0 | 4 |
| Parte II | 6 | 0 | 6 |
| Parte III | 3 | 0 | 3 |
| Parte IV | 2 | 0 | 2 |
| **Total** | **15** | **0** | **15** |

---

*Checklist generado automáticamente por el script de setup del RFC-HPBN*