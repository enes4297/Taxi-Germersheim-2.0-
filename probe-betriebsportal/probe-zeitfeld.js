/* ============================================================
   Designprobe Betriebsportal - kontrolliertes Zeitfeld
   ============================================================
   Grund: Das eingebaute <input type="time"> des Browsers hat innen zwei
   Abschnitte. Wer "15:30" tippt, dessen erste "1" wird sofort als
   Stunde uebernommen, und der Fokus springt zur Minute - die "5" landet
   dann im falschen Abschnitt. Im echten Bedienversuch war eine normale
   Eingabe damit kaum moeglich.

   Hier steht deshalb ein gewoehnliches Textfeld mit eigener Pruefung:
   von links nach rechts tippbar, nichts springt, "1530" wird beim
   Verlassen zu "15:30". Gueltig ist 00:00 bis 23:59.

   Kein Netzzugriff. Dieses Modul kennt weder Supabase noch fetch.
   ============================================================ */
(() => {
  "use strict";

  const h = (wert) => String(wert == null ? "" : wert)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

  /*
    Nimmt entgegen, was ein Mensch tippt, und macht daraus entweder eine
    gueltige Zeit oder eine verstaendliche Begruendung.

    Angenommen werden: "15:30", "1530", "15.30", "15 30", "9:05",
    "930" (= 09:30), "0930". Leer bedeutet "keine Zeit" und ist kein
    Fehler - erst die Planung entscheidet, ob eine Zeit noetig ist.
  */
  function pruefen(eingabe) {
    const roh = String(eingabe == null ? "" : eingabe).trim();
    if (!roh) return { leer: true, gueltig: false, wert: "", fehler: "" };

    const ziffern = roh.replace(/[^0-9]/g, "");
    const hatTrenner = /[:.\s]/.test(roh);

    if (!/^[0-9:.\s]+$/.test(roh)) {
      return { leer: false, gueltig: false, wert: "", fehler: "Nur Ziffern und ein Doppelpunkt, zum Beispiel 15:30." };
    }

    let stunde;
    let minute;

    if (hatTrenner) {
      const teile = roh.split(/[:.\s]+/).filter(Boolean);
      if (teile.length !== 2) {
        return { leer: false, gueltig: false, wert: "", fehler: "Bitte als HH:MM eintragen, zum Beispiel 15:30." };
      }
      if (teile[1].length !== 2) {
        return { leer: false, gueltig: false, wert: "", fehler: "Die Minute braucht zwei Ziffern, zum Beispiel 15:05." };
      }
      stunde = Number(teile[0]);
      minute = Number(teile[1]);
    } else if (ziffern.length === 4) {
      stunde = Number(ziffern.slice(0, 2));
      minute = Number(ziffern.slice(2));
    } else if (ziffern.length === 3) {
      stunde = Number(ziffern.slice(0, 1));
      minute = Number(ziffern.slice(1));
    } else {
      return {
        leer: false, gueltig: false, wert: "",
        fehler: "Die Zeit ist unvollständig. Bitte HH:MM eintragen, zum Beispiel 15:30."
      };
    }

    if (!Number.isFinite(stunde) || !Number.isFinite(minute)) {
      return { leer: false, gueltig: false, wert: "", fehler: "Bitte HH:MM eintragen, zum Beispiel 15:30." };
    }
    if (stunde > 23) {
      return { leer: false, gueltig: false, wert: "", fehler: "Die Stunde liegt zwischen 00 und 23." };
    }
    if (minute > 59) {
      return { leer: false, gueltig: false, wert: "", fehler: "Die Minute liegt zwischen 00 und 59." };
    }

    const wert = `${String(stunde).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    return { leer: false, gueltig: true, wert, fehler: "" };
  }

  /*
    Ein Zeitfeld zeichnen. `kennung` ist frei waehlbar und landet in
    data-zeit-kennung - damit weiss die aufrufende Stelle hinterher,
    zu WEM das Feld gehoert. Bewusst kein Index.
  */
  function markup({ kennung, teil, wert, beschriftung, fehler }) {
    const id = `zeit-${kennung}-${teil}`.replace(/[^a-zA-Z0-9-]/g, "");
    return `<span class="zeitfeld${fehler ? " hat-fehler" : ""}">
      <input type="text" id="${h(id)}"
        inputmode="numeric" autocomplete="off" spellcheck="false" maxlength="5"
        placeholder="HH:MM"
        aria-label="${h(beschriftung)}"
        ${fehler ? `aria-invalid="true" aria-describedby="${h(id)}-fehler"` : ""}
        data-zeit data-zeit-kennung="${h(kennung)}" data-zeit-teil="${h(teil)}"
        value="${h(wert || "")}">
      ${fehler ? `<span class="zeitfehler" id="${h(id)}-fehler" role="alert">${h(fehler)}</span>` : ""}
    </span>`;
  }

  /*
    Die Bedienung. Bewusst an einer Stelle gebuendelt, damit jedes
    Zeitfeld der Probe sich gleich verhaelt - in der Planung wie im
    Fahrtassistenten.

    `anmelden` bekommt eine Behandlung:
      uebernehmen(kennung, teil, ergebnis, feld)  nach Verlassen/Enter
      weiter(kennung, teil, feld)                 Enter bei gueltigem Wert
  */
  let behandlung = null;
  const anmelden = (fn) => { behandlung = fn; };

  /* Der letzte uebernommene Wert je Feld - fuer Escape. */
  const letzterWert = new Map();
  const schluessel = (feld) => `${feld.dataset.zeitKennung}|${feld.dataset.zeitTeil}`;

  function uebernehmen(feld, ausEnter) {
    if (!behandlung) return;
    const ergebnis = pruefen(feld.value);
    behandlung.uebernehmen(feld.dataset.zeitKennung, feld.dataset.zeitTeil, ergebnis, feld);
    if (ergebnis.gueltig || ergebnis.leer) {
      letzterWert.set(schluessel(feld), ergebnis.wert);
      if (ausEnter && behandlung.weiter) {
        behandlung.weiter(feld.dataset.zeitKennung, feld.dataset.zeitTeil, feld);
      }
    }
  }

  function binden() {
    /* Beim Hineinspringen den ganzen Wert markieren - so laesst er sich
       in einem Zug ueberschreiben, ohne erst loeschen zu muessen. */
    document.addEventListener("focusin", (e) => {
      const feld = e.target;
      if (!feld.matches || !feld.matches("[data-zeit]")) return;
      if (!letzterWert.has(schluessel(feld))) letzterWert.set(schluessel(feld), feld.value);
      window.requestAnimationFrame(() => {
        try { feld.select(); } catch { /* manche Browser mögen das nicht */ }
      });
    });

    document.addEventListener("focusout", (e) => {
      const feld = e.target;
      if (!feld.matches || !feld.matches("[data-zeit]")) return;
      uebernehmen(feld, false);
    });

    /* Auch auf "change" uebernehmen. Im Browser kommt das Ereignis beim
       Verlassen, also im selben Moment wie focusout; doppelt schadet
       nicht, weil die Pruefung dasselbe Ergebnis liefert. Es greift
       zusaetzlich, wenn ein Wert von aussen gesetzt und mit "change"
       gemeldet wird - etwa durch eine Browsererweiterung oder ein
       Hilfsmittel zur Bedienung.

       Bewusst NICHT auf "input": Waehrend des Tippens duerfte die Zeile
       nicht neu gezeichnet werden, sonst spraenge der Fokus aus dem
       Feld - genau der Mangel, den dieses Modul behebt. */
    document.addEventListener("change", (e) => {
      const feld = e.target;
      if (!feld.matches || !feld.matches("[data-zeit]")) return;
      uebernehmen(feld, false);
    });

    document.addEventListener("keydown", (e) => {
      const feld = e.target;
      if (!feld.matches || !feld.matches("[data-zeit]")) return;

      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        uebernehmen(feld, true);
        return;
      }
      if (e.key === "Escape") {
        /* Die laufende Eingabe verwerfen und zum zuletzt uebernommenen
           Wert zurueck. Das Fenster darf sich dabei nicht schliessen. */
        e.preventDefault();
        e.stopPropagation();
        const zurueck = letzterWert.get(schluessel(feld));
        feld.value = zurueck == null ? "" : zurueck;
        if (behandlung && behandlung.verwerfen) {
          behandlung.verwerfen(feld.dataset.zeitKennung, feld.dataset.zeitTeil, feld);
        }
        feld.select();
      }
    }, true);
  }

  /* Liegt das Ende vor dem Beginn, geht die Schicht ueber Mitternacht.
     Das ist erlaubt und kein Fehler. */
  const ueberMitternacht = (von, bis) => Boolean(von && bis && bis < von);

  window.ProbeZeit = { pruefen, markup, binden, anmelden, ueberMitternacht, letzterWert };
})();
