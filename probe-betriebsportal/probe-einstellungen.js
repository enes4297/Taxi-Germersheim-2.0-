/* ============================================================
   Designprobe Betriebsportal - Einstellungen: Rollen & Rechte
   ============================================================
   Wofuer dieser Bereich da ist:

   Bisher stand die Rechteverteilung fest im Code. Wer der Buchhaltung
   die Analyse nehmen oder der Disposition die Urlaubsentscheidung geben
   wollte, musste eine Datei aendern. Das ist keine Verwaltung.

   Hier kann die Administration beides schalten:
     - die Rechte einer ROLLE (gilt fuer alle Konten dieser Rolle)
     - zusaetzliche Freigaben fuer EIN KONTO

   Beides bleibt getrennt sichtbar. Sonst waere nach einer Weile
   niemandem mehr klar, ob jemand ein Recht aus seiner Rolle hat oder
   weil es ihm einmal einzeln gegeben wurde.

   Drei Regeln, die hier nicht verhandelbar sind:

   1. VERSTECKEN IST KEIN SCHUTZ. Jede Aktion dieses Bereichs prueft
      security.write selbst. Ein direkter Aufruf aus der Konsole bewirkt
      ohne dieses Recht nichts.
   2. KEINE SELBSTBERECHTIGUNG. Nur wer security.write hat, kann Rechte
      vergeben - und das hat in dieser Probe nur die Administration.
   3. DIE LETZTE ADMINISTRATION BLEIBT HANDLUNGSFAEHIG. Es muss immer
      mindestens ein Konto geben, das security.write behaelt. Sonst
      koennte sich die Administration aussperren, und niemand kaeme je
      wieder an die Rechte.

   Was NICHT entschieden ist und deshalb nicht gebaut wird: die genaue
   spaetere Verteilung fuer Buchhaltung, Personal und Disposition. Die
   Probe fuehrt vor, dass es schaltbar ist - sie legt nichts fest.

   Kein Netzzugriff. Dieses Modul kennt weder Supabase noch fetch.
   ============================================================ */
(() => {
  "use strict";

  const R = window.ProbeRahmen;
  const D = window.ProbeDaten;
  const h = R.h;

  /*
    Die Faehigkeiten mit der Beschriftung, die der Geschaeftsfuehrer
    genannt hat.

    Wo seine Liste feiner ist als das Modell, steht das ausdruecklich
    dabei - "Fahrten sehen" und "Planung sehen" sind hier beides
    operations.read. Das wird benannt und als offene Entscheidung
    gekennzeichnet, nicht stillschweigend aufgeteilt.
  */
  const GRUPPEN = [
    {
      name: "Betrieb",
      eintraege: [
        { id: "operations.read", name: "Fahrten und Planung sehen",
          zusammen: "Fahrten sehen und Planung sehen sind zurzeit EIN Recht." },
        { id: "operations.write", name: "Fahrten und Planung bearbeiten",
          zusammen: "Fahrten bearbeiten und Planung bearbeiten sind zurzeit EIN Recht." },
        { id: "fleet.read", name: "Fahrzeuge sehen" },
        { id: "fleet.write", name: "Fahrzeuge bearbeiten" }
      ]
    },
    {
      name: "Personal",
      eintraege: [
        { id: "personnel.read", name: "Personal und Krankheitszeiträume sehen",
          zusammen: "Personal sehen und Krankheitszeiträume sehen sind zurzeit EIN Recht." },
        { id: "personnel.write", name: "Personal bearbeiten und Gesundheitsdokumente prüfen",
          zusammen: "Personal bearbeiten und Dokumentprüfung sind zurzeit EIN Recht." },
        { id: "absence.decide", name: "Urlaub entscheiden" },
        { id: "payroll.read", name: "Lohn sehen" },
        { id: "payroll.write", name: "Lohnabrechnungen bereitstellen" }
      ]
    },
    {
      name: "Kunden und Geld",
      eintraege: [
        { id: "customers.read", name: "Kunden sehen" },
        { id: "customers.write", name: "Kunden anlegen oder ändern" },
        { id: "finance.read", name: "Finanzen sehen" },
        { id: "finance.write", name: "Finanzen bearbeiten" },
        { id: "rewards.read", name: "Rewards sehen" },
        { id: "rewards.write", name: "Rewards bearbeiten" }
      ]
    },
    {
      name: "Auswertung und Verwaltung",
      eintraege: [
        { id: "analytics.read", name: "Analyse sehen" },
        { id: "security.read", name: "Protokoll sehen" },
        { id: "security.write", name: "Rechte verwalten",
          heikel: "Wer dieses Recht hat, kann alle anderen Rechte vergeben." },
        { id: "self.read", name: "Eigene Übersicht und Meldungen sehen",
          heikel: "Ohne dieses Recht sieht ein Konto gar nichts mehr." }
      ]
    }
  ];

  const ALLE_IDS = GRUPPEN.flatMap((g) => g.eintraege.map((e) => e.id));
  const eintragVon = (id) =>
    GRUPPEN.flatMap((g) => g.eintraege).find((e) => e.id === id) || null;

  /*
    Der Bearbeitungsstand. Geaendert wird zuerst hier, nicht am
    Rechtemodell - gespeichert wird erst nach der letzten Pruefung.

    Dass ein Entwurf getrennt vom Bestand liegt, ist in dieser Probe
    durchgehend so: Sonst waere ein Klick schon die Entscheidung.
  */
  const stand = {
    /* Was gerade bearbeitet wird: "rolle:<id>" oder "konto:<kennung>" */
    ziel: "",
    entwurf: null,      /* Array der Faehigkeiten im Entwurf */
    stufe: "",          /* "" | "bearbeiten" | "pruefen" */
    grund: "",
    fehler: ""
  };

  const darfVerwalten = () => R.darf("security.write");

  const meinKonto = () => {
    const k = R.aktuellesKonto();
    return { name: k.name, kennung: k.kennung, rolle: k.anzeige };
  };

  const jetzt = () => new Date().toLocaleTimeString("de-DE",
    { hour: "2-digit", minute: "2-digit" }) + " Uhr";

  /* ============================================================
     Die Aussperrsperre
     ============================================================
     Geprueft wird nicht "bin ich noch drin", sondern "gibt es
     danach noch irgendein Konto, das Rechte verwalten kann". Das ist
     der Unterschied zwischen einer Hoeflichkeit und einem Schutz: Auch
     wer einem ANDEREN Administrationskonto das Recht nimmt, darf das
     letzte nicht treffen.
  */
  function aussperrung(zielArt, zielId, entwurf) {
    const faehig = [];
    for (const k of R.KONTEN) {
      /* Welche Rechte haette dieses Konto nach der Aenderung? */
      let rollenrecht = R.rollenRechte[k.rolle] || [];
      let kontorecht = R.kontoRechte[k.kennung] || [];
      if (zielArt === "rolle" && k.rolle === zielId) rollenrecht = entwurf;
      if (zielArt === "konto" && k.kennung === zielId) kontorecht = entwurf;
      const alle = rollenrecht.concat(kontorecht);
      if (alle.includes("security.write") && alle.includes("self.read")) {
        faehig.push(k.name + " (" + k.kennung + ")");
      }
    }
    if (!faehig.length) {
      return "Nach dieser Änderung könnte kein einziges Konto mehr Rechte "
        + "verwalten. Dann käme niemand je wieder an die Rechteverwaltung — "
        + "auch die Administration nicht. Diese Änderung wird deshalb nicht "
        + "gespeichert.";
    }
    return "";
  }

  /* Wer waere danach noch handlungsfaehig? Fuer die Anzeige. */
  function handlungsfaehigNach(zielArt, zielId, entwurf) {
    const liste = [];
    for (const k of R.KONTEN) {
      let rollenrecht = R.rollenRechte[k.rolle] || [];
      let kontorecht = R.kontoRechte[k.kennung] || [];
      if (zielArt === "rolle" && k.rolle === zielId) rollenrecht = entwurf;
      if (zielArt === "konto" && k.kennung === zielId) kontorecht = entwurf;
      const alle = rollenrecht.concat(kontorecht);
      if (alle.includes("security.write") && alle.includes("self.read")) liste.push(k);
    }
    return liste;
  }

  /* ============================================================
     Die Fläche
     ============================================================ */
  function zeichne() {
    if (!darfVerwalten()) {
      /*
        Auch hier: Verstecken ist kein Schutz, aber ein ehrlicher
        Hinweis gehoert dazu. Ohne security.write ist der Bereich in
        der Navigation ohnehin nicht sichtbar - wer per geheZu
        hereinkommt, bekommt das.
      */
      return `
        <div class="bereichskopf"><div>
          <h1>Einstellungen</h1>
          <p class="wichtig">Rollen und Rechte</p>
        </div></div>
        ${R.kastenKeinRecht("die Rechteverwaltung")}
        <div class="flaeche">
          <p class="schritt-hinweis">Rechte vergeben darf nur ein Konto mit dem Recht
            <strong>Rechte verwalten</strong>. In dieser Probe hat das ausschließlich die
            Administration. Es gibt keinen Weg, sich dieses Recht selbst zu geben —
            auch nicht über einen direkten Aufruf.</p>
        </div>`;
    }

    return `
      <div class="bereichskopf"><div>
        <h1>Einstellungen</h1>
        <p class="wichtig">Rollen und Rechte · angemeldet als
          <strong>${h(meinKonto().name)}</strong> (${h(meinKonto().kennung)})</p>
      </div></div>

      ${R.zustandsKasten("vorbereitet", "Nur in dieser Designprobe",
        "Änderungen gelten in dieser Sitzung und sind nach dem Neuladen weg. Es wird keine Supabase-Rolle angelegt, kein Grant vergeben und keine RLS-Policy geändert. Was hier geschaltet wird, zeigt, wie die Verwaltung aussähe.")}

      ${rollenFlaeche()}
      ${kontenFlaeche()}
      ${offeneFragen()}
      ${protokollFlaeche()}`;
  }

  /* ---- Die Rollen ---- */
  function rollenFlaeche() {
    const rollen = Object.keys(R.FAEHIGKEITEN);
    return `
      <div class="flaeche">
        <h2>Rechte einer Rolle</h2>
        <p class="schritt-hinweis">Gilt für <strong>alle</strong> Konten dieser Rolle.
          Einzelne Freigaben für ein bestimmtes Konto stehen weiter unten und bleiben
          davon getrennt.</p>
        <div class="aktenliste" role="list">
          <div class="az-kopf" aria-hidden="true">
            <span>Rolle</span><span>Konten</span><span>Rechte</span>
            <span>abweichend vom Ausgangsstand</span><span></span>
          </div>
          ${rollen.map((rolle) => {
            const jetztRechte = R.rollenRechte[rolle] || [];
            const anfang = R.FAEHIGKEITEN[rolle] || [];
            const dazu = jetztRechte.filter((x) => !anfang.includes(x));
            const weg = anfang.filter((x) => !jetztRechte.includes(x));
            const konten = R.KONTEN.filter((k) => k.rolle === rolle);
            const abweichung = (dazu.length || weg.length)
              ? `${dazu.length ? "+" + dazu.length : ""}${dazu.length && weg.length ? " / " : ""}${weg.length ? "−" + weg.length : ""}`
              : "unverändert";
            return window.ProbeAkten.aktenzeile(
              `es-rolle:${rolle}`,
              `${R.ROLLENNAMEN[rolle]}, ${jetztRechte.length} Rechte. Rechte dieser Rolle bearbeiten.`,
              [
                `<strong>${h(R.ROLLENNAMEN[rolle])}</strong>`,
                h(konten.map((k) => k.name).join(", ")) || "—",
                h(jetztRechte.length) + " von " + h(ALLE_IDS.length),
                (dazu.length || weg.length)
                  ? R.marke("aktiv", abweichung) : R.marke("ruhig", "unverändert"),
                "Bearbeiten"
              ]
            );
          }).join("")}
        </div>
      </div>`;
  }

  /* ---- Die Konten ---- */
  function kontenFlaeche() {
    return `
      <div class="flaeche">
        <h2>Einzelne Freigaben je Konto</h2>
        <p class="schritt-hinweis">Zusätzlich zur Rolle. So bekäme eine einzelne Person
          ein Recht, ohne dass die ganze Rolle es erhält. Was aus der Rolle kommt, steht
          hier <strong>nicht</strong> — sonst wäre später nicht mehr erkennbar, woher ein
          Recht stammt.</p>
        <div class="aktenliste" role="list">
          <div class="az-kopf" aria-hidden="true">
            <span>Konto</span><span>Kennung</span><span>Rolle</span>
            <span>einzeln vergeben</span><span>Rechte verwalten</span><span></span>
          </div>
          ${R.KONTEN.map((k) => {
            const einzeln = R.kontoRechte[k.kennung] || [];
            const alle = R.rechteVon(k);
            return window.ProbeAkten.aktenzeile(
              `es-konto:${k.kennung}`,
              `${k.name}, ${k.anzeige}, ${einzeln.length} einzeln vergebene Rechte. Freigaben dieses Kontos bearbeiten.`,
              [
                `<strong>${h(k.name)}</strong>`,
                h(k.kennung),
                h(k.anzeige),
                einzeln.length
                  ? R.marke("aktiv", einzeln.length + " einzeln")
                  : R.marke("ruhig", "keine"),
                alle.includes("security.write")
                  ? R.marke("warnung", "ja") : R.marke("ruhig", "nein"),
                "Bearbeiten"
              ]
            );
          }).join("")}
        </div>
        <p class="schritt-hinweis">Mindestens ein Konto muss <strong>Rechte verwalten</strong>
          behalten. Eine Änderung, die das letzte solche Konto treffen würde, wird nicht
          gespeichert — auch nicht über einen direkten Aufruf.</p>
      </div>`;
  }

  /* ---- Was offen ist ---- */
  function offeneFragen() {
    const zusammen = GRUPPEN.flatMap((g) => g.eintraege).filter((e) => e.zusammen);
    return `
      <div class="flaeche">
        <h2>Offene Entscheidungen</h2>
        <ul style="margin:0;padding-left:20px;color:var(--gedaempft);font-size:15px;line-height:1.7">
          <li>Die <strong>spätere Verteilung</strong> für Buchhaltung, Personal und
            Disposition ist nicht festgelegt. Diese Probe zeigt nur, dass sie schaltbar
            ist — sie legt nichts fest.</li>
          ${zusammen.map((e) => `<li>${h(e.name)}: <strong>${h(e.zusammen)}</strong>
            Ob daraus zwei getrennte Rechte werden sollen, ist offen.</li>`).join("")}
          <li>Ob ein <strong>Vieraugenprinzip</strong> für die Rechtevergabe gelten soll
            — also eine zweite Administration bestätigt — ist nicht entschieden.</li>
        </ul>
      </div>`;
  }

  /* ---- Das Protokoll der Rechteänderungen ---- */
  function protokollFlaeche() {
    const eintraege = D.protokoll
      .filter((x) => String(x.was || "").startsWith("Rechte"))
      .slice(0, 20);
    return `
      <div class="flaeche">
        <h2>Protokoll der Rechteänderungen</h2>
        ${eintraege.length ? `<ul class="konfliktliste">
          ${eintraege.map((x) => `<li>
            <strong>${h(x.was)}</strong>
            <span>${h(x.zeit)} · ${h(x.wer)}</span>
            <span>${h(x.betrifft)}</span>
            <span>${h(x.vorher)} → ${h(x.nachher)}</span>
            <span>Grund: ${h(x.grund || "—")}</span>
          </li>`).join("")}
        </ul>` : `<p class="schritt-hinweis">Noch keine Rechteänderung in dieser Sitzung.</p>`}
        <p class="schritt-hinweis">Eine spätere Korrektur kommt als <strong>neuer
          Eintrag</strong> dazu. Ein bestehender Eintrag wird nie überschrieben — sonst
          wäre das Protokoll kein Nachweis. <strong>Keine Zugangsdaten</strong> im
          Protokoll.</p>
      </div>`;
  }

  /* ============================================================
     Das Bearbeitungsfenster
     ============================================================ */
  function rechteDialog() {
    const [art, id] = stand.ziel.split(":");
    const titel = art === "rolle"
      ? "Rechte der Rolle " + (R.ROLLENNAMEN[id] || id)
      : "Einzelne Freigaben für " + ((R.kontoVon(id) || {}).name || id);
    const entwurf = stand.entwurf || [];

    if (stand.stufe === "pruefen") return pruefDialog(art, id, titel, entwurf);

    const vorher = art === "rolle"
      ? (R.rollenRechte[id] || [])
      : (R.kontoRechte[id] || []);
    const dazu = entwurf.filter((x) => !vorher.includes(x));
    const weg = vorher.filter((x) => !entwurf.includes(x));
    const konto = art === "konto" ? R.kontoVon(id) : null;

    return `
      <div class="dialog-hinter" data-dialog-zu></div>
      <div class="dialog-kasten" role="dialog" aria-modal="true" aria-label="${h(titel)}">
        <header class="dialog-kopf">
          <h2>${h(titel)}</h2>
          <button class="knopf klein" type="button" data-dialog-zu aria-label="Schließen">✕ Schließen</button>
        </header>
        <div class="dialog-rumpf">
          ${stand.fehler ? `<div class="feldfehler" role="alert">${h(stand.fehler)}</div>` : ""}
          ${art === "konto" && konto ? `<p class="schritt-hinweis">Aus der Rolle
            <strong>${h(konto.anzeige)}</strong> hat dieses Konto bereits
            ${h((R.rollenRechte[konto.rolle] || []).length)} Rechte. Hier geht es nur um
            <strong>zusätzliche</strong> Freigaben — ein Recht aus der Rolle kann hier
            nicht weggenommen werden.</p>` : ""}

          ${GRUPPEN.map((g) => `<div class="dialog-schritt">
            <h3>${h(g.name)}</h3>
            <div class="rechteliste">
              ${g.eintraege.map((e) => {
                const an = entwurf.includes(e.id);
                const ausRolle = art === "konto" && konto
                  && (R.rollenRechte[konto.rolle] || []).includes(e.id);
                return `<label class="rechtezeile${ausRolle ? " ist-aus-rolle" : ""}">
                  <input type="checkbox" data-es-recht="${h(e.id)}"
                    ${an ? "checked" : ""} ${ausRolle ? "disabled" : ""}>
                  <span>
                    <strong>${h(e.name)}</strong>
                    <span class="feldnotiz">${h(e.id)}${
                      ausRolle ? " · kommt aus der Rolle" : ""}${
                      e.heikel ? " · " + h(e.heikel) : ""}${
                      e.zusammen ? " · " + h(e.zusammen) : ""}</span>
                  </span>
                </label>`;
              }).join("")}
            </div>
          </div>`).join("")}

          ${(dazu.length || weg.length) ? `<div class="dialog-schritt">
            <h3>Geändert gegenüber dem Stand</h3>
            <ul class="konfliktliste">
              ${dazu.map((x) => `<li><strong>kommt dazu</strong>
                <span>${h((eintragVon(x) || {}).name || x)}</span></li>`).join("")}
              ${weg.map((x) => `<li><strong>wird entzogen</strong>
                <span>${h((eintragVon(x) || {}).name || x)}</span></li>`).join("")}
            </ul>
          </div>` : `<p class="schritt-hinweis">Noch nichts geändert.</p>`}
        </div>
        <footer class="dialog-fuss">
          <button class="knopf" type="button" data-dialog-zu>Abbrechen</button>
          <button class="knopf haupt-knopf" type="button" data-tun="es-weiter">Weiter zur Prüfung</button>
        </footer>
      </div>`;
  }

  /* ---- Die letzte Prüfung ---- */
  function pruefDialog(art, id, titel, entwurf) {
    const vorher = art === "rolle" ? (R.rollenRechte[id] || []) : (R.kontoRechte[id] || []);
    const dazu = entwurf.filter((x) => !vorher.includes(x));
    const weg = vorher.filter((x) => !entwurf.includes(x));
    const betroffen = art === "rolle"
      ? R.KONTEN.filter((k) => k.rolle === id)
      : [R.kontoVon(id)].filter(Boolean);
    const faehig = handlungsfaehigNach(art, id, entwurf);
    const sperre = aussperrung(art, id, entwurf);
    const name = (x) => (eintragVon(x) || {}).name || x;

    return `
      <div class="dialog-hinter" data-dialog-zu></div>
      <div class="dialog-kasten" role="dialog" aria-modal="true" aria-label="Letzte Prüfung">
        <header class="dialog-kopf">
          <h2>Letzte Prüfung</h2>
          <button class="knopf klein" type="button" data-dialog-zu aria-label="Schließen">✕ Schließen</button>
        </header>
        <div class="dialog-rumpf">
          ${stand.fehler ? `<div class="feldfehler" role="alert">${h(stand.fehler)}</div>` : ""}
          ${sperre
            ? R.zustandsKasten("fehler", "Diese Änderung wird nicht gespeichert", sperre)
            : R.zustandsKasten("vorbereitet", "Erst „Verbindlich speichern“ ändert etwas",
                "Bis hierher ist nichts geändert. In dieser Designprobe wird keine Supabase-Rolle und kein Grant angefasst.")}

          <dl class="zusammenfassung">
            <div><dt>Betroffen</dt><dd>${h(titel)}</dd></div>
            <div><dt>${art === "rolle" ? "Konten mit dieser Rolle" : "Konto"}</dt>
              <dd>${h(betroffen.map((k) => k.name + " (" + k.kennung + ")").join(", ")) || "—"}</dd></div>
            <div><dt>Vorher</dt><dd>${h(vorher.length)} Rechte</dd></div>
            <div><dt>Nachher</dt><dd>${h(entwurf.length)} Rechte</dd></div>
            <div><dt>Handelndes Konto</dt>
              <dd>${h(meinKonto().name)} · ${h(meinKonto().kennung)} · ${h(meinKonto().rolle)}</dd></div>
          </dl>

          <div class="dialog-schritt">
            <h3>Was sich ändert</h3>
            ${(dazu.length || weg.length) ? `<ul class="konfliktliste">
              ${dazu.map((x) => `<li><strong>kommt dazu</strong><span>${h(name(x))}</span></li>`).join("")}
              ${weg.map((x) => `<li><strong>wird entzogen</strong><span>${h(name(x))}</span></li>`).join("")}
            </ul>` : `<p class="schritt-hinweis">Nichts. Dann gibt es auch nichts zu speichern.</p>`}
          </div>

          <div class="dialog-schritt">
            <h3>Wer danach Rechte verwalten kann</h3>
            ${faehig.length ? `<ul class="konfliktliste">
              ${faehig.map((k) => `<li><strong>${h(k.name)}</strong>
                <span>${h(k.kennung)} · ${h(k.anzeige)}</span></li>`).join("")}
            </ul>` : `<p class="schritt-hinweis">Niemand — deshalb wird nicht gespeichert.</p>`}
          </div>

          <label>Grund der Änderung <span class="band-warnung">Pflichtfeld</span>
            <textarea data-es-grund rows="2"
              placeholder="Zum Beispiel: Buchhaltung braucht die Analyse nicht mehr.">${h(stand.grund)}</textarea></label>
          <p class="schritt-hinweis">Protokolliert werden Name, Kennung, Rolle, Datum,
            Uhrzeit, betroffenes Konto beziehungsweise betroffene Rolle, vorheriger und
            neuer Stand sowie dieser Grund. <strong>Keine Zugangsdaten.</strong></p>
        </div>
        <footer class="dialog-fuss">
          <button class="knopf" type="button" data-tun="es-zurueck">Zurück und ändern</button>
          <button class="knopf" type="button" data-dialog-zu>Abbrechen</button>
          ${sperre ? "" : `<button class="knopf haupt-knopf" type="button" data-tun="es-ja">
            Verbindlich speichern</button>`}
        </footer>
      </div>`;
  }

  /* ============================================================
     Bedienung
     ============================================================ */
  function tun(name, wert) {
    /*
      JEDE Aktion prueft das Recht selbst. Nicht einmal oben im
      Bereich, sondern hier - ein direkter Aufruf von es-ja geht sonst
      an der Pruefung vorbei.
    */
    switch (name) {
      case "es-rolle": {
        if (!darfVerwalten()) return;
        if (!R.rollenRechte[wert]) return;
        stand.ziel = "rolle:" + wert;
        stand.entwurf = (R.rollenRechte[wert] || []).slice();
        stand.stufe = "bearbeiten";
        stand.grund = "";
        stand.fehler = "";
        R.dialogOeffnen(rechteDialog());
        return;
      }
      case "es-konto": {
        if (!darfVerwalten()) return;
        if (!R.kontoVon(wert)) return;
        stand.ziel = "konto:" + wert;
        stand.entwurf = (R.kontoRechte[wert] || []).slice();
        stand.stufe = "bearbeiten";
        stand.grund = "";
        stand.fehler = "";
        R.dialogOeffnen(rechteDialog());
        return;
      }
      case "es-weiter": {
        if (!darfVerwalten() || !stand.ziel) return;
        const [art, id] = stand.ziel.split(":");
        const vorher = art === "rolle" ? (R.rollenRechte[id] || []) : (R.kontoRechte[id] || []);
        const gleich = vorher.length === stand.entwurf.length
          && vorher.every((x) => stand.entwurf.includes(x));
        if (gleich) {
          stand.fehler = "Es ist nichts geändert. Ohne Änderung gibt es nichts zu prüfen.";
          R.dialogOeffnen(rechteDialog());
          return;
        }
        stand.stufe = "pruefen";
        stand.fehler = "";
        R.dialogOeffnen(rechteDialog());
        return;
      }
      case "es-zurueck": {
        if (!darfVerwalten()) return;
        grundLesen();
        stand.stufe = "bearbeiten";
        stand.fehler = "";
        R.dialogOeffnen(rechteDialog());
        return;
      }
      case "es-ja": {
        /* Die Berechtigung steht in der AKTION - nicht nur am Knopf. */
        if (!darfVerwalten() || !stand.ziel || stand.stufe !== "pruefen") return;
        const [art, id] = stand.ziel.split(":");
        grundLesen();
        if (stand.grund.trim().length < 3) {
          stand.fehler = "Bitte einen Grund eintragen. Ohne Grund wird nichts geändert.";
          R.dialogOeffnen(rechteDialog());
          const feld = document.querySelector("[data-es-grund]");
          if (feld) feld.focus();
          return;
        }
        /*
          Die Aussperrsperre noch einmal, unmittelbar vor dem
          Schreiben. Die Pruefung beim Zeichnen allein genuegt nicht:
          Zwischen Anzeige und Klick kann sich etwas geaendert haben,
          und ein direkter Aufruf hat die Anzeige nie gesehen.
        */
        const sperre = aussperrung(art, id, stand.entwurf);
        if (sperre) {
          stand.fehler = sperre;
          R.dialogOeffnen(rechteDialog());
          return;
        }

        const vorher = art === "rolle" ? (R.rollenRechte[id] || []) : (R.kontoRechte[id] || []);
        const dazu = stand.entwurf.filter((x) => !vorher.includes(x));
        const weg = vorher.filter((x) => !stand.entwurf.includes(x));
        const name2 = (x) => (eintragVon(x) || {}).name || x;

        /* Jetzt wird geschrieben. */
        if (art === "rolle") R.rollenRechte[id] = stand.entwurf.slice();
        else R.kontoRechte[id] = stand.entwurf.slice();

        D.protokollieren({
          betrifft: art === "rolle"
            ? "Rolle " + (R.ROLLENNAMEN[id] || id)
            : "Konto " + ((R.kontoVon(id) || {}).name || id) + " (" + id + ")",
          was: "Rechte geändert",
          vorher: vorher.length + " Rechte"
            + (weg.length ? " · entzogen: " + weg.map(name2).join(", ") : ""),
          nachher: stand.entwurf.length + " Rechte"
            + (dazu.length ? " · neu: " + dazu.map(name2).join(", ") : ""),
          grund: stand.grund.trim()
        });

        stand.ziel = "";
        stand.entwurf = null;
        stand.stufe = "";
        stand.grund = "";
        stand.fehler = "";
        R.dialogSchliessen(true);
        R.zeichnen();
        return;
      }
      default:
    }
  }

  const grundLesen = () => {
    const feld = document.querySelector("[data-es-grund]");
    if (feld) stand.grund = feld.value;
  };

  /* Ein Haken im Entwurf. Geaendert wird NUR der Entwurf. */
  function geaendert(feld) {
    if (!feld.matches || !feld.matches("[data-es-recht]")) return false;
    if (!darfVerwalten() || !stand.entwurf) return true;
    const id = feld.dataset.esRecht;
    if (!ALLE_IDS.includes(id)) return true;
    if (feld.checked) {
      if (!stand.entwurf.includes(id)) stand.entwurf.push(id);
    } else {
      stand.entwurf = stand.entwurf.filter((x) => x !== id);
    }
    stand.fehler = "";
    /* Nur das Fenster neu zeichnen - die Flaeche dahinter bleibt. */
    R.dialogOeffnen(rechteDialog());
    return true;
  }

  /* Ist eine Eingabe begonnen? Der Rahmen fragt das vor dem Schliessen. */
  const offeneEingabe = () => {
    const feld = document.querySelector("[data-es-grund]");
    return Boolean(feld && feld.value.trim().length > 0);
  };

  window.ProbeEinstellungen = { zeichne, tun, geaendert, offeneEingabe, stand, GRUPPEN, ALLE_IDS };
})();
