/* ============================================================
   Designprobe Betriebsportal - die Bereiche
   ============================================================
   Jeder Bereich ist eine eigene Funktion und kennt nur seine Ansicht.
   Es gibt keinen Supabase-Zugriff, kein fetch, keinen Upload, keinen
   Versand und keine PAJ-Anfrage.
   ============================================================ */
(() => {
  "use strict";

  const R = window.ProbeRahmen;
  const D = window.ProbeDaten;
  const h = R.h;

  const mitarbeiterVon = (id) => D.mitarbeiter.find((m) => m.id === id);
  const fahrzeugVon = (id) => D.fahrzeuge.find((f) => f.id === id);
  const vorlageVon = (id) => D.vorlagen.find((v) => v.id === id);

  /* ============================================================
     Planung - Arbeitsstand
     ============================================================ */
  function planTagIso() { return D.alsIso(D.tagAls(R.zustand.planTag)); }

  function planEntwurf() {
    const iso = planTagIso();
    if (!R.zustand.planEntwurf || R.zustand.planEntwurf.iso !== iso) {
      const quelle = D.planung[iso];
      R.zustand.planEntwurf = {
        iso,
        zeilen: quelle.zeilen.map((z) => ({ ...z })),
        urzeilen: quelle.zeilen.map((z) => ({ ...z })),
        filter: "alle",
        suche: ""
      };
    }
    return R.zustand.planEntwurf;
  }

  const zeileGeaendert = (e, i) =>
    JSON.stringify(e.zeilen[i]) !== JSON.stringify(e.urzeilen[i]);

  const anzahlGeaendert = (e) => e.zeilen.filter((_, i) => zeileGeaendert(e, i)).length;

  /* Konflikte. Nur belegbare, keine erfundenen Regeln. */
  function konflikteVon(entwurf) {
    const treffer = new Map();
    const belegt = new Map();
    entwurf.zeilen.forEach((z, i) => {
      if (!z.imDienst) return;
      if (!z.von || !z.bis) { treffer.set(i, "Zeit fehlt"); return; }
      if (!z.fahrzeugId) { treffer.set(i, "kein Fahrzeug"); return; }
      const fz = fahrzeugVon(z.fahrzeugId);
      if (fz && fz.zustand === "werkstatt") { treffer.set(i, "Fahrzeug in der Werkstatt"); return; }
      const schluessel = `${z.fahrzeugId}|${z.von}`;
      if (belegt.has(schluessel)) {
        treffer.set(i, "Fahrzeug doppelt verplant");
        treffer.set(belegt.get(schluessel), "Fahrzeug doppelt verplant");
      } else {
        belegt.set(schluessel, i);
      }
    });
    return treffer;
  }

  /* ============================================================
     1. Übersicht
     ============================================================ */
  function uebersicht() {
    const iso = D.alsIso(D.heute);
    const plan = D.planung[iso];
    const imDienst = plan.zeilen.filter((z) => z.imDienst).length;
    const ohneFahrzeug = plan.zeilen.filter((z) => z.imDienst && !z.fahrzeugId).length;
    const frei = D.fahrzeuge.filter((f) => f.zustand === "verfuegbar").length;
    const ungeplant = D.fahrten.filter((f) => f.zustand === "ungeplant").length;
    const eingang = D.fahrten.filter((f) => f.zustand === "eingang").length;
    const unterwegs = D.fahrten.filter((f) => f.zustand === "unterwegs").length;
    const heuteAlle = D.fahrten.filter((f) => !["storniert"].includes(f.zustand)).length;
    const meldungen = D.meldungen.filter((m) => R.darf(m.faehigkeit));
    const warnungen = meldungen.filter((m) => m.stufe === "warnung").length;

    const naechste = D.fahrten
      .filter((f) => ["geplant", "unterwegs", "ungeplant"].includes(f.zustand))
      .sort((a, b) => a.zeit.localeCompare(b.zeit))
      .slice(0, 6);

    return `
      <div class="bereichskopf">
        <div>
          <h1>Übersicht</h1>
          <p class="wichtig">${h(D.alsText(D.heute))} · ${h(imDienst)} im Dienst · ${
            ungeplant + eingang > 0
              ? `${ungeplant + eingang} Fahrten warten auf eine Zuweisung`
              : "alle Fahrten sind zugewiesen"}</p>
        </div>
        <div class="hauptaktion">
          <button class="knopf haupt-knopf" type="button" data-tun="neue-fahrt">Neue Fahrt aufnehmen</button>
        </div>
      </div>

      <div class="flaeche">
        <h2>Jetzt wichtig <span class="offen">Zahlen sind anklickbar</span></h2>
        <div class="kennzahlen">
          ${R.kennzahl(heuteAlle, "Fahrten heute", "", "fahrten:alle")}
          ${R.kennzahl(ungeplant + eingang, "noch nicht zugewiesen", ungeplant + eingang ? "warnung" : "gut", "fahrten:ungeplant")}
          ${R.kennzahl(unterwegs, "gerade unterwegs", "marke", "fahrten:unterwegs")}
          ${R.kennzahl(imDienst, "Fahrer im Dienst", "gut", "planung")}
          ${R.kennzahl(frei, "Fahrzeuge verfügbar", "gut", "team")}
          ${R.kennzahl(ohneFahrzeug, "im Dienst ohne Fahrzeug", ohneFahrzeug ? "warnung" : "gut", "planung")}
          ${R.kennzahl(warnungen, "Warnungen", warnungen ? "warnung" : "gut", "meldungen")}
        </div>
      </div>

      <div class="flaeche">
        <h2>Tagesverlauf <span class="offen">nächste Fahrten</span></h2>
        <div class="tabelle-huelle">
          <table class="liste">
            <thead><tr>
              <th>Zeit</th><th>Kunde</th><th>Von</th><th>Nach</th>
              <th>Fahrer</th><th>Fahrzeug</th><th>Zustand</th>
            </tr></thead>
            <tbody>
              ${naechste.map((f) => {
                const fa = mitarbeiterVon(f.fahrerId);
                const fz = fahrzeugVon(f.fahrzeugId);
                return `<tr>
                  <td><strong>${h(f.zeit)}</strong></td>
                  <td>${h(f.kunde)}</td>
                  <td>${h(f.von)}</td>
                  <td>${h(f.nach)}</td>
                  <td>${fa ? h(fa.name) : R.marke("warnung", "offen")}</td>
                  <td>${fz ? h(fz.kennzeichen) : R.marke("warnung", "offen")}</td>
                  <td>${zustandMarke(f.zustand)}</td>
                </tr>`;
              }).join("")}
            </tbody>
          </table>
        </div>
        <p class="wichtig" style="margin-top:10px;font-size:14px;">
          Entfernung und Fahrzeit werden nicht angezeigt — es ist keine Kartenquelle angebunden.
        </p>
      </div>

      <div class="flaeche">
        <h2>Schnellaktionen</h2>
        <div class="wahlraster">
          <button class="wahlkarte" type="button" data-tun="neue-fahrt"><strong>Neue Fahrt</strong><span>Fahrt aufnehmen</span></button>
          <button class="wahlkarte" type="button" data-ziel="planung"><strong>Schicht planen</strong><span>Heute oder morgen</span></button>
          <button class="wahlkarte" type="button" data-tun="wechsel-fahrer"><strong>Fahrer wechseln</strong><span>Bei einer Fahrt</span></button>
          <button class="wahlkarte" type="button" data-tun="wechsel-fahrzeug"><strong>Fahrzeug wechseln</strong><span>Bei einer Fahrt</span></button>
          <button class="wahlkarte" type="button" data-ziel="fahrten:eingang"><strong>Anfrage bearbeiten</strong><span>${h(eingang)} im Eingang</span></button>
          <button class="wahlkarte" type="button" data-ziel="meldungen"><strong>Meldungen</strong><span>${h(meldungen.length)} offen</span></button>
        </div>
      </div>`;
  }

  function zustandMarke(id) {
    const tabelle = {
      eingang:       ["aktiv", "Eingang"],
      ungeplant:     ["warnung", "Ungeplant"],
      geplant:       ["ruhig", "Geplant"],
      unterwegs:     ["aktiv", "Unterwegs"],
      abgeschlossen: ["gut", "Abgeschlossen"],
      storniert:     ["ruhig", "Storniert"],
      klaerung:      ["warnung", "Klärungsbedarf"]
    };
    const [art, text] = tabelle[id] || ["ruhig", id];
    return R.marke(art, text);
  }

  /* ============================================================
     2. Fahrten
     ============================================================ */
  function fahrten() {
    const filter = R.zustand.fahrtFilter;
    const vorfuehrung = R.zustand.fahrtenZustand || "geladen";

    const zaehler = (id) => D.fahrten.filter((f) => f.zustand === id).length;
    const liste = filter === "alle" ? D.fahrten : D.fahrten.filter((f) => f.zustand === filter);

    let rumpf;
    if (vorfuehrung === "laedt") {
      rumpf = R.zustandsKasten("laedt", "Fahrten werden geladen", "Einen Moment.");
    } else if (vorfuehrung === "fehler") {
      rumpf = R.kastenFehler("Fahrten");
    } else if (vorfuehrung === "leer" || !liste.length) {
      rumpf = R.kastenLeer("Fahrten in dieser Ansicht");
    } else {
      rumpf = `<div class="tabelle-huelle"><table class="liste">
        <thead><tr>
          <th>Nummer</th><th>Zeit</th><th>Kunde</th><th>Von</th><th>Nach</th>
          <th>Fahrer</th><th>Fahrzeug</th><th>Zustand</th><th></th>
        </tr></thead>
        <tbody>${liste.map((f) => {
          const fa = mitarbeiterVon(f.fahrerId);
          const fz = fahrzeugVon(f.fahrzeugId);
          return `<tr>
            <td>${h(f.id)}</td>
            <td><strong>${h(f.zeit)}</strong></td>
            <td>${h(f.kunde)}</td>
            <td>${h(f.von)}</td>
            <td>${h(f.nach)}</td>
            <td>${fa ? h(fa.name) : R.marke("warnung", "offen")}</td>
            <td>${fz ? h(fz.kennzeichen) : R.marke("warnung", "offen")}</td>
            <td>${zustandMarke(f.zustand)}
              ${f.nurProbe ? `<br>${R.marke("aktiv", "nur Designprobe – nicht gespeichert")}` : ""}
              ${f.hinweis ? `<br><span style="font-size:13px;color:var(--gedaempft)">${h(f.hinweis)}</span>` : ""}</td>
            <td><button class="knopf klein" type="button" data-tun="fahrt-oeffnen:${h(f.id)}">Öffnen</button></td>
          </tr>`;
        }).join("")}</tbody></table></div>`;
    }

    return `
      <div class="bereichskopf">
        <div>
          <h1>Fahrten</h1>
          <p class="wichtig">${h(zaehler("eingang"))} im Eingang, ${h(zaehler("ungeplant"))} ungeplant, ${h(zaehler("klaerung"))} in Klärung</p>
        </div>
        <div class="hauptaktion">
          <button class="knopf haupt-knopf" type="button" data-tun="neue-fahrt">Neue Fahrt aufnehmen</button>
        </div>
      </div>

      <div class="flaeche">
        <h2>Ansicht</h2>
        <div class="wahlraster">
          <button class="wahlkarte" type="button" data-tun="fahrt-filter:alle" aria-pressed="${filter === "alle"}">
            <strong>Alle</strong><span>${h(D.fahrten.length)} Fahrten</span></button>
          ${D.fahrtZustaende.map((z) => `
            <button class="wahlkarte" type="button" data-tun="fahrt-filter:${h(z.id)}" aria-pressed="${filter === z.id}">
              <strong>${h(z.name)}</strong><span>${h(zaehler(z.id))} Fahrten</span></button>`).join("")}
        </div>
      </div>

      <div class="flaeche">
        <h2>Liste</h2>
        ${rumpf}
      </div>

      <div class="flaeche">
        <h2>Zustände vorführen <span class="offen">gehört zur Designprobe</span></h2>
        <p class="wichtig" style="font-size:14px;margin:0 0 10px;">
          Damit lässt sich prüfen, dass ein Ladefehler nicht wie ein leerer Datenbestand aussieht.
        </p>
        <div class="wahlraster">
          <button class="wahlkarte" type="button" data-tun="fahrt-zustand:geladen" aria-pressed="${vorfuehrung === "geladen"}"><strong>Geladen</strong><span>Normalfall</span></button>
          <button class="wahlkarte" type="button" data-tun="fahrt-zustand:laedt" aria-pressed="${vorfuehrung === "laedt"}"><strong>Lädt</strong><span>noch unterwegs</span></button>
          <button class="wahlkarte" type="button" data-tun="fahrt-zustand:leer" aria-pressed="${vorfuehrung === "leer"}"><strong>Leer</strong><span>nichts eingetragen</span></button>
          <button class="wahlkarte" type="button" data-tun="fahrt-zustand:fehler" aria-pressed="${vorfuehrung === "fehler"}"><strong>Fehler</strong><span>Server nicht erreichbar</span></button>
        </div>
      </div>`;
  }

  /* ============================================================
     3. Planung
     ============================================================ */
  function planung() {
    const e = planEntwurf();
    const tag = D.tagAls(R.zustand.planTag);
    const quelle = D.planung[e.iso];
    const konflikte = konflikteVon(e);
    const geaendert = anzahlGeaendert(e);

    const imDienst = e.zeilen.filter((z) => z.imDienst).length;
    const frei = e.zeilen.length - imDienst;
    const ohneFahrzeug = e.zeilen.filter((z) => z.imDienst && !z.fahrzeugId).length;

    let stand;
    if (!quelle.veroeffentlicht) {
      stand = R.marke("ruhig", "Entwurf — Mitarbeiter sehen den Plan noch nicht");
    } else if (geaendert > 0) {
      stand = R.marke("warnung", "Änderung noch nicht erneut veröffentlicht");
    } else {
      stand = R.marke("gut", `Veröffentlicht um ${quelle.veroeffentlichtUm} Uhr — Mitarbeiter sehen den Plan`);
    }

    let zeilen = e.zeilen.map((z, i) => ({ z, i }));
    if (e.filter === "ungeplant") zeilen = zeilen.filter(({ z }) => z.imDienst && (!z.von || !z.fahrzeugId));
    if (e.filter === "konflikte") zeilen = zeilen.filter(({ i }) => konflikte.has(i));
    if (e.suche) {
      const s = e.suche.toLowerCase();
      zeilen = zeilen.filter(({ z }) => (mitarbeiterVon(z.mitarbeiterId)?.name || "").toLowerCase().includes(s));
    }

    const koerper = zeilen.length
      ? zeilen.map(({ z, i }) => planZeile(z, i, konflikte.get(i), zeileGeaendert(e, i))).join("")
      : `<tr><td colspan="6">${R.kastenLeer("Zeilen für diesen Filter")}</td></tr>`;

    return `
      <div class="bereichskopf">
        <div>
          <h1>Planung</h1>
          <p class="wichtig">${h(imDienst)} im Dienst · ${h(frei)} frei · ${h(ohneFahrzeug)} ohne Fahrzeug · ${h(konflikte.size)} Konflikte</p>
        </div>
      </div>

      <div class="flaeche">
        <div class="tagleiste">
          <div class="tagumschalter" role="group" aria-label="Tag wählen">
            <button type="button" data-tun="plan-tag:0" aria-pressed="${R.zustand.planTag === 0}">Heute</button>
            <button type="button" data-tun="plan-tag:1" aria-pressed="${R.zustand.planTag === 1}">Morgen</button>
          </div>
          <span class="tagdatum">${h(D.alsText(tag))}</span>
          ${stand}
        </div>

        <div class="tagleiste">
          <div class="tagumschalter" role="group" aria-label="Filter">
            <button type="button" data-tun="plan-filter:alle" aria-pressed="${e.filter === "alle"}">Alle</button>
            <button type="button" data-tun="plan-filter:ungeplant" aria-pressed="${e.filter === "ungeplant"}">Nur ungeplant</button>
            <button type="button" data-tun="plan-filter:konflikte" aria-pressed="${e.filter === "konflikte"}">Nur Konflikte</button>
          </div>
          <label style="min-width:180px;">Suche
            <input type="search" data-plan-suche value="${h(e.suche)}" placeholder="Name suchen"></label>
          <button class="knopf klein" type="button" data-tun="plan-uebernehmen-gestern">Plan von gestern übernehmen</button>
          <button class="knopf klein" type="button" data-tun="plan-alle-frei">Alle als frei markieren</button>
        </div>

        <div class="tabelle-huelle">
          <table class="liste">
            <thead><tr>
              <th>Mitarbeiter</th><th>Status</th><th>Schicht</th><th>Zeit</th><th>Fahrzeug</th><th>Hinweis</th>
            </tr></thead>
            <tbody>${koerper}</tbody>
          </table>
        </div>

        <div class="aktionsleiste">
          <span class="stand">${geaendert
            ? `${geaendert} Änderung${geaendert === 1 ? "" : "en"} noch nicht gespeichert`
            : "Keine ungespeicherten Änderungen"}</span>
          <button class="knopf" type="button" data-tun="plan-verwerfen" ${geaendert ? "" : "disabled"}>Änderungen verwerfen</button>
          <button class="knopf" type="button" data-tun="plan-entwurf" ${geaendert ? "" : "disabled"}>Entwurf speichern</button>
          <button class="knopf haupt-knopf" type="button" data-tun="plan-veroeffentlichen">
            Plan für ${R.zustand.planTag === 0 ? "heute" : "morgen"} veröffentlichen</button>
        </div>
      </div>`;
  }

  function planZeile(z, i, konflikt, geaendert) {
    const m = mitarbeiterVon(z.mitarbeiterId);
    const eigene = z.imDienst && !z.vorlage;
    return `<tr class="plan-zeile ${geaendert ? "ist-geaendert" : ""}">
      <td><strong>${h(m ? m.name : z.mitarbeiterId)}</strong><br>
        <span style="font-size:13px;color:var(--gedaempft)">${h(m ? m.beschaeftigung : "")}</span></td>
      <td>
        <select data-plan="dienst" data-zeile="${i}" aria-label="Status von ${h(m ? m.name : "")}">
          <option value="ja" ${z.imDienst ? "selected" : ""}>Im Dienst</option>
          <option value="nein" ${!z.imDienst ? "selected" : ""}>Frei</option>
        </select>
      </td>
      <td>${z.imDienst ? `
        <select data-plan="vorlage" data-zeile="${i}" aria-label="Schicht von ${h(m ? m.name : "")}">
          ${D.vorlagen.map((v) => `<option value="${h(v.id)}" ${z.vorlage === v.id || (eigene && v.id === "individuell") ? "selected" : ""}>
            ${h(v.name)}${v.von ? ` · ${h(v.von)}–${h(v.bis)}` : ""}</option>`).join("")}
        </select>` : "<span style=\"color:var(--gedaempft)\">—</span>"}</td>
      <td>${z.imDienst ? `
        <span class="zeitpaar">
          <input type="time" data-plan="von" data-zeile="${i}" value="${h(z.von)}" aria-label="Beginn">
          <input type="time" data-plan="bis" data-zeile="${i}" value="${h(z.bis)}" aria-label="Ende">
        </span>
        ${z.von && z.bis && z.bis < z.von ? '<br><span style="font-size:13px;color:var(--gedaempft)">über Mitternacht</span>' : ""}
        ` : "<span style=\"color:var(--gedaempft)\">—</span>"}</td>
      <td>${z.imDienst ? `
        <select data-plan="fahrzeug" data-zeile="${i}" aria-label="Fahrzeug von ${h(m ? m.name : "")}">
          <option value="">Kein Fahrzeug</option>
          ${D.fahrzeuge.map((f) => `<option value="${h(f.id)}" ${z.fahrzeugId === f.id ? "selected" : ""}>
            ${h(f.name)} · ${h(f.kennzeichen)}${f.zustand === "werkstatt" ? " (Werkstatt)" : ""}</option>`).join("")}
        </select>` : "<span style=\"color:var(--gedaempft)\">—</span>"}</td>
      <td>${konflikt ? R.marke("warnung", konflikt) : (z.imDienst ? R.marke("gut", "vollständig") : R.marke("ruhig", "frei"))}</td>
    </tr>`;
  }

  /* ============================================================
     4. Fahrer & Fahrzeuge
     ============================================================ */
  function team() {
    const iso = D.alsIso(D.heute);
    const plan = D.planung[iso];
    return `
      <div class="bereichskopf"><div>
        <h1>Fahrer & Fahrzeuge</h1>
        <p class="wichtig">Betriebliche Angaben. Persönliche Daten stehen im Personalbereich.</p>
      </div></div>

      <div class="flaeche">
        <h2>Fahrer heute</h2>
        <div class="tabelle-huelle"><table class="liste">
          <thead><tr><th>Name</th><th>Status</th><th>Schicht</th><th>Fahrzeug</th><th>Aktuelle Fahrt</th><th></th></tr></thead>
          <tbody>${plan.zeilen.map((z) => {
            const m = mitarbeiterVon(z.mitarbeiterId);
            const f = fahrzeugVon(z.fahrzeugId);
            const fahrt = D.fahrten.find((x) => x.fahrerId === z.mitarbeiterId && x.zustand === "unterwegs");
            return `<tr>
              <td><strong>${h(m.name)}</strong></td>
              <td>${z.imDienst ? R.marke("gut", "Im Dienst") : R.marke("ruhig", "Frei")}</td>
              <td>${z.von ? `${h(z.von)}–${h(z.bis)}` : "—"}</td>
              <td>${f ? h(f.kennzeichen) : (z.imDienst ? R.marke("warnung", "offen") : "—")}</td>
              <td>${fahrt ? `${h(fahrt.id)} · ${h(fahrt.nach)}` : "—"}</td>
              <td><button class="knopf klein" type="button" data-tun="wechsel-fahrzeug">Fahrzeug wechseln</button></td>
            </tr>`;
          }).join("")}</tbody></table></div>
      </div>

      <div class="flaeche">
        <h2>Fahrzeuge</h2>
        <div class="tabelle-huelle"><table class="liste">
          <thead><tr><th>Fahrzeug</th><th>Kennzeichen</th><th>Art</th><th>Plätze</th><th>Rollstuhl</th><th>Zustand</th><th>Heute zugewiesen</th></tr></thead>
          <tbody>${D.fahrzeuge.map((f) => {
            const zeile = plan.zeilen.find((z) => z.fahrzeugId === f.id);
            const m = zeile ? mitarbeiterVon(zeile.mitarbeiterId) : null;
            return `<tr>
              <td><strong>${h(f.name)}</strong></td>
              <td>${h(f.kennzeichen)}</td>
              <td>${h(f.art)}</td>
              <td>${h(f.plaetze)}</td>
              <td>${f.rollstuhl ? R.marke("gut", "geeignet") : R.marke("ruhig", "nein")}</td>
              <td>${f.zustand === "verfuegbar" ? R.marke("gut", "Verfügbar") : R.marke("warnung", "Werkstatt")}</td>
              <td>${m ? h(m.name) : "—"}</td>
            </tr>`;
          }).join("")}</tbody></table></div>
      </div>

      <div class="flaeche">
        <h2>PAJ GPS</h2>
        ${R.zustandsKasten("vorbereitet", "PAJ GPS — nicht angebunden",
          "Es besteht keine Verbindung zu PAJ. Es werden keine Positionen angezeigt und keine erfunden. Nötig sind: offizielle API, serverseitige Zugangsdaten, Zuordnung Gerät zu Fahrzeug sowie eine Rollen- und Datenschutzprüfung.")}
      </div>`;
  }

  /* ============================================================
     5. Meldungen
     ============================================================ */
  function meldungen() {
    const liste = D.meldungen.filter((m) => R.darf(m.faehigkeit));
    if (!liste.length) return `<div class="bereichskopf"><div><h1>Meldungen</h1></div></div>${R.kastenLeer("Meldungen")}`;
    return `
      <div class="bereichskopf"><div>
        <h1>Meldungen</h1>
        <p class="wichtig">${h(liste.length)} für Ihre Rolle (${h(R.ROLLENNAMEN[R.zustand.rolle])})</p>
      </div></div>
      <div class="flaeche">
        <h2>Offen</h2>
        <div class="tabelle-huelle"><table class="liste">
          <thead><tr><th>Wann</th><th>Meldung</th><th>Stufe</th></tr></thead>
          <tbody>${liste.map((m) => `<tr>
            <td style="white-space:nowrap">${h(m.zeit)}</td>
            <td>${h(m.text)}</td>
            <td>${m.stufe === "warnung" ? R.marke("warnung", "Warnung") : R.marke("ruhig", "Information")}</td>
          </tr>`).join("")}</tbody></table></div>
        <p class="wichtig" style="font-size:14px;margin-top:10px;">
          Die Disposition sieht bei einer Krankmeldung nur, dass eine eingegangen ist — nicht den Inhalt.
          E-Mail-Benachrichtigungen sind nicht eingerichtet und werden nicht vorgetäuscht.
        </p>
      </div>`;
  }

  /* ============================================================
     6. Kunden
     ============================================================ */
  function kunden() {
    /* Gezeigt werden hoechstens 25 Zeilen. Der Bestand hat ueber
       zweitausend Eintraege - die Oberflaeche zeichnet ihn nie ganz. */
    const gezeigt = D.kunden.slice(0, 25);
    return `
      <div class="bereichskopf"><div>
        <h1>Kunden</h1>
        <p class="wichtig">${h(D.kunden.length)} Testkunden im Bestand</p>
      </div></div>
      <div class="flaeche">
        <h2>Suche</h2>
        <label style="max-width:420px">Name, Telefonnummer oder Kundennummer
          <input type="search" placeholder="Testkunde …"></label>
      </div>
      <div class="flaeche">
        <h2>Liste <span class="offen">die ersten ${h(gezeigt.length)} von ${h(D.kunden.length)}</span></h2>
        <div class="tabelle-huelle"><table class="liste">
          <thead><tr><th>Name</th><th>Kontakt</th><th>Kundenkonto</th><th>Fahrten</th><th>Hinweis</th></tr></thead>
          <tbody>${gezeigt.map((k) => `<tr>
            <td><strong>${h(k.name)}</strong></td>
            <td>${h(k.telefon)}</td>
            <td>${k.konto === "verknüpft" ? R.marke("gut", "verknüpft") : R.marke("ruhig", "nicht verknüpft")}</td>
            <td>${h(k.fahrten)}</td>
            <td>${h(k.hinweis) || "—"}</td>
          </tr>`).join("")}</tbody></table></div>
        <p class="wichtig" style="font-size:14px;margin-top:10px;">
          Die Disposition hat keinen Zugriff auf diese Liste. Sie sieht Kontaktangaben nur an einer konkreten Fahrt.
        </p>
      </div>`;
  }

  /* ============================================================
     7. Personal
     ============================================================ */
  function personal() {
    return `
      <div class="bereichskopf"><div>
        <h1>Personal</h1>
        <p class="wichtig">${h(D.personal.length)} Mitarbeiter · 1 Krankmeldung offen · 1 Frist läuft ab</p>
      </div></div>
      <div class="flaeche">
        <h2>Mitarbeiter</h2>
        <div class="tabelle-huelle"><table class="liste">
          <thead><tr><th>Name</th><th>Status</th><th>Beschäftigung</th><th>Eintritt</th><th>Konto</th><th>Fristen</th></tr></thead>
          <tbody>${D.personal.map((p) => {
            const kritisch = p.fristen.find((f) => f.bis !== "gültig");
            return `<tr>
              <td><strong>${h(p.name)}</strong></td>
              <td>${p.status === "aktiv" ? R.marke("gut", "aktiv")
                  : p.status === "krank" ? R.marke("warnung", "krank")
                  : R.marke("ruhig", p.status)}</td>
              <td>${h(p.beschaeftigung)}</td>
              <td>${h(p.eintritt)}</td>
              <td>${p.konto === "verknüpft" ? R.marke("gut", "verknüpft") : R.marke("ruhig", "nicht verknüpft")}</td>
              <td>${kritisch ? R.marke("warnung", `${kritisch.was}: ${kritisch.bis}`) : R.marke("gut", "alle gültig")}</td>
            </tr>`;
          }).join("")}</tbody></table></div>
        <p class="wichtig" style="font-size:14px;margin-top:10px;">
          Persönliche Daten stehen nicht in der Übersicht, sondern erst in der einzelnen Akte.
        </p>
      </div>`;
  }

  /* ============================================================
     8. Lohn
     ============================================================ */
  const lohnStand = { mitarbeiterId: "", monat: "", jahr: "2026", datei: "" };

  function lohn() {
    return `
      <div class="bereichskopf">
        <div><h1>Lohn</h1>
          <p class="wichtig">Besonders geschützt. Nur Administration und Personal. Die Disposition hat keinen Zugriff.</p></div>
        <div class="hauptaktion">
          <button class="knopf haupt-knopf" type="button" data-tun="lohn-neu">Lohnabrechnung bereitstellen</button>
        </div>
      </div>
      <div class="flaeche">
        <h2>Bereitgestellt</h2>
        <div class="tabelle-huelle"><table class="liste">
          <thead><tr><th>Mitarbeiter</th><th>Monat</th><th>Bereitgestellt am</th><th>Version</th><th></th></tr></thead>
          <tbody>${D.lohn.map((l) => {
            const m = mitarbeiterVon(l.mitarbeiterId);
            return `<tr>
              <td><strong>${h(m ? m.name : l.mitarbeiterId)}</strong></td>
              <td>${h(l.monat)}/${h(l.jahr)}</td>
              <td>${h(l.bereitgestellt)}</td>
              <td>${l.version > 1 ? R.marke("aktiv", `Korrektur v${l.version}`) : R.marke("ruhig", "v1")}</td>
              <td><button class="knopf klein" type="button" data-tun="lohn-ansehen">Ansehen</button></td>
            </tr>`;
          }).join("")}</tbody></table></div>
      </div>
      <div class="flaeche">
        <h2>Wie die Dateien liegen</h2>
        <ul style="margin:0;padding-left:20px;color:var(--gedaempft);font-size:15px;line-height:1.7">
          <li>privater Bucket, keine öffentliche Adresse</li>
          <li>ausschließlich PDF, feste Größenbegrenzung</li>
          <li>neutrale interne Dateinamen — kein Name, kein Geburtsdatum, keine Steuerdaten im Pfad</li>
          <li>Ansicht nur über kurz gültige, signierte Adresse</li>
          <li>kein stilles Überschreiben — eine Korrektur ist eine neue Version</li>
          <li>protokolliert wird: wer, wann, für welchen Abrechnungszeitraum</li>
          <li>Mitarbeiter sehen ausschließlich ihre eigenen Abrechnungen</li>
        </ul>
        <p class="wichtig" style="font-size:14px;margin-top:10px;">
          In dieser Probe wird nichts hochgeladen und nichts versendet.
        </p>
      </div>`;
  }

  function lohnDialog() {
    const s = lohnStand;
    const m = mitarbeiterVon(s.mitarbeiterId);
    const fertig = s.mitarbeiterId && s.monat && s.datei;
    return `
      <div class="dialog-hinter" data-dialog-zu></div>
      <div class="dialog-kasten" role="dialog" aria-modal="true" aria-labelledby="lohnTitel">
        <header class="dialog-kopf">
          <h2 id="lohnTitel">Lohnabrechnung bereitstellen</h2>
          <button class="knopf klein" type="button" data-dialog-zu>Abbrechen</button>
        </header>
        <div class="dialog-rumpf">
          <div class="dialog-schritt"><h3>1. Für wen?</h3>
            <div class="wahlraster">${D.mitarbeiter.map((x) => `
              <button class="wahlkarte" type="button" data-tun="lohn-wer:${h(x.id)}" aria-pressed="${s.mitarbeiterId === x.id}">
                <strong>${h(x.name)}</strong><span>${h(x.beschaeftigung)}</span></button>`).join("")}</div>
          </div>
          <div class="dialog-schritt"><h3>2. Welcher Zeitraum?</h3>
            <div class="feldpaar">
              <label>Monat<select data-lohn="monat">
                <option value="">— wählen —</option>
                ${["01","02","03","04","05","06","07","08","09","10","11","12"]
                  .map((mo) => `<option value="${mo}" ${s.monat === mo ? "selected" : ""}>${mo}</option>`).join("")}
              </select></label>
              <label>Jahr<select data-lohn="jahr">
                <option value="2026" ${s.jahr === "2026" ? "selected" : ""}>2026</option>
                <option value="2025" ${s.jahr === "2025" ? "selected" : ""}>2025</option>
              </select></label>
            </div>
          </div>
          <div class="dialog-schritt"><h3>3. Welche Datei?</h3>
            <div class="wahlraster">
              <button class="wahlkarte" type="button" data-tun="lohn-datei:Testdatei-A.pdf" aria-pressed="${s.datei === "Testdatei-A.pdf"}">
                <strong>Testdatei-A.pdf</strong><span>142 kB · PDF</span></button>
              <button class="wahlkarte" type="button" data-tun="lohn-datei:Testdatei-B.pdf" aria-pressed="${s.datei === "Testdatei-B.pdf"}">
                <strong>Testdatei-B.pdf</strong><span>138 kB · PDF</span></button>
            </div>
            <p class="wichtig" style="font-size:14px;margin-top:8px;">
              In der Probe wird keine echte Datei gewählt und nichts hochgeladen.</p>
          </div>
          <div class="dialog-schritt"><h3>4. Bitte prüfen</h3>
            <dl class="zusammenfassung">
              <div><dt>Mitarbeiter</dt><dd>${h(m ? m.name : "— nicht gewählt")}</dd></div>
              <div><dt>Zeitraum</dt><dd>${s.monat ? `${h(s.monat)}/${h(s.jahr)}` : "— nicht gewählt"}</dd></div>
              <div><dt>Datei</dt><dd>${h(s.datei || "— nicht gewählt")}</dd></div>
              <div><dt>Sichtbar für</dt><dd>nur ${h(m ? m.name : "den gewählten Mitarbeiter")}</dd></div>
            </dl>
          </div>
        </div>
        <footer class="dialog-fuss">
          <button class="knopf" type="button" data-dialog-zu>Abbrechen</button>
          <button class="knopf haupt-knopf" type="button" data-tun="lohn-fertig" ${fertig ? "" : "disabled"}>
            Lohnabrechnung bereitstellen</button>
        </footer>
      </div>`;
  }

  /* ============================================================
     9. Finanzen
     ============================================================ */
  function finanzen() {
    const zahl = (z) => D.rechnungen.filter((r) => r.zustand === z).length;
    return `
      <div class="bereichskopf"><div>
        <h1>Finanzen</h1>
        <p class="wichtig">${h(zahl("offen"))} offen · ${h(zahl("überfällig"))} überfällig · ${h(zahl("Entwurf"))} Entwurf</p>
      </div></div>
      <div class="flaeche">
        <h2>Rechnungen</h2>
        <div class="tabelle-huelle"><table class="liste">
          <thead><tr><th>Nummer</th><th>Kunde</th><th>Zeitraum</th><th>Betrag</th><th>Fällig</th><th>Zustand</th></tr></thead>
          <tbody>${D.rechnungen.map((r) => `<tr>
            <td>${h(r.nr)}</td><td>${h(r.kunde)}</td><td>${h(r.zeitraum)}</td>
            <td><strong>${h(r.betrag)}</strong></td><td>${h(r.faellig)}</td>
            <td>${r.zustand === "bezahlt" ? R.marke("gut", "bezahlt")
                : r.zustand === "überfällig" ? R.marke("warnung", "überfällig")
                : R.marke("ruhig", r.zustand)}</td>
          </tr>`).join("")}</tbody></table></div>
      </div>
      <div class="flaeche">
        <h2>Versand und Buchhaltung</h2>
        ${R.zustandsKasten("vorbereitet", "Rechnungsversand — nicht eingerichtet",
          "Es ist kein geprüfter Mailversand angebunden. Deshalb wird hier kein Versand angeboten und keiner simuliert. Nötig sind: Absender, SMTP mit SPF/DKIM/DMARC und eine Protokollierung.")}
      </div>`;
  }

  /* ============================================================
     10. Rewards
     ============================================================ */
  function rewards() {
    const w = D.rewards;
    return `
      <div class="bereichskopf"><div>
        <h1>Rewards</h1>
        <p class="wichtig">Nur Administration. Die Disposition hat keinen Verwaltungszugriff.</p>
      </div></div>
      <div class="flaeche">
        <h2>Regeln</h2>
        <div class="kennzahlen">${w.regeln.map((r) =>
          `<div class="kennzahl" style="cursor:default"><span class="wert" style="font-size:20px">${h(r.wert)}</span>
           <span class="name">${h(r.name)}</span></div>`).join("")}</div>
      </div>
      <div class="flaeche">
        <h2>Konten</h2>
        <div class="tabelle-huelle"><table class="liste">
          <thead><tr><th>Kunde</th><th>Punkte</th><th>Stufe</th><th>Offene Drehs</th></tr></thead>
          <tbody>${w.konten.map((k) => `<tr>
            <td><strong>${h(k.kunde)}</strong></td><td>${h(k.punkte)}</td>
            <td>${R.marke("aktiv", k.stufe)}</td><td>${h(k.drehs)}</td></tr>`).join("")}</tbody>
        </table></div>
      </div>
      <div class="flaeche">
        <h2>Vorgänge</h2>
        <div class="tabelle-huelle"><table class="liste">
          <thead><tr><th>Wann</th><th>Was</th><th>Kunde</th><th>Ergebnis</th></tr></thead>
          <tbody>${w.vorgaenge.map((v) => `<tr>
            <td>${h(v.zeit)}</td><td>${h(v.was)}</td><td>${h(v.kunde)}</td>
            <td>${R.marke(v.zustand, v.ergebnis)}</td></tr>`).join("")}</tbody>
        </table></div>
        <p class="wichtig" style="font-size:14px;margin-top:10px;">
          Der Gewinn wird nie im Browser bestimmt — maßgeblich bleibt die Serverfunktion.
          Ein abgebrochener Dreh vernichtet keinen Anspruch. Yumaks Box bleibt bis zur fachlichen Freigabe gesperrt.
        </p>
      </div>`;
  }

  /* ============================================================
     11. Analyse
     ============================================================ */
  function analyse() {
    const a = D.analyse;
    const groesster = Math.max(...a.aktionen.map((x) => x.wert));
    return `
      <div class="bereichskopf"><div>
        <h1>Analyse</h1>
        <p class="wichtig">Zeitraum: ${h(a.zeitraum)}</p>
      </div></div>

      ${R.zustandsKasten("vorbereitet", "Alle Zahlen hier sind erfunden",
        "Es findet heute keinerlei Besuchermessung statt. Diese Ansicht zeigt nur, wie die Auswertung später aussehen würde. Im produktiven Portal bleibt der Bereich leer, bis eine datensparsame Ereigniserfassung eingerichtet und rechtlich geprüft ist.")}

      <div class="flaeche">
        <h2>Kennzahlen</h2>
        <div class="kennzahlen">${a.kennzahlen.map((k) =>
          `<div class="kennzahl" style="cursor:default">
             <span class="wert">${h(k.wert)}</span>
             <span class="name">${h(k.name)} · ${h(k.hinweis)}</span></div>`).join("")}</div>
        <p class="wichtig" style="font-size:14px;margin-top:10px;">
          <strong>Besucher</strong> ist immer eine Schätzung: ein Mensch mit Handy und Rechner zählt doppelt,
          wer Speicherfunktionen blockiert, gar nicht. <strong>Besuche</strong> und <strong>Seitenaufrufe</strong>
          werden dagegen gezählt. Mitarbeiter- und Adminnutzung wird nicht als Besuch gewertet.
        </p>
      </div>

      <div class="flaeche">
        <h2>Aktionen</h2>
        <div style="display:grid;gap:8px">${a.aktionen.map((x) => `
          <div style="display:grid;grid-template-columns:minmax(150px,1fr) 2fr auto;gap:10px;align-items:center;font-size:15px">
            <span>${h(x.name)}</span>
            <span style="height:8px;border-radius:2px;background:var(--flaeche-2)">
              <span style="display:block;height:100%;border-radius:2px;background:var(--gold);width:${Math.round(x.wert / groesster * 100)}%"></span>
            </span>
            <strong>${h(x.wert)}</strong>
          </div>`).join("")}</div>
      </div>

      <div class="flaeche">
        <h2>Beliebteste Seiten</h2>
        <div class="tabelle-huelle"><table class="liste">
          <thead><tr><th>Seite</th><th>Aufrufe</th></tr></thead>
          <tbody>${a.seiten.map((s) => `<tr><td>${h(s.name)}</td><td><strong>${h(s.wert)}</strong></td></tr>`).join("")}</tbody>
        </table></div>
      </div>`;
  }

  /* ============================================================
     Kleine Bestaetigungsfenster
     ============================================================ */
  function hinweisDialog(titel, text, art) {
    return `
      <div class="dialog-hinter" data-dialog-zu></div>
      <div class="dialog-kasten" role="dialog" aria-modal="true" aria-label="${h(titel)}">
        <header class="dialog-kopf"><h2>${h(titel)}</h2>
          <button class="knopf klein" type="button" data-dialog-zu>Schließen</button></header>
        <div class="dialog-rumpf">${R.zustandsKasten(art || "leer", titel, text)}</div>
        <footer class="dialog-fuss">
          <button class="knopf haupt-knopf" type="button" data-dialog-zu>Verstanden</button>
        </footer>
      </div>`;
  }

  function veroeffentlichenDialog() {
    const e = planEntwurf();
    const konflikte = konflikteVon(e);
    const imDienst = e.zeilen.filter((z) => z.imDienst).length;
    const ohneFahrzeug = e.zeilen.filter((z) => z.imDienst && !z.fahrzeugId).length;
    const tag = D.tagAls(R.zustand.planTag);
    return `
      <div class="dialog-hinter" data-dialog-zu></div>
      <div class="dialog-kasten" role="dialog" aria-modal="true" aria-labelledby="vTitel">
        <header class="dialog-kopf"><h2 id="vTitel">Plan veröffentlichen</h2>
          <button class="knopf klein" type="button" data-dialog-zu>Abbrechen</button></header>
        <div class="dialog-rumpf">
          <dl class="zusammenfassung">
            <div><dt>Tag</dt><dd>${R.zustand.planTag === 0 ? "Heute" : "Morgen"}</dd></div>
            <div><dt>Datum</dt><dd>${h(D.alsText(tag))}</dd></div>
            <div><dt>Im Dienst</dt><dd>${h(imDienst)} Mitarbeiter</dd></div>
            <div><dt>Ohne Fahrzeug</dt><dd>${h(ohneFahrzeug)}</dd></div>
            <div><dt>Konflikte</dt><dd>${h(konflikte.size)}</dd></div>
          </dl>
          ${konflikte.size
            ? R.zustandsKasten("fehler", `${konflikte.size} Konflikte`, "Der Plan lässt sich veröffentlichen, die Konflikte bleiben aber bestehen und sind für die Mitarbeiter sichtbar.")
            : ""}
          <p style="margin:0;color:var(--gedaempft)">Danach sehen die Mitarbeiter diesen Plan im Mitarbeiterportal.</p>
        </div>
        <footer class="dialog-fuss">
          <button class="knopf" type="button" data-dialog-zu>Abbrechen</button>
          <button class="knopf haupt-knopf" type="button" data-tun="plan-veroeffentlichen-ja">
            Ja, für ${R.zustand.planTag === 0 ? "heute" : "morgen"} veröffentlichen</button>
        </footer>
      </div>`;
  }

  /* ============================================================
     Wegfuehrung der Aktionen
     ============================================================ */
  function tun(befehl) {
    /* Nur am ERSTEN Doppelpunkt trennen: ein Ziel wie
       "Testklinik 01, Speyer" darf nicht zerfallen. */
    const trenn = befehl.indexOf(":");
    const name = trenn < 0 ? befehl : befehl.slice(0, trenn);
    const wert = trenn < 0 ? undefined : befehl.slice(trenn + 1);
    const e = R.zustand.planEntwurf;

    /* Alles rund um die Fahrtaufnahme gehoert dem eigenen Modul. */
    if (name.startsWith("fa-")) { window.ProbeFahrtassistent.tun(name, wert); return; }

    switch (name) {
      case "neue-fahrt": window.ProbeFahrtassistent.starten(); return;

      case "fahrt-filter":  R.zustand.fahrtFilter = wert; R.zeichnen(); return;
      case "fahrt-zustand": R.zustand.fahrtenZustand = wert; R.zeichnen(); return;
      case "fahrt-oeffnen":
        R.dialogOeffnen(hinweisDialog(`Fahrt ${wert}`,
          "Hier stünden die Einzelheiten der Fahrt mit Fahrer- und Fahrzeugwechsel. Für die Designprobe genügt der Weg dorthin.", "leer"));
        return;
      case "neu-laden": R.zustand.fahrtenZustand = "geladen"; R.zeichnen(); return;

      case "wechsel-fahrer":
      case "wechsel-fahrzeug":
        R.dialogOeffnen(hinweisDialog(name === "wechsel-fahrer" ? "Fahrer wechseln" : "Fahrzeug wechseln",
          "Ein Fenster mit genau einer Auswahl: die verfügbaren Fahrer beziehungsweise Fahrzeuge als Karten, gold markiert. Kein zweites Fenster darüber.", "leer"));
        return;

      case "plan-tag":     R.zustand.planTag = Number(wert); R.zustand.planEntwurf = null; R.zeichnen(); return;
      case "plan-filter":  e.filter = wert; R.zeichnen(); return;
      case "plan-verwerfen":
        e.zeilen = e.urzeilen.map((z) => ({ ...z })); R.zeichnen(); return;
      case "plan-alle-frei":
        e.zeilen = e.zeilen.map((z) => ({ ...z, imDienst: false, vorlage: null, von: "", bis: "", fahrzeugId: null }));
        R.zeichnen(); return;
      case "plan-uebernehmen-gestern":
        e.zeilen = D.planung[D.alsIso(D.heute)].zeilen.map((z) => ({ ...z }));
        R.zeichnen(); return;
      case "plan-entwurf":
        e.urzeilen = e.zeilen.map((z) => ({ ...z }));
        D.planung[e.iso].zeilen = e.zeilen.map((z) => ({ ...z }));
        R.zeichnen(); return;
      case "plan-veroeffentlichen":
        R.dialogOeffnen(veroeffentlichenDialog()); return;
      case "plan-veroeffentlichen-ja": {
        const quelle = D.planung[e.iso];
        quelle.zeilen = e.zeilen.map((z) => ({ ...z }));
        quelle.veroeffentlicht = true;
        quelle.veroeffentlichtUm = new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
        e.urzeilen = e.zeilen.map((z) => ({ ...z }));
        R.dialogSchliessen(); R.zeichnen(); return;
      }

      case "lohn-neu":
        Object.assign(lohnStand, { mitarbeiterId: "", monat: "", jahr: "2026", datei: "" });
        R.dialogOeffnen(lohnDialog()); return;
      case "lohn-wer":   lohnStand.mitarbeiterId = wert; R.dialogOeffnen(lohnDialog()); return;
      case "lohn-datei": lohnStand.datei = wert; R.dialogOeffnen(lohnDialog()); return;
      case "lohn-fertig":
        R.dialogOeffnen(hinweisDialog("In der Probe wird nichts bereitgestellt",
          "Im echten Portal käme die Datei jetzt in den privaten Bucket, der Mitarbeiter sähe sie in seinem Portal, und der Vorgang würde protokolliert. Diese Probe lädt nichts hoch.", "vorbereitet"));
        return;
      case "lohn-ansehen":
        R.dialogOeffnen(hinweisDialog("Ansehen",
          "Im echten Portal würde jetzt eine kurz gültige, signierte Adresse erzeugt. In der Probe gibt es keine Datei.", "vorbereitet"));
        return;
      default: return;
    }
  }

  /* Aenderungen an Feldern */
  function geaendert(feld) {
    if (feld.matches("[data-plan]")) {
      const e = planEntwurf();
      const i = Number(feld.dataset.zeile);
      const z = e.zeilen[i];
      const was = feld.dataset.plan;
      if (was === "dienst") {
        z.imDienst = feld.value === "ja";
        if (!z.imDienst) { z.vorlage = null; z.von = ""; z.bis = ""; z.fahrzeugId = null; }
        else if (!z.vorlage) { z.vorlage = "tag"; z.von = "09:00"; z.bis = "17:00"; }
      } else if (was === "vorlage") {
        const v = vorlageVon(feld.value);
        z.vorlage = feld.value === "individuell" ? null : feld.value;
        if (v && v.von) { z.von = v.von; z.bis = v.bis; }
      } else if (was === "von") { z.von = feld.value; z.vorlage = null; }
      else if (was === "bis") { z.bis = feld.value; z.vorlage = null; }
      else if (was === "fahrzeug") { z.fahrzeugId = feld.value || null; }
      R.zeichnen();
      return true;
    }
    if (feld.matches("[data-plan-suche]")) {
      planEntwurf().suche = feld.value; R.zeichnen(); return true;
    }
    if (feld.matches("[data-nf]")) { neueFahrtStand[feld.dataset.nf] = feld.value; return true; }
    if (feld.matches("[data-lohn]")) { lohnStand[feld.dataset.lohn] = feld.value; R.dialogOeffnen(lohnDialog()); return true; }
    return false;
  }

  const bereiche = { uebersicht, fahrten, planung, team, meldungen, kunden, personal, lohn, finanzen, rewards, analyse };

  window.ProbeBereiche = {
    zeichne: (id) => (bereiche[id] ? bereiche[id]() : R.kastenLeer("Inhalte")),
    tun, geaendert,
    taste: (e) => window.ProbeFahrtassistent.taste(e),
    eingabe: (feld) => window.ProbeFahrtassistent.eingabe(feld)
  };
})();
