(() => {
  // Demo-Handbuch ohne Backend. Inhalte sind bewusst modular fur spaetere Erweiterung.
  const helpTopics = [
    {
      id: "HELP-001",
      title: "Erste Schritte",
      description: "Anmeldung, Navigation und erste Prufung im Admin-Bereich.",
      category: "Erste Schritte",
      scopes: ["Chef"],
      steps: [
        "Mit Demo-Benutzer anmelden.",
        "Rollenanzeige oben rechts prufen.",
        "Dashboard und Benachrichtigungen sichten."
      ]
    },
    {
      id: "HELP-002",
      title: "Fahrten verwalten",
      description: "Fahrten filtern, bestaetigen und Status aktualisieren.",
      category: "Fahrten verwalten",
      scopes: ["Chef", "Disposition", "Fahrer"],
      steps: [
        "In Fahrten nach Datum oder Status filtern.",
        "Passende Fahrt in der Karte offnen.",
        "Aktion ausfuhren und Demo-Hinweis bestaetigen."
      ]
    },
    {
      id: "HELP-003",
      title: "Fahrer verwalten",
      description: "Fahrerprofile sichten und Einsatzzuweisungen nachvollziehen.",
      category: "Fahrer verwalten",
      scopes: ["Chef", "Disposition"],
      steps: [
        "Fahrerliste durchsuchen.",
        "Profil oder Schichtstatus offnen.",
        "Zuweisung als Demo-Aktion ausfuhren."
      ]
    },
    {
      id: "HELP-004",
      title: "Fahrzeuge verwalten",
      description: "Fahrzeugstatus, Verfugbarkeit und Hinweise kontrollieren.",
      category: "Fahrzeuge verwalten",
      scopes: ["Chef", "Disposition", "Fahrer"],
      steps: [
        "Fahrzeug im Modul auswahlen.",
        "Status und Hinweise prufen.",
        "Demo-Statusaktion ausfuhren."
      ]
    },
    {
      id: "HELP-005",
      title: "Kunden verwalten",
      description: "Kundenstammdaten und Kontakte durchsuchen.",
      category: "Kunden verwalten",
      scopes: ["Chef", "Buchhaltung"],
      steps: [
        "Kundensuche verwenden.",
        "Datensatz im Detail ansehen.",
        "Optionale Demo-Aktion ausfuhren."
      ]
    },
    {
      id: "HELP-006",
      title: "Rechnungen",
      description: "Rechnungsstatus, Fälligkeit und Zahlungsvorgange im Blick behalten.",
      category: "Rechnungen",
      scopes: ["Chef", "Buchhaltung"],
      steps: [
        "Rechnungen nach Status filtern.",
        "Rechnung offnen und Daten prufen.",
        "Bezahlstatus als Demo markieren."
      ]
    },
    {
      id: "HELP-007",
      title: "Schichtplanung",
      description: "Schichten strukturieren und Fahrer planen.",
      category: "Schichtplanung",
      scopes: ["Chef", "Disposition"],
      steps: [
        "Schichtansicht aufrufen.",
        "Freie Slots identifizieren.",
        "Fahrerzuweisung per Demo-Aktion hinterlegen."
      ]
    },
    {
      id: "HELP-008",
      title: "Dokumente",
      description: "Dokumentstatus und Compliance-Hinweise kontrollieren.",
      category: "Dokumente",
      scopes: ["Chef"],
      steps: [
        "Dokumente nach Typ filtern.",
        "Ablaufdaten und Status prufen.",
        "Prufvorgang als Demo abschliessen."
      ]
    },
    {
      id: "HELP-009",
      title: "Werkstatt",
      description: "Wartungsvorgange und Fahrzeugthemen in der Werkstatt verfolgen.",
      category: "Werkstatt",
      scopes: ["Chef"],
      steps: [
        "Werkstattfall auswahlen.",
        "Prioritat und Termin prufen.",
        "Status als Demo aktualisieren."
      ]
    },
    {
      id: "HELP-010",
      title: "Rollen & Rechte",
      description: "Rollenmatrix und Berechtigungen im Demo-Modus verstehen.",
      category: "Rollen & Rechte",
      scopes: ["Chef"],
      steps: [
        "Benutzerverwaltung offnen.",
        "Rollenrechte pro Modul vergleichen.",
        "Rollenwechsel als Demo testen."
      ]
    },
    {
      id: "HELP-011",
      title: "Demo-Hinweise",
      description: "Warum Daten nicht gespeichert werden und wie Demo-Aktionen funktionieren.",
      category: "Demo-Hinweise",
      scopes: ["Chef", "Disposition", "Buchhaltung", "Fahrer"],
      steps: [
        "Hinweise im Modul lesen.",
        "Demo-Aktion ausfuhren.",
        "Ergebnis im Modal bestaetigen."
      ]
    },
    {
      id: "HELP-012",
      title: "Export fur Buchhaltung",
      description: "DATEV Demo und Rechnungs-/Kundenexport fur Buchhaltung.",
      category: "Demo-Hinweise",
      scopes: ["Chef", "Buchhaltung"],
      steps: [
        "Export & Backup aufrufen.",
        "Format DATEV Demo auswahlen.",
        "Export Demo starten und Hinweis prufen."
      ]
    }
  ];

  const faqItems = [
    { q: "Wie bestaetige ich eine Fahrt?", a: "Im Modul Fahrten die passende Fahrt offnen und die Demo-Aktion zur Bestatigung nutzen." },
    { q: "Wie weise ich einen Fahrer zu?", a: "In Fahrten oder Schichtplanung den Fahrer auswahlen und die Zuweisung als Demo ausfuhren." },
    { q: "Was bedeutet TUV bald fallig?", a: "Das Fahrzeug erreicht bald den TUV-Termin und sollte fruhzeitig eingeplant werden." },
    { q: "Was sieht ein Disponent?", a: "Disposition sieht primar Fahrten, Fahrer, Fahrzeuge und Schichtplanung inklusive relevanter Hilfeartikel." },
    { q: "Warum werden Daten nicht gespeichert?", a: "Der Admin-Bereich lauft aktuell als Demo ohne Backend und ohne persistente Speicherung." }
  ];

  const state = {
    searchTerm: ""
  };

  function normalizeText(value) {
    return String(value || "")
      .toLocaleLowerCase("de-DE")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function readSessionRole() {
    if (!window.AdminDemoAuth || typeof window.AdminDemoAuth.readSession !== "function") {
      return "Chef";
    }

    const session = window.AdminDemoAuth.readSession();
    return session && session.role ? session.role : "Chef";
  }

  function getRoleTopics() {
    const role = readSessionRole();
    const scopedTopics = helpTopics.filter((item) => item.scopes.includes(role));

    if (role === "Chef") return scopedTopics;
    if (role === "Disposition") {
      return scopedTopics.filter((item) => ["Fahrten verwalten", "Fahrer verwalten", "Fahrzeuge verwalten", "Schichtplanung", "Demo-Hinweise"].includes(item.category));
    }
    if (role === "Buchhaltung") {
      return scopedTopics.filter((item) => ["Kunden verwalten", "Rechnungen", "Demo-Hinweise"].includes(item.category));
    }
    if (role === "Fahrer") {
      return scopedTopics.filter((item) => ["Fahrten verwalten", "Fahrzeuge verwalten", "Demo-Hinweise"].includes(item.category));
    }

    return [];
  }

  function matchesSearch(item) {
    const query = normalizeText(state.searchTerm).trim();
    if (!query) return true;

    const haystack = normalizeText([item.title, item.description, item.category].join(" "));
    return haystack.includes(query);
  }

  function openModal(item) {
    const modal = document.querySelector("[data-help-modal]");
    const title = document.querySelector("[data-help-modal-title]");
    const body = document.querySelector("[data-help-modal-body]");
    if (!modal || !title || !body) return;

    title.textContent = item.title;
    body.innerHTML = `
      <section class="help-modal-section">
        <h4>Anleitungstitel</h4>
        <p>${item.title}</p>
      </section>
      <section class="help-modal-section">
        <h4>Schritt-fur-Schritt Demo-Anleitung</h4>
        <ol class="help-modal-steps">
          ${item.steps.map((step) => `<li>${step}</li>`).join("")}
        </ol>
      </section>
      <p class="help-modal-note">Hinweis: Demo-Handbuch - spater erweiterbar</p>
    `;

    modal.hidden = false;
    document.body.classList.add("admin-modal-open");
  }

  function closeModal() {
    const modal = document.querySelector("[data-help-modal]");
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove("admin-modal-open");
  }

  function renderHelpCards() {
    const grid = document.querySelector("[data-help-grid]");
    if (!grid) return;

    const visible = getRoleTopics().filter((item) => matchesSearch(item));
    if (!visible.length) {
      grid.innerHTML = `
        <article class="admin-empty-state">
          <strong>🧭 Keine Hilfethemen gefunden</strong>
          <p>Keine Einträge gefunden.</p>
        </article>
      `;
      return;
    }

    grid.innerHTML = visible
      .map((item) => {
        return `
          <article class="help-card">
            <header class="help-card-head">
              <h3>${item.title}</h3>
              <span class="status-pill help-category-pill">${item.category}</span>
            </header>
            <p class="help-card-description">${item.description}</p>
            <div class="help-actions">
              <button class="admin-btn" type="button" data-help-open="${item.id}">Anleitung offnen</button>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function renderFaq() {
    const list = document.querySelector("[data-help-faq-list]");
    if (!list) return;

    list.innerHTML = faqItems
      .map((item) => {
        return `
          <article class="help-faq-item">
            <h3>${item.q}</h3>
            <p>${item.a}</p>
          </article>
        `;
      })
      .join("");
  }

  function bindSearch() {
    const input = document.querySelector("[data-help-search]");
    if (!input) return;

    input.addEventListener("input", () => {
      state.searchTerm = input.value || "";
      renderHelpCards();
    });
  }

  function bindActions() {
    document.addEventListener("click", (event) => {
      const openButton = event.target.closest("[data-help-open]");
      if (openButton) {
        const id = openButton.getAttribute("data-help-open");
        const item = getRoleTopics().find((entry) => entry.id === id);
        if (!item) return;
        openModal(item);
        return;
      }

      const closeButton = event.target.closest("[data-help-modal-close]");
      if (closeButton) {
        closeModal();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      const modal = document.querySelector("[data-help-modal]");
      if (!modal || modal.hidden) return;
      closeModal();
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    bindSearch();
    bindActions();
    renderHelpCards();
    renderFaq();
  });
})();
