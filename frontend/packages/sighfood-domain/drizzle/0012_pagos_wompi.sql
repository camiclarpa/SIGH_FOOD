-- =============================================================================
-- 0012 - Pagos: registro de transacciones de la pasarela
-- =============================================================================
--
-- `pedidos.estado_pago` dice CÓMO ESTÁ el pago ahora. Esta tabla dice QUÉ PASÓ,
-- que no es lo mismo y hace falta para tres cosas que el campo suelto no puede:
--
--   · Reintentar. Un pago declinado deja una transacción cerrada; el reintento
--     es OTRA transacción sobre el mismo pedido. Con un solo campo, el segundo
--     intento borra el rastro del primero y nadie sabe por qué falló.
--
--   · Conciliar. Al cuadrar caja con el extracto de Wompi hay que poder cruzar
--     cada movimiento con su pedido, incluidos los que no llegaron a aprobarse.
--
--   · Auditar. Si alguien reclama un cobro doble, la respuesta está aquí: qué
--     transacciones hubo, cuándo, con qué método y qué dijo la pasarela.
--
-- Un pedido tiene N transacciones; solo una puede estar aprobada, y eso lo
-- garantiza el índice único parcial de abajo — no una comprobación en código.
--
-- Solo CREA y AÑADE.

CREATE TABLE IF NOT EXISTS "pagos" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "pedido_id" uuid NOT NULL REFERENCES "pedidos"("id") ON DELETE CASCADE,

  -- Referencia que se le manda a Wompi. Es única por INTENTO, no por pedido:
  -- Wompi rechaza una referencia repetida, así que un reintento necesita otra.
  "referencia" varchar(120) NOT NULL UNIQUE,

  -- Id de la transacción en Wompi. Null hasta que la pasarela responde.
  "transaccion_id" varchar(120),

  "estado" estado_pago NOT NULL DEFAULT 'pendiente',
  "metodo" metodo_pago NOT NULL,

  -- En CENTAVOS, como los maneja Wompi. Se guarda tal cual llega para poder
  -- comparar sin convertir: una conversión de más es una discrepancia de menos
  -- que detectar al conciliar.
  "monto_centavos" integer NOT NULL,
  "moneda" varchar(3) NOT NULL DEFAULT 'COP',

  -- Lo que dijo la pasarela cuando algo salió mal, para poder explicárselo a
  -- quien reclama sin abrir el panel de Wompi.
  "mensaje" varchar(500),
  -- Evento completo, por si hay que investigar algo que no se previó.
  "carga_util" jsonb,

  "creado_en" timestamptz DEFAULT now(),
  "actualizado_en" timestamptz DEFAULT now(),
  "aprobado_en" timestamptz
);

CREATE INDEX IF NOT EXISTS "idx_pagos_pedido" ON "pagos" ("pedido_id");
CREATE INDEX IF NOT EXISTS "idx_pagos_transaccion" ON "pagos" ("transaccion_id");
CREATE INDEX IF NOT EXISTS "idx_pagos_estado" ON "pagos" ("estado", "creado_en");

-- UN SOLO PAGO APROBADO POR PEDIDO.
--
-- Índice único PARCIAL: solo restringe las filas aprobadas, así que un pedido
-- puede acumular tantos intentos declinados como haga falta pero no dos cobros
-- buenos. Ponerlo en la base y no en código es lo único que aguanta dos webhooks
-- de Wompi llegando a la vez — que es exactamente lo que pasa cuando reintenta.
CREATE UNIQUE INDEX IF NOT EXISTS "uq_pago_aprobado_por_pedido"
  ON "pagos" ("pedido_id")
  WHERE "estado" = 'aprobado';
