# Diagrama de Flujo de Datos - Pipeline de Leads SIGH_FOOD

## Diagrama 1: Flujo de Estados del Lead

\\\mermaid
stateDiagram-v2
    [*] --> Recibido: Formulario validado
    
    Recibido --> Encolado: LPUSH a cola
    Encolado --> Procesando: Worker dequeue
    
    Procesando --> Sincronizado: CRM webhook OK
    Procesando --> Fallido: CRM webhook falla (3 reintentos)
    
    Fallido --> DLQ: Mover a Dead Letter Queue
    DLQ --> ResueltoManualmente: Ingeniero resuelve
    
    Sincronizado --> [*]
    ResueltoManualmente --> [*]
\\\

## Diagrama 2: Secuencia de Eventos End-to-End

\\\mermaid
sequenceDiagram
    actor Usuario as Gerente A&B
    participant Browser as Navegador
    participant Edge as Edge Function
    participant Queue as Upstash Redis
    participant Worker as Worker Consumer
    participant CRM as CRM (HubSpot)
    participant DLQ as Dead Letter Queue
    
    Usuario->>Browser: Click "Agendar Demo"
    Browser->>Edge: POST /api/leads
    activate Edge
    Edge->>Edge: Validar + generar idempotencyKey
    Edge->>Queue: LPUSH lead-events-log
    Queue-->>Edge: OK
    Edge-->>Browser: 202 Accepted (<50ms)
    deactivate Edge
    Browser->>Usuario: Redirige a /gracias
    
    Note over Queue,Worker: Procesamiento asíncrono
    
    Queue->>Worker: Consume evento
    activate Worker
    Worker->>Worker: Reintento 1 (backoff 2s)
    Worker->>CRM: POST /leads
    CRM--xWorker: Timeout
    Worker->>Worker: Reintento 2 (backoff 8s)
    Worker->>CRM: POST /leads
    CRM--xWorker: Error 503
    Worker->>Worker: Reintento 3 (backoff 30s)
    Worker->>CRM: POST /leads
    CRM--xWorker: Error persistente
    Worker->>DLQ: Mover a DLQ
    DLQ->>DLQ: Alerta a Slack
    deactivate Worker
\\\

## Diagrama 3: Arquitectura de Componentes

\\\mermaid
flowchart TD
    subgraph Cliente["CAPA CLIENTE"]
        A["Navegador<br/>(móvil, 4G/WiFi)"]
    end
    
    subgraph Edge["CAPA EDGE"]
        B["Edge CDN<br/>(SSG)"]
        C["Edge Function<br/>/api/leads"]
    end
    
    subgraph Backend["CAPA BACKEND"]
        D["Cola Upstash<br/>lead-events-log"]
        E["Worker Consumer"]
        F["Dead Letter Queue"]
    end
    
    subgraph Integraciones["INTEGRACIONES"]
        G["CRM<br/>HubSpot/Pipedrive"]
        H["Notificaciones<br/>Slack/WhatsApp"]
    end
    
    A -->|"GET / (SSG)"| B
    A -->|"POST /api/leads"| C
    C -->|"LPUSH"| D
    D -->|"Dequeue"| E
    E -->|"Webhook"| G
    E -->|"Paralelo"| H
    E -->|"3 fallos"| F
    F -.->|"Alerta"| E
    
    style Cliente fill:#1F3864,color:#fff
    style Edge fill:#2E5395,color:#fff
    style Backend fill:#3D6BB3,color:#fff
    style Integraciones fill:#EDEDED,color:#000
\\\

## Descripción de Estados

| Estado | Definición | Dónde Vive | Duración Típica |
|--------|-----------|-----------|-----------------|
| **Recibido** | Formulario validado por Edge Function | Efímero (milisegundos) | < 100ms |
| **Encolado** | Evento en lead-events-log | Upstash Redis | Segundos a minutos |
| **Procesando** | Worker intentando sincronizar | Memoria del Worker | Segundos (3 reintentos) |
| **Sincronizado** | Lead existe en CRM | CRM (HubSpot/Pipedrive) | Permanente |
| **Fallido** | 3 reintentos agotados | Memoria del Worker | Milisegundos |
| **DLQ** | Evento en Dead Letter Queue | Upstash Redis (DLQ) | Hasta resolución manual |
| **Resuelto Manualmente** | Ingeniero resolvió el evento | CRM (después de resolución) | Permanente |

## Garantías del Sistema

1. **At-least-once delivery**: Ningún Lead se pierde silenciosamente
2. **Idempotencia**: idempotencyKey previene duplicados en el CRM
3. **Trazabilidad completa**: Historial de transiciones en cada Lead
4. **Alertas proactivas**: DLQ genera alerta automática a Slack
5. **Recuperación manual**: Eventos en DLQ pueden resolverse manualmente

---

*Documento generado como parte de la Fase 5 del RFC-001*