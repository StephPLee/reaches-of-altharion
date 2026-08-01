ALTER TABLE guilds
ADD COLUMN IF NOT EXISTS discord_role_id TEXT;

UPDATE guilds g
SET
  discord_role_id = v.discord_role_id,
  updated_at = NOW()
FROM (VALUES
  ('the-argent-mark', '1435207916805292062'),
  ('the-ashen-veil', '1435207516240875690'),
  ('black-hand', '1428340956423393410'),
  ('crucible-of-creation', '1428341526404272240'),
  ('dawnwardens', '1428341088577388635'),
  ('dragons-den-of-drama', '1428341377917259857'),
  ('dread-legion', '1428341011381489706'),
  ('eclipsed-choir', '1498482646060241066'),
  ('golden-quill', '1428340688935981097'),
  ('iron-vanguard', '1428340890832732200'),
  ('verdant-accord', '1428341237043302431'),
  ('wayfarers-respite', '1474175943944966350')
) AS v(slug, discord_role_id)
WHERE g.slug = v.slug;
