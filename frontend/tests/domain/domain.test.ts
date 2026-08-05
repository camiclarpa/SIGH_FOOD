/**
 * ============================================================================
 * DOMAIN TESTS — Tests del dominio SIN navegador (Capítulo 33)
 * ============================================================================
 * 
 * PROPÓSITO: Verificar que las reglas de negocio de SIGH_FOOD pueden probarse
 * de forma aislada, sin React, sin DOM, sin navegador — usando solo Vitest
 * (un test runner de Node.js).
 * 
 * CONCEPTO VERIFICADO (Capítulo 33):
 * ──────────────────────────────────────────────────────────────────────────
 * Uncle Bob argumenta que las reglas de negocio deben ser el núcleo más
 * protegido del sistema — y la forma más directa de protegerlas es tener
 * tests unitarios que las validen de forma aislada, sin depender de la UI
 * ni de la infraestructura.
 * 
 * REFERENCIAS DEL LIBRO:
 *   • Capítulo 33: Tests
 *   • Capítulo 6: Programación Funcional (funciones puras son fácilmente testeables)
 * 
 * EJECUCIÓN:
 *   cd packages/sighfood-domain
 *   pnpm test
 * ============================================================================
 */

import { describe, it, expect } from 'vitest';
import { calcularRoiMensual } from '../packages/sighfood-domain/rules/calcularRoi';
import { validarFormularioLead } from '../packages/sighfood-domain/rules/validarFormularioLead';
import { obtenerConoPorId, PORTAFOLIO_CONOS } from '../packages/sighfood-domain/entities/Cono';

describe('Dominio SIGH_FOOD - Tests sin navegador', () => {
  describe('calcularRoiMensual', () => {
    it('debería calcular correctamente 100 tragos/fin de semana', () => {
      const resultado = calcularRoiMensual(100);
      
      // 100 × 0.20 = 20 conos/fin de semana
      // 20 × 4.33 = 86.6 → 87 conos/mes
      // 87 × 23,500 = 2,044,500 COP
      expect(resultado.conosEstimados).toBe(87);
      expect(resultado.gananciaNetaMensualCOP).toBe(2_044_500);
    });

    it('debería calcular correctamente 0 tragos', () => {
      const resultado = calcularRoiMensual(0);
      expect(resultado.conosEstimados).toBe(0);
      expect(resultado.gananciaNetaMensualCOP).toBe(0);
    });

    it('debería calcular correctamente 500 tragos', () => {
      const resultado = calcularRoiMensual(500);
      // 500 × 0.20 = 100 conos/fin de semana
      // 100 × 4.33 = 433 conos/mes
      // 433 × 23,500 = 10,175,500 COP
      expect(resultado.conosEstimados).toBe(433);
      expect(resultado.gananciaNetaMensualCOP).toBe(10_175_500);
    });

    it('debería ser determinística (misma entrada → misma salida)', () => {
      const resultado1 = calcularRoiMensual(100);
      const resultado2 = calcularRoiMensual(100);
      expect(resultado1).toEqual(resultado2);
    });

    it('debería lanzar error para valores negativos', () => {
      expect(() => calcularRoiMensual(-10)).toThrow();
    });
  });

  describe('validarFormularioLead', () => {
    it('debería validar un formulario correcto', () => {
      const resultado = validarFormularioLead({
        establecimiento: 'Gastrobar El Rincón',
        tomadorDecision: { nombre: 'Carlos Rodríguez', rol: 'Gerente A&B' },
        whatsapp: '+573001234567',
        licoresDominantes: ['Mezcal', 'Gin'],
        ciudad: 'Medellín',
      });

      expect(resultado.esValido).toBe(true);
      expect(resultado.errores).toHaveLength(0);
    });

    it('debería rechazar un formulario sin establecimiento', () => {
      const resultado = validarFormularioLead({
        establecimiento: '',
        tomadorDecision: { nombre: 'Carlos', rol: 'Gerente A&B' },
        whatsapp: '+573001234567',
        licoresDominantes: ['Mezcal'],
      });

      expect(resultado.esValido).toBe(false);
      expect(resultado.errores.length).toBeGreaterThan(0);
    });

    it('debería rechazar un WhatsApp con formato inválido', () => {
      const resultado = validarFormularioLead({
        establecimiento: 'Bar Test',
        tomadorDecision: { nombre: 'Carlos', rol: 'Gerente A&B' },
        whatsapp: '123',
        licoresDominantes: ['Mezcal'],
      });

      expect(resultado.esValido).toBe(false);
    });
  });

  describe('Cono entity', () => {
    it('debería tener 5 conos en el portafolio', () => {
      expect(PORTAFOLIO_CONOS).toHaveLength(5);
    });

    it('debería obtener un cono por ID', () => {
      const cono = obtenerConoPorId('spicy-volcano');
      expect(cono).toBeDefined();
      expect(cono!.nombre).toBe('The Spicy Volcano Cone');
    });

    it('debería retornar undefined para ID inexistente', () => {
      const cono = obtenerConoPorId('no-existe');
      expect(cono).toBeUndefined();
    });
  });
});