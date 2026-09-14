UPDATE capstones
SET is_published = true,
    updated_at = NOW()
WHERE is_published = false;
