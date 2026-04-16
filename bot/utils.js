function truncateValue(value, maxLength) {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 3)}...`;
}


function getDisplayName(interaction) {
  if (interaction.member && "displayName" in interaction.member) {
    return interaction.member.displayName;
  }

  return interaction.user.globalName || interaction.user.username;
}


module.exports = {
  getDisplayName,
  truncateValue,
};
