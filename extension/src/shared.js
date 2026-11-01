// Wspólne stałe i funkcje używane przez background, popup i opcje.

export const CONTENT_SCRIPT_ID = "motowarsztat-content";
export const CONTENT_JS = ["src/content/content.js"];
export const CONTENT_CSS = ["src/content/content.css"];

export const DEFAULT_SETTINGS = {
  panelEnabled: true,
  panelPosition: "right" // "right" | "left"
};

/**
 * Zamienia wpisany adres (np. "app.motowarsztat.pl" albo
 * "https://app.motowarsztat.pl/zlecenia") na wzorzec uprawnień Chrome,
 * np. "https://app.motowarsztat.pl/*".
 */
export function toOriginPattern(input) {
  let value = String(input || "").trim();
  if (!value) throw new Error("Podaj adres strony.");
  if (!/^https?:\/\//i.test(value)) value = "https://" + value;
  const url = new URL(value);
  if (!/^https?:$/.test(url.protocol)) throw new Error("Obsługiwane są tylko adresy http i https.");
  return `${url.protocol}//${url.hostname}/*`;
}

/** Zwraca listę adresów, na które użytkownik nadał uprawnienia. */
export async function getGrantedOrigins() {
  const { origins = [] } = await chrome.permissions.getAll();
  return origins.filter((o) => o !== "https://*/*" && o !== "http://*/*");
}

export async function getSettings() {
  const stored = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  return { ...DEFAULT_SETTINGS, ...stored };
}
