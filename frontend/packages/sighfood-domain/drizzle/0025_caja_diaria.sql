-- =============================================================================
-- Caja diaria: apertura, cierre y arqueo.
-- =============================================================================

CREATE TYPE caja_sesion_estado AS ENUM ('abierta', 'cerrada');

CREATE TABLE IF NOT EXISTS caja_sesiones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Puerta abierta para multi-sede. Hoy siempre null: una sola operación central.
  sede varchar(80),

  estado caja_sesion_estado NOT NULL DEFAULT 'abierta',

  monto_inicial_cop integer NOT NULL,
  -- Los tres siguientes quedan NULL mientras la sesión está abierta: se
  -- calculan y congelan UNA vez al cerrar.
  efectivo_contado_cop integer,
  efectivo_esperado_cop integer,
  diferencia_cop integer,

  abierta_por uuid NOT NULL REFERENCES staff_users(id) ON DELETE RESTRICT,
  cerrada_por uuid REFERENCES staff_users(id) ON DELETE RESTRICT,

  abierta_en timestamptz NOT NULL DEFAULT now(),
  cerrada_en timestamptz,

  notas_apertura varchar(255),
  notas_cierre varchar(255)
);

CREATE INDEX IF NOT EXISTS idx_caja_sesiones_estado ON caja_sesiones(estado);
CREATE INDEX IF NOT EXISTS idx_caja_sesiones_abierta_en ON caja_sesiones(abierta_en);

-- UNA SOLA SESIÓN ABIERTA A LA VEZ (por sede; hoy sede siempre es null, y
-- COALESCE la trata como una única sede "central" — mismo mecanismo que
-- uq_pago_aprobado_por_pedido usa en pagos, migración 0012).
CREATE UNIQUE INDEX IF NOT EXISTS uq_caja_sesion_abierta
  ON caja_sesiones ((COALESCE(sede, '')))
  WHERE estado = 'abierta';

-- Cuándo estado_pago pasó a 'aprobado'. La fija marcarPagado() y el flujo de
-- aprobación de Wompi. Necesaria para calcular el efectivo esperado por rango
-- de tiempo real de aprobación, no por created_at (puede ser de antes de abrir
-- caja) ni por updated_at (cambia con cualquier edición del pedido).
ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS pago_aprobado_en timestamptz;
