# El Futuro de los Sistemas de Datos — Unbundling Databases

## 1. El Concepto Verificado (Capítulo 12 de DDIA)

Kleppmann cierra el libro con una reflexión sobre cómo las bases de datos tradicionales combinan, dentro de un solo sistema monolítico, funciones que podrían separarse:
- Almacenamiento
- Índices secundarios
- Vistas materializadas
- Replicación

**Propuesta:** Pensar en un flujo de eventos (log) como el mecanismo unificador que permite ""desagregar"" (unbundle) esas funciones en componentes especializados.

## 2. Aplicación a SIGH_FOOD

El pipeline ya diseñado es, en sí mismo, una aplicación temprana del principio de unbundling:

\\\
lead-events-log (fuente única de verdad)
         │
         ├──→ CRM (HubSpot/Pipedrive)
         ├──→ Detección de spam/fraude
         ├──→ Enriquecimiento de datos
         ├──→ Dashboard en tiempo real
         └──→ Job batch nocturno
\\\

**Ventaja:** En vez de que el CRM sea la única fuente de verdad, el log de eventos es la fuente de verdad, y el CRM es solo uno más de sus consumidores.

## 3. Proyección a Largo Plazo: Data Lake

A medida que SIGH_FOOD acumule volumen histórico, el mismo log puede alimentar:

### Data Lake (Almacenamiento Columnar)

\\\
lead-events-log
         │
         └──→ Data Lake (Parquet en S3/GCS)
              │
              ├──→ Análisis histórico de patrones de maridaje
              ├──→ LTV:CAC por ciudad
              └──→ Predicción de conversión
\\\

**Formato:** Parquet (columnar, optimizado para análisis)  
**Ventaja:** Sin migración disruptiva — el log ya está desacoplado desde el día uno.

## 4. Preguntas de Análisis Futuras

Con suficiente volumen histórico en el Data Lake:

1. **Patrones de maridaje:** ¿Qué combinaciones (Mezcal+Spicy, Bourbon+Caramel) predicen mejor la conversión a cliente recurrente?
2. **Geografía:** ¿Qué ciudades tienen mejor LTV:CAC?
3. **Temporalidad:** ¿Hay patrones estacionales en la demanda de ciertos conos?

## 5. Principio de Unbundling Aplicado

| Función | Componente SIGH_FOOD |
|---------|----------------------|
| **Almacenamiento** | Upstash Redis (cola) + CRM (persistencia) |
| **Índices** | HashPartitioning.ts (partición por lead_id) |
| **Vistas Materializadas** | DashboardMaterializado (stream processing) |
| **Replicación** | AsyncReplication.ts (cola → CRM) |
| **Batch Processing** | BatchProcessing.ts (reportes nocturnos) |

**Conclusión:** Ya tenemos unbundling en práctica — solo falta escalarlo a un Data Lake cuando el volumen lo justifique.

---

*Verificado contra el Capítulo 12 de DDIA*