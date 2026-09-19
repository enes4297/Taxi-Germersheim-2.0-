// @ts-check
import { defineConfig } from 'astro/config';
import bestandUebernehmen from './tools/bestand-uebernehmen.mjs';

// Grundgeruest fuer die oeffentliche Webseite.
//
// Nur der oeffentliche Bereich wird gebaut. Zentrale (admin/),
// Mitarbeiterportal (fahrer/) und Dashboard bleiben unveraendert und werden
// nach dem Build Datei fuer Datei uebernommen - siehe tools/bestand-uebernehmen.mjs.
export default defineConfig({
  // Eigener Ausgabeordner. "dist" bleibt frei, damit nichts mit der
  // Designvorschau verwechselt wird.
  outDir: './dist-oeffentlich',

  // Statische Dateien der oeffentlichen Seiten. Noch leer: In diesem Schritt
  // wird keine Bestandsseite ersetzt.
  publicDir: './public',

  // WICHTIG fuer den Erhalt der bestehenden URLs.
  // "file" erzeugt impressum.html statt impressum/index.html. Nur so bleiben
  // die 21 gewachsenen Adressen der Wurzel unveraendert gueltig.
  build: { format: 'file' },

  // Alles wird vorab erzeugt, kein Server noetig - wie bisher.
  output: 'static',

  integrations: [bestandUebernehmen()],
});
