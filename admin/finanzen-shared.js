(() => {
  const KEY = "adminV16FinanceState";
  const V15_KEY = "adminV15DriverOps";
  const DISPO_KEY = "adminLiveDispoV131";

  const STATUS = {
    billing: [
      "noch nicht geprueft",
      "vollstaendig",
      "Dokument fehlt",
      "Rueckfrage Fahrer",
      "Rueckfrage Kunde",
      "Rueckfrage Krankenkasse",
      "Korrektur erforderlich",
      "freigegeben",
      "Rechnung erstellt",
      "eingereicht",
      "bezahlt",
      "abgelehnt",
      "storniert"
    ],
    invoice: [
      "Entwurf",
      "geprueft",
      "erstellt",
      "versendet",
      "zugestellt",
      "teilweise bezahlt",
      "bezahlt",
      "ueberfaellig",
      "storniert",
      "Gutschrift",
      "Mahnung"
    ],
    payment: ["erwartet", "erfasst", "bestaetigt", "teilweise", "fehlgeschlagen", "zurueckgebucht", "erstattet", "ungeklaert"],
    reminder: ["Erinnerung", "erste Mahnung", "zweite Mahnung", "letzte Mahnung", "Inkasso pruefen", "gesperrt", "geklaert"],
    checkCase: ["neu", "zugewiesen", "in Bearbeitung", "wartet auf Rueckmeldung", "geklaert", "geschlossen", "ignoriert"]
  };

  const ASSIGNEES = ["Admin Enes", "Admin Fatih", "Disponent 1", "Disponent 2", "Abrechnung", "Buchhaltung"];

  function nowIso() {
    return new Date().toISOString();
  }

  function todayIso() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function timeNow() {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }

  function clone(v) {
    return JSON.parse(JSON.stringify(v));
  }

  function safeParse(raw) {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function formatEuro(value) {
    return `${Number(value || 0).toFixed(2).replace(".", ",")} EUR`;
  }

  function normalize(v) {
    return String(v || "").toLocaleLowerCase("de-DE").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function createDefaultState() {
    const baseRides = buildRides();
    const invoices = buildInvoices(baseRides);
    const payments = buildPayments(baseRides, invoices);
    const insurers = buildInsurers();
    const insurerCases = buildInsurerCases(baseRides);
    const companies = buildCompanies(baseRides, invoices);
    const reminders = buildReminders(invoices);
    const costs = buildCosts();
    const checkCases = buildCheckCases(baseRides, invoices, payments);

    return {
      version: 1,
      lastUpdatedAt: nowIso(),
      ui: {
        filters: {},
        monthClosed: false,
        monthClosedAt: "",
        closedMonthKey: ""
      },
      rides: baseRides,
      invoices,
      payments,
      insurers,
      insurerCases,
      insurerBatches: [
        { id: "KB-2608-01", insurer: "AOK Pfalz", status: "in Pruefung", rideIds: ["TG-1049", "TG-1051", "TG-8120"], total: 524.2, coPayTotal: 18, submittedAt: "2026-08-01", feedback: "Rueckfrage zu Transportschein TG-1051" },
        { id: "KB-2608-02", insurer: "TK Rheinland-Pfalz", status: "Entwurf", rideIds: ["TG-8102", "TG-8119"], total: 262.8, coPayTotal: 10, submittedAt: "", feedback: "" }
      ],
      insurerQuestions: [
        { id: "KQ-100", insurer: "AOK Pfalz", patient: "Nora Winter", rideId: "TG-1051", amount: 96.4, receivedAt: "2026-08-02", dueAt: "2026-08-08", owner: "Abrechnung", status: "offen", note: "Unterschrift auf Transportschein fehlt" },
        { id: "KQ-101", insurer: "IKK Suedwest", patient: "Helga Maurer", rideId: "TG-8120", amount: 88.0, receivedAt: "2026-08-01", dueAt: "2026-08-06", owner: "Buchhaltung", status: "in Bearbeitung", note: "Strecke nicht nachvollziehbar" }
      ],
      companies,
      reminders,
      costs,
      vehicleEconomy: buildVehicleEconomy(costs),
      monthlyChecklist: buildMonthlyChecklist(),
      monthBlocks: buildMonthProblems(),
      checkCases,
      notifications: buildFinanceNotifications(),
      exports: {
        lastRun: "",
        history: []
      }
    };
  }

  function buildRides() {
    const dispo = safeParse(localStorage.getItem(DISPO_KEY));
    const dispoOrders = dispo && Array.isArray(dispo.orders) ? dispo.orders : [];
    const v15 = safeParse(localStorage.getItem(V15_KEY));
    const v15Payments = v15 && Array.isArray(v15.payments) ? v15.payments : [];
    const today = todayIso();

    const mapped = dispoOrders.slice(0, 20).map((o, idx) => {
      const meter = 35 + idx * 4.7;
      const fixed = o.pricing && normalize(o.pricing).includes("festpreis") ? Number(String(o.pricing).replace(/[^0-9,.]/g, "").replace(",", ".")) || 0 : 0;
      const fare = fixed || meter;
      const payType = o.billingType || (idx % 3 === 0 ? "Bar" : idx % 3 === 1 ? "Karte" : "Rechnung");
      const customerType = payType === "Krankenkasse" ? "Patient" : payType === "Rechnung" ? "Firmenkunde" : "Privatkunde";
      const transStatus = payType === "Krankenkasse" ? (idx % 4 === 0 ? "fehlt" : "vorhanden") : "nicht erforderlich";
      const approvalStatus = payType === "Krankenkasse" ? (idx % 5 === 0 ? "abgelaufen" : "gueltig") : "nicht erforderlich";
      const receiptStatus = payType === "Karte" && idx % 4 === 0 ? "fehlt" : "vorhanden";
      const diff = idx % 6 === 0 ? 12.5 : 0;
      return {
        orderNo: o.id,
        rideId: `R-${8100 + idx}`,
        date: o.date || today,
        time: o.time || "08:00",
        customer: o.customer || "Demo Kunde",
        customerType,
        pickup: o.pickup || "-",
        destination: o.destination || "-",
        rideType: o.rideType || "Taxi",
        driver: o.driverId || "nicht zugewiesen",
        vehicle: o.vehicleId || "nicht zugewiesen",
        meterAmount: Number(meter.toFixed(2)),
        fixedPrice: Number(fixed.toFixed(2)),
        surcharge: idx % 3 === 0 ? 4.5 : 0,
        tip: idx % 4 === 0 ? 2.5 : 0,
        voucher: idx % 8 === 0 ? 5 : 0,
        cashAmount: payType === "Bar" ? fare : 0,
        cardAmount: payType === "Karte" ? fare : 0,
        invoiceAmount: payType === "Rechnung" || payType === "Krankenkasse" ? fare : 0,
        reimbursementAmount: payType === "Krankenkasse" ? Math.max(0, fare - 10) : 0,
        openDiff: diff,
        paymentType: payType,
        billingType: payType === "Krankenkasse" ? "Krankenkasse" : payType === "Rechnung" ? "Sammelrechnung" : "Direktzahlung",
        receiptStatus,
        approvalStatus,
        transportStatus: transStatus,
        invoiceStatus: payType === "Bar" || payType === "Karte" ? "nicht erforderlich" : "offen",
        checkStatus: idx % 5 === 0 ? "noch nicht geprueft" : "vollstaendig",
        insurer: payType === "Krankenkasse" ? ["AOK Pfalz", "TK Rheinland-Pfalz", "IKK Suedwest"][idx % 3] : "",
        company: payType === "Rechnung" ? ["RheinBahn Service GmbH", "LogiTrans Rhein", "Mecasoft GmbH"][idx % 3] : "",
        permitNo: payType === "Krankenkasse" ? `GEN-26-${200 + idx}` : "",
        insuranceNo: payType === "Krankenkasse" ? `KV-${5000 + idx}` : "",
        permitFrom: "2026-01-01",
        permitTo: idx % 4 === 0 ? "2026-07-31" : "2026-12-31",
        returnAllowed: idx % 3 !== 0,
        waitMin: 5 + (idx % 6) * 4,
        plannedKm: 8 + (idx % 9) * 2,
        actualKm: 9 + (idx % 9) * 2 + (idx % 5 === 0 ? 8 : 0),
        startedAt: `${o.date || today}T${o.time || "08:00"}:00`,
        endedAt: `${o.date || today}T${String(Math.min(23, Number((o.time || "08:00").split(":")[0]) + 1)).padStart(2, "0")}:${(o.time || "08:00").split(":")[1]}:00`,
        internalNote: o.notes || "",
        timeline: [{ at: nowIso(), text: "Fall in Abrechnung uebernommen" }]
      };
    });

    const fromV15 = v15Payments.slice(0, 8).map((p, idx) => ({
      orderNo: `TG-V15-${idx + 1}`,
      rideId: `R-V15-${idx + 1}`,
      date: String(p.at || today).slice(0, 10),
      time: String(p.at || "").slice(11, 16) || timeNow(),
      customer: "Fahrerportal Demo",
      customerType: "Privatkunde",
      pickup: "Germersheim",
      destination: "Germersheim",
      rideType: "Taxi",
      driver: p.driverId || "101",
      vehicle: "VEH-201",
      meterAmount: Number(p.meter || p.fare || 0),
      fixedPrice: Number(p.fixed || 0),
      surcharge: 0,
      tip: Number(p.tip || 0),
      voucher: Number(p.voucher || 0),
      cashAmount: p.paymentType === "Bar" ? Number(p.fare || 0) : 0,
      cardAmount: p.paymentType === "Karte" ? Number(p.fare || 0) : 0,
      invoiceAmount: 0,
      reimbursementAmount: 0,
      openDiff: Number(p.rest || 0),
      paymentType: p.paymentType || "Bar",
      billingType: "Direktzahlung",
      receiptStatus: p.paymentType === "Karte" && !p.receipt ? "fehlt" : "vorhanden",
      approvalStatus: "nicht erforderlich",
      transportStatus: "nicht erforderlich",
      invoiceStatus: "nicht erforderlich",
      checkStatus: "noch nicht geprueft",
      insurer: "",
      company: "",
      permitNo: "",
      insuranceNo: "",
      permitFrom: "",
      permitTo: "",
      returnAllowed: true,
      waitMin: 0,
      plannedKm: 5,
      actualKm: 5,
      startedAt: p.at || nowIso(),
      endedAt: p.at || nowIso(),
      internalNote: p.note || "Import aus Fahrerportal",
      timeline: [{ at: nowIso(), text: "Import aus Fahrerportal" }]
    }));

    return [...mapped, ...fromV15];
  }

  function buildInvoices(rides) {
    const invoiceRides = rides.filter((r) => r.billingType === "Sammelrechnung" || r.billingType === "Krankenkasse");
    return invoiceRides.slice(0, 16).map((r, idx) => {
      const issueDate = r.date;
      const dueDate = `2026-08-${String(10 + (idx % 15)).padStart(2, "0")}`;
      const paid = idx % 5 === 0 ? r.invoiceAmount : idx % 4 === 0 ? r.invoiceAmount * 0.5 : 0;
      const open = Number((r.invoiceAmount - paid).toFixed(2));
      const status = open === 0 ? "bezahlt" : idx % 3 === 0 ? "ueberfaellig" : paid > 0 ? "teilweise bezahlt" : "versendet";
      return {
        id: `RG-26-${1200 + idx}`,
        kind: r.billingType === "Krankenkasse" ? "Krankenkasse" : "Firmenkunde",
        customer: r.billingType === "Krankenkasse" ? r.insurer : r.company,
        customerNo: r.billingType === "Krankenkasse" ? `IK-${900000 + idx}` : `FK-${3000 + idx}`,
        orderNo: r.orderNo,
        issueDate,
        dueDate,
        net: Number((r.invoiceAmount / 1.19).toFixed(2)),
        vat: Number((r.invoiceAmount - r.invoiceAmount / 1.19).toFixed(2)),
        gross: Number(r.invoiceAmount.toFixed(2)),
        paid: Number(paid.toFixed(2)),
        open,
        status,
        reminderLevel: open > 0 && idx % 4 === 0 ? "erste Mahnung" : "Erinnerung",
        costCenter: r.company ? ["RB-41", "OPS-12", "HR-8"][idx % 3] : "",
        internalNote: "Demo-Rechnung, nicht rechtsverbindlich"
      };
    });
  }

  function buildPayments(rides, invoices) {
    const payments = [];
    rides.slice(0, 24).forEach((r, idx) => {
      const amount = r.cashAmount || r.cardAmount || r.invoiceAmount || r.meterAmount;
      const status = idx % 7 === 0 ? "ungeklaert" : idx % 6 === 0 ? "teilweise" : "bestaetigt";
      payments.push({
        id: `PAY-26-${5000 + idx}`,
        date: r.date,
        time: r.time,
        amount: Number(amount.toFixed(2)),
        paymentType: r.paymentType,
        customer: r.customer,
        rideId: r.rideId,
        orderNo: r.orderNo,
        invoiceId: invoices.find((inv) => inv.orderNo === r.orderNo)?.id || "",
        driver: r.driver,
        vehicle: r.vehicle,
        shift: idx % 3 === 0 ? "Frueh" : idx % 3 === 1 ? "Spaet" : "Nacht",
        receiptNo: r.paymentType === "Karte" && idx % 4 === 0 ? "" : `RC-${8000 + idx}`,
        status,
        note: status === "ungeklaert" ? "Differenz offen" : "Abgleich ok"
      });
    });
    return payments;
  }

  function buildInsurers() {
    return [
      { name: "AOK Pfalz", ik: "108345690", contact: "Lena Stark", phone: "0621 440012", mail: "abrechnung@aok-demo.de", channel: "Portal", dueDays: 21, openCases: 8, openAmount: 1248.6, lastSubmit: "2026-08-01", lastPayment: "2026-07-27", questions: 2 },
      { name: "TK Rheinland-Pfalz", ik: "109993440", contact: "Robin Schaefer", phone: "06131 99812", mail: "tk-abrechnung@demo.de", channel: "DTA Demo", dueDays: 14, openCases: 5, openAmount: 910.2, lastSubmit: "2026-07-30", lastPayment: "2026-07-26", questions: 1 },
      { name: "IKK Suedwest", ik: "104550220", contact: "Miriam Kern", phone: "0631 770011", mail: "service@ikk-demo.de", channel: "E-Mail", dueDays: 30, openCases: 3, openAmount: 640, lastSubmit: "2026-07-29", lastPayment: "2026-07-20", questions: 1 }
    ];
  }

  function buildInsurerCases(rides) {
    const cases = rides.filter((r) => r.billingType === "Krankenkasse");
    return cases.map((r, idx) => ({
      id: `KKF-${idx + 1}`,
      patient: r.customer,
      insuranceNo: r.insuranceNo || `KV-${7000 + idx}`,
      insurer: r.insurer || "AOK Pfalz",
      permitNo: r.permitNo || `GEN-${900 + idx}`,
      permitFrom: r.permitFrom || "2026-01-01",
      permitTo: r.permitTo || "2026-12-31",
      approvedRideType: r.rideType,
      approvedCount: 40,
      usedCount: 35 + (idx % 7),
      remaining: 5 - (idx % 4),
      returnTrip: r.returnAllowed ? "Ja" : "Nein",
      coPay: idx % 4 === 0 ? 10 : 0,
      exemption: idx % 5 === 0 ? "Ja" : "Nein",
      transportStatus: r.transportStatus,
      billingOpen: r.invoiceStatus === "offen" ? "Ja" : "Nein"
    }));
  }

  function buildCompanies(rides, invoices) {
    const names = ["RheinBahn Service GmbH", "LogiTrans Rhein", "Mecasoft GmbH", "Flugdienst Rhein"];
    return names.map((name, idx) => {
      const companyRides = rides.filter((r) => r.company === name);
      const companyInv = invoices.filter((i) => i.customer === name);
      const openInv = companyInv.filter((i) => i.open > 0);
      return {
        id: `FC-${400 + idx}`,
        name,
        customerNo: `FK-${3100 + idx}`,
        contact: ["Eva Kranz", "Yusuf Tan", "Mara Fehr", "Jonas Klein"][idx],
        costCenter: ["RB-41", "OPS-12", "MC-2", "AIR-3"][idx],
        address: ["Germersheim Sued 7", "Speyer Ring 8", "Landau Park 3", "Baden-Airpark 1"][idx],
        dueDays: [14, 21, 14, 30][idx],
        tariff: ["Pauschal 89 EUR", "km-basiert", "City Tarif", "Flughafen Tarif"][idx],
        openRides: companyRides.length,
        unbilledAmount: Number(companyRides.reduce((s, r) => s + r.invoiceAmount, 0).toFixed(2)),
        openInvoices: openInv.length,
        overdueInvoices: openInv.filter((i) => i.status === "ueberfaellig").length
      };
    });
  }

  function buildReminders(invoices) {
    return invoices.filter((i) => i.open > 0).slice(0, 12).map((i, idx) => {
      const overdueDays = idx % 3 === 0 ? 12 + idx : 0;
      const stage = overdueDays > 20 ? "zweite Mahnung" : overdueDays > 7 ? "erste Mahnung" : "Erinnerung";
      return {
        id: `MN-${700 + idx}`,
        invoiceId: i.id,
        customer: i.customer,
        invoiceDate: i.issueDate,
        dueDate: i.dueDate,
        amount: i.gross,
        paid: i.paid,
        open: i.open,
        overdueDays,
        stage,
        lastContact: idx % 2 === 0 ? "Telefon" : "E-Mail",
        owner: ASSIGNEES[idx % ASSIGNEES.length],
        status: overdueDays > 0 ? stage : "Erinnerung"
      };
    });
  }

  function buildCosts() {
    const categories = [
      "Kraftstoff", "Strom", "Werkstatt", "Reifen", "Versicherung", "Steuer", "Leasing", "Finanzierung", "Fahrzeugwaesche", "Reinigung", "Zubehoer", "Maut", "Parkgebuehren", "Software", "Telefon", "Personal", "Sonstige Kosten"
    ];
    return categories.map((c, idx) => ({
      id: `KC-${idx + 1}`,
      category: c,
      month: "2026-08",
      amount: Number((220 + idx * 73.4).toFixed(2)),
      note: "Demo-Kostenwert"
    }));
  }

  function buildVehicleEconomy(costs) {
    const vehicles = ["VEH-201", "VEH-202", "VEH-203", "VEH-204", "VEH-205", "VEH-206"];
    return vehicles.map((vehicle, idx) => {
      const revenue = 2200 + idx * 480;
      const km = 1300 + idx * 210;
      const fuel = 300 + idx * 60;
      const power = 70 + idx * 25;
      const workshop = 120 + idx * 95;
      const fixed = 450 + idx * 40;
      const variable = fuel + power + workshop;
      const total = fixed + variable;
      return {
        vehicle,
        revenue,
        rides: 72 + idx * 7,
        km,
        revPerKm: Number((revenue / Math.max(1, km)).toFixed(2)),
        fuelCost: fuel,
        powerCost: power,
        workshopCost: workshop,
        insurance: 210 + idx * 10,
        fixedCost: fixed,
        variableCost: variable,
        totalCost: total,
        contribution: Number((revenue - total).toFixed(2)),
        downtimeDays: idx % 3,
        workshopVisits: 1 + (idx % 3),
        damages: 1 + (idx % 4),
        assignments: 60 + idx * 8
      };
    });
  }

  function buildMonthlyChecklist() {
    const tasks = [
      "alle Fahrten abgeschlossen",
      "alle Fahrer-Schichten geprueft",
      "Barbestaende geprueft",
      "Kartenzahlungen abgeglichen",
      "Krankenkassenfahrten geprueft",
      "Transportscheine vollstaendig",
      "Genehmigungen geprueft",
      "Firmenrechnungen erstellt",
      "Privatrechnungen erstellt",
      "offene Differenzen geklaert",
      "Tankbelege vollstaendig",
      "Ladekosten vollstaendig",
      "Fahrzeugkosten erfasst",
      "offene Mahnungen geprueft",
      "Monatsbericht erstellt",
      "Export vorbereitet"
    ];
    return tasks.map((label, idx) => ({ id: `MC-${idx + 1}`, label, status: idx < 8 ? "erledigt" : idx < 12 ? "in Bearbeitung" : "offen" }));
  }

  function buildMonthProblems() {
    return [
      { id: "MP-1", kind: "fehlende Schichtabrechnung", ref: "MA-203", owner: "Abrechnung", status: "offen" },
      { id: "MP-2", kind: "Bargelddifferenz", ref: "CASH-441", owner: "Buchhaltung", status: "offen" },
      { id: "MP-3", kind: "fehlender Kartenbeleg", ref: "PAY-26-5007", owner: "Disponent 1", status: "in Bearbeitung" },
      { id: "MP-4", kind: "offene Krankenkassenfahrt", ref: "TG-1051", owner: "Abrechnung", status: "offen" }
    ];
  }

  function buildCheckCases(rides, invoices, payments) {
    const cases = [];
    rides.slice(0, 15).forEach((r, idx) => {
      const rules = evaluateRules(r, payments, invoices);
      rules.forEach((rule, rIdx) => {
        cases.push({
          id: `PC-${idx + 1}-${rIdx + 1}`,
          category: rule.category,
          priority: rule.priority,
          customer: r.customer,
          driver: r.driver,
          vehicle: r.vehicle,
          ride: r.orderNo,
          invoice: invoices.find((i) => i.orderNo === r.orderNo)?.id || "",
          amount: r.invoiceAmount || r.meterAmount,
          createdAt: r.date,
          owner: ASSIGNEES[(idx + rIdx) % ASSIGNEES.length],
          dueAt: "2026-08-09",
          status: STATUS.checkCase[(idx + rIdx) % STATUS.checkCase.length],
          timeline: [`${r.date}: Fall automatisch erkannt`],
          note: rule.suggestion,
          cause: rule.cause,
          value: rule.value
        });
      });
    });
    return cases.slice(0, 40);
  }

  function buildFinanceNotifications() {
    return [
      { id: "FN-1", priority: "kritisch", title: "Rechnung ueberfaellig", text: "RG-26-1203 ist ueberfaellig.", read: false, at: "08:22" },
      { id: "FN-2", priority: "wichtig", title: "Krankenkasse lehnt Fall ab", text: "Fall TG-8102 wurde abgelehnt.", read: false, at: "08:15" },
      { id: "FN-3", priority: "normal", title: "Zahlung eingegangen", text: "Teilzahlung fuer RG-26-1208 erfasst.", read: false, at: "07:58" },
      { id: "FN-4", priority: "wichtig", title: "Bargelddifferenz", text: "Differenz 12,50 EUR in Schicht MA-102.", read: false, at: "07:44" }
    ];
  }

  function evaluateRules(ride, payments, invoices) {
    const warnings = [];
    const pay = payments.find((p) => p.orderNo === ride.orderNo);
    const inv = invoices.find((i) => i.orderNo === ride.orderNo);
    const finalAmount = Number(ride.fixedPrice || ride.meterAmount || 0);

    if (!finalAmount) {
      warnings.push({ category: "Betrag fehlt", priority: "kritisch", cause: "Kein abrechenbarer Betrag", value: "0 EUR", suggestion: "Betrag pruefen und erfassen" });
    }

    if (ride.fixedPrice > 0 && !ride.internalNote) {
      warnings.push({ category: "Festpreis ohne Begruendung", priority: "pruefen", cause: "Festpreis gesetzt", value: formatEuro(ride.fixedPrice), suggestion: "Freitext-Begruendung erfassen" });
    }

    if (ride.paymentType === "Bar" && ride.openDiff > 0) {
      warnings.push({ category: "Barzahlung ohne Kassenabschluss", priority: "wichtig", cause: "Differenz vorhanden", value: formatEuro(ride.openDiff), suggestion: "Kassenabschluss zuordnen" });
    }

    if (ride.paymentType === "Karte" && (!pay || !pay.receiptNo)) {
      warnings.push({ category: "Kartenbeleg fehlt", priority: "wichtig", cause: "Keine Belegnummer", value: "-", suggestion: "Belegnummer nachtragen" });
    }

    if (ride.billingType === "Krankenkasse" && ride.transportStatus !== "vorhanden") {
      warnings.push({ category: "Transportschein fehlt", priority: "kritisch", cause: "Status nicht vorhanden", value: ride.transportStatus, suggestion: "Dokument anfordern" });
    }

    if (ride.billingType === "Krankenkasse" && ride.approvalStatus === "abgelaufen") {
      warnings.push({ category: "Genehmigung abgelaufen", priority: "kritisch", cause: "Ablaufdatum ueberschritten", value: ride.permitTo || "", suggestion: "Neue Genehmigung anfordern" });
    }

    if (ride.actualKm > ride.plannedKm + 8) {
      warnings.push({ category: "Kilometer auffaellig", priority: "pruefen", cause: "Abweichung zur Planung", value: `${ride.actualKm} km`, suggestion: "Strecke plausibilisieren" });
    }

    if (ride.waitMin > 20) {
      warnings.push({ category: "ungewoehnlich lange Wartezeit", priority: "Hinweis", cause: "Wartezeit ueber 20 Min", value: `${ride.waitMin} Min`, suggestion: "Kundenkontakt pruefen" });
    }

    if ((ride.paymentType === "Rechnung" || ride.paymentType === "Krankenkasse") && !inv) {
      warnings.push({ category: "Auftrag ohne Rechnung", priority: "wichtig", cause: "keine Rechnung vorhanden", value: ride.orderNo, suggestion: "Rechnung erstellen" });
    }

    return warnings;
  }

  function loadState() {
    const raw = localStorage.getItem(KEY);
    if (!raw) return createDefaultState();
    const parsed = safeParse(raw);
    if (!parsed || !Array.isArray(parsed.rides)) return createDefaultState();
    return parsed;
  }

  function saveState(next) {
    next.lastUpdatedAt = nowIso();
    localStorage.setItem(KEY, JSON.stringify(next));
  }

  function resetState() {
    const fresh = createDefaultState();
    saveState(fresh);
    return fresh;
  }

  function getComparativePct(value, base) {
    if (!base) return 0;
    return Number((((value - base) / base) * 100).toFixed(1));
  }

  function findRide(state, orderNo) {
    return state.rides.find((r) => r.orderNo === orderNo || r.rideId === orderNo) || null;
  }

  function updateRide(state, orderNo, patch) {
    const ride = findRide(state, orderNo);
    if (!ride) return false;
    Object.assign(ride, patch || {});
    ride.timeline = Array.isArray(ride.timeline) ? ride.timeline : [];
    ride.timeline.unshift({ at: nowIso(), text: "Fall aktualisiert" });
    return true;
  }

  function addCaseNote(state, caseId, note) {
    const row = state.checkCases.find((c) => c.id === caseId);
    if (!row) return false;
    row.timeline.unshift(`${todayIso()} ${timeNow()}: ${note}`);
    return true;
  }

  function getRangeFilter(dateIso, range) {
    const d = new Date(`${dateIso}T00:00:00`).getTime();
    const now = new Date(`${todayIso()}T00:00:00`).getTime();
    const diffDays = Math.floor((now - d) / 86400000);
    if (range === "heute") return diffDays === 0;
    if (range === "gestern") return diffDays === 1;
    if (range === "diese Woche") return diffDays >= 0 && diffDays < 7;
    if (range === "letzte Woche") return diffDays >= 7 && diffDays < 14;
    if (range === "dieser Monat") return diffDays >= 0 && diffDays < 31;
    if (range === "letzter Monat") return diffDays >= 31 && diffDays < 62;
    if (range === "dieses Quartal") return diffDays >= 0 && diffDays < 92;
    if (range === "dieses Jahr") return diffDays >= 0 && diffDays < 366;
    return true;
  }

  window.AdminFinanceDemo = {
    KEY,
    STATUS,
    ASSIGNEES,
    loadState,
    saveState,
    resetState,
    createDefaultState,
    formatEuro,
    normalize,
    evaluateRules,
    getComparativePct,
    findRide,
    updateRide,
    addCaseNote,
    getRangeFilter,
    todayIso,
    timeNow
  };
})();
