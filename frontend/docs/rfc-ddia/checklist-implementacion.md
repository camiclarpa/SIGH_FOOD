# Checklist de Implementación — RFC-DDIA

## Checklist — Parte I (Preliminary Considerations)

### Capítulo 1: Confiabilidad, Escalabilidad y Mantenibilidad
- [ ] Definir parámetros de carga específicos (visitas/día, bandwidth)
- [ ] Documentar asimetría lectura/escritura (Twitter fan-out)
- [ ] Calcular bandwidth para 3 escenarios (Low/Medium/High)
- [ ] Configurar escalabilidad horizontal (Edge/Serverless)

### Capítulo 2: Modelos de Datos
- [ ] Decidir modelo documental vs relacional para Lead
- [ ] Implementar schema-on-read en Upstash Redis
- [ ] Documentar decisión con criterios de Kleppmann

### Capítulo 3: Almacenamiento y Recuperación
- [ ] Analizar LSM-Tree vs B-Tree para ingesta de leads
- [ ] Configurar Upstash Redis (append-only, similar a LSM)
- [ ] Verificar que el patrón de escritura es secuencial

### Capítulo 4: Codificación y Evolución
- [ ] Elegir formato de serialización (Avro/Protobuf)
- [ ] Definir esquema v1 del LeadEvent
- [ ] Documentar reglas de compatibilidad (campos opcionales con default)

---

## Checklist — Parte II (Tuning in Depth)

### Capítulo 5: Replicación
- [ ] Documentar replicación asíncrona (cola → CRM)
- [ ] Mitigar replication lag (página de gracias SSG)
- [ ] Implementar "leer del líder para datos propios recientes"

### Capítulo 6: Particionamiento
- [ ] Definir estrategia de particionamiento (hash vs range)
- [ ] Implementar partición por hash de lead_id
- [ ] Crear índices secundarios por campaign_id/city

### Capítulo 7: Transacciones
- [ ] Evaluar y rechazar 2PC (Two-Phase Commit)
- [ ] Documentar problema de "dual writes"
- [ ] Implementar patrón Outbox (cola única como fuente de verdad)

### Capítulo 8-9: Consistencia y Consenso
- [ ] Analizar linealizabilidad vs consistencia eventual
- [ ] Implementar idempotencia (idempotency key)
- [ ] Garantizar orden de eventos en partición

### Capítulo 10: Batch Processing
- [ ] Diseñar job batch nocturno (2:00 AM COT)
- [ ] Calcular tasa de conversión por campaña
- [ ] Garantizar reproducibilidad del job

### Capítulo 11: Stream Processing
- [ ] Implementar pipeline de streaming en tiempo real
- [ ] Detección de spam/fraude (CEP)
- [ ] Enriquecimiento de datos (stream-table join)
- [ ] Vista materializada del dashboard

### Capítulo 12: Futuro de los Sistemas de Datos
- [ ] Aplicar concepto de "unbundling databases"
- [ ] Proyectar Data Lake a largo plazo (Parquet)

---

## Checklist — Parte III (Appendixes)

### Apéndice A: Netscape Enterprise Server
- [ ] Traducir parámetros de tuning a configuración moderna
- [ ] Documentar equivalentes en Vercel/Cloudflare

### Apéndice B: Apache Performance Notes
- [ ] Aplicar espíritu de "AllowOverride None" a Next.js
- [ ] Desactivar features innecesarias en next.config.js

### Apéndice C: Solaris TCP/IP Tuning
- [ ] Documentar que no es accionable en stack Edge
- [ ] Explicar por qué HTTP/3/QUIC resuelve estos problemas

---

## Checklist — Parte IV (Author's Tips)

- [ ] Verificar que el framework está en versión más reciente
- [ ] Desactivar resoluciones DNS inversas en camino crítico
- [ ] Separar almacenamiento de build de sistema de logging
- [ ] Mantener contenido (imágenes, video) lo más pequeño posible
- [ ] Preprocesar contenido fuera de línea (SSG)
- [ ] Usar Edge Functions + cola en vez de CGI lento
- [ ] Monitorear retransmisiones TCP en RUM
- [ ] Configurar trailingSlash explícitamente

---

*Checklist generado como parte de la implementación del RFC-DDIA*