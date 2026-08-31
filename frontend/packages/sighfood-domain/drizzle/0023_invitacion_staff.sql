-- =============================================================================
-- Invitación de usuarios del equipo por token, en vez de contraseña a mano
-- =============================================================================

ALTER TABLE staff_users
  ADD COLUMN IF NOT EXISTS invitacion_token varchar(64) UNIQUE,
  ADD COLUMN IF NOT EXISTS invitacion_expira timestamptz;

CREATE INDEX IF NOT EXISTS idx_staff_users_invitacion ON staff_users(invitacion_token);
