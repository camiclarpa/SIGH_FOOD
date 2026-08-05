/**
 * ============================================================================
 * FORMULARIO LEAD CONTROLLER — Círculo 3: Interface Adapters (Capítulo 22)
 * ============================================================================
 * 
 * Traduce el formato "conveniente para el framework" (FormData del navegador)
 * al formato "conveniente para el Use Case" (el input tipado del dominio).
 * 
 * REFERENCIAS DEL LIBRO:
 *   • Capítulo 22: Interface Adapters — Traducen entre Use Cases y Frameworks
 *   • Capítulo 26: El Componente Main — este controller es ensamblado en Main
 * ============================================================================
 */

import { type AgendarDemoUseCase } from '@sighfood/domain/useCases/AgendarDemoUseCase';
import { type FormularioLeadInput } from '@sighfood/domain/rules/validarFormularioLead';

export class FormularioLeadController {
  constructor(private readonly useCase: AgendarDemoUseCase) {}

  async manejar(formData: FormData): Promise<{ status: number; body: unknown }> {
    // Traducir FormData → Input del Use Case
    const input: FormularioLeadInput = {
      establecimiento: formData.get('establecimiento') as string,
      tomadorDecision: {
        nombre: formData.get('tomadorNombre') as string,
        rol: formData.get('tomadorRol') as 'Dueño' | 'Gerente A&B' | 'Head Bartender',
      },
      whatsapp: formData.get('whatsapp') as string,
      licoresDominantes: formData.getAll('licores') as string[],
      ciudad: formData.get('ciudad') as string | undefined,
    };

    // Ejecutar Use Case
    const resultado = await this.useCase.ejecutar(input);

    // Traducir resultado → Respuesta HTTP
    return resultado.exito
      ? { status: 202, body: { status: 'queued', leadId: resultado.leadId } }
      : { status: 400, body: { errores: resultado.errores } };
  }
}