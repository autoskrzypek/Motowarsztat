// Service worker rozszerzenia.
//
// Adres Motowarsztatu nie jest wpisany na sztywno: użytkownik dodaje go
// w opcjach albo w popupie ("Włącz na tej stronie"). Lista nadanych
// uprawnień do stron jest jedynym źródłem prawdy, a content script jest
// rejestrowany dynamicznie dokładnie dla tych adresów.

import {
  CONTENT_SCRIPT_ID,
  CONTENT_JS,
  CONTENT_CSS,
  DEFAULT_SETTINGS,
  getGrantedOrigins
} from "./shared.js";

async function syncContentScripts() {
  const origins = await getGrantedOrigins();
  const existing = await chrome.scripting.getRegisteredContentScripts({ ids: [CONTENT_SCRIPT_ID] });

  if (origins.length === 0) {
    if (existing.length) await chrome.scripting.unregisterContentScripts({ ids: [CONTENT_SCRIPT_ID] });
    return;
  }

  const script = {
    id: CONTENT_SCRIPT_ID,
    matches: origins,
    js: CONTENT_JS,
    css: CONTENT_CSS,
    runAt: "document_idle",
    persistAcrossSessions: true
  };

  if (existing.length) {
    await chrome.scripting.updateContentScripts([script]);
  } else {
    await chrome.scripting.registerContentScripts([script]);
  }
}

/** Wstrzykuje skrypt do kart, które były już otwarte w chwili nadania uprawnień. */
async function injectIntoOpenTabs(origins) {
  if (!origins?.length) return;
  const tabs = await chrome.tabs.query({ url: origins });
  for (const tab of tabs) {
    try {
      await chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: CONTENT_CSS });
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: CONTENT_JS });
    } catch (err) {
      console.warn("Nie udało się wstrzyknąć skryptu do karty", tab.id, err);
    }
  }
}

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason === "install") {
    await chrome.storage.sync.set(DEFAULT_SETTINGS);
    chrome.runtime.openOptionsPage();
  }
  await syncContentScripts();
});

chrome.runtime.onStartup.addListener(syncContentScripts);

chrome.permissions.onAdded.addListener(async ({ origins }) => {
  await syncContentScripts();
  await injectIntoOpenTabs(origins);
});

chrome.permissions.onRemoved.addListener(syncContentScripts);

// Miejsce na logikę wymagającą tła: zapytania do zewnętrznych API
// (np. dekoder VIN, katalog części), eksport danych itp.
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message?.type) {
    case "mw:ping":
      sendResponse({ ok: true, version: chrome.runtime.getManifest().version });
      return false;
    default:
      return false;
  }
});
