# Integración de RFCs - SIGH_FOOD

## Visión General

SIGH_FOOD tiene 4 RFCs complementarios que definen la arquitectura completa del sistema:

| RFC | Alcance | Capa que Define |
|-----|---------|-----------------|
| **RFC-001** (este documento) | System Architecture & Topology | Topología de infraestructura completa |
| **RFC-HPBN** | Web Performance Tuning (Killelea) | Optimizaciones de rendimiento Edge |
| **RFC-DDIA** | Designing Data-Intensive Applications (Kleppmann) | Arquitectura de datos distribuidos |
| **RFC Clean Architecture** | Clean Architecture (Uncle Bob) | Organización interna del código |

## Cómo se Integran

### RFC-001 + RFC-HPBN
- RFC-001 define **qué** componentes existen (Edge CDN, Edge Function, Cola)
- RFC-HPBN define **cómo** optimizar cada componente (preload, cache headers, HTTP/3)
- Ejemplo: RFC-001 dice "Edge Function responde 202 en <50ms"; RFC-HPBN dice "usar AbortController con timeout 3s y medir con performance.now()"

### RFC-001 + RFC-DDIA
- RFC-001 define **qué** sistemas de datos existen (Upstash Redis, CRM)
- RFC-DDIA define **cómo** diseñar el pipeline de datos (LSM-Tree, outbox pattern, idempotencia)
- Ejemplo: RFC-001 dice "cola de mensajes con idempotencyKey"; RFC-DDIA dice "usar Avro para evolución de esquema y particionar por hash de lead_id"

### RFC-001 + RFC Clean Architecture
- RFC-001 define **qué** capas existen (Cliente, Edge, Backend, Integraciones)
- RFC Clean Architecture define **cómo** organizar el código dentro de cada capa (círculos concéntricos, DIP, SOLID)
- Ejemplo: RFC-001 dice "Worker Consumidor procesa la cola"; RFC Clean Architecture dice "el Worker usa LeadRepository interface, no HubSpot concreto"

## Mapa de Dependencias
┌─────────────────────────────────────────────────────────────┐ 
RFC-001 (Topología) │ 
│ Define: Cliente → Edge → Backend → Integraciones │ └─────────────────────────────────────────────────────────────┘
│ │ │
▼ ▼ ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
RFC-HPBN │ │ RFC-DDIA │ │ RFC Clean Arch │
(Rendimiento) │ │ (Datos) │ │ (Código) │
- preload │ │ - outbox │ │ - DIP │
- cache │ │ - idempotencia │ │ - SOLID │ 
│ - HTTP/3 │ │ - partición │ │ - círculos │

## Decisiones Fuera de Alcance (RFC-001 Sección 7)

Las siguientes decisiones se documentan en los RFCs complementarios:

| Decisión | RFC que la Define |
|----------|-------------------|
| Organización interna del código de dominio | RFC Clean Architecture |
| Optimizaciones de Core Web Vitals capa por capa | RFC-HPBN |
| Modelo de datos del Lead, particionamiento del CRM | RFC-DDIA |

## Verificación de Coherencia

Los 4 RFCs son coherentes entre sí y no se contradicen:

- **Stack tecnológico**: Next.js 14+, Edge Runtime, Upstash Redis, HubSpot/Pipedrive (consistente en los 4)
- **Métricas de negocio**: $8,500 / $32,000 / $23,500 COP (contexto, no alteradas)
- **Objetivos de rendimiento**: LCP < 1.2s, TTFB < 100ms, Form < 50ms (RFC-001 + RFC-HPBN)
- **Garantías de datos**: At-least-once delivery, idempotencia, cero pérdida (RFC-001 + RFC-DDIA)

---

*Documento de integración generado como parte de la Fase 7 del RFC-001*