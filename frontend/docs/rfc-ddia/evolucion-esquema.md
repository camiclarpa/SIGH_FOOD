# Codificación y Evolución de Esquema

## 1. Formatos de Serialización (Capítulo 4 de DDIA)

Kleppmann compara:

| Formato | Ventajas | Desventajas |
|---------|----------|-------------|
| **JSON** | Legible, universal | Sin esquema explícito, evolución riesgosa |
| **Avro** | Schema-on-read, resolución en tiempo de lectura | Requiere gestión de esquemas |
| **Protobuf** | Compacto, rápido | Menor flexibilidad que Avro |

## 2. Decisión: Avro para SIGH_FOOD

**Por qué Avro:**
- Resolución de esquema en tiempo de lectura
- Esquema del escritor embebido o referenciado
- Permite evolución sin coordinación de despliegues

## 3. Caso Concreto: Añadir \presupuesto_mensual\

### Esquema Avro v1 (Actual)

\\\json
{
  "type": "record",
  "name": "LeadEvent",
  "fields": [
    { "name": "leadId", "type": "string" },
    { "name": "establecimiento", "type": "string" },
    { "name": "whatsapp", "type": "string" },
    { "name": "licoresDominantes", "type": { "type": "array", "items": "string" } },
    { "name": "ciudad", "type": "string" },
    { "name": "timestamp", "type": "long" }
  ]
}
\\\

### Esquema Avro v2 (Con Campo Nuevo)

\\\json
{
  "type": "record",
  "name": "LeadEvent",
  "fields": [
    { "name": "leadId", "type": "string" },
    { "name": "establecimiento", "type": "string" },
    { "name": "whatsapp", "type": "string" },
    { "name": "licoresDominantes", "type": { "type": "array", "items": "string" } },
    { "name": "ciudad", "type": "string" },
    { "name": "timestamp", "type": "long" },
    { "name": "presupuestoMensualCOP", "type": ["null", "long"], "default": null }
  ]
}
\\\

## 4. Reglas de Compatibilidad

**Campo nuevo debe ser:**
1. **Opcional** (type: ["null", "long"])
2. **Con default** (default: null)
3. **Nunca reutilizar números de campo**

**Resultado:**
- Consumidor v1 ignora campo que no conoce → nunca falla
- Lead antiguo (v1) leído por consumidor v2 recibe null automáticamente
- **Sin breaking changes**

---

*Verificado contra el Capítulo 4 de DDIA*