UPDATE guilds
SET
  emblem_src = '/img/Eclipsed%20Choir.png',
  emblem_alt = 'Eclipsed Choir emblem',
  updated_at = NOW()
WHERE slug = 'eclipsed-choir';
