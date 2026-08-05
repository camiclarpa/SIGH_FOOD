# Modelo de Datos — Documental vs Relacional

## 1. Análisis del Lead de SIGH_FOOD

Siguiendo los criterios de Kleppmann (Capítulo 2):

| Criterio | Análisis |
|----------|----------|
| **¿Es autocontenida, tipo árbol?** | Sí — Lead tiene: establecimiento, tomador de decisión, WhatsApp, licores, ciudad, timestamp. Sin relaciones muchos-a-muchos en captura. |
| **¿Se necesitan joins frecuentes?** | Solo en CRM downstream (Lead ↔ Vendedor ↔ Cuenta). No en momento de captura. |
| **¿El esquema cambiará?** | Sí — nuevos campos de calificación se añaden progresivamente. |

## 2. Decisión: Modelo Documental para Captura

**Justificación:**
- Schema-on-read tolera evolución sin migración
- Upstash Redis (sin esquema rígido) es ideal para la etapa de cola
- Una vez en CRM (HubSpot/Pipedrive), ese sistema impone su modelo relacional

## 3. Modelo Documental del Lead

\\\	ypescript
interface LeadEvent {
  leadId: string;
  establecimiento: string;
  tomadorDecision: { 
    nombre: string; 
    rol: 'Dueño' | 'Gerente A&B' | 'Head Bartender' 
  };
  whatsapp: string;
  licoresDominantes: string[]; // campo evolucionable
  ciudad: string;
  timestamp: number;
  // Campos añadidos progresivamente:
  scoreCalificacion?: number;
  icpMatch?: boolean;
}
\\\

## 4. Ventajas del Enfoque Documental

1. **Evolución sin breaking changes:** Nuevos campos son opcionales
2. **Sin joins en captura:** Todo está en un solo documento
3. **Flexibilidad:** Diferentes campañas pueden tener campos distintos

---

*Verificado contra el Capítulo 2 de DDIA*