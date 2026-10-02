/*
  Akten der Designprobe: Kunde, Personal, Rechnung, Rewards-Konto.

  Warum es dieses Modul gibt: Der manuelle Rundgang hat in vier
  Bereichen denselben Befund ergeben - die Zeilen leuchten beim
  Darueberfahren, lassen sich aber nicht anklicken. Vier unbewegliche
  Anzeigen.

  Die Regel, die daraus folgt und hier gilt:

    Ein Element hat nur dann Hover- oder Klickoptik, wenn es
    tatsaechlich bedienbar ist. Bedienbar heisst: eine echte
    Schaltflaeche, per Tastatur erreichbar, mit sichtbarem Fokus und
    einer Beschriftung, die ein Vorleseprogramm versteht.

  Deshalb sind die Listenzeilen hier <button>, nicht <tr> mit einem
  Klickhorcher. Tastatur, Fokus und Enter kommen damit von selbst -
  ohne Nachbauten, die nur im Test funktionieren.

  Alle Daten sind Testdaten.
*/
(function () {
  "use strict";

  const R = window.ProbeRahmen;
  const D = window.ProbeDaten;
  const h = (s) => R.h(s);

  const stand = {
    /* Welche Akte soll nach dem Zeichnen aufgehen? */
    oeffne: null,          // { art, id, zusatz }
    kundeNeu: null,        // { stufe, felder, fehler }
    korrektur: null        // { art, id, grund, fehler, feld, wert }
  };

  const meinKonto = () => R.benutzer();
  const meinName = () => R.benutzerText();
  const kontoText = (k) => (k ? k.name + " – " + k.rolle : "");
  const jetzt = () => new Date().toLocaleTimeString("de-DE",
    { hour: "2-digit", minute: "2-digit" }) + " Uhr";
  const zeitstempel = () => D.alsText(D.heute) + " · " + jetzt();

  /* Eine Anschrift aus Teilen, die fehlen duerfen. Ohne Strasse soll
     sie nicht mit einem Komma anfangen. */
  function anschriftText(q) {
    const zeileEins = [q.strasse, q.hausnummer].filter(Boolean).join(" ").trim();
    const zeileZwei = [q.plz, q.ort].filter(Boolean).join(" ").trim();
    return [zeileEins, zeileZwei].filter(Boolean).join(", ");
  }

  /* ============================================================
     Gemeinsame Bausteine
     ============================================================ */
  /*
    Eine Zeile, die wirklich bedienbar ist. Der sichtbare Text steht in
    den Spalten; aria-label fasst zusammen, was ein Vorleseprogramm
    braucht.
  */
  function aktenzeile(aktion, label, spalten) {
    return `<button class="aktenzeile" type="button" data-tun="${h(aktion)}"
      aria-label="${h(label)}">
      ${spalten.map((s) => `<span class="az-feld">${s}</span>`).join("")}
    </button>`;
  }

  const dialogKopf = (titel, nebentext) => `
    <div class="dialog-hinter" data-dialog-zu></div>
    <div class="dialog-kasten" role="dialog" aria-modal="true" aria-labelledby="akTitel">
      <header class="dialog-kopf">
        <h2 id="akTitel">${h(titel)}</h2>
        ${nebentext ? `<span class="band-gold">${h(nebentext)}</span>` : ""}
        <button class="knopf klein" type="button" data-dialog-zu aria-label="Schließen">✕ Schließen</button>
      </header>`;

  const zeileDl = (paare) => `<dl class="zusammenfassung">
    ${paare.filter(([, w]) => w !== null && w !== undefined)
      .map(([n, w]) => `<div><dt>${h(n)}</dt><dd>${w}</dd></div>`).join("")}
  </dl>`;

  /* Ein Protokolleintrag am Datensatz - unveraenderlich. */
  function verlaufEintragen(ziel, eintrag) {
    if (!ziel.verlauf) ziel.verlauf = [];
    ziel.verlauf.unshift(Object.freeze({
      zeit: zeitstempel(),
      wer: meinName(),
      kennung: meinKonto().kennung,
      rolle: meinKonto().rolle,
      ...eintrag
    }));
  }

  const verlaufBlock = (titel, liste) => `
    <div class="dialog-schritt">
      <h3>${h(titel)}</h3>
      ${(liste && liste.length) ? `<ul class="konfliktliste">
        ${liste.map((e) => `<li>
          <strong>${h(e.was)}</strong>
          <span>${h(e.zeit)} · ${h(e.wer)}</span>
          ${e.vorher || e.nachher ? `<span>${h(e.vorher || "—")} → ${h(e.nachher || "—")}</span>` : ""}
          ${e.grund ? `<span>Grund: ${h(e.grund)}</span>` : ""}
        </li>`).join("")}
      </ul>` : `<p class="schritt-hinweis">Noch keine Änderung festgehalten.</p>`}
    </div>`;

  /* ============================================================
     1. Kundenakte
     ============================================================ */
  function kundenakte(id) {
    const k = D.kundeVon(id);
    if (!k) return "";
    const offene = D.fahrtenVonKunde(k).filter((f) => f.zustand !== "abgeschlossen");
    const erledigte = D.fahrtenVonKunde(k).filter((f) => f.zustand === "abgeschlossen");
    const ziele = D.haeufigeZiele(k);
    const rech = R.darf("finance.read") ? D.rechnungenVonKunde(k) : null;
    const rw = R.darf("rewards.read") ? D.rewardsVonKunde(k) : null;
    const anschrift = anschriftText(k);

    return dialogKopf(k.name, k.art === "firma" ? "Firmenkunde" : "Privatkunde") + `
      <div class="dialog-rumpf">
        ${zeileDl([
          ["Kundennummer", h(k.kundennummer)],
          ["Kennung", h(k.id)],
          [k.art === "firma" ? "Firma" : "Name", h(k.firma || k.name)],
          ["Telefon", h(k.telefon)],
          ["E-Mail", k.email ? h(k.email) : "<em>nicht hinterlegt</em>"],
          ["Anschrift", h(anschrift)],
          ["Kundenkonto", k.konto === "verknüpft"
            ? R.marke("gut", "verknüpft") : R.marke("ruhig", "nicht verknüpft")],
          ["Fahrten insgesamt", h(k.fahrten)]
        ])}

        ${k.hinweis ? `<div class="dialog-schritt">
          <h3>Betrieblicher Hinweis</h3>
          <p class="schritt-hinweis">${h(k.hinweis)}</p>
          <p class="schritt-hinweis">Hier stehen ausschließlich betriebliche Angaben —
            keine Diagnose und kein medizinischer Freitext.</p>
        </div>` : ""}

        <div class="dialog-schritt">
          <h3>Offene Fahrten <span class="band-gold">${offene.length}</span></h3>
          ${offene.length ? `<ul class="konfliktliste">
            ${D.nachZeit(offene).map((f) => `<li>
              <strong>${h(f.id)} · ${f.zeit ? h(f.zeit) : "Zeit offen"}</strong>
              <span>${h(f.von)} → ${h(f.nach)}</span>
            </li>`).join("")}
          </ul>` : `<p class="schritt-hinweis">Keine offene Fahrt.</p>`}
        </div>

        <div class="dialog-schritt">
          <h3>Vergangene Fahrten</h3>
          ${(erledigte.length || k.letzteFahrten.length) ? `<ul class="konfliktliste">
            ${erledigte.map((f) => `<li>
              <strong>${h(f.id)} · heute ${h(f.zeit)}</strong>
              <span>${h(f.von)} → ${h(f.nach)}</span></li>`).join("")}
            ${k.letzteFahrten.map((f) => `<li>
              <strong>${h(f.datum)}</strong>
              <span>${h(f.von)} → ${h(f.nach)}</span></li>`).join("")}
          </ul>` : `<p class="schritt-hinweis">Keine vergangene Fahrt hinterlegt.</p>`}
        </div>

        ${ziele.length ? `<div class="dialog-schritt">
          <h3>Häufige Ziele</h3>
          <ul class="konfliktliste">
            ${ziele.map((z) => `<li><strong>${h(z.ziel)}</strong>
              <span>${h(z.anzahl)}× in den letzten Fahrten</span></li>`).join("")}
          </ul>
          <p class="schritt-hinweis">Gezählt aus den hinterlegten Fahrten — nicht geschätzt.</p>
        </div>` : ""}

        ${rech ? `<div class="dialog-schritt">
          <h3>Rechnungen <span class="band-gold">${rech.length}</span></h3>
          ${rech.length ? `<ul class="konfliktliste">
            ${rech.map((r) => `<li>
              <strong>${h(r.nr)}</strong>
              <span>${h(r.zeitraum)} · ${h(r.betrag)} · ${h(r.zustand)}</span></li>`).join("")}
          </ul>
          <p class="schritt-hinweis">Verknüpft über die Kundenkennung, soweit sie am Beleg
            steht — sonst über den Namen. Der Name ist die schwächere Verknüpfung.</p>`
          : `<p class="schritt-hinweis">Keine Rechnung zu diesem Kunden.</p>`}
        </div>` : ""}

        ${rw ? `<div class="dialog-schritt">
          <h3>Rewards-Konto</h3>
          ${zeileDl([
            ["Punkte", h(rw.punkte)],
            ["Stufe", h(rw.stufe)],
            ["Offene Drehs", h(rw.drehs)]
          ])}
          <div class="knopfzeile">
            <button class="knopf klein" type="button"
              data-tun="ak-rewards:${h(k.id)}">Rewards-Konto öffnen</button>
          </div>
        </div>` : ""}

        ${verlaufBlock("Änderungsverlauf", k.verlauf)}

        <p class="schritt-hinweis">Diese Akte zeigt nur, was in der Designprobe hinterlegt
          ist. Zahlungsdaten, Verträge und Schriftverkehr sind nicht vorhanden — es wird
          nichts erfunden.</p>
      </div>
      <footer class="dialog-fuss">
        <button class="knopf" type="button" data-dialog-zu>Schließen</button>
        ${R.darf("operations.write") ? `<button class="knopf haupt-knopf" type="button"
          data-tun="ak-kunde-fahrt:${h(k.id)}">Neue Fahrt für diesen Kunden</button>` : ""}
      </footer>
    </div>`;
  }

  /* ============================================================
     2. Kundenneuanlage - zweistufig
     ============================================================ */
  const PFLICHT = [
    ["name", "Name oder Firma"],
    ["telefon", "Telefonnummer"]
  ];

  function kundeNeuDialog() {
    const s = stand.kundeNeu;
    const f = s.felder;

    if (s.stufe === "pruefen") {
      return dialogKopf("Neuen Kunden anlegen", "Letzte Prüfung") + `
        <div class="dialog-rumpf">
          ${s.fehler ? `<div class="feldfehler" role="alert">${h(s.fehler)}</div>` : ""}
          ${R.zustandsKasten("vorbereitet", "Bitte prüfen",
            "Erst „Verbindlich anlegen“ erzeugt den Kunden. In dieser Designprobe wird nichts gespeichert und nichts versendet.")}
          ${zeileDl([
            ["Art", f.art === "firma" ? "Firmenkunde" : "Privatkunde"],
            [f.art === "firma" ? "Firma" : "Name", h(f.name)],
            ["Telefon", h(f.telefon)],
            ["E-Mail", f.email ? h(f.email) : "<em>nicht angegeben</em>"],
            ["Anschrift", h(anschriftText(f)) || "<em>nicht angegeben</em>"],
            ["Hinweis", f.hinweis ? h(f.hinweis) : "<em>keiner</em>"],
            ["Angelegt von", h(meinName())]
          ])}
          <p class="schritt-hinweis">Keine Diagnose und keine medizinische Angabe im
            Hinweisfeld — dort stehen betriebliche Dinge wie „Rollstuhlfahrzeug
            erforderlich“.</p>
        </div>
        <footer class="dialog-fuss">
          <button class="knopf" type="button" data-tun="ak-kunde-zurueck">Zurück und ändern</button>
          <button class="knopf" type="button" data-dialog-zu>Abbrechen</button>
          <button class="knopf haupt-knopf" type="button" data-tun="ak-kunde-ja">Verbindlich anlegen</button>
        </footer>
      </div>`;
    }

    return dialogKopf("Neuen Kunden anlegen", "Schritt 1 von 2") + `
      <div class="dialog-rumpf">
        ${s.fehler ? `<div class="feldfehler" role="alert">${h(s.fehler)}</div>` : ""}
        <div class="dialog-schritt">
          <h3>Art</h3>
          <div class="wahlraster">
            <button class="wahlkarte" type="button" data-tun="ak-kunde-art:privat"
              aria-pressed="${f.art === "privat"}"><strong>Privatkunde</strong></button>
            <button class="wahlkarte" type="button" data-tun="ak-kunde-art:firma"
              aria-pressed="${f.art === "firma"}"><strong>Firmenkunde</strong></button>
          </div>
        </div>
        <div class="dialog-schritt">
          <h3>Pflichtangaben</h3>
          <label>${f.art === "firma" ? "Firma" : "Name"} <span class="band-warnung">Pflichtfeld</span>
            <input type="text" data-kn="name" value="${h(f.name)}"
              placeholder="${f.art === "firma" ? "Testfirma 05 GmbH" : "Testkunde 07"}"></label>
          <label>Telefonnummer <span class="band-warnung">Pflichtfeld</span>
            <input type="text" data-kn="telefon" value="${h(f.telefon)}"
              placeholder="Testnummer 0007"></label>
        </div>
        <div class="dialog-schritt">
          <h3>Weitere Angaben</h3>
          <label>E-Mail <input type="text" data-kn="email" value="${h(f.email)}"
            placeholder="optional"></label>
          <div class="feldpaar">
            <label>Straße <input type="text" data-kn="strasse" value="${h(f.strasse)}"></label>
            <label>Hausnummer <input type="text" data-kn="hausnummer" value="${h(f.hausnummer)}"></label>
          </div>
          <div class="feldpaar">
            <label>PLZ <input type="text" data-kn="plz" value="${h(f.plz)}"></label>
            <label>Ort <input type="text" data-kn="ort" value="${h(f.ort)}"></label>
          </div>
          <label>Betrieblicher Hinweis
            <input type="text" data-kn="hinweis" value="${h(f.hinweis)}"
              placeholder="zum Beispiel: Rollstuhlfahrzeug erforderlich"></label>
        </div>
      </div>
      <footer class="dialog-fuss">
        <button class="knopf" type="button" data-dialog-zu>Abbrechen</button>
        <button class="knopf haupt-knopf" type="button" data-tun="ak-kunde-weiter">Weiter</button>
      </footer>
    </div>`;
  }

  /* ============================================================
     3. Personalakte
     ============================================================ */
  function personalakte(id) {
    const pz = D.personalVon(id);
    if (!pz) return "";
    const darfLohn = R.darf("payroll.read");
    const darfKrank = R.darf("personnel.read");
    const lohnzeilen = darfLohn ? D.lohn.filter((l) => l.mitarbeiterId === id) : [];
    const krankVorgaenge = darfKrank
      ? D.vorgaenge.filter((v) => v.thema === "krankheit" && v.betrifft && v.betrifft.id === id)
      : [];
    const urlaubRest = (pz.urlaubAnspruch !== undefined && pz.urlaubGenommen !== undefined)
      ? pz.urlaubAnspruch - pz.urlaubGenommen : null;

    return dialogKopf(pz.name, "Personalakte") + `
      <div class="dialog-rumpf">
        ${zeileDl([
          ["Kennung", h(pz.id)],
          ["Name", h(pz.name)],
          ["Status", pz.status === "aktiv" ? R.marke("gut", "aktiv")
            : pz.status === "krank" ? R.marke("warnung", "krank") : R.marke("ruhig", pz.status)],
          ["Beschäftigung", h(pz.beschaeftigung)],
          ["Eintritt", h(pz.eintritt)],
          ["Vertrag", h(pz.vertrag) || "<em>nicht hinterlegt</em>"],
          ["Arbeitszeitmodell", h(pz.modell) || "<em>nicht hinterlegt</em>"],
          ["Mitarbeiterkonto", pz.konto === "verknüpft"
            ? R.marke("gut", "verknüpft") : R.marke("ruhig", "nicht verknüpft")]
        ])}

        <div class="dialog-schritt">
          <h3>Urlaub</h3>
          ${urlaubRest === null
            ? `<p class="schritt-hinweis">Kein Anspruch hinterlegt.</p>`
            : zeileDl([
                ["Anspruch", h(pz.urlaubAnspruch) + " Tage"],
                ["Genommen", h(pz.urlaubGenommen) + " Tage"],
                ["Rest", h(urlaubRest) + " Tage"]
              ])}
          ${pz.abwesenheiten.filter((a) => a.art === "urlaub").length ? `<ul class="konfliktliste">
            ${pz.abwesenheiten.filter((a) => a.art === "urlaub").map((a) => `<li>
              <strong>${h(D.zeitraumText({ von: a.von, bis: a.bis }))}</strong>
              <span>${h(a.status)}</span></li>`).join("")}
          </ul>` : ""}
          <p class="schritt-hinweis">Anspruch und Modell sind Testwerte der Designprobe.
            Welche Arbeitszeitmodelle der Betrieb führt und wie viel Urlaub wem zusteht,
            ist <strong>nicht festgelegt</strong>.</p>
        </div>

        ${darfKrank ? `<div class="dialog-schritt geschuetzt">
          <h3>Krankheitsvorgänge <span class="band-gold">nur Personal und Administration</span></h3>
          ${krankVorgaenge.length ? `<ul class="konfliktliste">
            ${krankVorgaenge.map((v) => `<li>
              <strong>${h(v.id)} · ${h(v.titel)}</strong>
              <span>Gemeldet ${h(D.zeitraumText({ von: v.daten.von, bis: v.daten.bis }))}</span>
            </li>`).join("")}
          </ul>` : `<p class="schritt-hinweis">Kein Krankheitsvorgang.</p>`}
          <p class="schritt-hinweis">Hier stehen Zeitraum und Vorgangsnummer. <strong>Keine
            Diagnose, keine Bescheinigung und kein medizinischer Freitext</strong> — die
            Dokumentprüfung läuft im Vorgang selbst, mit ihren eigenen Sperren.</p>
        </div>` : ""}

        <div class="dialog-schritt">
          <h3>Dokumente und Fristen</h3>
          ${pz.dokumente.length ? `<ul class="konfliktliste">
            ${pz.dokumente.map((d) => `<li>
              <strong>${h(d.art)}</strong>
              <span>gültig bis ${h(D.alsText(new Date(d.bis + "T00:00:00")))}</span></li>`).join("")}
          </ul>` : `<p class="schritt-hinweis">Kein Dokument hinterlegt.</p>`}
          ${pz.dokumentstand.lage !== "gueltig"
            ? `<p class="schritt-hinweis">${R.marke("warnung", D.DOKUMENT_LAGE[pz.dokumentstand.lage])}
                ${h(pz.dokumentstand.text || "")}</p>` : ""}
        </div>

        ${darfLohn ? `<div class="dialog-schritt geschuetzt">
          <h3>Lohnabrechnungen <span class="band-gold">nur mit payroll.read</span></h3>
          ${lohnzeilen.length ? `<ul class="konfliktliste">
            ${lohnzeilen.map((l) => `<li>
              <strong>${h(l.monat)}/${h(l.jahr)}</strong>
              <span>bereitgestellt ${h(l.bereitgestellt)} · ${l.version > 1 ? "Korrektur v" + h(l.version) : "v1"}</span>
            </li>`).join("")}
          </ul>` : `<p class="schritt-hinweis">Keine Abrechnung bereitgestellt.</p>`}
          <p class="schritt-hinweis">Die Dateien selbst liegen im privaten Bucket und werden
            nur über eine kurz gültige, signierte Adresse geöffnet — im Lohnbereich.</p>
        </div>`
        : `<div class="dialog-schritt">
          <p class="schritt-hinweis">Lohnabrechnungen gehören nicht zu Ihrer Rolle. Sie werden
            nicht angezeigt und nicht ausgeliefert.</p>
        </div>`}

        ${verlaufBlock("Änderungsverlauf", pz.verlauf)}

        <p class="schritt-hinweis">Diese Akte zeigt dieselben Stammdaten wie „Fahrer &amp;
          Fahrzeuge“ — sie liegen nur an einer Stelle. Gehalt, Steuerdaten und
          Personalaktendokumente sind in der Designprobe nicht hinterlegt.</p>
      </div>
      <footer class="dialog-fuss">
        <button class="knopf" type="button" data-dialog-zu>Schließen</button>
        ${R.darf("fleet.read") ? `<button class="knopf" type="button"
          data-tun="ak-person-fahrer:${h(pz.id)}">Zur Fahrerkarte</button>` : ""}
      </footer>
    </div>`;
  }

  /* ============================================================
     4. Rechnungsakte
     ============================================================ */
  function rechnungsakte(nr) {
    const r = D.rechnungen.find((x) => x.nr === nr);
    if (!r) return "";
    const darfBuchen = R.darf("finance.write");
    const fahrten = (r.fahrten || []);
    const posten = (r.posten || []);
    const zahlungen = (r.zahlungen || []);

    return dialogKopf(r.nr, "Rechnung") + `
      <div class="dialog-rumpf">
        ${zeileDl([
          ["Rechnungsnummer", h(r.nr)],
          ["Kunde", h(r.kunde)],
          ["Zeitraum", h(r.zeitraum)],
          ["Betrag", h(r.betrag)],
          ["Fällig", h(r.faellig)],
          ["Zahlungszustand", r.zustand === "bezahlt" ? R.marke("gut", "bezahlt")
            : r.zustand === "überfällig" ? R.marke("warnung", "überfällig")
            : r.zustand === "Entwurf" ? R.marke("ruhig", "Entwurf") : R.marke("aktiv", "offen")],
          ["Version", h(r.version || 1)]
        ])}

        <div class="dialog-schritt">
          <h3>Zugehörige Fahrten</h3>
          ${fahrten.length ? `<ul class="konfliktliste">
            ${fahrten.map((f) => `<li><strong>${h(f)}</strong></li>`).join("")}
          </ul>` : `<p class="schritt-hinweis">Keine Fahrt zugeordnet.</p>`}
        </div>

        <div class="dialog-schritt">
          <h3>Positionen</h3>
          ${posten.length ? `<ul class="konfliktliste">
            ${posten.map((x) => `<li><strong>${h(x.was)}</strong>
              <span>${h(x.menge)} × ${h(x.einzel)} = ${h(x.summe)}</span></li>`).join("")}
          </ul>` : `<p class="schritt-hinweis">Keine Positionen hinterlegt.</p>`}
        </div>

        <div class="dialog-schritt">
          <h3>Zahlungen</h3>
          ${zahlungen.length ? `<ul class="konfliktliste">
            ${zahlungen.map((z) => `<li><strong>${h(z.betrag)}</strong>
              <span>${h(z.datum)} · ${h(z.art)}${z.wer ? " · " + h(z.wer) : ""}</span></li>`).join("")}
          </ul>` : `<p class="schritt-hinweis">Keine Zahlung erfasst.</p>`}
        </div>

        <div class="dialog-schritt">
          <h3>Rechnung als PDF</h3>
          ${R.zustandsKasten("vorbereitet", "In dieser Designprobe gibt es keine PDF",
            "Es ist keine Datei hinterlegt und keine Storage-API verfügbar. Im Portal würde sie über eine kurz gültige, signierte Adresse geöffnet — wie im Lohnbereich. Kein Herunterladen auf Vorrat, kein Anhang per E-Mail.")}
        </div>

        ${verlaufBlock("Änderungsverlauf", r.verlauf)}
      </div>
      <footer class="dialog-fuss">
        <button class="knopf" type="button" data-dialog-zu>Schließen</button>
        ${darfBuchen ? `
          <button class="knopf" type="button" data-tun="ak-zahlung:${h(r.nr)}">Zahlung erfassen</button>
          <button class="knopf" type="button" data-tun="ak-mahnung:${h(r.nr)}">Mahnung vorbereiten</button>
          <button class="knopf haupt-knopf" type="button" data-tun="ak-rech-korrektur:${h(r.nr)}">
            Korrektur als neue Version</button>`
          : `<span class="fz-hinweis">Buchen und korrigieren darf nur, wer finance.write hat.</span>`}
      </footer>
    </div>`;
  }

  /* ============================================================
     5. Rewards-Konto
     ============================================================ */
  function rewardskontoVon(kundeName) {
    const konto = D.rewards.konten.find((x) => x.kunde === kundeName);
    if (!konto) return "";
    const stufe = D.REWARDS_STUFEN.find((s) => s.name === konto.stufe);
    const vip = D.REWARDS_STUFEN.find((s) => s.name === "VIP");
    const naechste = D.REWARDS_STUFEN[D.REWARDS_STUFEN.findIndex((s) => s.name === konto.stufe) + 1];
    const darfKorrigieren = R.darf("rewards.write") && R.darf("security.read");

    return dialogKopf(konto.kunde, "Rewards-Konto") + `
      <div class="dialog-rumpf">
        ${zeileDl([
          ["Punktestand", h(konto.punkte)],
          ["Stufe", R.marke(stufe ? stufe.marke : "ruhig", konto.stufe)],
          ["Qualifizierende Fahrten", h(konto.qualifizierteFahrten) + " von "
            + h(100) + " bis VIP"],
          ["Offene Drehs", h(konto.drehs)],
          ["Geburtstagsbonus", konto.geburtstagGutgeschrieben
            ? "gutgeschrieben für " + h(konto.geburtstagGutgeschrieben)
            : "<em>noch nicht gutgeschrieben</em>"]
        ])}

        <div class="dialog-schritt">
          <h3>Fortschritt</h3>
          <p class="schritt-hinweis">Aktuelle Stufe: <strong>${h(konto.stufe)}</strong>
            (${h(stufe ? stufe.schwelle : "—")}).</p>
          ${naechste ? `<p class="schritt-hinweis">Nächste Stufe:
            <strong>${h(naechste.name)}</strong> — ${h(naechste.schwelle)}.
            ${naechste.festgelegt ? "" : "Diese Schwelle ist eine offene Geschäftsentscheidung und wird hier nicht erfunden."}</p>`
            : `<p class="schritt-hinweis">Höchste Stufe erreicht.</p>`}
          <p class="schritt-hinweis">VIP-Ziel: ${h(vip ? vip.schwelle : "—")}.</p>
        </div>

        <div class="dialog-schritt">
          <h3>Gutscheine</h3>
          ${(konto.gutscheine || []).length ? `<ul class="konfliktliste">
            ${konto.gutscheine.map((g) => `<li class="${g.zustand === "eingelöst" ? "ist-ausnahme" : ""}">
              <strong>${h(g.was)}</strong>
              <span>gültig bis ${h(g.bis)} · ${h(g.zustand)}</span></li>`).join("")}
          </ul>` : `<p class="schritt-hinweis">Kein Gutschein.</p>`}
        </div>

        <div class="dialog-schritt">
          <h3>Punkteverlauf <span class="band-gold">${(konto.verlauf || []).length}</span></h3>
          ${(konto.verlauf || []).length ? `<ul class="konfliktliste">
            ${konto.verlauf.map((e) => `<li>
              <strong>${h(e.was)}${e.punkte ? " · " + (e.punkte > 0 ? "+" : "") + h(e.punkte) : ""}</strong>
              <span>${h(e.zeit)}</span>
              <span>Begründung: ${h(e.grund)}</span>
              ${e.wer ? `<span>${h(e.wer)}</span>` : ""}</li>`).join("")}
          </ul>` : `<p class="schritt-hinweis">Kein Eintrag.</p>`}
          <p class="schritt-hinweis">Jede Gutschrift und jede Belastung trägt ihre Begründung.
            Ausgeschlossen sind ${h(D.REWARDS_AUSSCHLUSS.join(", "))}.</p>
        </div>
      </div>
      <footer class="dialog-fuss">
        <button class="knopf" type="button" data-dialog-zu>Schließen</button>
        ${darfKorrigieren
          ? `<button class="knopf haupt-knopf" type="button"
              data-tun="ak-rw-korrektur:${h(konto.kunde)}">Punkte korrigieren</button>`
          : `<span class="fz-hinweis">Eine manuelle Korrektur darf nur die Administration.</span>`}
      </footer>
    </div>`;
  }

  /* ============================================================
     6. Zahlung, Mahnung, Korrekturen - je mit letzter Pruefung
     ============================================================
     Gemeinsame Regeln:

       - Nichts wird still ueberschrieben. Eine fachliche Korrektur
         ist eine neue Version, die auf die alte verweist.
       - Eine fachliche Korrektur verlangt einen Grund.
       - Vor dem Speichern eine Zusammenfassung mit vorher und
         nachher.
       - Protokolliert werden wer, wann, vorher, nachher, Grund und
         der betroffene Beleg.
       - Die Berechtigung steht in der AKTION, nicht nur am Knopf.
  */
  function buchungsDialog() {
    const s = stand.korrektur;
    const r = s.art !== "rewards"
      ? D.rechnungen.find((x) => x.nr === s.id)
      : null;
    const konto = s.art === "rewards"
      ? D.rewards.konten.find((x) => x.kunde === s.id)
      : null;

    const TITEL = {
      zahlung: "Zahlung erfassen",
      mahnung: "Mahnung vorbereiten",
      rechnung: "Rechnung korrigieren",
      rewards: "Punkte korrigieren"
    };
    const brauchtGrund = s.art === "rechnung" || s.art === "rewards";

    const felder = s.art === "zahlung" ? `
      <label>Betrag <span class="band-warnung">Pflichtfeld</span>
        <input type="text" data-bk="wert" value="${h(s.wert)}" placeholder="184,00 €"></label>
      <label>Art der Zahlung
        <select data-bk="art2">
          <option value="Überweisung" ${s.art2 === "Überweisung" ? "selected" : ""}>Überweisung</option>
          <option value="bar" ${s.art2 === "bar" ? "selected" : ""}>bar</option>
          <option value="Karte" ${s.art2 === "Karte" ? "selected" : ""}>Karte</option>
        </select></label>`
      : s.art === "rewards" ? `
      <label>Punkte (mit Vorzeichen) <span class="band-warnung">Pflichtfeld</span>
        <input type="text" data-bk="wert" value="${h(s.wert)}" placeholder="-50 oder 120"></label>`
      : "";

    if (s.stufe === "pruefen") {
      return dialogKopf(TITEL[s.art], "Letzte Prüfung") + `
        <div class="dialog-rumpf">
          ${s.fehler ? `<div class="feldfehler" role="alert">${h(s.fehler)}</div>` : ""}
          ${R.zustandsKasten("vorbereitet", "Nichts wird überschrieben",
            s.art === "rechnung"
              ? "Die bisherige Rechnung bleibt unverändert. Es entsteht eine neue Version, die auf sie verweist."
              : s.art === "rewards"
                ? "Der bisherige Punktestand bleibt im Verlauf stehen. Die Korrektur kommt als eigener Eintrag dazu."
                : "Die Buchung kommt als eigener Eintrag dazu; bestehende Zahlungen bleiben unberührt.")}
          ${zeileDl([
            [s.art === "rewards" ? "Konto" : "Rechnung", h(s.id)],
            ["Vorher", h(s.vorher)],
            ["Nachher", h(s.nachher)],
            ["Handelndes Konto", h(meinKonto().name) + " · " + h(meinKonto().kennung)],
            ["Rolle", h(meinKonto().rolle)]
          ])}
          ${brauchtGrund ? `<label>Grund der Korrektur <span class="band-warnung">Pflichtfeld</span>
            <textarea data-bk-grund rows="2"
              placeholder="Zum Beispiel: Position doppelt berechnet.">${h(s.grund)}</textarea></label>`
            : `<label>Bemerkung
              <textarea data-bk-grund rows="2" placeholder="optional">${h(s.grund)}</textarea></label>`}
          <p class="schritt-hinweis">In dieser Designprobe wird nichts versendet und nichts
            gebucht. Festgehalten wird, was protokolliert würde.</p>
        </div>
        <footer class="dialog-fuss">
          <button class="knopf" type="button" data-tun="ak-bk-zurueck">Zurück und ändern</button>
          <button class="knopf" type="button" data-dialog-zu>Abbrechen</button>
          <button class="knopf haupt-knopf" type="button" data-tun="ak-bk-ja">Verbindlich speichern</button>
        </footer>
      </div>`;
    }

    return dialogKopf(TITEL[s.art], "Schritt 1 von 2") + `
      <div class="dialog-rumpf">
        ${s.fehler ? `<div class="feldfehler" role="alert">${h(s.fehler)}</div>` : ""}
        ${zeileDl([
          [s.art === "rewards" ? "Konto" : "Rechnung", h(s.id)],
          [s.art === "rewards" ? "Punktestand" : "Betrag",
            h(konto ? konto.punkte : (r ? r.betrag : "—"))],
          [s.art === "rewards" ? "Stufe" : "Zustand",
            h(konto ? konto.stufe : (r ? r.zustand : "—"))]
        ])}
        ${felder}
        ${s.art === "mahnung" ? `<p class="schritt-hinweis">Welche Mahnstufen und
          Fristen gelten, ist <strong>nicht festgelegt</strong>. Die Probe bereitet nur den
          Vermerk vor und erfindet keine Stufe und keine Gebühr.</p>` : ""}
        ${s.art === "rechnung" ? `<p class="schritt-hinweis">Eine Korrektur erzeugt die
          nächste Version. Steuersätze und Zahlungsziele sind in der Probe nicht
          hinterlegt.</p>` : ""}
      </div>
      <footer class="dialog-fuss">
        <button class="knopf" type="button" data-dialog-zu>Abbrechen</button>
        <button class="knopf haupt-knopf" type="button" data-tun="ak-bk-weiter">Weiter</button>
      </footer>
    </div>`;
  }

  /* ============================================================
     Bedienung
     ============================================================ */
  function tun(name, wert) {
    switch (name) {
      /* ---- Kundenakte ---- */
      case "ak-kunde": {
        if (!R.darf("customers.read")) return;
        const k = D.kundeVon(wert);
        if (!k) return;
        R.dialogOeffnen(kundenakte(k.id));
        return;
      }

      /* ---- Neuanlage ---- */
      case "ak-kunde-neu":
        if (!R.darf("customers.write")) return;
        stand.kundeNeu = {
          stufe: "eingabe", fehler: "",
          felder: {
            art: "privat", name: "", telefon: "", email: "",
            strasse: "", hausnummer: "", plz: "", ort: "", hinweis: ""
          }
        };
        R.dialogOeffnen(kundeNeuDialog());
        return;
      case "ak-kunde-art":
        if (!stand.kundeNeu) return;
        stand.kundeNeu.felder.art = wert;
        stand.kundeNeu.fehler = "";
        R.dialogOeffnen(kundeNeuDialog());
        return;
      case "ak-kunde-weiter": {
        const s = stand.kundeNeu;
        if (!s) return;
        const fehlend = PFLICHT.filter(([feld]) => !String(s.felder[feld] || "").trim());
        if (fehlend.length) {
          s.fehler = "Bitte ausfüllen: " + fehlend.map(([, n]) => n).join(", ") + ".";
          R.dialogOeffnen(kundeNeuDialog());
          return;
        }
        s.stufe = "pruefen";
        s.fehler = "";
        R.dialogOeffnen(kundeNeuDialog());
        return;
      }
      case "ak-kunde-zurueck":
        if (!stand.kundeNeu) return;
        stand.kundeNeu.stufe = "eingabe";
        stand.kundeNeu.fehler = "";
        R.dialogOeffnen(kundeNeuDialog());
        return;
      case "ak-kunde-ja": {
        const s = stand.kundeNeu;
        if (!s || !R.darf("customers.write")) return;
        if (s.stufe !== "pruefen") return;
        const neu = D.kundeAnlegen({ ...s.felder, quelle: "Kundenbereich" });
        verlaufEintragen(neu, {
          was: "Kunde angelegt", vorher: "—", nachher: neu.name, grund: ""
        });
        D.protokollieren({
          betrifft: neu.name + " (" + neu.kundennummer + ")",
          was: "Kunde angelegt",
          vorher: "nicht im Bestand",
          nachher: "angelegt über den Kundenbereich", grund: ""
        });
        stand.kundeNeu = null;
        /* Direkt in die neue Akte. */
        R.dialogOeffnen(kundenakte(neu.id));
        R.zeichnen();
        return;
      }

      /* ---- Aus der Kundenakte eine Fahrt aufnehmen ---- */
      case "ak-kunde-fahrt": {
        const k = D.kundeVon(wert);
        if (!k || !R.darf("operations.write")) return;
        R.dialogSchliessen(true);
        window.ProbeFahrtassistent.starten(k);
        return;
      }

      /* ---- Rewards aus der Kundenakte ---- */
      case "ak-rewards": {
        const k = D.kundeVon(wert);
        if (!k || !R.darf("rewards.read")) return;
        R.dialogOeffnen(rewardskontoVon(k.name));
        return;
      }

      /* ---- Personalakte ---- */
      case "ak-person": {
        if (!R.darf("personnel.read")) return;
        const pz = D.personalVon(wert);
        if (!pz) return;
        R.dialogOeffnen(personalakte(pz.id));
        return;
      }
      case "ak-person-fahrer": {
        if (!R.darf("fleet.read")) return;
        R.dialogSchliessen(true);
        R.geheZu("team");
        return;
      }

      /* ---- Rechnungsakte ---- */
      case "ak-rechnung": {
        if (!R.darf("finance.read")) return;
        const r = D.rechnungen.find((x) => x.nr === wert);
        if (!r) return;
        R.dialogOeffnen(rechnungsakte(r.nr));
        return;
      }

      /* ---- Rewards-Konto ---- */
      case "ak-rewards-konto": {
        if (!R.darf("rewards.read")) return;
        R.dialogOeffnen(rewardskontoVon(wert));
        return;
      }

      /* ---- Buchen und korrigieren ---- */
      case "ak-zahlung":
      case "ak-mahnung":
      case "ak-rech-korrektur": {
        if (!R.darf("finance.write")) return;
        const r = D.rechnungen.find((x) => x.nr === wert);
        if (!r) return;
        const art = name === "ak-zahlung" ? "zahlung"
          : name === "ak-mahnung" ? "mahnung" : "rechnung";
        stand.korrektur = {
          art, id: wert, stufe: "eingabe", grund: "", fehler: "",
          wert: "", art2: "Überweisung", vorher: "", nachher: ""
        };
        R.dialogOeffnen(buchungsDialog());
        return;
      }
      case "ak-rw-korrektur": {
        /* Nur die Administration - rewards.write allein genuegt nicht. */
        if (!R.darf("rewards.write") || !R.darf("security.read")) return;
        const konto = D.rewards.konten.find((x) => x.kunde === wert);
        if (!konto) return;
        stand.korrektur = {
          art: "rewards", id: wert, stufe: "eingabe", grund: "", fehler: "",
          wert: "", vorher: "", nachher: ""
        };
        R.dialogOeffnen(buchungsDialog());
        return;
      }
      case "ak-bk-zurueck":
        if (!stand.korrektur) return;
        stand.korrektur.stufe = "eingabe";
        stand.korrektur.fehler = "";
        R.dialogOeffnen(buchungsDialog());
        return;
      case "ak-bk-weiter": {
        const s = stand.korrektur;
        if (!s) return;
        if ((s.art === "zahlung" || s.art === "rewards") && !String(s.wert).trim()) {
          s.fehler = s.art === "zahlung"
            ? "Bitte einen Betrag eintragen."
            : "Bitte die Punkte eintragen, mit Vorzeichen.";
          R.dialogOeffnen(buchungsDialog());
          return;
        }
        if (s.art === "rewards" && !/^[+-]?\d+$/.test(String(s.wert).trim())) {
          s.fehler = "Bitte eine ganze Zahl eintragen, zum Beispiel -50 oder 120.";
          R.dialogOeffnen(buchungsDialog());
          return;
        }
        /* Vorher und nachher ausrechnen, damit die Pruefung sie zeigt. */
        if (s.art === "rewards") {
          const konto = D.rewards.konten.find((x) => x.kunde === s.id);
          s.vorher = konto.punkte + " Punkte";
          s.nachher = (konto.punkte + Number(s.wert)) + " Punkte";
        } else {
          const r = D.rechnungen.find((x) => x.nr === s.id);
          if (s.art === "zahlung") {
            s.vorher = r.zustand + " · " + (r.zahlungen || []).length + " Zahlung(en)";
            s.nachher = "Zahlung " + s.wert + " erfasst";
          } else if (s.art === "mahnung") {
            s.vorher = r.zustand;
            s.nachher = "Mahnung vorbereitet";
          } else {
            s.vorher = "Version " + (r.version || 1);
            s.nachher = "Version " + ((r.version || 1) + 1);
          }
        }
        s.stufe = "pruefen";
        s.fehler = "";
        R.dialogOeffnen(buchungsDialog());
        return;
      }
      case "ak-bk-ja": {
        const s = stand.korrektur;
        if (!s || s.stufe !== "pruefen") return;
        /* Die Berechtigung steht in der AKTION. */
        if (s.art === "rewards") {
          if (!R.darf("rewards.write") || !R.darf("security.read")) return;
        } else if (!R.darf("finance.write")) return;

        const feld = document.querySelector("[data-bk-grund]");
        s.grund = feld ? feld.value.trim() : "";
        const brauchtGrund = s.art === "rechnung" || s.art === "rewards";
        if (brauchtGrund && s.grund.length < 3) {
          s.fehler = "Bitte einen Grund eintragen. Ohne Grund wird nichts geändert.";
          R.dialogOeffnen(buchungsDialog());
          const f2 = document.querySelector("[data-bk-grund]");
          if (f2) f2.focus();
          return;
        }

        if (s.art === "rewards") {
          const konto = D.rewards.konten.find((x) => x.kunde === s.id);
          const vorher = konto.punkte;
          konto.punkte = vorher + Number(s.wert);
          if (!konto.verlauf) konto.verlauf = [];
          /* Der Eintrag ist unveraenderlich - auch der Verlauf. */
          konto.verlauf.unshift(Object.freeze({
            zeit: zeitstempel(), was: "Manuelle Korrektur",
            punkte: Number(s.wert), grund: s.grund, wer: meinName()
          }));
          D.protokollieren({
            betrifft: "Rewards-Konto " + konto.kunde,
            was: "Punkte manuell korrigiert",
            vorher: vorher + " Punkte", nachher: konto.punkte + " Punkte",
            grund: s.grund
          });
        } else {
          const r = D.rechnungen.find((x) => x.nr === s.id);
          if (s.art === "zahlung") {
            if (!r.zahlungen) r.zahlungen = [];
            r.zahlungen.unshift({
              betrag: s.wert, datum: D.alsText(D.heute), art: s.art2, wer: meinName()
            });
            verlaufEintragen(r, {
              was: "Zahlung erfasst", vorher: s.vorher, nachher: s.nachher, grund: s.grund
            });
            D.protokollieren({
              betrifft: "Rechnung " + r.nr,
              was: "Zahlung erfasst", vorher: s.vorher, nachher: s.nachher, grund: s.grund
            });
          } else if (s.art === "mahnung") {
            verlaufEintragen(r, {
              was: "Mahnung vorbereitet", vorher: s.vorher,
              nachher: "Mahnung vorbereitet – nicht versendet", grund: s.grund
            });
            D.protokollieren({
              betrifft: "Rechnung " + r.nr,
              was: "Mahnung vorbereitet",
              vorher: s.vorher, nachher: "vorbereitet, nicht versendet", grund: s.grund
            });
          } else {
            /* Korrektur: die alte Rechnung bleibt, es entsteht eine
               neue Version, die auf sie verweist. */
            const alteVersion = r.version || 1;
            const neueNr = r.nr + "-v" + (alteVersion + 1);
            D.rechnungen.unshift({
              ...r,
              nr: neueNr,
              version: alteVersion + 1,
              bezugAuf: r.nr,
              zustand: "Entwurf",
              zahlungen: [],
              verlauf: []
            });
            verlaufEintragen(r, {
              was: "Korrektur angelegt", vorher: "Version " + alteVersion,
              nachher: neueNr, grund: s.grund
            });
            D.protokollieren({
              betrifft: "Rechnung " + r.nr,
              was: "Korrektur als neue Version angelegt",
              vorher: "Version " + alteVersion,
              nachher: neueNr + " – die alte bleibt unverändert", grund: s.grund
            });
          }
        }

        const art = s.art;
        const id = s.id;
        stand.korrektur = null;
        R.dialogOeffnen(art === "rewards" ? rewardskontoVon(id) : rechnungsakte(id));
        R.zeichnen();
        return;
      }

      default:
    }
  }

  /* ============================================================
     Eingabefelder der Neuanlage
     ============================================================ */
  function geaendert(feld) {
    if (feld.matches && feld.matches("[data-kn]") && stand.kundeNeu) {
      stand.kundeNeu.felder[feld.dataset.kn] = feld.value;
      return true;
    }
    if (feld.matches && feld.matches("[data-bk]") && stand.korrektur) {
      stand.korrektur[feld.dataset.bk] = feld.value;
      return true;
    }
    return false;
  }

  /* ============================================================
     Nach dem Zeichnen angeforderte Akte oeffnen
     ============================================================ */
  function nachZeichnen() {
    if (!stand.oeffne) return;
    const { art, id } = stand.oeffne;
    stand.oeffne = null;
    if (art === "kunde" && R.darf("customers.read")) R.dialogOeffnen(kundenakte(id));
    if (art === "rewards" && R.darf("rewards.read")) R.dialogOeffnen(rewardskontoVon(id));
  }


  window.ProbeAkten = {
    tun, geaendert, nachZeichnen, stand,
    aktenzeile, dialogKopf, zeileDl, verlaufBlock, verlaufEintragen,
    meinKonto, meinName, kontoText, jetzt, zeitstempel, anschriftText,
    kundenakte, personalakte, rechnungsakte, rewardskontoVon
  };
})();
