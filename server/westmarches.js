const { westMarchesApiBaseUrl, westMarchesApiKey } = require("./config");

function isWestMarchesConfigured() {
  return Boolean(westMarchesApiBaseUrl && westMarchesApiKey);
}

async function westMarchesFetch(path, init = {}) {
  if (!isWestMarchesConfigured()) {
    throw new Error("West Marches API is not configured.");
  }

  const response = await fetch(`${westMarchesApiBaseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${westMarchesApiKey}`,
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers || {}),
    },
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error =
      typeof payload?.error === "string" && payload.error
        ? payload.error
        : `West Marches request failed (${response.status}).`;
    const requestError = new Error(error);
    requestError.status = response.status;
    requestError.payload = payload;
    throw requestError;
  }

  return payload;
}

async function listAllCharacters() {
  const pageSize = 500;
  let page = 1;
  let totalPages = 1;
  const characters = [];

  while (page <= totalPages) {
    const payload = await westMarchesFetch(
      `/characters?page=${page}&pageSize=${pageSize}`,
    );
    const nextCharacters = Array.isArray(payload.data) ? payload.data : [];
    characters.push(...nextCharacters);

    totalPages =
      typeof payload?.pagination?.totalPages === "number" &&
      payload.pagination.totalPages > 0
        ? payload.pagination.totalPages
        : 1;
    page += 1;
  }

  return characters;
}

async function listCurrencies() {
  const payload = await westMarchesFetch("/currencies");
  return Array.isArray(payload.data) ? payload.data : [];
}

async function getCharacter(characterId) {
  const payload = await westMarchesFetch(`/characters/${characterId}`);
  return payload.data ?? null;
}

async function distributeReward({ characterId, reward }) {
  const payload = await westMarchesFetch(`/characters/${characterId}/rewards`, {
    method: "POST",
    body: JSON.stringify(reward),
  });

  return payload.data ?? null;
}

module.exports = {
  distributeReward,
  getCharacter,
  isWestMarchesConfigured,
  listAllCharacters,
  listCurrencies,
};
