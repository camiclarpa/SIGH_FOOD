-- =============================================================================
-- Qué QR concreto originó cada momento, para el desglose por mesa
-- =============================================================================
--
-- sensory_moments solo guardaba account_id (el bar), no qué mesa. Con 10 mesas
-- en el mismo bar era imposible saber cuál trae más gente. La zona ya se
-- guarda del bar, no del móvil (ver columna `zona`); esta es la misma idea:
-- lo que sabe el sistema, no lo que hay que pedirle a la persona.

ALTER TABLE sensory_moments
  ADD COLUMN IF NOT EXISTS qr_code_id uuid REFERENCES qr_codes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sensory_moments_qr_code ON sensory_moments(qr_code_id);
