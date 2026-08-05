# Migración a React Native — Reutilizando el Dominio (Capítulo 34)

**Fecha de creación:** 2026-08-04  
**Fuente:** Clean Architecture — Robert C. Martin (Uncle Bob), Capítulo 34  
**Estado:** Documento de planificación

---

## Concepto Verificado (Capítulo 34)

Uncle Bob cierra el libro argumentando que una arquitectura limpia no solo hace el sistema fácil de cambiar hoy — lo hace **preparable para cambios que aún no podemos prever**. El libro es explícito: si el dominio está bien aislado de los detalles (UI, BD, frameworks), migrar a una nueva plataforma (React Native, Flutter, una app de escritorio) no debería requerir reescribir las reglas de negocio.

---

## Escenario: SIGH_FOOD decide construir una App nativa

**Contexto:** El equipo comercial de SIGH_FOOD quiere que los vendedores puedan calcular el ROI y agendar demos directamente desde el campo, sin abrir un navegador — usando una app nativa iOS/Android construida con React Native.

**Pregunta crítica:** ¿Cuánto código del dominio habría que reescribir?

**Respuesta:** CERO líneas.

---

## Plan de Migración en 4 Pasos

### Paso 1: Reutilizar el paquete \@sighfood/domain\ sin cambios

El dominio ya es TypeScript puro, sin imports de React ni Next.js. Puede instalarse directamente en un proyecto React Native:

\\\json
// apps/mobile/package.json
{
  "dependencies": {
    "@sighfood/domain": "workspace:*",
    "react-native": "^0.73.0"
  }
}
\\\

**Archivos reutilizados sin cambios:**
- \packages/sighfood-domain/rules/calcularRoi.ts\
- \packages/sighfood-domain/rules/validarFormularioLead.ts\
- \packages/sighfood-domain/entities/Lead.ts\
- \packages/sighfood-domain/entities/Cono.ts\
- \packages/sighfood-domain/useCases/AgendarDemoUseCase.ts\
- \packages/sighfood-domain/ports/LeadRepository.ts\

### Paso 2: Crear nuevos adapters de UI para React Native

En vez de componentes React para web (\@sighfood/ui\), se crean componentes React Native:

\\\
apps/mobile/
├── components/
│   ├── CalculadoraRoiNative.tsx    ← usa calcularRoiMensual del dominio
│   ├── FormularioLeadNative.tsx    ← usa validarFormularioLead del dominio
│   └── PortafolioConosNative.tsx   ← usa PORTAFOLIO_CONOS del dominio
└── adapters/
    └── MobileLeadRepository.ts     ← implementa LeadRepository para la app
\\\

### Paso 3: Crear un nuevo adapter de persistencia móvil

La app móvil puede usar AsyncStorage o SQLite en vez de HubSpot/Pipedrive:

\\\	ypescript
// apps/mobile/adapters/AsyncStorageLeadRepository.ts
import { type Lead } from '@sighfood/domain/entities/Lead';
import { type LeadRepository } from '@sighfood/domain/ports/LeadRepository';
import AsyncStorage from '@react-native-async-storage/async-storage';

export class AsyncStorageLeadRepository implements LeadRepository {
  async guardar(lead: Lead): Promise<void> {
    const key = \lead:\\;
    await AsyncStorage.setItem(key, JSON.stringify(lead));
  }
}
\\\

### Paso 4: Crear un nuevo componente Main para la app móvil

\\\	ypescript
// apps/mobile/app/Main.tsx
import { AgendarDemoUseCase } from '@sighfood/domain/useCases/AgendarDemoUseCase';
import { validarFormularioLead } from '@sighfood/domain/rules/validarFormularioLead';
import { AsyncStorageLeadRepository } from '../adapters/AsyncStorageLeadRepository';

// Composición de dependencias — SOLO aquí
const repositorio = new AsyncStorageLeadRepository();
const useCase = new AgendarDemoUseCase(repositorio, { validar: validarFormularioLead });
\\\

---

## Comparación: Web vs. Móvil

| Capa | Web (Next.js) | Móvil (React Native) | Cambios requeridos |
|------|---------------|----------------------|---------------------|
| **Entities** | \Lead.ts\, \Cono.ts\ | Mismos archivos | **Ninguno** |
| **Use Cases** | \AgendarDemoUseCase.ts\ | Mismo archivo | **Ninguno** |
| **Rules** | \calcularRoi.ts\, \alidarFormularioLead.ts\ | Mismos archivos | **Ninguno** |
| **Ports** | \LeadRepository.ts\ | Misma interfaz | **Ninguno** |
| **Adapters UI** | \@sighfood/ui\ (React web) | \@sighfood/mobile-ui\ (React Native) | **Nuevos componentes** |
| **Adapters DB** | \HubSpotLeadRepository.ts\ | \AsyncStorageLeadRepository.ts\ | **Nuevo adapter** |
| **Main** | \pps/web/app/api/leads/route.ts\ | \pps/mobile/app/Main.tsx\ | **Nuevo Main** |

**Conclusión:** Solo se crean nuevos adapters y un nuevo Main. El dominio se reutiliza al 100%.

---

## Verificación de la Arquitectura

La prueba definitiva de que Clean Architecture se aplicó correctamente es que esta migración sea posible sin tocar el dominio. Si durante la migración descubrimos que hay que modificar \calcularRoi.ts\ o \AgendarDemoUseCase.ts\ para que funcionen en React Native, significa que el dominio tenía acoplamiento encubierto a la web — y habría que refactorizarlo antes de continuar.

---

## Referencias del Libro

- **Capítulo 34:** La Arquitectura Limpia es sobre prepararse para lo imprevisible
- **Capítulo 31:** La Web Es un Detalle
- **Capítulo 32:** Los Frameworks Son Detalles
- **Capítulo 26:** El Componente Main (donde se ensamblan las dependencias concretas)

---

*Documento generado como parte de la Fase 6 de implementación de Clean Architecture en SIGH_FOOD*