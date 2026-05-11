const config = require("./config");

function hasRequiredRole(interaction) {
  if (!config.requiredRoleId) {
    return true;
  }

  return hasRole(interaction, config.requiredRoleId);
}

function hasDmOrRequiredRole(interaction) {
  if (!config.requiredRoleId) {
    return true;
  }

  return (
    hasRole(interaction, config.requiredRoleId) ||
    (config.dmRoleId ? hasRole(interaction, config.dmRoleId) : false)
  );
}

function hasRole(interaction, roleId) {
  if (!roleId) {
    return false;
  }

  const roleIds = interaction.member?.roles;
  if (!roleIds) {
    return false;
  }

  if (Array.isArray(roleIds)) {
    return roleIds.includes(roleId);
  }

  if (roleIds.cache) {
    return roleIds.cache.has(roleId);
  }

  return false;
}


module.exports = {
  hasDmOrRequiredRole,
  hasRequiredRole,
};
