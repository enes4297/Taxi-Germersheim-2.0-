/* ═══════════════════════════════════════════════════════════════════════
   Das Gluecksrad - Zeichnung und Drehung
   ═══════════════════════════════════════════════════════════════════════

   EINE Radlogik fuer beide Stellen, die sie brauchen:
     spiele.html            die Spielewelt der Kunden
     sichtproben/gluecksrad.html  die Designprobe

   Die Probe laedt NICHT spiele.js: Das wuerde die gesamte
   Rewards-Initialisierung mitstarten, die dort weder Elemente noch eine
   Anmeldung vorfindet. Sie laedt nur diese Datei.

   Zwei getrennte Radimplementierungen waeren die Art von Doppelung, bei
   der eine von beiden irgendwann anders rechnet.
*/
(function () {
  'use strict';
  /* ═══════════════════════════════════════════════════════════════════
     Das Glücksrad
     ═══════════════════════════════════════════════════════════════════

     Gestaltung nach der freigegebenen Vorlage
     design-vorlagen/Taxi-Germersheim-Gluecksrad.html.

     ───────────────────────────────────────────────────────────────────
     DIE WICHTIGSTE REGEL DIESER DATEI
     ───────────────────────────────────────────────────────────────────

     DER BROWSER BESTIMMT NIEMALS DEN GEWINN.

     `wheelStopAt(prizeType)` nimmt einen Gewinntyp ENTGEGEN und dreht das
     Rad dorthin. Es gibt in dieser Datei keine Zufallsauswahl und keine
     Gewinnlogik - nicht einmal als Vorbereitung. Wer das Rad drehen
     lässt, muss vorher ein bestätigtes Ergebnis haben.

     Die Vorlage hatte eine Auswahlliste für das Testergebnis. Die ist
     hier bewusst NICHT übernommen; sie steht ausschließlich in der
     Designprobe unter sichtproben/gluecksrad.html.

     ───────────────────────────────────────────────────────────────────
     STAND DER ANBINDUNG - NACHGESEHEN AM 23.09.2026
     ───────────────────────────────────────────────────────────────────

     `spin_rewards_wheel` wird im gesamten Kundenbereich NICHT aufgerufen.
     Der einzige Aufruf im Projekt steht in admin/rewards.js:807, also in
     der Zentrale. Die Schaltfläche am Rad ist in JEDEM Zustand
     `disabled` - "Bald verfügbar", "Nicht verfügbar", "Kein Dreh
     verfügbar".

     Daran ändert dieser Schritt NICHTS. Es wurde keine Teilnahme
     aktiviert und keine Gewinnanbindung eingeführt.

     ───────────────────────────────────────────────────────────────────
     ABWEICHUNG DER VORLAGE, GEPRÜFT UND BENANNT
     ───────────────────────────────────────────────────────────────────

     Die Vorlage zeigt SIEBEN GLEICH GROSSE Felder. Die hinterlegten
     Wahrscheinlichkeiten sind aber nicht gleich:

       5 Punkte 35 % · 10 Punkte 25 % · 20 Punkte 18 % · 30 Punkte 10 %
       50 Punkte 7 % · Gutschein 20,00 € 4 % · Yumaks Box 1 %
       (public.rewards_wheel_rules(), Migration 007)

     Gleich große Felder legen nahe, dass alles gleich wahrscheinlich
     wäre. Das ist es nicht. Die Vorlage sagt das selbst: "Gleich große
     Felder stellen keine Gewinnwahrscheinlichkeiten dar."

     Angepasst wurde deshalb nicht die Größe - ein Feld mit 1 % wäre
     3,6 Grad breit und unlesbar -, sondern die Umgebung: Unter dem Rad
     steht ein Satz, der die Felder ausdrücklich als gleich groß und
     NICHT als Wahrscheinlichkeit benennt und auf die Rewards-Seite
     verweist, wo die Werte stehen.

     Die BESCHRIFTUNGEN stimmen mit den Regeln überein; geprüft gegen
     die sieben prize_type-Werte der Migration. Einzige Abweichung in
     der Schreibweise: Auf dem Rad steht "20 €", in der Regel und im
     Ergebnistext "20,00 €". Auf einem Radfeld ist der kurze Wert
     lesbarer, der Betrag ist derselbe.
  */

  /**
   * Die sieben Felder, in der Reihenfolge der Migration 007.
   *
   * `prize` ist der Schlüssel, den der Server zurückgibt. Er ist die
   * Brücke zwischen einem bestätigten Ergebnis und dem Feld, auf dem das
   * Rad stehen bleibt.
   */
  const wheelSegments = [
    { prize: 'points_5', label: '5', unit: 'PUNKTE', title: '5 Punkte' },
    { prize: 'points_10', label: '10', unit: 'PUNKTE', title: '10 Punkte' },
    { prize: 'points_20', label: '20', unit: 'PUNKTE', title: '20 Punkte' },
    { prize: 'points_30', label: '30', unit: 'PUNKTE', title: '30 Punkte' },
    { prize: 'points_50', label: '50', unit: 'PUNKTE', title: '50 Punkte' },
    { prize: 'voucher_20', label: '20 €', unit: 'GUTSCHEIN', title: '20,00 € Gutschein', featured: true },
    { prize: 'yumaks_box', label: 'BOX', unit: 'YUMAKS', title: 'Yumaks Box', box: true, word: true }
  ];

  /** Gradmaß eines Feldes. Sieben gleich große Felder. */
  const WHEEL_STEP = 360 / wheelSegments.length;

  /** Wie lange sich das Rad dreht. */
  const WHEEL_DURATION = 4800;

  /** Volle Umdrehungen vor dem Auslaufen. */
  const WHEEL_TURNS = 5;

  /**
   * Auf welchem Feld das Rad gerade steht.
   *
   * ── WARUM DER WINKEL NICHT WEITERGEZAEHLT WIRD ────────────────────
   *
   * Zwei Fallen, beide gemessen und beide vermieden:
   *
   * 1. 360 geteilt durch sieben geht nicht glatt auf. Wer den Winkel
   *    aufaddiert, schleppt bei jeder Drehung einen Rest mit.
   *
   * 2. Schlimmer, und der eigentliche Grund: DER BROWSER RUNDET, wenn er
   *    `style.transform` als Text ablegt. Aus 10902.857142857143 wird
   *    `rotate(10902.9deg)` - sechs geltende Ziffern. Je groesser der
   *    Winkel, desto groeber die Rundung. Nachgemessen: nach sieben
   *    Drehungen 0,043 Grad daneben, nach tausend Drehungen waeren es
   *    Grad statt Bruchteile - dann traefe das Rad das Feld nicht mehr.
   *
   * Deshalb bleibt der abgelegte Winkel IMMER zwischen 0 und 360. Die
   * vollen Umdrehungen leben nur in der Bildfolge, nicht im Zustand.
   * Sichtbar ist das dasselbe: 5 Umdrehungen plus 102,86 Grad sehen aus
   * wie 102,86 Grad - nur eben ohne die Rundung.
   */
  let wheelIndex = 0;
  let wheelBusy = false;

  /** Der Winkel, bei dem Feld `index` unter dem Zeiger steht. */
  function wheelAngleFor(index) {
    return (360 - index * WHEEL_STEP) % 360;
  }

  function createSvgNode(name, attributes) {
    const node = document.createElementNS('http://www.w3.org/2000/svg', name);
    Object.keys(attributes || {}).forEach(function (key) {
      node.setAttribute(key, attributes[key]);
    });
    return node;
  }

  /** Punkt auf dem Radrand. 0 Grad ist oben, im Uhrzeigersinn. */
  function wheelPoint(angleDegrees) {
    const rad = angleDegrees * Math.PI / 180;
    return {
      x: 250 + 247 * Math.sin(rad),
      y: 250 - 247 * Math.cos(rad)
    };
  }

  function renderWheel() {
    const svg = document.querySelector('[data-gw-wheel-svg]');
    if (!svg) return;
    svg.innerHTML = '';

    // Die drei Farbverläufe der Vorlage.
    const defs = createSvgNode('defs', {});
    [
      ['gwSegmentDark', ['#454536', '#252c21', '#101812']],
      ['gwSegmentBright', ['#56543d', '#303527', '#1b2419']],
      ['gwSegmentSpecial', ['#e1c583', '#ad8f4c', '#665326']]
    ].forEach(function (entry) {
      const gradient = createSvgNode('radialGradient', { id: entry[0] });
      const offsets = entry[0] === 'gwSegmentSpecial' ? ['0', '.35', '1'] : ['0', '.5', '1'];
      entry[1].forEach(function (color, i) {
        gradient.appendChild(createSvgNode('stop', { offset: offsets[i], 'stop-color': color }));
      });
      defs.appendChild(gradient);
    });
    svg.appendChild(defs);

    const rotor = createSvgNode('g', { 'data-gw-wheel-rotor': '' });

    wheelSegments.forEach(function (segment, index) {
      // Feld i liegt mittig auf i * STEP - deshalb beginnt es eine halbe
      // Feldbreite davor. Genau diese Rechnung kehrt wheelStopAt() um.
      const start = index * WHEEL_STEP - WHEEL_STEP / 2;
      const end = start + WHEEL_STEP;
      const p = wheelPoint(start);
      const q = wheelPoint(end);

      const group = createSvgNode('g', {});
      let klasse = 'gw-wheel-segment';
      if (segment.featured) klasse += ' is-featured';
      else if (segment.box) klasse += ' is-box';
      else if (index % 2) klasse += ' is-bright';

      group.appendChild(createSvgNode('path', {
        d: 'M250 250 L' + p.x.toFixed(2) + ' ' + p.y.toFixed(2) +
          ' A247 247 0 0 1 ' + q.x.toFixed(2) + ' ' + q.y.toFixed(2) + ' Z',
        class: klasse
      }));

      // Beschriftung: aufrecht im Feld, mitgedreht.
      const beschriftung = createSvgNode('g', {
        transform: 'rotate(' + (index * WHEEL_STEP) + ' 250 250)'
      });
      const wert = createSvgNode('text', {
        x: 250,
        y: 80,
        class: 'gw-wheel-label' + (segment.word ? ' is-word' : '') +
          (segment.featured || segment.box ? ' on-special' : '')
      });
      wert.textContent = segment.label;
      const einheit = createSvgNode('text', { x: 250, y: 103, class: 'gw-wheel-label-unit' });
      einheit.textContent = segment.unit;
      beschriftung.appendChild(wert);
      beschriftung.appendChild(einheit);
      beschriftung.appendChild(createSvgNode('circle', { cx: 250, cy: 26, r: 3, class: 'gw-wheel-dot' }));

      group.appendChild(beschriftung);
      rotor.appendChild(group);
    });

    svg.appendChild(rotor);
  }

  /**
   * Das Rad auf ein BESTÄTIGTES Ergebnis drehen.
   *
   * @param {string} prizeType  einer der sieben Schlüssel aus Migration 007
   * @returns {Promise<object|null>} das getroffene Feld, oder null
   *
   * Der Aufrufer muss den Gewinntyp mitbringen. Diese Funktion würfelt
   * nicht und rät nicht: Ist der Schlüssel unbekannt, dreht sie gar
   * nicht und meldet null zurück. Ein Rad, das bei unbekanntem Ergebnis
   * irgendwo stehen bliebe, würde einen Gewinn behaupten.
   */
  function wheelStopAt(prizeType) {
    const svg = document.querySelector('[data-gw-wheel-svg]');
    const index = wheelSegments.findIndex(function (s) { return s.prize === prizeType; });
    if (!svg || index < 0) return Promise.resolve(null);
    if (wheelBusy) return Promise.resolve(null);

    wheelBusy = true;

    // Ein Feld steht mittig auf seiner Nummer mal STEP. Damit es unter
    // dem Zeiger (0 Grad, oben) landet, muss das Rad um den Gegenwinkel
    // gedreht werden.
    //
    // `vorher` und `zielwinkel` liegen beide zwischen 0 und 360 und
    // werden aus der Feldnummer neu gerechnet - siehe wheelIndex oben.
    const vorher = wheelAngleFor(wheelIndex);
    const zielwinkel = wheelAngleFor(index);
    // Immer vorwaerts: ein Rad, das zurueckdreht, sieht aus wie ein
    // Fehler. Der Rest bis zum Ziel kommt zu den vollen Umdrehungen dazu.
    const rest = (zielwinkel - vorher + 360) % 360;
    const naechste = vorher + 360 * WHEEL_TURNS + rest;

    const reduziert = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    return new Promise(function (fertig) {
      function abschluss() {
        // Den Endstand fest eintragen, damit er auch nach dem Ende der
        // Bildfolge steht.
        // Abgelegt wird der KLEINE Winkel, nicht der grosse. Sichtbar
        // ist es dasselbe Bild; die Rundung des Browsers greift aber
        // erst bei grossen Zahlen.
        svg.style.transform = 'rotate(' + zielwinkel + 'deg)';
        wheelIndex = index;
        wheelBusy = false;
        fertig(wheelSegments[index]);
      }

      if (reduziert || typeof svg.animate !== 'function') {
        abschluss();
        return;
      }

      const lauf = svg.animate(
        [
          { transform: 'rotate(' + vorher + 'deg)' },
          { transform: 'rotate(' + naechste + 'deg)' }
        ],
        { duration: WHEEL_DURATION, easing: 'cubic-bezier(.12,.65,.08,1)', fill: 'forwards' }
      );
      lauf.addEventListener('finish', function () {
        lauf.cancel();
        abschluss();
      });
      lauf.addEventListener('cancel', function () {
        wheelBusy = false;
        fertig(null);
      });
    });
  }

  /** Dreht sich das Rad gerade? Schützt vor doppelten Klicks. */
  function wheelIsBusy() {
    return wheelBusy;
  }

  // Für die Designprobe und für eine spätere echte Anbindung erreichbar
  // machen - ohne dass hier etwas davon aufgerufen würde.
  window.TaxiGluecksrad = {
    segmente: wheelSegments,
    stoppeAuf: wheelStopAt,
    dreht: wheelIsBusy,
    zeichne: renderWheel
  };
})();
