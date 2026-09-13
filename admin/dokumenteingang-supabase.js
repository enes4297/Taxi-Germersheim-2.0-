/*
 * dokumenteingang-supabase.js
 *
 * Zeigt die ueber das Mitarbeiterportal eingereichten Nachweise aus
 * public.document_submissions und oeffnet die Dateien ueber kurz gueltige
 * signierte URLs.
 *
 * Zugriff
 *   document_submissions_select_admin erlaubt das Lesen ausschliesslich
 *   Konten mit profiles.role = 'admin'. Disponenten sehen die Liste NICHT.
 *   Der Bucket 'employee-documents' ist privat; die Storage-Policy
 *   employee_documents_select_admin erlaubt aktiven Admins den Lesezugriff.
 *
 * Diese Datei liest ausschliesslich. Kein Freigabe- oder Pruefprozess.
 * Kein Service-Role-Key - es wird derselbe Client wie im uebrigen
 * Adminbereich verwendet, der nur mit dem Publishable Key arbeitet.
 */
(() => {
  "use strict";

  const MOUNT = "[data-dokumenteingang-supabase]";
  const BUCKET = "employee-documents";
  const SIGNED_URL_SECONDS = 60;

  let rows = [];

  const STATUS_TEXT = {
    submitted: "Neu eingereicht",
    in_review: "In Prüfung",
    accepted: "Anerkannt",
    rejected: "Abgelehnt"
  };

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatDateTime(iso) {
    const text = String(iso || "");
    const m = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[3]}.${m[2]}.${m[1]}` : (text || "-");
  }

  function employeeName(row) {
    const e = row && row.employees;
    if (!e) return row?.employee_id || "-";
    const name = [e.first_name, e.last_name].filter(Boolean).join(" ").trim();
    return name || row.employee_id || "-";
  }

  function setBody(html) {
    const node = document.querySelector(MOUNT);
    if (node) node.innerHTML = html;
  }

  async function getClient() {
    const bridge = window.TaxiSupabaseAuth;
    if (!bridge || typeof bridge.getClient !== "function") return null;
    return bridge.getClient();
  }

  async function load() {
    setBody('<p class="person-meta">Dokumenteingang wird geladen …</p>');

    const client = await getClient();
    if (!client) {
      setBody('<p class="person-meta">Keine Verbindung zur Datenbank. Es werden keine Einreichungen angezeigt.</p>');
      return;
    }

    const { data, error } = await client
      .from("document_submissions")
      .select("id, employee_id, document_type_id, file_path, file_name, mime_type, status, note, submitted_at, employees(first_name, last_name), document_types(label)")
      .order("submitted_at", { ascending: false })
      .limit(200);

    if (error) {
      console.error("Dokumenteingang konnte nicht geladen werden.", error.code || error.message);
      setBody(
        '<p class="person-meta">Dokumenteingang konnte nicht geladen werden. ' +
        'Diese Ansicht ist nur fuer Administratoren freigegeben.</p>'
      );
      return;
    }

    rows = Array.isArray(data) ? data : [];
    if (!rows.length) {
      setBody('<p class="person-meta">Keine über das Mitarbeiterportal eingereichten Nachweise vorhanden.</p>');
      return;
    }

    const body = rows.map((row) => `
      <tr>
        <td>${esc(employeeName(row))}</td>
        <td>${esc(row.document_types?.label || "Dokument")}</td>
        <td>${esc(row.file_name || "-")}</td>
        <td>${esc(formatDateTime(row.submitted_at))}</td>
        <td>${esc(STATUS_TEXT[String(row.status || "").toLowerCase()] || row.status || "-")}</td>
        <td>${esc(row.note || "-")}</td>
        <td><button class="admin-btn admin-btn-secondary" type="button" data-dokument-oeffnen="${esc(row.id)}">Öffnen</button></td>
      </tr>
    `).join("");

    setBody(`
      <div class="person-table-wrap">
        <table class="admin-table person-table person-table-compact">
          <thead>
            <tr>
              <th>Mitarbeiter</th><th>Art</th><th>Datei</th><th>Eingegangen</th>
              <th>Status</th><th>Notiz</th><th>Aktion</th>
            </tr>
          </thead>
          <tbody>${body}</tbody>
        </table>
      </div>
      <p class="person-meta" data-dokumenteingang-hinweis>${rows.length} Einreichung(en). Dateien liegen in einem privaten Speicher und werden über kurz gültige Links geöffnet.</p>
    `);
  }

  /* Datei oeffnen. Das Fenster wird synchron im Klick geoeffnet, sonst
     verwirft der Popup-Blocker den spaeteren Aufruf. Die signierte Adresse
     wird nachgereicht und ist nur kurz gueltig. */
  function bindOpen() {
    document.addEventListener("click", (event) => {
      const trigger = event.target.closest("[data-dokument-oeffnen]");
      if (!trigger) return;
      event.preventDefault();

      const row = rows.find((r) => r.id === trigger.getAttribute("data-dokument-oeffnen"));
      if (!row || !row.file_path) return;

      const fenster = window.open("", "_blank");
      if (fenster) {
        try { fenster.opener = null; } catch (_e) { /* egal */ }
      }
      trigger.disabled = true;

      getClient()
        .then((client) => {
          if (!client) return null;
          return client.storage.from(BUCKET).createSignedUrl(row.file_path, SIGNED_URL_SECONDS);
        })
        .then((result) => {
          const url = result?.data?.signedUrl || null;
          if (url && fenster) {
            fenster.location.href = url;
            return;
          }
          if (fenster) fenster.close();
          const hinweis = document.querySelector("[data-dokumenteingang-hinweis]");
          if (hinweis) hinweis.textContent = "Die Datei konnte nicht geöffnet werden. Bitte Berechtigung prüfen.";
        })
        .catch((err) => {
          console.error("Signierte URL konnte nicht erzeugt werden.", err?.message || err);
          if (fenster) fenster.close();
        })
        .finally(() => { trigger.disabled = false; });
    });
  }

  function init() {
    if (!document.querySelector(MOUNT)) return;
    bindOpen();
    load().catch((err) => {
      console.error("Dokumenteingang konnte nicht geladen werden.", err?.message || err);
      setBody('<p class="person-meta">Dokumenteingang konnte nicht geladen werden.</p>');
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

  window.AdminDokumenteingangSupabase = { load };
})();
