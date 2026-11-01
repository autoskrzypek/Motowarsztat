import { toOriginPattern, getGrantedOrigins } from "../shared.js";

const $ = (id) => document.getElementById(id);

function show(id) {
  for (const s of ["inactive", "unsupported", "active"]) $(s).hidden = s !== id;
}

async function init() {
  $("open-options").addEventListener("click", (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url || !/^https?:/.test(tab.url)) return show("unsupported");

  const pattern = toOriginPattern(tab.url);
  const granted = await getGrantedOrigins();

  if (!granted.includes(pattern)) {
    $("current-origin").textContent = new URL(tab.url).hostname;
    $("enable-here").addEventListener("click", async () => {
      // Po nadaniu uprawnienia background sam zarejestruje i wstrzyknie skrypt.
      const ok = await chrome.permissions.request({ origins: [pattern] });
      if (ok) window.close();
    });
    return show("inactive");
  }

  show("active");
  try {
    const data = await chrome.tabs.sendMessage(tab.id, { type: "mw:getPageData" });
    $("vins").textContent = data.vins.join(", ") || "brak";
    $("plates").textContent = data.plates.join(", ") || "brak";
  } catch {
    $("vins").textContent = "Odśwież stronę, aby załadować pomocnika.";
    $("plates").textContent = "–";
  }
}

init();
