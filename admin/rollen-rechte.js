(() => {
  const S = window.AdminSystemCenter;
  if (!S) return;

  const state = { data: S.loadState() };

  function allowByDemoMatrix(role, area, right) {
    const r = S.normalize(role);
    const a = S.normalize(area);
    const x = S.normalize(right);

    if (r.includes("chef")) return true;
    if (x.includes("loesch") && !r.includes("admin") && !r.includes("geschaeftsleitung")) return false;
    if (x.includes("sensible") && (r.includes("fahrer") || r.includes("mitarbeiter") || r.includes("nur lesen"))) return false;
    if (a.includes("finanzen") && (r.includes("fahrer") || r.includes("werkstatt") || r.includes("mitarbeiter"))) return false;
    if (a.includes("benutzerverwaltung") && !r.includes("admin") && !r.includes("chef")) return false;
    if (r.includes("nur lesen") && !x.includes("ansehen")) return false;
    if (r.includes("fahrer") && (a.includes("personal") || a.includes("benutzerverwaltung"))) return false;
    return true;
  }

  function renderUsers() {
    const node = document.querySelector("[data-role-users]");
    if (!node) return;
    const users = S.getUsersForProfiles();
    node.innerHTML = users
      .map((u) => `<tr><td>${u.name}</td><td>${u.role}</td><td>${u.status}</td><td>${u.lastActivity}</td><td>${u.startPage}</td><td>${u.areas}</td></tr>`)
      .join("");
  }

  function renderPreviewForms() {
    const roles = S.ROLE_MATRIX.Rollen;

    const previewForm = document.querySelector("[data-role-preview-form]");
    if (previewForm && previewForm.elements.role.options.length === 0) {
      previewForm.elements.role.innerHTML = roles.map((r) => `<option value="${r}">${r}</option>`).join("");
    }

    const simForm = document.querySelector("[data-role-sim-form]");
    if (simForm) {
      if (simForm.elements.role.options.length === 0) {
        simForm.elements.role.innerHTML = roles.map((r) => `<option value="${r}">${r}</option>`).join("");
      }
      if (simForm.elements.area.options.length === 0) {
        simForm.elements.area.innerHTML = S.ROLE_MATRIX.Bereiche.map((a) => `<option value="${a}">${a}</option>`).join("");
      }
      if (simForm.elements.right.options.length === 0) {
        simForm.elements.right.innerHTML = S.ROLE_MATRIX.Rechte.map((x) => `<option value="${x}">${x}</option>`).join("");
      }
    }

    const note = document.querySelector("[data-role-preview-note]");
    if (note) {
      const preview = state.data.rolePreview || {};
      note.textContent = preview.active
        ? `Aktive Vorschau: ${preview.role} seit ${S.formatDateTime(preview.updatedAt || S.nowIso())}`
        : "Keine aktive Rollenvorschau.";
    }
  }

  function renderMatrix() {
    const table = document.querySelector("[data-role-matrix-table]");
    if (!table) return;

    const roles = S.ROLE_MATRIX.Rollen;
    const areas = S.ROLE_MATRIX.Bereiche;

    const head = `<thead><tr><th>Bereich</th>${roles.map((r) => `<th>${r}</th>`).join("")}</tr></thead>`;
    const body = `<tbody>${areas
      .map((area) => {
        const cells = roles
          .map((role) => {
            const canEdit = allowByDemoMatrix(role, area, "bearbeiten");
            const canApprove = allowByDemoMatrix(role, area, "freigeben");
            const label = canEdit && canApprove ? "Voll" : canEdit ? "Teil" : "Read";
            const cls = canEdit && canApprove ? "success" : canEdit ? "wichtig" : "normal";
            return `<td><span class="m-pill ${cls}">${label}</span></td>`;
          })
          .join("");
        return `<tr><td>${area}</td>${cells}</tr>`;
      })
      .join("")}</tbody>`;

    table.innerHTML = `${head}${body}`;
  }

  function renderActivity() {
    const node = document.querySelector("[data-role-activity]");
    if (!node) return;

    const rows = S.getActivityLog().filter((x) => x.area === "Benutzer").slice(0, 12);
    if (!rows.length) {
      node.innerHTML = '<p class="m-note">Noch keine Rollenereignisse protokolliert.</p>';
      return;
    }

    node.innerHTML = rows
      .map((row) => `<article class="m-item"><strong>${row.action}</strong><p>${row.note || ""}</p><p>${S.formatDateTime(row.at)} · ${row.user}</p></article>`)
      .join("");
  }

  function bindPreview() {
    const form = document.querySelector("[data-role-preview-form]");
    if (!form) return;

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const role = String(form.elements.role.value || "");
      S.setRolePreview(state.data, role, true);
      S.applyRolePreview(role);
      renderPreviewForms();
      window.alert(`Rollenvorschau aktiviert: ${role}. Seite wird neu geladen.`);
      window.location.reload();
    });

    const stop = document.querySelector("[data-role-stop-preview]");
    if (stop) {
      stop.addEventListener("click", () => {
        S.setRolePreview(state.data, "", false);
        const current = localStorage.getItem("demoAdminUser") || "admin";
        const users = {
          admin: "Chef",
          enes: "Chef",
          fatih: "Chef",
          geschaeft: "Geschaeftsleitung",
          dispo: "Disposition",
          disponent: "Disposition",
          abrechnung: "Buchhaltung",
          billing: "Buchhaltung",
          fahrer: "Fahrer",
          werkstatt: "Werkstatt",
          personal: "Personalverwaltung",
          qualitaet: "Qualitaetsmanagement",
          mitarbeiter: "Mitarbeiter"
        };
        localStorage.setItem("demoAdminRole", users[current] || "Chef");
        renderPreviewForms();
        window.alert("Rollenvorschau beendet. Urspruengliche Rolle wird wiederhergestellt.");
        window.location.reload();
      });
    }
  }

  function bindSimulation() {
    const form = document.querySelector("[data-role-sim-form]");
    const result = document.querySelector("[data-role-sim-result]");
    if (!form || !result) return;

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const role = String(form.elements.role.value || "");
      const area = String(form.elements.area.value || "");
      const right = String(form.elements.right.value || "");
      const allowed = allowByDemoMatrix(role, area, right);
      result.textContent = allowed
        ? `Erlaubt: ${role} darf ${right} in ${area} (Demo-Entscheidung).`
        : `Nicht erlaubt: ${role} darf ${right} in ${area} nicht (Demo-Entscheidung).`;
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderUsers();
    renderPreviewForms();
    renderMatrix();
    renderActivity();
    bindPreview();
    bindSimulation();
  });
})();
