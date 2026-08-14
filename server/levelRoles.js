const {
  LEVEL_ROLE_BRACKETS,
  getDesiredLevelRoleIds,
} = require("../shared/levelRoles");
const {
  addGuildMemberRole,
  fetchGuildMember,
  removeGuildMemberRole,
} = require("./discord");
const { listAllCharacters } = require("./westmarches");

const LEVEL_ROLE_IDS = new Set(
  LEVEL_ROLE_BRACKETS.map((bracket) => bracket.roleId),
);

async function syncLevelRolesForCharacterIds(characterIds) {
  const targetCharacterIds = new Set(characterIds);
  if (targetCharacterIds.size === 0) {
    return;
  }

  const characters = await listAllCharacters();
  const discordUserIds = new Set(
    characters
      .filter((character) => targetCharacterIds.has(character?.id))
      .map((character) => character?.user?.discordId)
      .filter((discordUserId) =>
        typeof discordUserId === "string" && /^\d+$/.test(discordUserId),
      ),
  );

  for (const discordUserId of discordUserIds) {
    const member = await fetchGuildMember(discordUserId);
    if (!member) {
      continue;
    }

    const userCharacters = characters.filter(
      (character) => character?.user?.discordId === discordUserId,
    );
    const desiredRoleIds = getDesiredLevelRoleIds(userCharacters);
    const currentRoleIds = new Set(
      (Array.isArray(member.roles) ? member.roles : []).filter((roleId) =>
        LEVEL_ROLE_IDS.has(roleId),
      ),
    );
    const additions = [...desiredRoleIds].filter(
      (roleId) => !currentRoleIds.has(roleId),
    );
    const removals = [...currentRoleIds].filter(
      (roleId) => !desiredRoleIds.has(roleId),
    );

    for (const roleId of additions) {
      await addGuildMemberRole(discordUserId, roleId);
    }
    for (const roleId of removals) {
      await removeGuildMemberRole(discordUserId, roleId);
    }
  }
}

module.exports = { syncLevelRolesForCharacterIds };
