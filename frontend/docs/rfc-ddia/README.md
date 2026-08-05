# RFC-DDIA: Arquitectura de Datos Distribuidos para SIGH_FOOD

**Fuente:** Designing Data-Intensive Applications — Martin Kleppmann, O'Reilly 2017  
**Alcance:** Partes I, II y III completas (Capítulos 1-12)  
**Aplicación:** Pipeline de captura, procesamiento y explotación de Leads B2B

## Objetivo

Traducir los principios de ""Designing Data-Intensive Applications"" al pipeline de datos de SIGH_FOOD, garantizando:
- **Confiabilidad:** El sistema funciona correctamente incluso bajo carga
- **Escalabilidad:** Capacidad de crecer sin cambios arquitectónicos mayores
- **Mantenibilidad:** Fácil de adaptar a requisitos nuevos

## Regla de Oro

> **No inventar cifras** — Todo cálculo debe ser verificable contra documentos fuente o cálculos directos.

## Estructura del Documento

| Documento | Contenido |
|-----------|-----------|
| capacity-planning.md | Parámetros de carga, escalabilidad, bandwidth |
| modelo-datos.md | Documental vs Relacional, schema-on-read |
| almacenamiento.md | LSM-Tree vs B-Tree, Upstash Redis |
| evolucion-esquema.md | Avro/Protobuf, compatibilidad |
| arquitectura-futura.md | Unbundling databases, Data Lake |

## Métricas de Negocio (Contexto)

- Costo B2B: \,500 COP
- Precio Venta: \,000 COP  
- Utilidad Neta: \,500 COP
- Margen: 73.4%

---

*Documento generado como parte de la implementación del RFC-DDIA para SIGH_FOOD*