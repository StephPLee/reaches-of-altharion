const config = require("./config");

function hasRequiredRole(interaction) {
  if (!config.requiredRoleId) {
    return true;
  }

  const roleIds = interaction.member?.roles;
  if (!roleIds) {
    return false;
  }

  if (Array.isArray(roleIds)) {
    return roleIds.includes(config.requiredRoleId);
  }

  if (roleIds.cache) {
    return roleIds.cache.has(config.requiredRoleId);
  }

  return false;
}


module.exports = {
  hasRequiredRole,
};
