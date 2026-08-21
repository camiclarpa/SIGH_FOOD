-- =============================================================================
-- 0008 - Plantilla aprobada de Meta en las secuencias de automatización
-- =============================================================================
--
-- Motivo: `automation_sequences.template` guarda el texto libre que se escribe
-- en el CRM, con {{nombre}}, {{puntos}}… Eso NO es lo que Meta envía. Fuera de
-- la ventana de 24 h, la Cloud API solo acepta una plantilla previamente
-- aprobada (HSM), identificada por su nombre, y con huecos POSICIONALES
-- ({{1}}, {{2}}…). Sin estos tres campos, activar una secuencia de WhatsApp
-- dejaba el CRM sin nada que mandar: se guardaba la campaña y no salía ningún
-- mensaje.
--
--   · meta_template_name  nombre exacto de la plantilla aprobada en Meta
--   · meta_template_lang  código de idioma con el que se aprobó (es, es_ES, …);
--                         Meta rechaza el envío si no coincide con el aprobado
--   · meta_template_vars  claves del CRM en el orden de {{1}}, {{2}}… Es un
--                         array y no un objeto porque el orden ES el dato: Meta
--                         numera los huecos, no los nombra.
--
-- Las tres son anulables y sin valor por defecto: las secuencias que ya existen
-- siguen siendo válidas, y las de email/SMS/push nunca las necesitan.
-- Solo añade columnas — no borra ni reescribe nada.

ALTER TABLE "automation_sequences"
  ADD COLUMN IF NOT EXISTS "meta_template_name" varchar(255),
  ADD COLUMN IF NOT EXISTS "meta_template_lang" varchar(10),
  ADD COLUMN IF NOT EXISTS "meta_template_vars" jsonb;
