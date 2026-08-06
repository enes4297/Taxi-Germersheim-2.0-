(() => {
  const CENTRAL_VISIBLE_TERMS = Array.isArray(window.AdminUiVisibleTerms) ? window.AdminUiVisibleTerms : [];

  const REPLACEMENTS = [
    ...CENTRAL_VISIBLE_TERMS,
    [/\bRueckfragen\b/g, "Rückfragen"],
    [/\brueckfragen\b/g, "rückfragen"],
    [/\bRueckfahrt\b/g, "Rückfahrt"],
    [/\brueckfahrt\b/g, "rückfahrt"],
    [/\bRueckruf\b/g, "Rückruf"],
    [/\brueckruf\b/g, "rückruf"],
    [/\bQualitaetsmanagement\b/g, "Qualitätsmanagement"],
    [/\bQualitaet\b/g, "Qualität"],
    [/\bGeschaeftsleitung\b/g, "Geschäftsleitung"],
    [/\bGeschaeftsfuehrer\b/g, "Geschäftsführer"],
    [/\bSuedwest\b/g, "Südwest"],
    [/\bUeberfaellig\b/g, "Überfällig"],
    [/\bueberfaellig\b/g, "überfällig"],
    [/\bvollstaendig\b/g, "vollständig"],
    [/\bgeoeffnet\b/g, "geöffnet"],
    [/\bschliessen\b/g, "schließen"],
    [/\bSchliessen\b/g, "Schließen"],
    [/\bloeschen\b/g, "löschen"],
    [/\bLoeschen\b/g, "Löschen"],
    [/\bhinzufuegen\b/g, "hinzufügen"],
    [/\bHinzufuegen\b/g, "Hinzufügen"],
    [/\bbestaetigt\b/g, "bestätigt"],
    [/\bBestaetigt\b/g, "Bestätigt"],
    [/\bzuruecksetzen\b/g, "zurücksetzen"],
    [/\bZuruecksetzen\b/g, "Zurücksetzen"],
    [/\bgefuehrt\b/g, "geführt"],
    [/\bzustaendig\b/g, "zuständig"],
    [/\bVerfuegbar\b/g, "Verfügbar"],
    [/\bverfuegbar\b/g, "verfügbar"],
    [/\bPruefung\b/g, "Prüfung"],
    [/\bpruefung\b/g, "prüfung"],
    [/\bRueckkehr\b/g, "Rückkehr"],
    [/\brueckkehr\b/g, "rückkehr"],
    [/\bRueckmeldung\b/g, "Rückmeldung"],
    [/\brueckmeldung\b/g, "rückmeldung"],
    [/\bUebersicht\b/g, "Übersicht"],
    [/\buebersicht\b/g, "übersicht"],
    [/\bUeberfaellig\b/g, "Überfällig"],
    [/\bueberfaellig\b/g, "überfällig"],
    [/\bFaellig\b/g, "Fällig"],
    [/\bfaellig\b/g, "fällig"],
    [/\bEintraege\b/g, "Einträge"],
    [/\beintraege\b/g, "einträge"],
    [/\bKlaeren\b/g, "Klären"],
    [/\bklaeren\b/g, "klären"],
    [/\bFuehrerschein\b/g, "Führerschein"],
    [/\bfuehrerschein\b/g, "führerschein"],
    [/\bgueltig\b/g, "gültig"],
    [/\bGueltig\b/g, "Gültig"],
    [/\bgeprueft\b/g, "geprüft"],
    [/\bGeprueft\b/g, "Geprüft"],
    [/\bSpaetschicht\b/g, "Spätschicht"],
    [/\bSpaet\b/g, "Spät"],
    [/\bFruehschicht\b/g, "Frühschicht"],
    [/\bfruehschicht\b/g, "frühschicht"],
    [/\bverfuegbar\b/g, "verfügbar"],
    [/\bVerfuegbar\b/g, "Verfügbar"],
    [/\bbenoetigt\b/g, "benötigt"],
    [/\bBenoetigt\b/g, "Benötigt"],
    [/\bKapazitaet\b/g, "Kapazität"],
    [/\bKapazitaeten\b/g, "Kapazitäten"],
    [/\bGeschaeftsfuehrer\b/g, "Geschäftsführer"],
    [/\bGeschaeftsfuehrer-Dashboard\b/g, "Geschäftsführer-Dashboard"],
    [/\bPersonaluebersicht\b/g, "Personalübersicht"],
    [/\bPersoenliche Einstellungen\b/g, "Persönliche Einstellungen"],
    [/\bMeldung ueber\b/g, "Meldung über"]
  ];

  const ISO_DATE_RE = /\b(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::\d{2})?)?\b/g;

  function formatIsoDate(year, month, day) {
    const date = new Date(`${year}-${month}-${day}T00:00:00`);
    if (Number.isNaN(date.getTime())) return `${year}-${month}-${day}`;
    return date.toLocaleDateString("de-DE");
  }

  function formatIsoDateTime(year, month, day, hour, minute) {
    const date = new Date(`${year}-${month}-${day}T${hour}:${minute}:00`);
    if (Number.isNaN(date.getTime())) return `${year}-${month}-${day} ${hour}:${minute}`;
    return `${date.toLocaleDateString("de-DE")} · ${date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr`;
  }

  function replaceIsoDates(text) {
    if (!text || typeof text !== "string") return text;
    return text.replace(ISO_DATE_RE, (_, year, month, day, hour, minute) => {
      if (hour && minute) {
        return formatIsoDateTime(year, month, day, hour, minute);
      }
      return formatIsoDate(year, month, day);
    });
  }

  const ATTRIBUTE_NAMES = ["title", "aria-label", "placeholder", "alt"];

  function replaceText(text) {
    if (!text || typeof text !== "string") return text;
    let output = replaceIsoDates(text);
    REPLACEMENTS.forEach(([pattern, next]) => {
      output = output.replace(pattern, next);
    });
    return output;
  }

  function normalizeTextNode(node) {
    if (!node || !node.nodeValue) return;
    const next = replaceText(node.nodeValue);
    if (next !== node.nodeValue) {
      node.nodeValue = next;
    }
  }

  function normalizeAttributes(root) {
    const elements = root.querySelectorAll ? root.querySelectorAll("*") : [];
    elements.forEach((el) => {
      ATTRIBUTE_NAMES.forEach((name) => {
        const current = el.getAttribute(name);
        if (!current) return;
        const next = replaceText(current);
        if (next !== current) {
          el.setAttribute(name, next);
        }
      });
    });
  }

  function normalizeDocument(root = document) {
    if (!root) return;

    if (root.title && typeof root.title === "string") {
      root.title = replaceText(root.title);
    }

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      normalizeTextNode(node);
      node = walker.nextNode();
    }
    normalizeAttributes(root);
  }

  function observeDocument(root = document) {
    if (!root || !root.body || root.__adminUiTextObserverBound) return;
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "characterData") {
          normalizeTextNode(mutation.target);
          return;
        }
        mutation.addedNodes.forEach((added) => {
          if (!(added instanceof Element)) return;
          normalizeDocument(added);
        });
      });
    });
    observer.observe(root.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
    root.__adminUiTextObserverBound = true;
  }

  window.AdminUiText = {
    replaceText,
    normalizeDocument,
    observeDocument
  };
})();