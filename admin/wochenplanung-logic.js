(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  root.AdminWeeklyPlanningLogic = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  function isEmployeeAbsentForDate(personnel, employeeId, dateIso) {
    const vacations = Array.isArray(personnel && personnel.vacations) ? personnel.vacations : [];
    const absences = Array.isArray(personnel && personnel.absences) ? personnel.absences : [];
    const activeVacation = vacations.some((entry) => entry.employeeId === employeeId && ["genehmigt", "teilweise genehmigt"].includes(entry.status) && dateIso >= entry.start && dateIso <= entry.end);
    const activeAbsence = absences.some((entry) => entry.employeeId === employeeId && entry.status !== "abgeschlossen" && dateIso >= entry.start && dateIso <= entry.expectedEnd);
    return activeVacation || activeAbsence;
  }

  function deriveWeeklyCellState({ employee, employeeId, personnel, dateIso, publishedRow, draftRow, vehicleConflicts, daysUntil, blocked, permitExpired }) {
    const row = draftRow || publishedRow || null;
    const vacation = isEmployeeAbsentForDate(personnel, employeeId, dateIso);
    const sick = (Array.isArray(personnel && personnel.absences) ? personnel.absences : []).some((entry) => entry.employeeId === employeeId && entry.kind === "Krank" && entry.status !== "abgeschlossen" && dateIso >= entry.start && dateIso <= entry.expectedEnd);
    const hasConflict = Boolean(row && row.vehicleLabel && Array.isArray(vehicleConflicts) && vehicleConflicts.some((conflict) => conflict.vehicle === row.vehicleLabel && conflict.entries.some((entry) => entry.employeeId === employeeId)));

    let status = "offen";
    let label = "Noch offen";
    let vehicle = "";
    let tone = "is-gold";
    let note = "";

    if (sick) {
      status = "krank";
      label = "Krank";
      tone = "is-red";
    } else if (vacation) {
      status = "urlaub";
      label = "Urlaub";
      tone = "is-gray";
    } else if (row) {
      if (row.status === "Frei") {
        status = "frei";
        label = "Frei";
        tone = "is-gray";
      } else if (row.shiftStart && row.shiftEnd) {
        status = "dienst";
        label = `${row.shiftStart}–${row.shiftEnd}`;
        tone = "is-green";
        vehicle = row.vehicleLabel || row.vehicle || "";
      } else {
        status = "offen";
        label = "Noch offen";
        tone = "is-gold";
      }

      if (hasConflict) {
        status = "konflikt";
        label = "Konflikt";
        tone = "is-red";
        note = "Fahrzeugkonflikt";
      }

      if (permitExpired) {
        note = note ? `${note} · P-Schein abgelaufen` : "P-Schein abgelaufen";
        tone = tone === "is-green" ? "is-blue" : tone;
      }

      if (row && row.shiftStart && row.shiftEnd && row.vehicleLabel === "") {
        tone = "is-gold";
        label = `${row.shiftStart}–${row.shiftEnd}`;
      }
    } else if (blocked) {
      status = "gesperrt";
      label = "Gesperrt";
      tone = "is-red";
    } else if (permitExpired) {
      status = "info";
      label = "P-Schein abgelaufen";
      tone = "is-blue";
    }

    if (typeof daysUntil === "function" && employee && employee.pPermitValidUntil && daysUntil(employee.pPermitValidUntil) < 0) {
      note = note ? `${note} · P-Schein abgelaufen` : "P-Schein abgelaufen";
    }

    return {
      status,
      label,
      vehicle,
      tone,
      note,
      row,
      sick,
      vacation,
      blocked: Boolean(blocked),
      permitExpired: Boolean(permitExpired)
    };
  }

  return { deriveWeeklyCellState };
});
