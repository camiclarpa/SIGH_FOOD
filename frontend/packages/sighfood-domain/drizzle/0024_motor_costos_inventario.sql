-- =============================================================================
-- Motor de costos e inventario (COGS/FIFO): insumos, fichas técnicas, capas
-- de costo por compra, ledger de consumo.
-- =============================================================================

CREATE TYPE unidad_medida AS ENUM ('g', 'kg', 'ml', 'l', 'unidad');

-- 'salida_venta' la dispara el sistema al entregar un pedido. 'faltante' es
-- la salida que NO se pudo cubrir con ninguna capa. 'ajuste' es manual.
CREATE TYPE insumo_movimiento_tipo AS ENUM ('salida_venta', 'faltante', 'ajuste');

CREATE TABLE IF NOT EXISTS proveedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre varchar(150) NOT NULL,
  telefono varchar(30),
  notas text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_proveedores_activo ON proveedores(activo);

CREATE TABLE IF NOT EXISTS insumos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre varchar(150) NOT NULL,
  unidad_medida unidad_medida NOT NULL,
  stock_minimo numeric(14, 4),
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_insumos_activo ON insumos(activo);

CREATE TABLE IF NOT EXISTS receta_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id uuid NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  insumo_id uuid NOT NULL REFERENCES insumos(id) ON DELETE RESTRICT,
  cantidad numeric(14, 4) NOT NULL,
  notas varchar(255)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_receta_items_producto_insumo ON receta_items(producto_id, insumo_id);
CREATE INDEX IF NOT EXISTS idx_receta_items_insumo ON receta_items(insumo_id);

CREATE TABLE IF NOT EXISTS insumo_capas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  insumo_id uuid NOT NULL REFERENCES insumos(id) ON DELETE RESTRICT,
  proveedor_id uuid REFERENCES proveedores(id) ON DELETE SET NULL,

  cantidad_inicial numeric(14, 4) NOT NULL,
  cantidad_disponible numeric(14, 4) NOT NULL,

  costo_total_cop integer NOT NULL,
  costo_unitario_cop numeric(14, 6) NOT NULL,

  referencia_compra varchar(120),
  notas text,
  fecha_compra timestamptz NOT NULL DEFAULT now(),
  registrado_por uuid REFERENCES staff_users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_capas_insumo_fecha ON insumo_capas(insumo_id, fecha_compra);
-- "capa más antigua con stock" es el corazón del consumo FIFO; parcial porque
-- solo importa buscar entre las que todavía tienen algo.
CREATE INDEX IF NOT EXISTS idx_capas_insumo_disponible ON insumo_capas(insumo_id, cantidad_disponible)
  WHERE cantidad_disponible > 0;

CREATE TABLE IF NOT EXISTS insumo_movimientos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  insumo_id uuid NOT NULL REFERENCES insumos(id) ON DELETE RESTRICT,
  capa_id uuid REFERENCES insumo_capas(id) ON DELETE RESTRICT,

  tipo insumo_movimiento_tipo NOT NULL,
  cantidad numeric(14, 4) NOT NULL,
  costo_cop integer,

  pedido_id uuid REFERENCES pedidos(id) ON DELETE SET NULL,
  pedido_item_id uuid REFERENCES pedido_items(id) ON DELETE SET NULL,
  staff_user_id uuid REFERENCES staff_users(id) ON DELETE SET NULL,

  notas text,
  creado_en timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_insumo_mov_insumo_fecha ON insumo_movimientos(insumo_id, creado_en);
CREATE INDEX IF NOT EXISTS idx_insumo_mov_pedido ON insumo_movimientos(pedido_id);
CREATE INDEX IF NOT EXISTS idx_insumo_mov_capa ON insumo_movimientos(capa_id);
CREATE INDEX IF NOT EXISTS idx_insumo_mov_tipo ON insumo_movimientos(tipo, creado_en);

-- Idempotencia del descuento de inventario al entregar: mismo rol que
-- pedidos.puntos_otorgados.
ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS inventario_descontado_en timestamptz;
