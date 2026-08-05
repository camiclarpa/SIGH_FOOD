# Almacenamiento y Recuperación — LSM-Tree vs B-Tree

## 1. Comparación Verificada (Capítulo 3 de DDIA)

Kleppmann describe dos familias de motores de almacenamiento:

### LSM-Tree (Log-Structured Merge-Tree)
- **Escritura:** Secuencial a log append-only en memoria (memtable)
- **Volcado:** Periódico a SSTables ordenados en disco
- **Fusión:** En segundo plano
- **Throughput:** Alto para escrituras secuenciales

### B-Tree
- **Estructura:** Páginas de tamaño fijo en árbol balanceado
- **Actualización:** In-place (I/O aleatorio)
- **Lectura:** Rápida para índices
- **Uso:** Bases de datos relacionales tradicionales

## 2. Por Qué LSM-Tree para SIGH_FOOD

| Característica | LSM-Tree | Aplicación a SIGH_FOOD |
|----------------|----------|------------------------|
| **Patrón de escritura** | Secuencial, solo-append | Picos de campaña: cientos de leads/segundo continuos |
| **Throughput bajo carga** | Alto (sin I/O aleatorio) | Escenario 10,000+ usuarios concurrentes |
| **Lectura de claves inexistentes** | Más lento (Bloom filters) | Irrelevante — casi nunca preguntamos ""¿existe lead X?"" |

## 3. Upstash Redis como LSM-Tree

**Aplicación práctica:**
- Upstash opera sobre principios de journaling append-only
- Cada escritura es un \LPUSH\ secuencial
- Nunca actualización in-place de registro existente
- **Conclusión:** Coherente con el principio de Kleppmann de usar la estructura que coincide con el patrón de acceso (solo-append de alto volumen)

## 4. Decisión de Arquitectura

**Cola de ingesta:** Upstash Redis (LSM-Tree spirit)  
**CRM downstream:** HubSpot/Pipedrive (B-Tree interno, pero no en camino crítico)

---

*Verificado contra el Capítulo 3 de DDIA*