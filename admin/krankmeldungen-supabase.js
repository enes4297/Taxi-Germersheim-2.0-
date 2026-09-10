/*
 * krankmeldungen-supabase.js
 *
 * Zeigt die ueber das Mitarbeiterportal eingegangenen Krankmeldungen aus
 * public.sickness_reports an.
 *
 * Zugriff
 *   Die Policy sickness_reports_select_admin erlaubt das Lesen ausschliesslich
 *   Konten mit profiles.role = 'admin'. Disponenten sehen die Liste NICHT -
 *   das ist so vorgesehen und wird hier nicht umgangen. Fuer Konten ohne
 *   Berechtigung liefert die Abfrage schlicht keine Zeilen.
 *
 * Datenschutz
 *   Es werden nur Zeitraum, Quelle, Status und die freiwillige Notiz gezeigt.
 *   Diagnosen oder medizinische Angaben werden weder gespeichert noch
 *   dargestellt.
 *
 * Diese Datei aendert nichts an der Datenbank. Sie liest ausschliesslich.
 */
(() => {
  "use strict";

  const MOUNT = "[data-krankmeldungen-supabase]";

  const STATUS_TEXT = {
    submitted: "Eingegangen",
    in_review: "In Prüfung",
    accepted: "Anerkannt",
    closed: "Abgeschlossen"
  };

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatDate(iso) {
    const text = String(iso || "").trim();
    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return match ? `${match[3]}.${match[2]}.${match[1]}` : (text || "-");
  }

  function formatPeriod(start, end) {
    return end ? `${formatDate(start)} bis ${formatDate(end)}` : `ab ${formatDate(start)}`;
  }

  function statusText(value) {
    return STATUS_TEXT[String(value || "").toLowerCase()] || (value || "Eingegangen");
  }

  function setBody(html) {
    const node = document.querySelector(MOUNT);
    if (node) node.innerHTML = html;
  }

  function employeeName(row) {
    const e = row && row.employees;
    if (!e) return row?.employee_id || "-";
    const name = [e.first_name, e.last_name].filter(Boolean).join(" ").trim();
    return name || row.employee_id || "-";
  }

  async function getClient() {
    const bridge = window.TaxiSupabaseAuth;
    if (!bridge || typeof bridge.getClient !== "function") return null;
    return bridge.getClient();
  }

  async function load() {
    setBody('<p class="person-meta">Krankmeldungen werden geladen …</p>');

    const client = await getClient();
    if (!client) {
      setBody('<p class="person-meta">Keine Verbindung zur Datenbank. Es werden keine eingegangenen Krankmeldungen angezeigt.</p>');
      return;
    }

    /* employees wird mitgelesen, damit der Name statt der UUID erscheint.
       Faellt der Join wegen fehlender Rechte aus, greift der Fallback unten. */
    const { data, error } = await client
      .from("sickness_reports")
      .select("id, employee_id, start_date, expected_end_date, note, submission_source, status, created_at, employees(first_name, last_name)")
      .order("start_date", { ascending: false })
      .limit(200);

    if (error) {
      console.error("Krankmeldungen konnten nicht geladen werden.", error.code || error.message);
      setBody(
        '<p class="person-meta">Krankmeldungen konnten nicht geladen werden. ' +
        'Diese Ansicht ist nur fuer Administratoren freigegeben.</p>'
      );
      return;
    }

    const rows = Array.isArray(data) ? data : [];
    if (!rows.length) {
      setBody('<p class="person-meta">Keine über das Mitarbeiterportal eingegangenen Krankmeldungen vorhanden.</p>');
      return;
    }

    const body = rows.map((row) => `
      <tr>
        <td>${esc(employeeName(row))}</td>
        <td>${esc(formatPeriod(row.start_date, row.expected_end_date))}</td>
        <td>${esc(statusText(row.status))}</td>
        <td>${esc(row.submission_source || "-")}</td>
        <td>${esc(row.note || "-")}</td>
        <td>Nicht übermittelt</td>
      </tr>
    `).join("");

    setBody(`
      <div class="person-table-wrap">
        <table class="admin-table person-table person-table-compact">
          <thead>
            <tr>
              <th>Mitarbeiter</th>
              <th>Zeitraum</th>
              <th>Status</th>
              <th>Eingang über</th>
              <th>Notiz</th>
              <th>Nachweis</th>
            </tr>
          </thead>
          <tbody>${body}</tbody>
        </table>
      </div>
      <p class="person-meta">${rows.length} Eintrag/Einträge. Nachweise werden vom Portal derzeit nicht mitgesendet.</p>
    `);
  }

  function init() {
    if (!document.querySelector(MOUNT)) return;
    load().catch((err) => {
      console.error("Krankmeldungen konnten nicht geladen werden.", err?.message || err);
      setBody('<p class="person-meta">Krankmeldungen konnten nicht geladen werden.</p>');
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

  window.AdminKrankmeldungenSupabase = { load };
})();
