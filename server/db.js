const { Pool } = require("pg");
const {
  databaseSslMode,
  databaseSslRejectUnauthorized,
  databaseUrl,
} = require("./config");

function buildSslConfig() {
  if (databaseSslMode === "disable") {
    return false;
  }

  return {
    rejectUnauthorized: databaseSslRejectUnauthorized,
  };
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: buildSslConfig(),
});

module.exports = {
  pool,
};
