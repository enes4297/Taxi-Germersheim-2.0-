// ═══════════════════════════════════════════════════════════════════════════
// Die freigegebene Kopfzeile in die letzte Bestandsseite einsetzen
// ═══════════════════════════════════════════════════════════════════════════
//
// ───────────────────────────────────────────────────────────────────────────
// DER BEFUND
// ───────────────────────────────────────────────────────────────────────────
//
// `spiele.html` trug eine andere Kopfzeile als der Rest der Webseite -
// erzeugt zur Laufzeit von `public-system.js`. Gemessen bei 1440 px:
//
//     freigegeben (Astro):   Logo 107 x 52 px,  Kopf 81 px hoch,  fixed
//     spiele.html (alt):     Logo 196 x 96 px,  Kopf 114 px hoch, sticky
//
// Das Logo war also fast doppelt so gross. Dazu fehlten "Spiele", die
// Telefonnummer und "Fahrt anfragen"; stattdessen stand dort ein
// "Leistungen"-Aufklappmenue, das es sonst nirgends gibt.
//
// ───────────────────────────────────────────────────────────────────────────
// WARUM NICHT NACHGEBAUT
// ───────────────────────────────────────────────────────────────────────────
//
// Eine zweite Kopfzeile, die "genauso aussieht", driftet. Deshalb wird hier
// die ECHTE genommen: Nach dem Astro-Build steht sie fertig in jeder
// gebauten Seite. Diese Integration schneidet sie dort heraus - Markup,
// Stilvorlage und das Skript, das sie bedient - und setzt sie in
// `spiele.html` ein.
//
// Eine Quelle, ein Aussehen. Aendert sich `Kopfbereich.astro`, aendert sich
// `spiele.html` beim naechsten Build mit.
//
// ───────────────────────────────────────────────────────────────────────────
// WARUM EINGESETZT UND NICHT ERSETZT
// ───────────────────────────────────────────────────────────────────────────
//
// Der Bestand wird byteweise ausgeliefert; `ausgabe-pruefen` vergleicht die
// Ausgabe gegen das Repository. Wuerde hier die alte `<header class="topbar">`
// herausgeschnitten, waere dieser Vergleich nicht mehr wiederherstellbar.
//
// Deshalb wird NUR EINGEFUEGT, in zwei klar begrenzten Bloecken. Die alte
// Kopfzeile bleibt im Dokument stehen und wird per CSS ausgeblendet - der
// eingesetzte Block enthaelt die Regel dafuer selbst. `ausgabe-pruefen`
// schneidet beide Bloecke wieder heraus und vergleicht den Rest Byte fuer
// Byte. Die Zusicherung bleibt maschinell nachrechenbar.
//
// `public-system.js` erkennt die neue Kopfzeile und laesst die alte in Ruhe -
// sonst wuerde es sie beim Laden durch seine eigene ersetzen.

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export const KOPF_ANFANG = '<!-- tg:kopfzeile Anfang - eingesetzt von tools/kopfzeile-bestand.mjs -->';
export const KOPF_ENDE = '<!-- tg:kopfzeile Ende -->';

/** Die Bestandsseiten, die die freigegebene Kopfzeile bekommen. */
export const BETROFFENE_SEITEN = ['spiele.html'];

/** Aus welcher gebauten Seite die Kopfzeile genommen wird. */
const VORLAGE = 'rewards.html';

/**
 * Den Kopfbereich aus einer gebauten Astro-Seite herausschneiden.
 *
 * Gesucht wird ueber `data-kopf` - dieselbe Kennung, an der auch das
 * Bedienskript haengt. Ein Namenswechsel faellt damit sofort auf, statt
 * still eine leere Kopfzeile zu erzeugen.
 */
function kopfHolen(html) {
  const a = html.indexOf('<header');
  if (a < 0) return null;
  const e = html.indexOf('</header>', a);
  if (e < 0) return null;
  const markup = html.slice(a, e + '</header>'.length);
  if (!markup.includes('data-kopf')) return null;
  return markup;
}

/** Das Modul-Skript, das die Kopfzeile bedient (Scrollzustand, Menue, Konto). */
function skriptHolen(html) {
  for (const m of html.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)) {
    if (m[1].includes('data-kopf')) return m[1];
  }
  return null;
}

/** Die Stilvorlage des Designs - ohne sie greifen die Klassen nicht. */
function stilvorlageHolen(html) {
  const m = html.match(/<link rel="stylesheet" href="(\/_astro\/[^"]+\.css)"/);
  return m ? m[1] : null;
}

/* ═══════════════════════════════════════════════════════════════════════
   Die Regeln des Designs noch einmal - diesmal ungeschichtet
   ═══════════════════════════════════════════════════════════════════════

   GEMESSENER BEFUND: Die Klassen der freigegebenen Kopfzeile greifen auf
   dieser Seite nicht. Die Ursache sind CSS-Ebenen.

   Tailwind legt seine Hilfsklassen in `@layer utilities`. Fuer die
   Kaskade gilt: UNGESCHICHTETES CSS gewinnt IMMER gegen geschichtetes -
   unabhaengig von Genauigkeit und Reihenfolge. `style.css` ist
   ungeschichtet. Gemessen:

     .hidden aus style.css         schlug  .lg\:flex   → Navigation weg
     a{color:inherit} aus style.css schlug .text-white/72 → falsche Farbe
     button{…!important}            schlug  die Schriftgroesse
     svg-Regeln                     schlugen w-[18px]

   Einzelne Gegenregeln von Hand waeren eine zweite Kopfzeile in Zeitlupe:
   Bei jeder Aenderung an `Kopfbereich.astro` fehlte eine.

   Deshalb wird hier MECHANISCH gearbeitet: Aus dem Markup der Kopfzeile
   werden alle Klassennamen gelesen, im Design-Buendel die zugehoerigen
   Regeln gesucht und noch einmal ausgegeben - ungeschichtet und auf
   `header[data-kopf]` begrenzt. Kein Wert wird abgeschrieben, nichts von
   Hand gepflegt. Aendert sich die Kopfzeile, aendert sich das hier mit.

   Ausserhalb der Kopfzeile wirkt davon nichts; der Praefix sorgt dafuer.
*/

/**
 * Klassennamen, die erst das Bedienskript vergibt.
 *
 * Die Kopfzeile aendert ihr Aussehen im Betrieb: Beim Scrollen faerbt sie
 * sich ein, beim Oeffnen des Menues wird sie schmaler und das Logo
 * kleiner. Diese Klassen stehen NICHT im Markup, sondern werden vom
 * Skript gesetzt.
 *
 * Gemessen, was passiert, wenn man sie uebersieht: Mit geoeffnetem
 * Mobilmenue war das Logo auf rewards.html 74 x 36 Pixel gross und auf
 * spiele.html 0 x 0 - die Hoehenklasse des geoeffneten Zustands fehlte
 * schlicht.
 *
 * Gelesen werden deshalb alle Zeichenketten des Skripts. Ein Wort, das
 * keine Klasse ist, findet im Buendel keine Regel und bleibt folgenlos.
 */
function klassenAusSkript(skript) {
  const aus = new Set();
  const zeichenketten = skript.match(/'[^'\n]{1,120}'|"[^"\n]{1,120}"|`[^`\n]{1,120}`/g) || [];
  for (const roh of zeichenketten) {
    for (const wort of roh.slice(1, -1).split(/\s+/)) {
      if (wort && wort.length < 60 && /^[A-Za-z0-9][\w:.\/\[\]%,()#-]*$/.test(wort)) aus.add(wort);
    }
  }
  return aus;
}

/** Alle Klassennamen aus einem Markup-Stueck. */
function klassenAus(markup) {
  const aus = new Set();
  for (const m of markup.matchAll(/class="([^"]*)"/g)) {
    for (const k of m[1].split(/\s+/)) if (k) aus.add(k);
  }
  return aus;
}

/**
 * Das Buendel in Regelbloecke zerlegen - @media und @layer eingeschlossen.
 *
 * Kein vollstaendiger Parser: gezaehlt werden geschweifte Klammern. Das
 * genuegt fuer erzeugtes CSS und kommt ohne Abhaengigkeit aus.
 */
function bloeckeAus(css, umgebung = []) {
  const aus = [];
  let i = 0;
  while (i < css.length) {
    const auf = css.indexOf('{', i);
    if (auf < 0) break;
    const kopf = css.slice(i, auf).trim();
    let tiefe = 1;
    let j = auf + 1;
    while (j < css.length && tiefe > 0) {
      if (css[j] === '{') tiefe += 1;
      else if (css[j] === '}') tiefe -= 1;
      j += 1;
    }
    const rumpf = css.slice(auf + 1, j - 1);
    if (/^@(media|supports|layer|container)/.test(kopf)) {
      // @layer ohne eigene Umgebung: Der Inhalt zaehlt, die Ebene nicht -
      // ungeschichtet wollen wir ihn ja gerade haben.
      const neueUmgebung = /^@layer/.test(kopf) ? umgebung : [...umgebung, kopf];
      aus.push(...bloeckeAus(rumpf, neueUmgebung));
    } else if (kopf && !kopf.startsWith('@')) {
      aus.push({ selektor: kopf, rumpf: rumpf.trim(), umgebung });
    }
    i = j;
  }
  return aus;
}

/** Nennt dieser Selektor eine der Klassen der Kopfzeile? */
function betrifftKopf(selektor, klassen) {
  for (const m of selektor.matchAll(/\.((?:[\w-]|\\.)+)/g)) {
    // Maskierungen zurueckdrehen: `.text-white\/72` → `text-white/72`
    const name = m[1].replace(/\\(.)/g, '$1');
    if (klassen.has(name)) return true;
  }
  return false;
}

/**
 * Die Grundlagen, die die Kopfzeile aus dem Design braucht - und NUR die.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * WARUM NICHT EINFACH DAS GANZE BUENDEL VERLINKEN
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Genau das stand hier zuerst: ein <link> auf die Astro-Stilvorlage. Das
 * holt aber Tailwinds "Preflight" mit - eine Grundbereinigung, die JEDEM
 * Knopf den Innenabstand, JEDEM Absatz den Aussenabstand und JEDER
 * Ueberschrift die Schriftstaerke nimmt. Gemessen in spiele.html:
 *
 *     BUTTON.drive  padding-top   Bestand 1px   -  danach 0px
 *     BUTTON.drive  padding-left  Bestand 6px   -  danach 0px
 *     P             margin-top    Bestand 14px  -  danach 0px
 *     H2            font-weight   Bestand 700   -  danach 400
 *
 * Die Spielewelt ist uebernommener Bestand. Sie darf sich durch das
 * Einsetzen einer Kopfzeile nicht veraendern. Deshalb wird das Buendel
 * NICHT verlinkt; stattdessen kommen genau drei Dinge mit:
 *
 *   1. die Schriftarten (@font-face) - sonst stuende die Kopfzeile in der
 *      Systemschrift,
 *   2. die Eigenschaftsanmeldungen (@property) - Tailwind rechnet Schatten,
 *      Transformationen und Weichzeichner ueber --tw-* zusammen,
 *   3. die Designvariablen, aber NICHT auf :root, sondern auf der
 *      Kopfzeile selbst. So kann kein Variablenname der Spielewelt
 *      ueberschrieben werden; geerbt wird nach unten trotzdem.
 *
 * Alles Uebrige - Preflight eingeschlossen - bleibt draussen. Was die
 * Kopfzeile an Klassenregeln braucht, erzeugt designRegeln() weiter unten
 * bereits selbst, begrenzt auf header[data-kopf].
 */
function grundlagenAus(buendel) {
  const schriften = [];
  const eigenschaften = [];
  let variablen = '';
  let twVorgaben = '';

  // Brace-Zaehlung wie in bloeckeAus - erzeugtes CSS, kein Parser noetig.
  const durchgehen = (css) => {
    let i = 0;
    while (i < css.length) {
      const auf = css.indexOf('{', i);
      if (auf < 0) break;
      const kopf = css.slice(i, auf).trim();
      let tiefe = 1;
      let j = auf + 1;
      while (j < css.length && tiefe > 0) {
        if (css[j] === '{') tiefe += 1;
        else if (css[j] === '}') tiefe -= 1;
        j += 1;
      }
      const rumpf = css.slice(auf + 1, j - 1);
      if (/^@font-face$/.test(kopf)) schriften.push(`@font-face{${rumpf.trim()}}`);
      else if (/^@property\s/.test(kopf)) eigenschaften.push(`${kopf}{${rumpf.trim()}}`);
      else if (/^@layer\b/.test(kopf)) durchgehen(rumpf);
      else if (/^:root(\s*,\s*:host)?$/.test(kopf)) variablen += rumpf.trim().replace(/;?$/, ';');
      else if (/^\*\s*,/.test(kopf) && /--tw-/.test(rumpf)) twVorgaben += rumpf.trim().replace(/;?$/, ';');
      i = j;
    }
  };
  durchgehen(buendel);

  if (!schriften.length) throw new Error('kopfzeile-bestand: keine @font-face im Buendel');
  if (!variablen) throw new Error('kopfzeile-bestand: kein :root mit Designvariablen im Buendel');

  const zeilen = [
    '    /* ── Grundlagen des Designs, eng begrenzt ────────────────────',
    '',
    '       Nur Schriften, Eigenschaftsanmeldungen und Variablen. KEIN',
    '       Preflight: Der wuerde der Spielewelt Innenabstaende,',
    '       Aussenabstaende und Schriftstaerken nehmen. Siehe',
    '       tools/kopfzeile-bestand.mjs. */',
    ...schriften.map((s) => '    ' + s),
    ...eigenschaften.map((s) => '    ' + s),
    '',
    '    /* Die Designvariablen stehen auf der Kopfzeile, nicht auf :root -',
    '       so kann kein Name der Spielewelt ueberschrieben werden. */',
    `    header[data-kopf]{${variablen}}`,
  ];
  if (twVorgaben) {
    zeilen.push(
      '',
      '    /* Tailwinds --tw-*-Vorgaben, ebenfalls nur innerhalb der',
      '       Kopfzeile. Ohne sie blieben zusammengesetzte Werte wie',
      '       Schatten oder Weichzeichner leer. */',
      `    header[data-kopf],header[data-kopf] *,header[data-kopf] *::before,header[data-kopf] *::after{${twVorgaben}}`,
    );
  }
  zeilen.push('');
  return zeilen;
}

/**
 * Tailwinds Grundbereinigung ("Preflight") - aber NUR in der Kopfzeile.
 *
 * Sie steht im Buendel in `@layer base` und setzt Dinge, die keine Klasse
 * setzt: `img{display:block}`, `*{border:0 solid}`, `button{background:
 * transparent}` und so fort. Ohne sie stuende das Logo auf der Grundlinie
 * statt als Block - gemessen: display "inline" statt "block", dazu eine
 * Grundlinienluecke und ein um 4 px anderer Kasten.
 *
 * Global darf sie NICHT wirken: Die Spielewelt ist Bestand und rechnet mit
 * ihren eigenen Abstaenden. Genau das ging beim ersten Versuch schief, als
 * das ganze Buendel verlinkt war:
 *
 *     BUTTON.drive  padding-left  Bestand 6px  - mit Preflight 0px
 *     H2            font-weight   Bestand 700  - mit Preflight 400
 *
 * Deshalb wird jede Regel hier auf `header[data-kopf]` umgeschrieben:
 *   *          →  header[data-kopf], header[data-kopf] *
 *   html/body  →  header[data-kopf]   (was die Kopfzeile sonst erbt)
 *   img, …     →  header[data-kopf] img, …
 */
function preflightAus(buendel) {
  // Nur der Inhalt von @layer base - nicht theme, components, utilities.
  const grundlagen = [];
  let i = 0;
  while (i < buendel.length) {
    const auf = buendel.indexOf('{', i);
    if (auf < 0) break;
    const kopf = buendel.slice(i, auf).trim();
    let tiefe = 1;
    let j = auf + 1;
    while (j < buendel.length && tiefe > 0) {
      if (buendel[j] === '{') tiefe += 1;
      else if (buendel[j] === '}') tiefe -= 1;
      j += 1;
    }
    if (/^@layer\s+base$/.test(kopf)) grundlagen.push(...bloeckeAus(buendel.slice(auf + 1, j - 1)));
    i = j;
  }
  if (!grundlagen.length) throw new Error('kopfzeile-bestand: kein @layer base im Buendel');

  const umschreiben = (sel) => {
    const t = sel.trim();
    if (!t) return null;
    if (t === '*') return 'header[data-kopf],header[data-kopf] *';
    if (/^(html|:host|body)$/.test(t)) return 'header[data-kopf]';
    if (t.startsWith('::')) return `header[data-kopf] *${t}`;
    return `header[data-kopf] ${t}`;
  };

  const zeilen = [
    '    /* ── Grundbereinigung, nur in der Kopfzeile ──────────────────',
    '',
    '       Tailwinds Preflight, umgeschrieben auf header[data-kopf].',
    '       Global wuerde sie der Spielewelt Innenabstaende und',
    '       Schriftstaerken nehmen - gemessen. Siehe',
    '       tools/kopfzeile-bestand.mjs. */',
  ];
  let anzahl = 0;
  for (const b of grundlagen) {
    if (!b.rumpf) continue;
    if (b.umgebung.length) continue; // @media/@supports im Preflight: nicht noetig
    const teile = b.selektor.split(',').map(umschreiben).filter(Boolean);
    if (!teile.length) continue;
    const rumpf = b.rumpf
      .split(';')
      .map((d) => d.trim())
      .filter(Boolean)
      .map((d) => (d.includes('!important') ? d : `${d} !important`))
      .join(';');
    zeilen.push(`    ${teile.join(',')}{${rumpf}}`);
    anzahl += 1;
  }
  zeilen.push(`    /* ${anzahl} Grundregeln uebernommen. */`, '');
  return zeilen;
}

/**
 * Die Regeln der Kopfzeile ungeschichtet und begrenzt noch einmal ausgeben.
 * Rueckgabe: Zeilen fuer den <style>-Block.
 */
function designRegeln(kopfMarkup, buendel, skript = '') {
  const klassen = klassenAus(kopfMarkup);
  for (const k of klassenAusSkript(skript)) klassen.add(k);
  const zeilen = [
    '    /* ── Die Regeln des Designs, ungeschichtet ───────────────────',
    '',
    '       Erzeugt aus dem Design-Buendel: alle Regeln, deren Selektor',
    '       eine Klasse der Kopfzeile nennt, noch einmal - diesmal ohne',
    '       @layer und begrenzt auf header[data-kopf]. Grund: Tailwind',
    '       legt seine Klassen in @layer utilities, und ungeschichtetes',
    '       CSS wie style.css gewinnt dagegen immer.',
    '',
    '       Nicht von Hand gepflegt. Siehe tools/kopfzeile-bestand.mjs. */',
  ];

  /*
    Was NICHT ueber Klassen kommt: Schrift und Grundfarbe.

    Die Kopfzeile erbt beides im Design vom `body`. Auf der Bestandsseite
    erbt sie dagegen deren Werte - und `public-system.css` setzt fuer
    `body.tg-public :where(a, button, …)` zusaetzlich eine eigene Schrift.
    Gemessen: Die Verweise standen in "Segoe UI Variable Text" statt in
    Outfit, und es wurde keine einzige Design-Schrift geladen.

    Deshalb hier ausdruecklich - ueber die Variablen des Designs, nicht
    als abgeschriebene Werte. Die erzeugten Klassenregeln stehen danach
    und sind genauer; sie bleiben also wirksam.
  */
  zeilen.push(
    '    header[data-kopf],',
    '    header[data-kopf] a,',
    '    header[data-kopf] button,',
    '    header[data-kopf] span,',
    '    header[data-kopf] nav {',
    '      font-family: var(--font-sans);',
    '      font-variant-numeric: normal;',
    '      font-feature-settings: normal;',
    '    }',
    '    header[data-kopf] { color: var(--color-foreground); }',
    '',
    '    /* Das Design stellt Symbole als Block dar (Preflight). Die',
    '       Bestandsseite setzt fuer "button svg" inline-block - gemessen,',
    '       und das verschiebt die Symbole um die Grundlinie. */',
    '    header[data-kopf] svg { display: block; }',
    '',
    '    /* style.css:1334 erzwingt fuer JEDEN Knopf 15 px und',
    '       Schriftstaerke 850 - mit !important, also gegen jede normale',
    '       Regel. Betroffen ist hier allein der Menueknopf des Handys; er',
    '       hat keine eigene Schriftklasse und soll schlicht erben. */',
    '    header[data-kopf] button {',
    '      font-size: inherit !important;',
    '      font-weight: inherit !important;',
    '      min-height: 0 !important;',
    '      border-radius: 0 !important;',
    '    }',
    '',
  );

  const nachUmgebung = new Map();
  for (const b of bloeckeAus(buendel)) {
    if (!b.rumpf) continue;
    if (!betrifftKopf(b.selektor, klassen)) continue;
    // Jeden Teilselektor begrenzen. `:root` und `html` wuerden sonst als
    // Nachfahre der Kopfzeile gesucht und faenden nichts.
    const teile = b.selektor.split(',').map((t) => t.trim()).filter(Boolean)
      .filter((t) => !/^(:root|html|body)\b/.test(t))
      /*
        Zwei Schreibweisen je Teilselektor.

        Die Kopfzeile traegt ihre Klassen AM WURZELELEMENT selbst
        (border-b, bg-transparent, transition-…). Nur
        `header[data-kopf] .border-b` geschrieben, waere das ein
        Nachfahre - und traefe die Kopfzeile nicht. Gemessen: Sie war
        dadurch 80 statt 81 Pixel hoch, der untere Rand fehlte.
      */
      .flatMap((t) => (t.startsWith('.') ? [`header[data-kopf]${t}`, `header[data-kopf] ${t}`] : [`header[data-kopf] ${t}`]));
    if (!teile.length) continue;
    // Der Schluessel ist die Umgebung als Text - @media-Bloecke mit
    // gleicher Bedingung landen so zusammen.
    const schluessel = JSON.stringify(b.umgebung);
    if (!nachUmgebung.has(schluessel)) nachUmgebung.set(schluessel, []);
    /*
      Jede Deklaration bekommt !important.

      Nicht aus Bequemlichkeit: Die Bestandsdateien setzen an mehreren
      Stellen selbst !important auf Elementnamen - gemessen etwa
        button svg, … { width:22px!important; height:22px!important }
      aus style.css. Dagegen hilft keine Genauigkeit, nur Gleichstand.

      Das ist vertretbar, weil hier ausschliesslich Regeln stehen, die
      OHNEHIN fuer diese Kopfzeile gelten sollen, und weil sie samt und
      sonders auf `header[data-kopf]` begrenzt sind. Ausserhalb wirkt
      nichts davon. Inline-Stile koennten sie verdraengen - die Kopfzeile
      hat keine (geprueft: 0 style-Attribute).
    */
    const rumpfWichtig = b.rumpf
      .split(';')
      .map((d) => d.trim())
      .filter(Boolean)
      .map((d) => (d.includes('!important') ? d : `${d} !important`))
      .join(';');
    nachUmgebung.get(schluessel).push(teile.join(',') + '{' + rumpfWichtig + '}');
  }

  let anzahl = 0;
  for (const [schluessel, regeln] of nachUmgebung) {
    anzahl += regeln.length;
    const ebenen = JSON.parse(schluessel);
    if (!ebenen.length) {
      for (const r of regeln) zeilen.push('    ' + r);
      continue;
    }
    zeilen.push('    ' + ebenen.map((e) => e + '{').join(''));
    for (const r of regeln) zeilen.push('      ' + r);
    zeilen.push('    ' + '}'.repeat(ebenen.length));
  }

  if (!anzahl) {
    throw new Error('kopfzeile-bestand: keine Designregeln zur Kopfzeile gefunden - stimmt das Buendel?');
  }
  zeilen.push(`    /* ${anzahl} Regeln uebernommen. */`);
  return zeilen;
}

export default function kopfzeileBestand() {
  return {
    name: 'kopfzeile-bestand',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const ordner = dir.pathname.replace(/^\/([A-Za-z]:)/, '$1');
        const vorlagePfad = join(ordner, VORLAGE);
        if (!existsSync(vorlagePfad)) {
          logger.warn(`${VORLAGE} fehlt - Kopfzeile nicht uebernommen.`);
          return;
        }

        const vorlage = await readFile(vorlagePfad, 'utf8');
        const kopf = kopfHolen(vorlage);
        const skript = skriptHolen(vorlage);
        const stil = stilvorlageHolen(vorlage);

        // Lieber laut scheitern als still eine kaputte Kopfzeile ausliefern.
        if (!kopf) throw new Error('kopfzeile-bestand: kein <header data-kopf> in ' + VORLAGE);
        if (!skript) throw new Error('kopfzeile-bestand: kein Bedienskript mit data-kopf in ' + VORLAGE);
        if (!stil) throw new Error('kopfzeile-bestand: keine _astro-Stilvorlage in ' + VORLAGE);

        // Das Design-Buendel selbst - Quelle fuer die Regeln unten.
        const buendel = await readFile(join(ordner, stil.replace(/^\//, '')), 'utf8');

        let bearbeitet = 0;
        for (const seite of BETROFFENE_SEITEN) {
          const pfad = join(ordner, seite);
          if (!existsSync(pfad)) continue;
          let html = await readFile(pfad, 'utf8');
          if (html.includes(KOPF_ANFANG)) continue;

          /*
            BLOCK 1, vor </head>: die Stilvorlage und die Regel, die die
            alte Kopfzeile ausblendet.

            Die Stilvorlage steht VOR den Bestandsdateien. So gewinnen bei
            gleicher Genauigkeit weiterhin die Bestandsregeln - die
            Spielewelt bleibt, wie sie ist. Was die neue Kopfzeile
            braucht, holt sie sich ueber eigene Klassen.
          */
          const kopfBlock = [
            KOPF_ANFANG,
            '  <style>',
            ...grundlagenAus(buendel),
            ...preflightAus(buendel),
            '    /* Die alte Kopfzeile des Bestands bleibt im Dokument',
            '       stehen, damit die byteweise Pruefung moeglich bleibt -',
            '       sichtbar ist die freigegebene. */',
            '    header.topbar { display: none !important; }',
            '',
            '    /* Die Abdeckung der alten KLEBENDEN Kopfzeile. Sie lag mit',
            '       z-index 99 ueber allem und verdeckte die neue Kopfzeile',
            '       (z-index 40) vollstaendig - gemessen: schwarz auf schwarz,',
            '       nichts zu sehen. Die freigegebene Kopfzeile faerbt sich',
            '       beim Scrollen selbst ein und braucht keine Abdeckung. */',
            '    body.gameworld-body::after { display: none !important; }',
            '',
            '    /* Die Bestandsseite rechnet mit 114 px Kopfhoehe. Die',
            '       freigegebene misst 81 px am Schreibtisch und 65 px am',
            '       Handy - gemessen, nicht geschaetzt. Damit stimmen auch die',
            '       Sprungziele der Spielewelt wieder. */',
            '    body.gameworld-body { --tg-header-height: 81px; }',
            '    @media (max-width: 1023px) {',
            '      body.gameworld-body { --tg-header-height: 65px; }',
            '    }',
            '',
            '    /* Sprungziele unter der Kopfzeile halten.',
            '',
            '       Die Bestandsseite setzt scroll-padding-top: 84px - gerechnet',
            '       fuer ihre alte, 88 px hohe Kopfzeile. Gemessen mit der',
            '       freigegebenen: Der Titel "Gluecksrad" landete nach dem Sprung',
            '       59 Pixel unter dem oberen Rand und damit HINTER der 81 Pixel',
            '       hohen Kopfzeile - die restlichen Titel bei 84, also nur drei',
            '       Pixel darunter. Nachladende Bilder verschieben den Inhalt dabei',
            '       noch um rund 25 Pixel nach oben.',
            '',
            '       Deshalb Kopfhoehe plus 40 Pixel Luft: 121 am Schreibtisch,',
            '       105 am Handy. Auch eine spaete Verschiebung bleibt damit',
            '       unter der Kopfzeile sichtbar. */',
            '    html { scroll-padding-top: 121px !important; }',
            '    @media (max-width: 1023px) {',
            '      html { scroll-padding-top: 105px !important; }',
            '    }',
            '',
            ...designRegeln(kopf, buendel, skript),
            '  </style>',
            KOPF_ENDE,
          ].join('\n  ');

          html = html.replace('</head>', `${kopfBlock}\n</head>`);

          /*
            BLOCK 2, direkt nach <body>: die Kopfzeile selbst und ihr
            Bedienskript. Sie steht VOR der alten - so ist sie auch ohne
            JavaScript das erste, was im Dokument steht.
          */
          const koerperBlock = [
            KOPF_ANFANG,
            kopf,
            `<script type="module">${skript}</script>`,
            KOPF_ENDE,
          ].join('\n');

          html = html.replace(/(<body[^>]*>)/, `$1\n${koerperBlock}`);

          await writeFile(pfad, html, 'utf8');
          bearbeitet += 1;
        }

        logger.info(`Freigegebene Kopfzeile eingesetzt: ${bearbeitet} Bestandsseite(n)`);
      },
    },
  };
}
