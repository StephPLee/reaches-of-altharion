UPDATE guilds
SET
  emblem_src = '/img/eclipsed%20choir.png',
  emblem_alt = 'Eclipsed Choir emblem',
  updated_at = NOW()
WHERE slug = 'eclipsed-choir';
