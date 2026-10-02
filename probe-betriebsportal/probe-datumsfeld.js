/* ============================================================
   Designprobe Betriebsportal - kontrolliertes Datumsfeld
   ============================================================
   GEMESSENER AUSGANGSFEHLER (manueller Rundgang):

   Das eingebaute <input type="date"> hat innen drei Abschnitte. Wer
   "02102026" tippt, dessen erste Ziffer des Jahres loest einen Sprung
   aus - der Rest landet im Tag oder im Monat. Eine normale Eingabe von
   links nach rechts ist damit nicht moeglich. Derselbe Mangel wie beim
   <input type="time">, der dieses Portal schon ein eigenes Zeitmodul
   gekostet hat.

   URSACHE: Nicht unser Code, sondern das Verhalten des Browserfeldes.
   Deshalb hilft kein Flicken an der Aufrufstelle - es braucht ein
   eigenes Feld, genau wie bei der Zeit.

   Hier steht ein gewoehnliches Textfeld mit eigener Pruefung:
     - von links nach rechts tippbar, nichts springt
     - "02102026" wird beim Verlassen zu "02.10.2026"
     - echte Datumspruefung: 31.02. ist ungueltig, Schaltjahre stimmen
     - Enter uebernimmt nur gueltige Werte
     - Escape verwirft die laufende Aenderung
     - beim Betreten wird der vorhandene Wert markiert
     - Schriftgroesse 16 px, damit iOS nicht hineinzoomt

   Nach aussen wird immer ISO (JJJJ-MM-TT) gegeben und genommen - der
   Bestand rechnet damit. Angezeigt wird immer TT.MM.JJJJ.

   Kein Netzzugriff. Dieses Modul kennt weder Supabase noch fetch.
   ============================================================ */
(() => {
  "use strict";

  const h = (wert) => String(wert == null ? "" : wert)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

  const ZWEI = (n) => String(n).padStart(2, "0");

  /* Wie viele Tage hat dieser Monat wirklich? Schaltjahr eingerechnet. */
  function tageImMonat(monat, jahr) {
    if (monat === 2) {
      const schalt = (jahr % 4 === 0 && jahr % 100 !== 0) || jahr % 400 === 0;
      return schalt ? 29 : 28;
    }
    return [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][monat - 1];
  }

  const istIso = (wert) => /^\d{4}-\d{2}-\d{2}$/.test(String(wert || ""));

  /* ISO nach Anzeige. Ein unbrauchbarer Wert gibt leer, nicht "NaN". */
  function alsText(iso) {
    if (!istIso(iso)) return "";
    const [j, m, t] = String(iso).split("-");
    return `${t}.${m}.${j}`;
  }

  /*
    Nimmt entgegen, was ein Mensch tippt, und macht daraus entweder ein
    gueltiges Datum oder eine verstaendliche Begruendung.

    Angenommen werden:
      "02.10.2026", "2.10.2026", "02102026", "2102026" (7 Ziffern),
      "02-10-2026", "02/10/2026", "02 10 2026"
      und ISO "2026-10-02" - damit ein von aussen gesetzter Wert nicht
      als Fehler gilt.

    Leer bedeutet "kein Datum" und ist KEIN Fehler. Erst die aufrufende
    Stelle entscheidet, ob ein Datum noetig ist - eine Pflicht gehoert
    in die Fachlogik, nicht in ein Eingabefeld.
  */
  function pruefen(eingabe) {
    const roh = String(eingabe == null ? "" : eingabe).trim();
    const leerErgebnis = { leer: true, gueltig: false, iso: "", text: "", fehler: "" };
    if (!roh) return leerErgebnis;

    /* ISO von aussen - unveraendert durchlassen, wenn es stimmt. */
    if (istIso(roh)) {
      const [j, m, t] = roh.split("-").map(Number);
      if (m >= 1 && m <= 12 && t >= 1 && t <= tageImMonat(m, j)) {
        return { leer: false, gueltig: true, iso: roh, text: alsText(roh), fehler: "" };
      }
      return { leer: false, gueltig: false, iso: "", text: "", fehler: "Dieses Datum gibt es nicht." };
    }

    if (!/^[0-9.\-/\s]+$/.test(roh)) {
      return {
        leer: false, gueltig: false, iso: "", text: "",
        fehler: "Nur Ziffern und Punkte, zum Beispiel 02.10.2026."
      };
    }

    const hatTrenner = /[.\-/\s]/.test(roh);
    const ziffern = roh.replace(/[^0-9]/g, "");
    let tag;
    let monat;
    let jahr;

    if (hatTrenner) {
      const teile = roh.split(/[.\-/\s]+/).filter(Boolean);
      if (teile.length !== 3) {
        return {
          leer: false, gueltig: false, iso: "", text: "",
          fehler: "Bitte als TT.MM.JJJJ eintragen, zum Beispiel 02.10.2026."
        };
      }
      if (teile[2].length !== 4) {
        return {
          leer: false, gueltig: false, iso: "", text: "",
          fehler: "Das Jahr braucht vier Ziffern, zum Beispiel 2026."
        };
      }
      tag = Number(teile[0]);
      monat = Number(teile[1]);
      jahr = Number(teile[2]);
    } else if (ziffern.length === 8) {
      tag = Number(ziffern.slice(0, 2));
      monat = Number(ziffern.slice(2, 4));
      jahr = Number(ziffern.slice(4));
    } else if (ziffern.length === 7) {
      /* "2102026" - ein einziffriger Tag, ohne Punkte getippt. */
      tag = Number(ziffern.slice(0, 1));
      monat = Number(ziffern.slice(1, 3));
      jahr = Number(ziffern.slice(3));
    } else {
      return {
        leer: false, gueltig: false, iso: "", text: "",
        fehler: "Das Datum ist unvollständig. Bitte TT.MM.JJJJ eintragen, zum Beispiel 02.10.2026."
      };
    }

    if (!Number.isFinite(tag) || !Number.isFinite(monat) || !Number.isFinite(jahr)) {
      return {
        leer: false, gueltig: false, iso: "", text: "",
        fehler: "Bitte TT.MM.JJJJ eintragen, zum Beispiel 02.10.2026."
      };
    }
    if (monat < 1 || monat > 12) {
      return { leer: false, gueltig: false, iso: "", text: "", fehler: "Es gibt nur die Monate 01 bis 12." };
    }
    /*
      Ein Jahr weit vor oder nach der Betriebszeit ist mit grosser
      Wahrscheinlichkeit ein Tippfehler. Die Grenze ist absichtlich
      weit - sie soll Vertipper abfangen, nicht fachlich entscheiden,
      welcher Zeitraum zulaessig ist. Das gehoert in die Fachlogik.
    */
    if (jahr < 1900 || jahr > 2200) {
      return { leer: false, gueltig: false, iso: "", text: "", fehler: "Bitte ein Jahr zwischen 1900 und 2200." };
    }
    const grenze = tageImMonat(monat, jahr);
    if (tag < 1) {
      /* Tag 0 ist kein zu grosser Tag, sondern gar keiner. Die Meldung
         "hat 31 Tage" waere hier irrefuehrend. */
      return {
        leer: false, gueltig: false, iso: "", text: "",
        fehler: "Der Tag beginnt bei 01."
      };
    }
    if (tag > grenze) {
      return {
        leer: false, gueltig: false, iso: "", text: "",
        fehler: `Der Monat ${ZWEI(monat)}.${jahr} hat ${grenze} Tage.`
      };
    }

    const iso = `${jahr}-${ZWEI(monat)}-${ZWEI(tag)}`;
    return { leer: false, gueltig: true, iso, text: alsText(iso), fehler: "" };
  }

  const alsIso = (eingabe) => {
    const e = pruefen(eingabe);
    return e.gueltig ? e.iso : "";
  };

  /*
    Ein Datumsfeld zeichnen. `kennung` ist frei waehlbar und landet in
    data-datum-kennung - damit weiss die aufrufende Stelle hinterher,
    zu WEM das Feld gehoert. Bewusst kein Index: Ein Index aendert sich,
    wenn eine Zeile dazukommt.

    `wert` darf ISO oder TT.MM.JJJJ sein. Gezeigt wird immer TT.MM.JJJJ.
  */
  function markup({ kennung, teil, wert, beschriftung, fehler, pflicht }) {
    const id = `datum-${kennung}-${teil}`.replace(/[^a-zA-Z0-9-]/g, "");
    const gezeigt = istIso(wert) ? alsText(wert) : String(wert == null ? "" : wert);
    return `<span class="datumsfeld${fehler ? " hat-fehler" : ""}">
      <input type="text" id="${h(id)}"
        inputmode="numeric" autocomplete="off" spellcheck="false" maxlength="10"
        placeholder="TT.MM.JJJJ"
        aria-label="${h(beschriftung)}"
        ${pflicht ? 'aria-required="true"' : ""}
        ${fehler ? `aria-invalid="true" aria-describedby="${h(id)}-fehler"` : ""}
        data-datum data-datum-kennung="${h(kennung)}" data-datum-teil="${h(teil)}"
        value="${h(gezeigt)}">
      ${fehler ? `<span class="datumsfehler" id="${h(id)}-fehler" role="alert">${h(fehler)}</span>` : ""}
    </span>`;
  }

  /*
    Die Bedienung. An einer Stelle gebuendelt, damit sich jedes
    Datumsfeld der Probe gleich verhaelt - im Kalender wie in der
    Planung, der Analyse, dem Archivfilter und jedem Dialog.

    `anmelden` bekommt eine Behandlung:
      uebernehmen(kennung, teil, ergebnis, feld)  nach Verlassen/Enter
      weiter(kennung, teil, feld)                 Enter bei gueltigem Wert
      verwerfen(kennung, teil, feld)              nach Escape
  */
  let behandlung = null;
  const anmelden = (fn) => { behandlung = fn; };

  /* Der letzte uebernommene Wert je Feld - fuer Escape. */
  const letzterWert = new Map();
  const schluessel = (feld) => `${feld.dataset.datumKennung}|${feld.dataset.datumTeil}`;

  function uebernehmen(feld, ausEnter) {
    if (!behandlung) return;
    const ergebnis = pruefen(feld.value);
    /* Gueltiges in die Anzeigeform bringen - der Mensch sieht, was
       angekommen ist. Ein ungueltiger Wert bleibt stehen, damit er
       berichtigt werden kann und nicht stumm verschwindet. */
    if (ergebnis.gueltig) feld.value = ergebnis.text;
    behandlung.uebernehmen(feld.dataset.datumKennung, feld.dataset.datumTeil, ergebnis, feld);
    if (ergebnis.gueltig || ergebnis.leer) {
      letzterWert.set(schluessel(feld), ergebnis.text);
      if (ausEnter && behandlung.weiter) {
        behandlung.weiter(feld.dataset.datumKennung, feld.dataset.datumTeil, feld);
      }
    }
  }

  function binden() {
    /* Beim Hineinspringen den ganzen Wert markieren - so laesst er sich
       in einem Zug ueberschreiben, ohne erst loeschen zu muessen. */
    document.addEventListener("focusin", (e) => {
      const feld = e.target;
      if (!feld.matches || !feld.matches("[data-datum]")) return;
      if (!letzterWert.has(schluessel(feld))) letzterWert.set(schluessel(feld), feld.value);
      /*
        Markieren erst im naechsten Bild - sonst hebt der Browser die
        Markierung beim Setzen des Fokus wieder auf.

        Aber nur, wenn seit dem Betreten NICHTS getippt wurde: Wer
        sofort anfaengt zu tippen, verlor sonst die ersten Zeichen,
        weil die Markierung sie ersetzte. Vom eigenen Prueflauf
        gefunden.
      */
      const beimBetreten = feld.value;
      window.requestAnimationFrame(() => {
        if (document.activeElement !== feld) return;
        if (feld.value !== beimBetreten) return;
        try { feld.select(); } catch { /* manche Browser mögen das nicht */ }
      });
    });

    document.addEventListener("focusout", (e) => {
      const feld = e.target;
      if (!feld.matches || !feld.matches("[data-datum]")) return;
      uebernehmen(feld, false);
    });

    /*
      Auch auf "change". Im Browser kommt das beim Verlassen, also im
      selben Moment wie focusout; doppelt schadet nicht, weil die
      Pruefung dasselbe Ergebnis liefert. Es greift zusaetzlich, wenn
      ein Wert von aussen gesetzt und mit "change" gemeldet wird.

      Bewusst NICHT auf "input": Waehrend des Tippens darf die Zeile
      nicht neu gezeichnet werden, sonst spraenge der Fokus aus dem Feld
      - genau der Mangel, den dieses Modul behebt.
    */
    document.addEventListener("change", (e) => {
      const feld = e.target;
      if (!feld.matches || !feld.matches("[data-datum]")) return;
      uebernehmen(feld, false);
    });

    document.addEventListener("keydown", (e) => {
      const feld = e.target;
      if (!feld.matches || !feld.matches("[data-datum]")) return;

      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        uebernehmen(feld, true);
        return;
      }
      if (e.key === "Escape") {
        /* Die laufende Eingabe verwerfen und zum zuletzt uebernommenen
           Wert zurueck. Das Fenster darf sich dabei NICHT schliessen -
           deshalb stopPropagation. */
        e.preventDefault();
        e.stopPropagation();
        const zurueck = letzterWert.get(schluessel(feld));
        feld.value = zurueck == null ? "" : zurueck;
        if (behandlung && behandlung.verwerfen) {
          behandlung.verwerfen(feld.dataset.datumKennung, feld.dataset.datumTeil, feld);
        }
        feld.select();
      }
    }, true);
  }

  /* Ein Zeitraum ist verdreht, wenn das Ende vor dem Beginn liegt.
     Anders als bei einer Schicht ueber Mitternacht ist das hier ein
     Fehler - ein Zeitraum laeuft nicht rueckwaerts. */
  const verdreht = (vonIso, bisIso) => Boolean(vonIso && bisIso && bisIso < vonIso);

  window.ProbeDatum = {
    pruefen, markup, binden, anmelden,
    alsIso, alsText, istIso, tageImMonat, verdreht, letzterWert
  };
})();
