// =============================================================================
// A6: FORGETTING CURVE - Depreciacion de Conocimiento CRM
// =============================================================================

import { crmPatterns } from '@sighfood/domain/db/schema';
import { eq, sql } from 'drizzle-orm';
import { conBaseDeDatos } from './_soporte';

/** Días transcurridos que se asumen entre ejecuciones semanales. */
const DIAS_SIN_USO = 7;

export class ForgettingCurveService {
  /**
   * Aplica la depreciación semanal a todos los patrones.
   *
   * Antes recorría los patrones en JavaScript y por cada uno lanzaba un UPDATE
   * y un INSERT: 2N+1 viajes a la base dentro de una sola petición. Con miles
   * de patrones el Worker agotaba su tiempo antes de acabar, y como cada
   * escritura iba suelta, un fallo a mitad dejaba unos patrones depreciados y
   * otros no.
   *
   * Ahora son dos sentencias dentro de una transacción: primero se registra el
   * histórico —leyendo los valores ANTES de tocarlos— y después se aplica la
   * depreciación. El orden importa: al revés, el log guardaría como "anterior"
   * el valor ya depreciado.
   */
  async applyWeeklyDecay() {
    return conBaseDeDatos(async (db) =>
      db.transaction(async (tx) => {
        // La fórmula vive en un solo sitio para que el log y el UPDATE no
        // puedan divergir: si se calculara dos veces, un cambio en una copia
        // dejaría el histórico contando otra cosa.
        const nuevaConfianza = sql`
          GREATEST(0, ROUND(
            COALESCE(confidence_score, 0) *
            (1 - COALESCE(decay_rate, 0) * (${DIAS_SIN_USO}::numeric / 7)),
            2
          ))
        `;

        const nuevoEstado = sql`
          CASE
            WHEN ${nuevaConfianza} < 0.30 THEN 'deprecated'::pattern_consolidation
            WHEN ${nuevaConfianza} < 0.50 THEN 'active'::pattern_consolidation
            ELSE consolidation
          END
        `;

        await tx.execute(sql`
          INSERT INTO forgetting_curve_log
            (pattern_id, previous_confidence, new_confidence, previous_state, new_state, days_since_last_use)
          SELECT
            id,
            confidence_score,
            ${nuevaConfianza},
            consolidation,
            ${nuevoEstado},
            ${DIAS_SIN_USO}
          FROM crm_patterns
        `);

        const afectados = await tx.execute(sql`
          UPDATE crm_patterns
          SET confidence_score = ${nuevaConfianza},
              consolidation = ${nuevoEstado},
              updated_at = now()
          RETURNING id, confidence_score, consolidation
        `);

        return afectados;
      })
    );
  }

  async getDeprecatedPatterns() {
    return conBaseDeDatos(async (db) =>
      db.select()
        .from(crmPatterns)
        .where(eq(crmPatterns.consolidation, 'deprecated'))
    );
  }

  async archivePattern(patternId: string) {
    return conBaseDeDatos(async (db) => {
      await db.update(crmPatterns)
        .set({ consolidation: 'archived' })
        .where(eq(crmPatterns.id, patternId));
    });
  }
}

export const forgettingCurveService = new ForgettingCurveService();
