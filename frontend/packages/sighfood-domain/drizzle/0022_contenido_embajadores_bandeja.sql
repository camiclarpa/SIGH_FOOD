-- =============================================================================
-- Contenido con medios y lote, comisión de embajadores, cierre de chats
-- =============================================================================

-- Etiquetado de piezas: faltaban las dos categorías que se pidieron
-- explícitamente para Contenido — maridaje y campaña — junto a las que ya
-- existían (guía, video, reto, storytelling, receta, ugc).
ALTER TYPE contenido_tipo ADD VALUE IF NOT EXISTS 'maridaje';
ALTER TYPE contenido_tipo ADD VALUE IF NOT EXISTS 'campana';

-- Subida de archivos reales (antes solo se podía pegar un enlace externo) y
-- vínculo a la tanda de producción de la que habla la pieza.
ALTER TABLE contenidos
  ADD COLUMN IF NOT EXISTS media_key varchar(300),
  ADD COLUMN IF NOT EXISTS media_tipo varchar(100),
  ADD COLUMN IF NOT EXISTS lote_id uuid REFERENCES lotes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_contenidos_lote ON contenidos(lote_id);

-- Comisión en pesos por embajador. No mueve dinero -ver el comentario en el
-- schema-: solo registra cuánto se debe y cuándo se marcó como pagado fuera
-- del sistema.
ALTER TABLE embajadores
  ADD COLUMN IF NOT EXISTS comision_por_pedido_cop integer,
  ADD COLUMN IF NOT EXISTS comision_liquidada_cop integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comision_liquidada_en timestamptz;
