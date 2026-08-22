const LEVEL_ROLE_BRACKETS = [
  { name: "Beginner [1-4]", roleId: "1417172430539063378", minLevel: 1, maxLevel: 4 },
  { name: "Intermediate [5-8]", roleId: "1417172772588884111", minLevel: 5, maxLevel: 8 },
  { name: "Adept [9-12]", roleId: "1417173034334163077", minLevel: 9, maxLevel: 12 },
  { name: "Expert [13-16]", roleId: "1417173254057099306", minLevel: 13, maxLevel: 16 },
  { name: "Master [17-19]", roleId: "1417173513109770362", minLevel: 17, maxLevel: 19 },
  { name: "Paragon [20+]", roleId: "1417173791678791690", minLevel: 20, maxLevel: Infinity },
];

function normalizeLevel(character) {
  const level = Number.parseInt(character?.level, 10);
  return Number.isInteger(level) && level > 0 ? level : null;
}

function isActiveApprovedCharacter(character) {
  const status =
    typeof character?.status === "string"
      ? character.status.trim().toUpperCase()
      : "";
  return (
    character?.isApproved === true &&
    status !== "RETIRED" &&
    status !== "DELETED" &&
    status !== "ARCHIVED"
  );
}

function getDesiredLevelRoleIds(characters) {
  const levels = (Array.isArray(characters) ? characters : [])
    .filter(isActiveApprovedCharacter)
    .map(normalizeLevel)
    .filter((level) => level !== null);

  return new Set(
    LEVEL_ROLE_BRACKETS.filter((bracket) =>
      levels.some(
        (level) => level >= bracket.minLevel && level <= bracket.maxLevel,
      ),
    ).map((bracket) => bracket.roleId),
  );
}

module.exports = {
  LEVEL_ROLE_BRACKETS,
  getDesiredLevelRoleIds,
  isActiveApprovedCharacter,
};
