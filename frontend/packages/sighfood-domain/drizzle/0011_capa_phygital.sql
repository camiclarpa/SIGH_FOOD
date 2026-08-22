-- =============================================================================
-- 0011 - Capa phygital: del QR de la mesa al pedido
-- =============================================================================
--
-- Conecta el local físico con la tienda. Hasta ahora un pedido solo podía ser
-- 'domicilio' o 'recoger': los dos suponen que la persona NO está en el local.
-- Pero el caso más valioso es justo el contrario — alguien sentado en una mesa,
-- con el antojo delante, que no tiene que levantarse ni hacer cola.
--
--   · tipo_entrega gana el valor 'mesa'.
--   · pedidos.account_id y pedidos.mesa dicen A QUÉ MESA llevarlo. Sin eso, la
--     cocina tendría una comanda sin destino.
--   · eventos_embudo.qr_token permite saber qué adhesivo trajo qué pedido, que
--     es lo que convierte un lote de QR impresos en una campaña medible.
--
-- Solo AÑADE. No borra ni modifica nada existente.

-- Añadir un valor a un enum no se puede deshacer, y falla si ya existe: de ahí
-- la comprobación previa en lugar de un IF NOT EXISTS, que este ALTER no admite
-- en todas las versiones.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'tipo_entrega' AND e.enumlabel = 'mesa'
  ) THEN
    ALTER TYPE "tipo_entrega" ADD VALUE 'mesa';
  END IF;
END $$;

ALTER TABLE "pedidos"
  ADD COLUMN IF NOT EXISTS "account_id" uuid REFERENCES "accounts"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "mesa" varchar(50),
  -- Qué QR trajo este pedido. Sirve para medir la campaña y, si algo va mal,
  -- para saber de qué adhesivo salió.
  ADD COLUMN IF NOT EXISTS "qr_token" varchar(255);

CREATE INDEX IF NOT EXISTS "idx_pedidos_mesa" ON "pedidos" ("account_id", "mesa");

ALTER TABLE "eventos_embudo"
  ADD COLUMN IF NOT EXISTS "qr_token" varchar(255);

CREATE INDEX IF NOT EXISTS "idx_embudo_qr" ON "eventos_embudo" ("qr_token");
