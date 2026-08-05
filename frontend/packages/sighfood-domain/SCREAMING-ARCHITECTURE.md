# Screaming Architecture — Estructura que "Grita" SIGH_FOOD

## Principio (Capítulo 21)

La estructura de carpetas debe revelar el **propósito de negocio** del sistema,
no el framework técnico usado para construirlo.

## Comparación

### ❌ Estructura que grita "Next.js" (organización por tipo técnico):
\\\
app/
├── components/
│   ├── Button.tsx
│   ├── Slider.tsx
│   └── Card.tsx
── hooks/
│   └── useForm.ts
├── lib/
│   └── api.ts
└── pages/
    └── index.tsx
\\\

### ✅ Estructura que grita "SIGH_FOOD" (organización por concepto de negocio):
\\\
packages/sighfood-domain/
├── portafolio/          ← "esto administra un catálogo de productos gourmet RTA"
│   ├── Cono.ts
│   └── PORTAFOLIO_CONOS.ts
├── captura-de-leads/    ← "esto captura y califica leads B2B"
│   ├── Lead.ts
│   ├── AgendarDemoUseCase.ts
│   └── validarFormularioLead.ts
── calculadora-roi/     ← "esto calcula el retorno de inversión para un bar"
    └── calcularRoi.ts
\\\

## Verificación

Al ver la carpeta \captura-de-leads/\, cualquier desarrollador nuevo entiende
de inmediato que este sistema existe para calificar oportunidades comerciales
de gastrobares — sin necesidad de leer una sola línea de JSX o saber que el
proyecto usa Next.js.

**Referencia:** Capítulo 21 — Arquitectura Gritona (Screaming Architecture)