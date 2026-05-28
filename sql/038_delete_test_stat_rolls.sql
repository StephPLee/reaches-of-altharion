DELETE FROM stat_roll_sets
WHERE claimed_by_discord_user_id = (
  SELECT discord_user_id FROM users
  WHERE LOWER(COALESCE(global_name, username)) = 'marshy'
);
