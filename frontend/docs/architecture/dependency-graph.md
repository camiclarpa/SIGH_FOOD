# Grafo de Dependencias y Principios de Componentes - SIGH_FOOD

## Principios de Cohesión (REP, CCP, CRP)

### REP (Reuse/Release Equivalence Principle)
**Definición:** La unidad de reutilización es la unidad de release.

**Aplicación en SIGH_FOOD:**
- \sighfood-crm-adapter\ se versiona y libera de forma independiente
- Puede actualizarse (ej. nueva versión del SDK de HubSpot) sin forzar un nuevo release del dominio o de la UI
- Cada componente tiene su propio \package.json\ y ciclo de versionamiento

### CCP (Common Closure Principle)
**Definición:** Agrupar en el mismo componente las clases que cambian juntas y por la misma razón.

**Aplicación en SIGH_FOOD:**
- \sighfood-domain\ agrupa todo lo que cambia por una misma razón de negocio
- Nueva regla de scoring, nueva fórmula de ROI, nuevo campo de validación → todos viven en \sighfood-domain\
- Cambian juntos, se liberan juntos, se prueban juntos

### CRP (Common Reuse Principle)
**Definición:** No forzar a los consumidores de un componente a depender de cosas que no usan.

**Aplicación en SIGH_FOOD:**
- \sighfood-ui\ depende solo de las interfaces del dominio, no de detalles del CRM
- Un cambio de estilo visual no debería forzar una nueva versión del paquete de dominio
- Los consumidores de la UI no dependen de detalles internos del dominio que no usan

## Principios de Acoplamiento (ADP, SDP, SAP)

### ADP (Acyclic Dependencies Principle)
**Definición:** El grafo de dependencias entre componentes no debe tener ciclos.

**Verificación en SIGH_FOOD:**
- \sighfood-domain\ NO importa nada de \sighfood-ui\ ni de \sighfood-crm-adapter\
- Solo define interfaces (\LeadRepository\, \ValidadorFormulario\) que los otros dos implementan o consumen
- Ningún ciclo es posible por construcción

### SDP (Stable Dependencies Principle)
**Definición:** Las dependencias deben apuntar en dirección de la estabilidad.

**Grafo de dependencias:**
\\\
sighfood-ui (INESTABLE) ──────▶ sighfood-domain (ESTABLE) ◀────── sighfood-crm-adapter (INESTABLE)
│                                │                                 │
│ Cambia con cada ajuste         │ Cambia solo si cambian          │ Cambia con cada versión
│ de diseño, A/B tests,          │ las reglas de negocio           │ del SDK de HubSpot/Pipedrive
│ feedback de UX                 │ (poca frecuencia)               │
\\\

**Verificación:**
- \sighfood-ui\ y \sighfood-crm-adapter\ (inestables) dependen de \sighfood-domain\ (estable)
- Nunca al revés

### SAP (Stable Abstractions Principle)
**Definición:** Un componente estable debe ser también abstracto.

**Aplicación en SIGH_FOOD:**
- \sighfood-domain\ expone principalmente interfaces (\LeadRepository\, \ValidadorFormulario\)
- Su estabilidad no bloquea la extensión
- Nuevas implementaciones (nuevos CRMs, nuevas UIs) pueden añadirse sin tocarlo

## Resumen de Principios Aplicados

| Principio | Tipo | Archivo/Componente | Verificación |
|-----------|------|-------------------|--------------|
| REP | Cohesión | sighfood-crm-adapter | Versionamiento independiente |
| CCP | Cohesión | sighfood-domain | Cambios de negocio agrupados |
| CRP | Cohesión | sighfood-ui | No depende de detalles del CRM |
| ADP | Acoplamiento | sighfood-domain | Sin ciclos de dependencias |
| SDP | Acoplamiento | sighfood-ui, sighfood-crm-adapter | Dependen de domain (estable) |
| SAP | Acoplamiento | sighfood-domain | Expone interfaces, no implementaciones |

---

*Documento verificado contra los Capítulos 12-14 de Clean Architecture (Robert C. Martin)*