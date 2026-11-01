import { toOriginPattern, getGrantedOrigins, getSettings } from "../shared.js";

const $ = (id) => document.getElementById(id);

async function renderOrigins() {
  const list = $("origins");
  const origins = await getGrantedOrigins();
  list.replaceChildren();

  if (!origins.length) {
    const li = document.createElement("li");
    li.className = "muted";
    li.textContent = "Brak dodanych adresów.";
    list.append(li);
    return;
  }

  for (const origin of origins) {
    const li = document.createElement("li");
    const code = document.createElement("code");
    code.textContent = origin;
    const remove = document.createElement("button");
    remove.textContent = "Usuń";
    remove.addEventListener("click", async () => {
      await chrome.permissions.remove({ origins: [origin] });
      renderOrigins();
    });
    li.append(code, remove);
    list.append(li);
  }
}

$("add-origin").addEventListener("submit", async (e) => {
  e.preventDefault();
  const error = $("origin-error");
  error.hidden = true;
  try {
    const pattern = toOriginPattern($("origin-input").value);
    const ok = await chrome.permissions.request({ origins: [pattern] });
    if (!ok) throw new Error("Nie udzielono zgody na dostęp do strony.");
    $("origin-input").value = "";
    renderOrigins();
  } catch (err) {
    error.textContent = err.message;
    error.hidden = false;
  }
});

async function initSettings() {
  const settings = await getSettings();
  $("panelEnabled").checked = settings.panelEnabled;
  $("panelPosition").value = settings.panelPosition;

  $("panelEnabled").addEventListener("change", (e) =>
    chrome.storage.sync.set({ panelEnabled: e.target.checked }));
  $("panelPosition").addEventListener("change", (e) =>
    chrome.storage.sync.set({ panelPosition: e.target.value }));
}

chrome.permissions.onAdded.addListener(renderOrigins);
chrome.permissions.onRemoved.addListener(renderOrigins);

renderOrigins();
initSettings();
