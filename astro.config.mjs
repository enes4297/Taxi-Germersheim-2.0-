// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import bestandUebernehmen from './tools/bestand-uebernehmen.mjs';
import suchmaschinenDateien from './tools/suchmaschinen-dateien.mjs';
import kopfangabenBestand from './tools/kopfangaben-bestand.mjs';
import kopfzeileBestand from './tools/kopfzeile-bestand.mjs';

// Grundgeruest fuer die oeffentliche Webseite.
//
// Nur der oeffentliche Bereich wird gebaut. Zentrale (admin/),
// Mitarbeiterportal (fahrer/) und Dashboard bleiben unveraendert und werden
// nach dem Build Datei fuer Datei uebernommen - siehe tools/bestand-uebernehmen.mjs.
export default defineConfig({
  // Die Adresse, unter der die Seite spaeter steht - Auskunft der
  // Geschaeftsfuehrung vom 20.09.2026. Sie wird NUR fuer Angaben gebraucht,
  // die zwingend vollstaendig sein muessen: canonical, Open Graph und die
  // sitemap.xml. Suchmaschinen und Messengerdienste verlangen dort eine
  // vollstaendige Adresse; ein relativer Pfad ist dort wertlos.
  //
  // WICHTIG - oertliche Vorschau und Veroeffentlichung sind zweierlei:
  // In der oertlichen Vorschau (127.0.0.1:5200) stehen diese Angaben also
  // bereits auf die spaetere Domain. Das ist richtig so und loest nichts aus:
  // Es sind Textangaben im Seitenkopf, keine Weiterleitung. Wer oertlich
  // klickt, bleibt oertlich. Veroeffentlicht wird nichts durch den Build -
  // der Austausch gegen WordPress ist ein eigener Vorgang beim IT-Dienstleister.
  //
  // Sollte der Auftritt doch unter einem Unterpfad liegen, kommt `base` dazu.
  site: 'https://taxigermersheim.de',

  // Eigener Ausgabeordner. "dist" bleibt frei, damit nichts mit der
  // Designvorschau verwechselt wird.
  outDir: './dist-oeffentlich',

  // Statische Dateien der neuen oeffentlichen Seiten: Hero-Medien,
  // Fahrzeugbilder und die oertlich ausgelieferten Schriften. Alles daraus
  // landet unveraendert im Ausgabeordner - zusammen mit dem Bestand. Gegen
  // gleichnamige Dateien schuetzt konflikteSuchen() im Uebernahme-Werkzeug.
  publicDir: './public',

  // WICHTIG fuer den Erhalt der bestehenden URLs.
  // "file" erzeugt impressum.html statt impressum/index.html. Nur so bleiben
  // die 21 gewachsenen Adressen der Wurzel unveraendert gueltig.
  build: { format: 'file' },

  // Alles wird vorab erzeugt, kein Server noetig - wie bisher.
  output: 'static',

  // Fester Port fuer 'npm run dev' und 'npm run preview', damit der Link
  // gleich bleibt. Nur auf 127.0.0.1 - kein Zugriff aus dem Netz.
  server: { host: '127.0.0.1', port: 5200 },

  // Tailwind v4 als Vite-Zusatz. Die freigegebene Gestaltung ist in der
  // Vorschau damit gebaut; eine Nachbildung in Hand-CSS wuerde nur
  // Abweichungen erzeugen. Das Ergebnis ist gewoehnliches CSS.
  vite: { plugins: [tailwindcss()] },

  // Reihenfolge ist bedeutungstragend:
  //   1. bestandUebernehmen  kopiert die Bestandsseiten in den Ausgabeordner
  //   2. kopfzeileBestand    setzt in spiele.html die freigegebene Kopfzeile
  //                          ein - geholt aus einer FERTIG GEBAUTEN
  //                          Astro-Seite, also nach dem Kopieren und vor
  //                          allem, was am Kopfbereich noch ergaenzt wird
  //   3. kopfangabenBestand  ergaenzt dort Symbole, canonical und noindex -
  //                          es muss also NACH dem Kopieren laufen
  //   4. suchmaschinenDateien schreibt robots.txt und sitemap.xml
  integrations: [bestandUebernehmen(), kopfzeileBestand(), kopfangabenBestand(), suchmaschinenDateien()],
});
