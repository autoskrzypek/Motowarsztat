# Motowarsztat Pomocnik – wtyczka do Chrome

Rozszerzenie Chrome (Manifest V3), które działa na stronach systemu Motowarsztat:
dodaje na stronie panel pomocnika, odczytuje dane (VIN, numery rejestracyjne)
i jest bazą pod kolejne automatyzacje.

## Instalacja (tryb dewelopera)

1. Otwórz `chrome://extensions`.
2. Włącz **Tryb dewelopera** (prawy górny róg).
3. Kliknij **Załaduj rozpakowane** i wskaż folder `extension/`.
4. Otworzą się ustawienia – wpisz adres Motowarsztatu (np. `app.motowarsztat.pl`)
   i zaakceptuj prośbę Chrome o dostęp do strony.

Albo: wejdź na stronę Motowarsztatu, kliknij ikonę wtyczki → **Włącz na tej stronie**.

Po zmianach w kodzie kliknij ikonę odświeżania przy wtyczce w `chrome://extensions`
i przeładuj kartę z Motowarsztatem.

## Struktura

```
extension/
├── manifest.json          # konfiguracja wtyczki
├── icons/                 # ikony 16/32/48/128 px
└── src/
    ├── background.js      # service worker: rejestruje skrypt dla dodanych adresów
    ├── shared.js          # wspólne stałe i funkcje (popup, opcje, background)
    ├── ui.css             # style popupu i ustawień
    ├── content/
    │   ├── content.js     # kod działający na stronie Motowarsztatu (panel, odczyt danych)
    │   └── content.css    # style panelu (prefiks mwp-)
    ├── popup/             # okienko po kliknięciu ikony wtyczki
    └── options/           # strona ustawień (adresy, panel)
```

## Jak to działa

- Adres Motowarsztatu **nie jest wpisany na sztywno**. Wtyczka prosi o dostęp tylko
  do stron, które dodasz w ustawieniach (`optional_host_permissions`).
- `background.js` rejestruje `content.js` dynamicznie dla dokładnie tych adresów
  i wstrzykuje go też do kart, które są już otwarte.
- `content.js` pokazuje przycisk **M** w rogu strony. Po kliknięciu panel pokazuje
  wykryte numery VIN i rejestracje, z kopiowaniem i eksportem do JSON.
- Popup pyta content script o dane bieżącej strony (`mw:getPageData`).

## Co dalej

Wykrywanie VIN i rejestracji to na razie ogólne wyrażenia regularne na tekście strony.
Kiedy poznamy strukturę stron Motowarsztatu (zapisany HTML lub zrzuty ekranu),
w `collectPageData()` w `src/content/content.js` podstawimy konkretne selektory
i dodamy właściwe akcje (wypełnianie formularzy, eksport zleceń, integracje).
