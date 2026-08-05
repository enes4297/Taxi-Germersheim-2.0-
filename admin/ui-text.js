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
    [/\bpruefung\b/g, "prüfung"]
  ];

  const ATTRIBUTE_NAMES = ["title", "aria-label", "placeholder", "alt"];

  function replaceText(text) {
    if (!text || typeof text !== "string") return text;
    let output = text;
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