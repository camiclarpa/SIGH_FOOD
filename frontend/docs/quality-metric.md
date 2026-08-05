# Métrica de Calidad de Diseño — DDIA (Designing Data-Intensive Applications)

**Fecha de creación:** 2026-08-04  
**Fuente:** Designing Data-Intensive Applications — Martin Kleppmann (O'Reilly 2017)  
**Objetivo del libro:** "Construir sistemas que sean confiables, escalables y mantenibles"

---

## Definición de la Métrica

> **Un diseño limpio es aquel donde cada cambio previsible del negocio toca exactamente 1 archivo.**

Esta métrica operacionaliza el objetivo de Kleppmann de minimizar la complejidad accidental. En lugar de medir "elegancia técnica" o "cobertura de tests", medimos algo directamente observable: **cuántos archivos debe tocar un desarrollador para completar un cambio que el equipo de marketing va a pedir con certeza**.

---

## Cambios Previsibles del Negocio SIGH_FOOD

| # | Cambio Previsible (Marketing) | Archivos a Tocar (Diseño Limpio) | Archivos a Tocar (Diseño Acoplado) | Principio que lo Garantiza |
|---|-------------------------------|----------------------------------|-------------------------------------|----------------------------|
| 1 | Añadir un 6to cono al portafolio | **1** (Cono.ts — agregar entrada al arreglo) | 3-5 (componentes UI mezclados con datos) | Separación de preocupaciones |
| 2 | Cambiar la fórmula de ROI (ej. de 20% a 25% de conversión) | **1** (calcularRoi.ts — modificar constante) | 2-3 (buscar 0.20 hardcodeado en componentes) | Funciones puras aisladas |
| 3 | Migrar de HubSpot a Pipedrive como CRM | **1** (nuevo adapter que implementa LeadRepository) | 5-10 (llamadas directas a HubSpot dispersas) | Inversión de dependencias |
| 4 | Añadir campo \presupuesto_mensual\ al formulario | **1** (esquema Avro v2 con campo opcional) | 2-4 (validación duplicada en UI y backend) | Evolución de esquema compatible |
| 5 | Cambiar el threshold de score de calificación | **1** (constante en regla de scoring) | 2-3 (buscar threshold en múltiples lugares) | Configuración centralizada |

---

## Los Dos Valores (Capítulo 1-2)

Kleppmann distingue dos valores que todo sistema de datos debe entregar:

| Valor | Definición | Ejemplo en SIGH_FOOD | Urgencia Percibida |
|-------|------------|----------------------|---------------------|
| **Confiabilidad** (Reliability) | Que el sistema funcione correctamente incluso cuando las cosas salen mal | "El formulario debe aceptar leads incluso si HubSpot está caído — encolar en Upstash y reintentar después" | Media — solo se nota cuando falla |
| **Escalabilidad** (Scalability) | Que el sistema mantenga el rendimiento bajo carga creciente | "El landing debe soportar 50,000 visitas/día sin degradar LCP < 1.2s" | Baja — nadie lo pide explícitamente hasta que es tarde |
| **Mantenibilidad** (Maintainability) | Qué tan fácil es cambiar el sistema mañana | "Añadir un 6to cono debe tocar solo 1 archivo" | Baja — se prioriza después de que el costo de cambio se vuelve insoportable |

### La Apuesta de Este RFC

Invertir el esfuerzo de diseño ahora (Partes I-III del libro) en separar el dominio de SIGH_FOOD (reglas de ROI, validación de leads) de los detalles (React, Next.js, HubSpot) **no es sobre-ingeniería** para un simple landing page. Es la aplicación directa del argumento de Kleppmann:

> La campaña del viernes es urgente, pero la capacidad de cambiar rápidamente la fórmula de ROI, añadir un 6to cono, o migrar de CRM sin romper nada, es lo que preserva la velocidad del equipo durante todo el ciclo de vida comercial de SIGH_FOOD.

---

## Verificación de la Métrica

Para verificar que la métrica se cumple, el equipo debe poder responder afirmativamente a estas preguntas después de cada cambio:

- [ ] ¿El cambio tocó exactamente 1 archivo del dominio?
- [ ] Los tests del dominio siguen pasando sin modificación?
- [ ] La UI sigue funcionando sin cambios (si el cambio fue solo de dominio)?
- [ ] El dominio sigue sin importar React, Next.js, ni SDKs de CRM?

---

*Métrica definida como parte de la Fase 1 de implementación de DDIA en SIGH_FOOD*