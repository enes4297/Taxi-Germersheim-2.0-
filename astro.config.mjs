// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
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

  integrations: [bestandUebernehmen()],
});
