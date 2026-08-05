# Plan de Capacidad — RFC-HPBN

**Fecha de creación:** 2026-08-04  
**Versión:** 1.0  
**Fórmula:** Killelea Capacity Planning (Capítulo 2)

---

## Fórmula de Killelea

\\\	ext
bandwidth (bits/s) = (visitas/día ÷ 86,400) × peso_bytes × 8 × 1.3
\\\

Donde:
- **86,400** = segundos en un día
- **peso_bytes** = tamaño promedio de la página en bytes (objetivo SIGH_FOOD: 1.5 MB = 1,500,000 bytes)
- **8** = conversión de bytes a bits
- **1.3** = factor de overhead de red (TCP/IP, headers HTTP, retransmisiones, etc.)

---

## Escenarios de Volumen para SIGH_FOOD

### 1. Low Volume (MVP, lanzamiento inicial)

| Métrica | Valor |
|---------|-------|
| Visitas/día | 200 |
| Peso de página | 1.5 MB (1,500,000 bytes) |
| Cálculo | (200 ÷ 86,400) × 1,500,000 × 8 × 1.3 ≈ 36,111 bits/s |
| **Bandwidth promedio** | **≈ 0.036 Mbit/s** |
| **Bandwidth pico (5×)** | **≈ 0.18 Mbit/s** |
| Presupuesto Edge estimado | \ (plan gratuito de Vercel/Cloudflare) |

**Análisis:** Trivial para cualquier plan Edge gratuito o de entrada. No requiere consideraciones especiales de capacity planning más allá de las optimizaciones estándar de Core Web Vitals.

---

### 2. Medium Volume (expansión regional, 3 ciudades)

| Métrica | Valor |
|---------|-------|
| Visitas/día | 3,000 |
| Peso de página | 1.5 MB (1,500,000 bytes) |
| Cálculo | (3,000 ÷ 86,400) × 1,500,000 × 8 × 1.3 ≈ 541,667 bits/s |
| **Bandwidth promedio** | **≈ 0.54 Mbit/s** |
| **Bandwidth pico (5×)** | **≈ 2.7 Mbit/s** |
| Presupuesto Edge estimado | \ - \/mes (plan Pro de Vercel) |

**Análisis:** Requiere plan Pro de Vercel o equivalente para aprovechar funciones avanzadas (ISR, Edge Functions). El bandwidth es manejable para cualquier CDN moderno sin riesgo de saturación.

---

### 3. High Volume (campaña masiva, pico de lanzamiento)

| Métrica | Valor |
|---------|-------|
| Visitas/día | 50,000 |
| Peso de página | 1.5 MB (1,500,000 bytes) |
| Cálculo promedio | (50,000 ÷ 86,400) × 1,500,000 × 8 × 1.3 ≈ 9,027,778 bits/s |
| **Bandwidth promedio** | **≈ 9.03 Mbit/s** |
| **Bandwidth pico (5×)** | **≈ 45.1 Mbit/s** |
| Presupuesto Edge estimado | \ - \/mes (dependiendo del proveedor y funciones Edge invocadas) |

**Análisis:** Requiere una red Edge real (Vercel/Cloudflare), no un servidor único. La advertencia de Killelea sobre picos de 3-5× se vuelve crítica aquí. Aunque el proveedor escala automáticamente, el equipo debe conocer estas cifras para no recibir una factura sorpresiva durante una campaña de alto tráfico.

---

## Notas sobre Picos de Tráfico (Sección 2.3 de Killelea)

Killelea advierte que la carga real **nunca se distribuye uniformemente**. Los picos de tráfico durante eventos específicos (ej. un anuncio de retargeting, mención en redes sociales, o envío de newsletter) pueden ser de **3 a 5 veces el promedio**.

### Traducción a 2026 (Serverless/Edge)

En 1998, dimensionar para el escenario "High Volume" significaba comprar hardware de servidor dedicado con margen para el pico, o arriesgarse a que el servidor colapsara ("golpear una pared", Principio 5.1.15: Internet Performance Degrades Nonlinearly).

En 2026, con una arquitectura Serverless/Edge, este cálculo deja de ser un ejercicio de aprovisionamiento de hardware y se convierte en un ejercicio de **presupuesto de facturación y monitoreo**:
1. El proveedor Edge escala automáticamente el ancho de banda y la concurrencia.
2. El riesgo no es la caída del servidor, sino el costo inesperado o el agotamiento de límites de tasa (rate limits) de APIs externas (ej. HubSpot, Pipedrive).
3. Por eso, la arquitectura de SIGH_FOOD usa una cola de Upstash Redis y responde \202 Accepted\ en <50ms, desacoplando completamente la experiencia del usuario de la velocidad de las APIs externas.

---

## Recomendaciones de Monitoreo y Presupuesto

1. **Monitorear facturación Edge semanalmente** durante campañas publicitarias para detectar desviaciones tempranas.
2. **Configurar alertas de gasto** en Vercel/Cloudflare Dashboard (ej. alerta al 80% del presupuesto mensual).
3. **Mantener Page Weight < 1.5MB** estrictamente, usando formatos AVIF/WebP y compresión Brotli, para minimizar costos de bandwidth por visita.
4. **Maximizar Cache Hit Ratio (> 95%)** mediante headers \Cache-Control: public, max-age=31536000, immutable\ en assets estáticos, reduciendo invocaciones de Edge Functions y solicitudes al origen.
5. **Considerar plan Enterprise** si se superan consistentemente las 50,000 visitas/día o si se requieren SLA de disponibilidad > 99.99%.

---

*Documento generado automáticamente por el script de setup del RFC-HPBN*