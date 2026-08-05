/**
 * domain/enums/EB2BRole.ts
 *
 * Rol del Tomador de Decisión que completa el formulario. Este campo es
 * crítico para la calificación del Lead (ver Guía de Calificación Comercial,
 * Módulo 4): un Dueño o Gerente A&B tiene autoridad de presupuesto; un Head
 * Bartender es el Influenciador/Champion pero rara vez el Economic Buyer.
 * El equipo de ventas prioriza el follow-up según este campo.
 */
export enum EB2BRole {
  DUENIO = 'DUENIO',
  GERENTE_AB = 'GERENTE_AB',
  HEAD_BARTENDER = 'HEAD_BARTENDER',
  SOCIO_INVERSIONISTA = 'SOCIO_INVERSIONISTA',
  OTRO = 'OTRO',
}