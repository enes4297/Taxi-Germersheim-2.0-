(() => {
  "use strict";

  const DEMO_SESSION_KEY = "tgEmployeeDemoSession";
  const loginForm = document.querySelector("[data-employee-login-form]");
  const messageNode = document.querySelector("[data-login-message]");
  const demoHintNode = document.querySelector("[data-demo-hint]");

  /* ------------------------------------------------------------------ */
  /* UI-Hilfsfunktionen                                                  */
  /* ------------------------------------------------------------------ */

  function setMessage(text, kind = "info") {
    if (!messageNode) return;
    messageNode.textContent = text;
    messageNode.hidden = false;
    messageNode.className = "demo-note" + (kind === "error" ? " is-error" : "");
  }

  function clearMessage() {
    if (!messageNode) return;
    messageNode.hidden = true;
    messageNode.textContent = "";
  }

  function setLoading(loading) {
    const btn = loginForm?.querySelector('[type="submit"]');
    if (!btn) return;
    btn.disabled = loading;
    btn.textContent = loading ? "Anmeldung läuft …" : "Anmelden";
  }

  /* ------------------------------------------------------------------ *
   * KEIN DEMO-ZUGANG MEHR
   *
   * Hier stand ein Rueckfall: War Supabase nicht eingerichtet, kam man mit
   * "demo" / "demo" hinein, und eine Marke im Browserspeicher galt danach
   * als Anmeldung. Das Portal zeigte dann erfundene Personen aus den
   * Vorgabedaten.
   *
   * In der Messung liess sich der Zugang zwar nicht ausloesen - das
   * E-Mail-Feld weist "demo" als ungueltig ab, bevor das Formular
   * absendet. Wirksam war aber der Hinweis darunter: Er nannte
   * Zugangsdaten, sobald die Konfiguration ausfiel.
   *
   * Beides ist entfernt. Ohne eingerichtete Verbindung gibt es keine
   * Anmeldung, und das wird gesagt, statt sie vorzutaeuschen.
   * ------------------------------------------------------------------ */

  /* ------------------------------------------------------------------ */
  /* Supabase-Login                                                      */
  /* ------------------------------------------------------------------ */

  async function handleSupabaseLogin(email, password) {
    setLoading(true);
    clearMessage();
    try {
      await window.EmployeeSupabase.signIn(email, password);
      /* Supabase verwahrt die Session selbst (localStorage via GoTrueClient). */
      /* Nur ein minimaler Marker für den Reload-Schutz. */
      /* Nur Bequemlichkeit, keine Entscheidung — siehe portalSperren() in
         mitarbeiter.js. Bei gesperrtem Browserspeicher geht es ohne
         weiter, statt die Anmeldung abzubrechen. */
      try {
        localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify({
          authenticated: true,
          provider: "supabase"
        }));
      } catch { /* gesperrter Browserspeicher */ }
      window.location.assign("mitarbeiter.html");
    } catch (err) {
      setLoading(false);
      setMessage(err.message || "Anmeldung fehlgeschlagen.", "error");
    }
  }

  /* ------------------------------------------------------------------ */
  /* Formular-Listener                                                   */
  /* ------------------------------------------------------------------ */

  async function handleSubmit(event) {
    event.preventDefault();
    if (!loginForm) return;

    const formData = new FormData(loginForm);
    const emailOrUser = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "").trim();

    if (!emailOrUser || !password) {
      setMessage("Bitte E-Mail-Adresse und Passwort eingeben.", "error");
      return;
    }

    const ES = window.EmployeeSupabase;

    if (ES && ES.isConfigured()) {
      await handleSupabaseLogin(emailOrUser, password);
    } else {
      /* Kein Ersatzweg. Ehrlich sagen, woran es liegt. */
      setMessage(
        "Die Anmeldung ist gerade nicht möglich, weil die Verbindung zum "
        + "System nicht eingerichtet ist. Bitte wenden Sie sich an die Zentrale.",
        "error"
      );
    }
  }

  /* ------------------------------------------------------------------ */
  /* Init                                                                */
  /* ------------------------------------------------------------------ */

  /**
   * Grund einer Rueckleitung aus dem Portal anzeigen.
   *
   * Das Portal haengt bei einer Sperre `?grund=…` an. Die Texte sagen, was
   * los ist, ohne etwas zu verraten: kein Dienstwortlaut, keine Kennung,
   * keine Auskunft darueber, ob es ein Konto gibt.
   */
  function grundAnzeigen() {
    const params = new URLSearchParams(window.location.search);
    const grund = params.get("grund");
    if (params.get("abmeldung") === "unbestaetigt") {
      setMessage(
        "Sie sind auf diesem Gerät abgemeldet. Der Abschluss der Abmeldung "
        + "wurde allerdings nicht bestätigt — falls Sie an weiteren Geräten "
        + "angemeldet sind, melden Sie sich dort bitte ebenfalls ab.",
        "error"
      );
      return;
    }
    if (grund === "nicht-eingerichtet") {
      setMessage(
        "Die Verbindung zum System ist nicht eingerichtet. Bitte wenden Sie "
        + "sich an die Zentrale.",
        "error"
      );
    } else if (grund === "nicht-erreichbar") {
      setMessage(
        "Das System war gerade nicht erreichbar. Bitte melden Sie sich neu an.",
        "error"
      );
    } else if (grund === "abgemeldet") {
      setMessage("Bitte melden Sie sich an.");
    }
    if (grund || params.get("abmeldung")) {
      /* Den Grund aus der Adresszeile nehmen - er gehoert nicht in den
         Verlauf und nicht in ein Bildschirmfoto. */
      if (window.history?.replaceState) {
        window.history.replaceState(null, document.title, window.location.pathname);
      }
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    const ES = window.EmployeeSupabase;

    /* Der Demo-Hinweis nannte Zugangsdaten. Er wird nie mehr gezeigt und
       zur Sicherheit auch aus dem Dokument genommen. */
    if (demoHintNode) demoHintNode.remove();

    if (ES && ES.isConfigured()) {
      const emailInput = loginForm?.querySelector('[name="email"]');
      if (emailInput) emailInput.placeholder = "mitarbeiter@taxi-germersheim.de";
    } else {
      setMessage(
        "Die Anmeldung ist gerade nicht möglich, weil die Verbindung zum "
        + "System nicht eingerichtet ist. Bitte wenden Sie sich an die Zentrale.",
        "error"
      );
    }

    grundAnzeigen();

    if (loginForm) {
      loginForm.addEventListener("submit", handleSubmit);
    }
  });
})();
