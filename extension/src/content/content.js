// Content script: działa wewnątrz stron Motowarsztatu.
// Uwaga: content scripty nie obsługują `import`, dlatego plik jest samodzielny.

(() => {
  // Ochrona przed podwójnym wstrzyknięciem (rejestracja + ręczne wstrzyknięcie).
  if (window.__motowarsztatPomocnik) return;
  window.__motowarsztatPomocnik = true;

  const DEFAULT_SETTINGS = { panelEnabled: true, panelPosition: "right" };

  // ---------------------------------------------------------------------
  // Odczyt danych ze strony.
  // To są ogólne heurystyki. Gdy poznamy strukturę stron Motowarsztatu,
  // zastąpimy je konkretnymi selektorami (np. pole formularza zlecenia).
  // ---------------------------------------------------------------------

  // VIN: 17 znaków, bez liter I, O, Q.
  const VIN_RE = /\b[A-HJ-NPR-Z0-9]{17}\b/g;
  // Polska tablica rejestracyjna: 2–3 litery wyróżnika + 4–5 znaków.
  const PLATE_RE = /\b[A-Z]{2,3}[ -]?[0-9A-Z]{4,5}\b/g;

  function pageText() {
    const fields = [...document.querySelectorAll("input, textarea")]
      .map((el) => el.value)
      .filter(Boolean);
    return [document.body?.innerText || "", ...fields].join("\n");
  }

  function unique(list) {
    return [...new Set(list)];
  }

  function collectPageData() {
    const text = pageText().toUpperCase();
    const vins = unique(text.match(VIN_RE) || []).filter((v) => /[A-Z]/.test(v) && /[0-9]/.test(v));
    const plates = unique(text.match(PLATE_RE) || [])
      .filter((p) => /[0-9]/.test(p) && !vins.some((v) => v.includes(p.replace(/[ -]/g, ""))))
      .slice(0, 20);

    return {
      title: document.title,
      url: location.href,
      vins,
      plates,
      collectedAt: new Date().toISOString()
    };
  }

  // ---------------------------------------------------------------------
  // Panel boczny na stronie.
  // ---------------------------------------------------------------------

  let host = null;

  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (key === "class") node.className = value;
      else if (key.startsWith("on")) node.addEventListener(key.slice(2), value);
      else node.setAttribute(key, value);
    }
    for (const child of [].concat(children)) {
      node.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
    return node;
  }

  function renderList(label, items) {
    return el("div", { class: "mwp-section" }, [
      el("div", { class: "mwp-label" }, label),
      items.length
        ? el("ul", { class: "mwp-list" }, items.map((item) =>
            el("li", {}, [
              el("code", {}, item),
              el("button", {
                class: "mwp-copy",
                title: "Kopiuj",
                onclick: () => navigator.clipboard.writeText(item)
              }, "⧉")
            ])
          ))
        : el("div", { class: "mwp-empty" }, "nie znaleziono")
    ]);
  }

  function renderBody(body) {
    const data = collectPageData();
    body.replaceChildren(
      renderList("VIN", data.vins),
      renderList("Numery rejestracyjne", data.plates),
      el("div", { class: "mwp-actions" }, [
        el("button", { class: "mwp-btn", onclick: () => renderBody(body) }, "Odśwież"),
        el("button", {
          class: "mwp-btn",
          onclick: () => navigator.clipboard.writeText(JSON.stringify(collectPageData(), null, 2))
        }, "Kopiuj dane (JSON)")
      ])
    );
  }

  function mountPanel(settings) {
    unmountPanel();
    host = el("div", { id: "mwp-root", class: `mwp-${settings.panelPosition}` });

    const body = el("div", { class: "mwp-body" });
    const panel = el("div", { class: "mwp-panel mwp-collapsed" }, [
      el("div", { class: "mwp-header" }, [
        el("strong", {}, "Motowarsztat Pomocnik"),
        el("button", {
          class: "mwp-close",
          title: "Zwiń",
          onclick: () => panel.classList.add("mwp-collapsed")
        }, "×")
      ]),
      body
    ]);
    const toggle = el("button", {
      class: "mwp-toggle",
      title: "Motowarsztat Pomocnik",
      onclick: () => {
        panel.classList.toggle("mwp-collapsed");
        if (!panel.classList.contains("mwp-collapsed")) renderBody(body);
      }
    }, "M");

    host.append(toggle, panel);
    document.documentElement.append(host);
  }

  function unmountPanel() {
    host?.remove();
    host = null;
  }

  async function applySettings() {
    const settings = { ...DEFAULT_SETTINGS, ...(await chrome.storage.sync.get(DEFAULT_SETTINGS)) };
    if (settings.panelEnabled) mountPanel(settings);
    else unmountPanel();
  }

  chrome.storage.onChanged.addListener((_changes, area) => {
    if (area === "sync") applySettings();
  });

  // Komunikacja z popupem.
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "mw:getPageData") {
      sendResponse(collectPageData());
    }
    return false;
  });

  applySettings();
})();
