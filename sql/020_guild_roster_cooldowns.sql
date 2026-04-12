ALTER TABLE guild_roster_memberships
ADD COLUMN IF NOT EXISTS last_membership_change_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS guild_roster_memberships_change_cooldown_idx
  ON guild_roster_memberships (westmarches_character_id, last_membership_change_at);
