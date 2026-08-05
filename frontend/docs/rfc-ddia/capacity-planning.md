# Capacity Planning — Parámetros de Carga de SIGH_FOOD

## 1. Asimetría Lectura/Escritura (Patrón Twitter Fan-Out)

Siguiendo el ejemplo de Twitter de Kleppmann (Capítulo 1 de DDIA), analizamos la asimetría de carga en SIGH_FOOD:

### Caso Twitter (Referencia del Libro)
En 2012, Twitter publicaba tweets a 4.6k solicitudes/segundo en promedio (hasta 12k en pico), pero leía timelines a 300k solicitudes/segundo — una asimetría de casi **dos órdenes de magnitud** que determinó su arquitectura (fan-out de escritura en vez de cómputo en cada lectura).

### Aplicación a SIGH_FOOD

| Parámetro de Carga | Definición Específica | Orden de Magnitud |
|-------------------|----------------------|-------------------|
| **Escrituras** | Formularios /api/leads enviados por segundo | Bajo en operación normal (decenas/hora); picos de campaña pueden llegar a cientos/segundo |
| **Lecturas** | Landing page servida desde Edge CDN | 100% estático (SSG) — cero impacto en pipeline de datos |
| **Ratio Lectura/Escritura** | Dashboard de ventas vs leads nuevos | Similar a Twitter: muchas más lecturas de reportes que escrituras |

### Decisión Arquitectónica Basada en la Asimetría

Así como Twitter decidió pre-computar el fan-out en el momento de escritura (porque las lecturas eran 65× más frecuentes que las escrituras), SIGH_FOOD debe pre-computar el HTML del landing en build time (SSG) — porque las lecturas (visitas al landing) son órdenes de magnitud más frecuentes que las escrituras (leads capturados).

**El landing de SIGH_FOOD nunca debería ejecutar una consulta de base de datos para renderizarse**, exactamente por la misma razón estructural que llevó a Twitter a abandonar el enfoque de "calcular el timeline en cada lectura".

## 2. Parámetros de Carga Específicos

| Parámetro | Definición | Orden de Magnitud Esperado |
|-----------|------------|---------------------------|
| Escrituras al endpoint /api/leads | Formularios de agendamiento enviados por segundo | Bajo en operación normal (decenas/hora); picos de campaña pueden llevarlo a cientos por segundo durante una activación publicitaria masiva |
| Lecturas de la landing (SSG) | Servidas 100% desde el Edge CDN — cero impacto en el pipeline de datos | No aplica al parámetro de carga de datos — este es precisamente el diseño correcto: el 99.9% del tráfico (visualización) nunca toca un sistema de datos con estado |
| Ratio lectura/escritura del dashboard de ventas | El equipo comercial consulta el dashboard de leads mucho más frecuentemente de lo que se generan leads nuevos | Similar en espíritu a la asimetría de Twitter — muchas más lecturas de reportes que escrituras de leads nuevos |

## 3. Escenarios de Volumen (Fórmula de Killelea)

Aplicando la fórmula del Capítulo 2 de Web Performance Tuning:

\\\
bandwidth = (visitas/día ÷ 86,400) × peso_bytes × 8 × 1.3 (overhead)
\\\

### Escenario Low Volume (MVP)
- **Visitas/día:** 200
- **Peso de página:** 1.5 MB
- **Cálculo:** (200 ÷ 86,400) × 1,500,000 × 8 × 1.3 ≈ 36,111 bits/s
- **Bandwidth:** ≈ 0.036 Mbit/s
- **Presupuesto Edge:** Plan gratuito de Vercel/Cloudflare

### Escenario Medium Volume (Regional)
- **Visitas/día:** 3,000
- **Peso de página:** 1.5 MB
- **Cálculo:** (3,000 ÷ 86,400) × 1,500,000 × 8 × 1.3 ≈ 541,667 bits/s
- **Bandwidth:** ≈ 0.54 Mbit/s
- **Presupuesto Edge:** \ - \/mes (plan Pro)

### Escenario High Volume (Campaña Masiva)
- **Visitas/día:** 50,000
- **Peso de página:** 1.5 MB
- **Cálculo promedio:** ≈ 9.03 Mbit/s
- **Pico (5×):** ≈ 45.1 Mbit/s
- **Presupuesto Edge:** \ - \/mes

## 4. Escalabilidad Horizontal

| Componente | Estrategia de Escalado | Por Qué Escala |
|------------|----------------------|----------------|
| **Landing (SSG)** | Replicado en Edge CDN | Sin estado — escala linealmente |
| **Edge Function** | Serverless auto-scaling | Cada invocación es independiente |
| **Cola Upstash** | Absorbe picos de escritura | Desacopla ingesta de procesamiento |

---

*Documento verificado contra el Capítulo 1 de DDIA (asimetría Twitter) y Capítulo 2 de Web Performance Tuning*