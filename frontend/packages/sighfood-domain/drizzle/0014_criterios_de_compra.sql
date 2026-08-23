-- =============================================================================
-- 0014 - Criterios de insignia basados en la compra
-- =============================================================================
--
-- Los seis criterios existentes miden escaneos del QR de la mesa: escaneos
-- totales, líneas probadas, bares distintos, franja horaria, racha de semanas y
-- referidos. Todos venían de cuando el sujeto del CRM era el bar.
--
-- Hoy el dinero entra por la tienda, y ninguno de los seis mira un pedido. El
-- efecto era que quien comprara diez veces no ganaba una sola insignia ni subía
-- de nivel: el club de fidelización no reconocía justamente al mejor cliente.
--
-- Los tres nuevos se evalúan solo sobre pedidos ENTREGADOS, el mismo momento en
-- que se otorgan los puntos. Antes de entregar el pedido puede cancelarse, y
-- una insignia retirada se vive como un castigo.
--
-- Aditivo: no se toca ningún valor existente ni ninguna fila. Fuera de
-- transacción por lo mismo que la 0013 — un valor de enum recién añadido no se
-- puede usar hasta que la transacción que lo añadió termina.

ALTER TYPE "badge_criterio" ADD VALUE IF NOT EXISTS 'pedidos_totales';
ALTER TYPE "badge_criterio" ADD VALUE IF NOT EXISTS 'gasto_acumulado';
ALTER TYPE "badge_criterio" ADD VALUE IF NOT EXISTS 'lineas_pedidas';
