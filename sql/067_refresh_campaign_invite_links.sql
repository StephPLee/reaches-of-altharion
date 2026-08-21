-- Refresh all fifteen D&D Beyond campaign invitations during the campaign
-- spring clean.
--
-- Updating the existing rows (rather than recreating them) preserves all
-- cc_assignments that reference these campaign IDs.
BEGIN;

DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE cc_campaigns AS campaign
  SET invite_url = replacements.invite_url
  FROM (
    VALUES
      ('CC1',  'https://www.dndbeyond.com/campaigns/join/70501493977248658'),
      ('CC2',  'https://www.dndbeyond.com/campaigns/join/71028231432642013'),
      ('CC3',  'https://www.dndbeyond.com/campaigns/join/71545561562509115'),
      ('CC4',  'https://www.dndbeyond.com/campaigns/join/72037861904918902'),
      ('CC5',  'https://www.dndbeyond.com/campaigns/join/72292224210208628'),
      ('CC6',  'https://www.dndbeyond.com/campaigns/join/72695173493357004'),
      ('CC7',  'https://www.dndbeyond.com/campaigns/join/72695203769363965'),
      ('CC8',  'https://www.dndbeyond.com/campaigns/join/72695312372386829'),
      ('CC9',  'https://www.dndbeyond.com/campaigns/join/72695322870719083'),
      ('CC10', 'https://www.dndbeyond.com/campaigns/join/72695333220858305'),
      ('CC11', 'https://www.dndbeyond.com/campaigns/join/72695541400838834'),
      ('CC12', 'https://www.dndbeyond.com/campaigns/join/7269559547404901'),
      ('CC13', 'https://www.dndbeyond.com/campaigns/join/72695623981864266'),
      ('CC14', 'https://www.dndbeyond.com/campaigns/join/72695711632796000'),
      ('CC15', 'https://www.dndbeyond.com/campaigns/join/72695752114485695')
  ) AS replacements(code, invite_url)
  WHERE campaign.code = replacements.code;

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  IF updated_count <> 15 THEN
    RAISE EXCEPTION
      'Expected to update 15 cc_campaigns rows, but updated %',
      updated_count;
  END IF;
END
$$;

COMMIT;
