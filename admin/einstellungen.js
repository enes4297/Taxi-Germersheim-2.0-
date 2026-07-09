(() => {
  function readRole() {
    if (!window.AdminDemoAuth || typeof window.AdminDemoAuth.readSession !== "function") {
      return null;
    }

    const session = window.AdminDemoAuth.readSession();
    return session && session.role ? session.role : null;
  }

  function applyRoleVisibility(role) {
    const sections = document.querySelectorAll("[data-settings-roles]");
    sections.forEach((section) => {
      const allowed = String(section.getAttribute("data-settings-roles") || "")
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);

      section.hidden = !allowed.includes(role);
    });
  }

  function bindContactForm() {
    const form = document.querySelector("[data-settings-contact-form]");
    const note = document.querySelector("[data-settings-save-note]");
    if (!form || !note) return;

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      note.textContent = `Demo - keine echten Änderungen gespeichert (${new Date().toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit"
      })})`;
    });
  }

  function bindNotificationToggles() {
    const wrap = document.querySelector("[data-settings-toggles]");
    const note = document.querySelector("[data-settings-toggle-note]");
    if (!wrap || !note) return;

    // Nur Demo-Benachrichtigungen ohne Backend
    wrap.addEventListener("change", (event) => {
      if (!event.target.matches("input[type='checkbox']")) return;
      note.textContent = "Demo - keine echten Änderungen gespeichert";
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    const role = readRole();
    if (role) {
      applyRoleVisibility(role);
    }
    bindContactForm();
    bindNotificationToggles();
  });
})();
