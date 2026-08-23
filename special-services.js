(function () {
  var SERVICE_KEY = {
    medical: "Krankenfahrten",
    dialysis: "Dialysefahrten",
    chemo: "Chemo- und Strahlentherapiefahrten",
    wheelchair: "Rollstuhlfahrten",
    series: "Serienfahrten",
    airport: "Flughafentransfers",
    business: "Firmen- und Geschäftskunden",
    student: "Schülerfahrten",
    courier: "Kurierfahrten"
  };

  var SERVICE_CONFIG = {
    medical: {
      title: "Krankenfahrten",
      icon: "assets/icons/Route.svg",
      description: "Fahrten zu Arzt, Klinik, Therapie sowie stationärer Aufnahme und Entlassung persönlich vorbereiten.",
      benefits: [
        "Sitzende Beförderung und Rollstuhlbeförderung möglich",
        "Hin- und Rückfahrt gemeinsam planbar",
        "Transparenter Hinweis zu Verordnung und Genehmigung"
      ],
      notice: "Je nach Fahrt können Verordnung und Genehmigung der Krankenkasse erforderlich sein. Eine verbindliche Kostenübernahme kann hier nicht zugesagt werden.",
      fields: [
        { id: "name", label: "Name", type: "text", required: true },
        { id: "phone", label: "Telefonnummer", type: "tel", required: true },
        { id: "pickup", label: "Abholadresse", type: "text", required: true },
        { id: "destination", label: "Behandlungsort", type: "text", required: true },
        { id: "date", label: "Datum", type: "date", required: true },
        { id: "time", label: "Uhrzeit", type: "time", required: true },
        { id: "roundtrip", label: "Hin- und Rückfahrt", type: "select", required: true, options: ["Nur Hinfahrt", "Hin- und Rückfahrt"] },
        { id: "rideType", label: "Fahrttyp", type: "select", required: true, options: ["Krankenfahrt", "Dialyse", "Chemo", "Strahlentherapie", "Ambulante Behandlung", "Stationäre Aufnahme/Entlassung"] },
        { id: "insurance", label: "Krankenkasse (optional)", type: "text", required: false },
        { id: "prescription", label: "Verordnung vorhanden", type: "select", required: true, options: ["Ja", "Nein", "Unklar"] },
        { id: "approval", label: "Genehmigung vorhanden", type: "select", required: true, options: ["Ja", "Nein", "Unklar"] },
        { id: "companion", label: "Begleitperson", type: "select", required: true, options: ["Keine", "Eine Begleitperson", "Mehrere Begleitpersonen"] },
        { id: "notes", label: "Besondere Hinweise", type: "textarea", required: false }
      ]
    },
    dialysis: {
      alias: "medical",
      title: "Dialysefahrten",
      preset: { rideType: "Dialyse" }
    },
    chemo: {
      alias: "medical",
      title: "Chemo- und Strahlentherapiefahrten",
      preset: { rideType: "Chemo" }
    },
    wheelchair: {
      title: "Rollstuhlfahrten",
      icon: "assets/icons/Wheelchair%20Vehicle.svg",
      description: "Barrierearme Fahrten mit Rampe, Sicherung und optionaler Begleitperson persönlich planen.",
      benefits: [
        "Manueller und elektrischer Rollstuhl auswählbar",
        "Faltbar/nicht faltbar und Umsteigen abfragbar",
        "Zugangssituation vorab abstimmbar"
      ],
      notice: "Bitte teilen Sie uns Rollstuhltyp und Zugangssituation möglichst genau mit.",
      fields: [
        { id: "name", label: "Name", type: "text", required: true },
        { id: "phone", label: "Telefonnummer", type: "tel", required: true },
        { id: "pickup", label: "Abholadresse", type: "text", required: true },
        { id: "destination", label: "Zieladresse", type: "text", required: true },
        { id: "date", label: "Datum", type: "date", required: true },
        { id: "time", label: "Uhrzeit", type: "time", required: true },
        { id: "wheelchairType", label: "Rollstuhltyp", type: "select", required: true, options: ["Manueller Rollstuhl", "Elektrischer Rollstuhl"] },
        { id: "foldable", label: "Rollstuhl faltbar", type: "select", required: true, options: ["Ja", "Nein"] },
        { id: "canTransfer", label: "Person kann umsteigen", type: "select", required: true, options: ["Ja", "Nein"] },
        { id: "companion", label: "Begleitperson", type: "select", required: true, options: ["Keine", "Eine Begleitperson", "Mehrere Begleitpersonen"] },
        { id: "stairSituation", label: "Treppen / besondere Zugangssituation", type: "textarea", required: false },
        { id: "dimensions", label: "Maße / Gewicht (optional)", type: "text", required: false },
        { id: "notes", label: "Zusätzliche Hinweise", type: "textarea", required: false }
      ]
    },
    series: {
      title: "Serienfahrten",
      icon: "assets/icons/Calendar.svg",
      description: "Regelmäßige Fahrten mit Wochenstruktur sowie Hin- und Rückfahrt persönlich vorbereiten.",
      benefits: [
        "Dialyse M/W/F als Beispiel hinterlegbar",
        "Tägliche Schüler- oder Therapiefahrten planbar",
        "Wochenzusammenfassung vor der Abstimmung"
      ],
      notice: "Eine Serienfahrt wird erst nach persönlicher Bestätigung verbindlich.",
      fields: [
        { id: "name", label: "Name", type: "text", required: true },
        { id: "phone", label: "Telefonnummer", type: "tel", required: true },
        { id: "startDate", label: "Startdatum", type: "date", required: true },
        { id: "endDate", label: "Enddatum (optional)", type: "date", required: false },
        { id: "weekdays", label: "Wochentage", type: "multicheck", required: true, options: ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"] },
        { id: "direction", label: "Fahrtart", type: "select", required: true, options: ["Nur Hinfahrt", "Hin- und Rückfahrt"] },
        { id: "pickup", label: "Abholadresse", type: "text", required: true },
        { id: "destination", label: "Zieladresse", type: "text", required: true },
        { id: "outboundTime", label: "Uhrzeit Hinfahrt", type: "time", required: true },
        { id: "returnTime", label: "Uhrzeit Rückfahrt", type: "time", required: false },
        { id: "rideType", label: "Fahrttyp", type: "select", required: true, options: ["Dialyse", "Schülerfahrt", "Therapiefahrt", "Firmenfahrt", "Standardfahrt"] },
        { id: "companion", label: "Begleitperson", type: "select", required: true, options: ["Keine", "Begleitperson eingeplant"] },
        { id: "remark", label: "Bemerkung", type: "textarea", required: false }
      ]
    },
    airport: {
      title: "Flughafentransfers",
      icon: "assets/icons/Route.svg",
      description: "Transfers für FRA, FKB, STR oder weitere Flughäfen auf Anfrage persönlich vorbereiten.",
      benefits: [
        "Terminal und Flugnummer optional",
        "Normales Taxi oder Großraumtaxi auswählbar",
        "Festpreisanfrage persönlich abstimmbar"
      ],
      notice: "Der Preis wird erst nach persönlicher Prüfung bestätigt.",
      fields: [
        { id: "name", label: "Name", type: "text", required: true },
        { id: "phone", label: "Telefonnummer", type: "tel", required: true },
        { id: "pickup", label: "Abholadresse", type: "text", required: true },
        { id: "airport", label: "Flughafen", type: "select", required: true, options: ["Frankfurt Airport FRA", "Karlsruhe/Baden-Baden FKB", "Stuttgart Airport STR", "Weiterer Flughafen auf Anfrage"] },
        { id: "terminal", label: "Terminal (optional)", type: "text", required: false },
        { id: "flightNumber", label: "Flugnummer (optional)", type: "text", required: false },
        { id: "pickupDate", label: "Abholdatum", type: "date", required: true },
        { id: "pickupTime", label: "Abholzeit", type: "time", required: true },
        { id: "persons", label: "Anzahl Personen", type: "number", required: true },
        { id: "bags", label: "Anzahl Koffer", type: "number", required: true },
        { id: "childSeat", label: "Kindersitz benötigt", type: "select", required: true, options: ["Nein", "Ja, 1", "Ja, 2+"] },
        { id: "vehicleType", label: "Taxiart", type: "select", required: true, options: ["Normales Taxi", "Großraumtaxi"] },
        { id: "roundtrip", label: "Hin- und Rückfahrt", type: "select", required: true, options: ["Nur Hinfahrt", "Hin- und Rückfahrt"] },
        { id: "returnFlightDate", label: "Rückflugdatum (optional)", type: "date", required: false },
        { id: "fixedPrice", label: "Festpreisanfrage", type: "select", required: true, options: ["Ja", "Nein"] }
      ]
    },
    business: {
      title: "Firmenkonto",
      icon: "assets/icons/Profile.svg",
      description: "Planung für Firmen- und Geschäftskunden mit Ansprechpartnern und wiederkehrenden Leistungen.",
      benefits: [
        "Mitarbeiterfahrten, Flughafentransfers und Kurierfahrten kombinierbar",
        "Bahn- und Schichtpersonal kann als Leistung markiert werden",
        "Individuelle Vereinbarungen persönlich abstimmbar"
      ],
      notice: "Vereinbarungen und Abrechnung werden persönlich geprüft und bestätigt.",
      fields: [
        { id: "company", label: "Firmenname", type: "text", required: true },
        { id: "contact", label: "Ansprechpartner", type: "text", required: true },
        { id: "phone", label: "Telefonnummer", type: "tel", required: true },
        { id: "email", label: "E-Mail", type: "email", required: true },
        { id: "billingAddress", label: "Rechnungsadresse", type: "textarea", required: true },
        { id: "ridesPerMonth", label: "Erwartete Fahrten pro Monat", type: "number", required: true },
        { id: "services", label: "Gewünschte Leistungen", type: "multicheck", required: true, options: ["Zentrale Buchung", "Wiederkehrende Fahrten", "Monatsrechnung", "Flughafentransfers", "Mitarbeiterfahrten", "Kurierfahrten", "Bahn- und Schichtpersonal"] },
        { id: "invoiceMode", label: "Rechnungswunsch", type: "select", required: true, options: ["Monatsrechnung", "Wochenrechnung", "Einzelfahrten"] },
        { id: "remark", label: "Bemerkung", type: "textarea", required: false }
      ]
    },
    student: {
      title: "Schülerfahrten",
      icon: "assets/icons/Route.svg",
      description: "Regelmäßige Schülerbeförderung mit festen Abholzeiten, Hin- und Rückfahrt und individueller Abstimmung.",
      benefits: [
        "Wochentage und Zeitfenster klar definierbar",
        "Abstimmung mit Eltern, Schule oder Träger",
        "Begleitbedarf direkt abfragbar"
      ],
      notice: "Eine persönliche Abstimmung und Bestätigung ist erforderlich.",
      fields: [
        { id: "name", label: "Ansprechpartner", type: "text", required: true },
        { id: "phone", label: "Telefonnummer", type: "tel", required: true },
        { id: "passengers", label: "Anzahl Fahrgäste", type: "number", required: true },
        { id: "pickup", label: "Abholort", type: "text", required: true },
        { id: "destination", label: "Ziel", type: "text", required: true },
        { id: "weekdays", label: "Wochentage", type: "multicheck", required: true, options: ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag"] },
        { id: "times", label: "Uhrzeiten", type: "text", required: true, placeholder: "z. B. Hinfahrt 07:15, Rückfahrt 13:20" },
        { id: "support", label: "Begleitbedarf", type: "select", required: true, options: ["Kein Begleitbedarf", "Begleitperson nötig", "Individuell zu klären"] },
        { id: "period", label: "Zeitraum", type: "text", required: true, placeholder: "z. B. Schuljahr 2026/27" }
      ]
    },
    courier: {
      title: "Kurierfahrten",
      icon: "assets/icons/Route.svg",
      description: "Direktfahrten für Dokumente, Ersatzteile und kleine Sendungen inklusive Zeitfenster vorbereiten.",
      benefits: [
        "Zeitkritische Zustellung kennzeichnen",
        "Kontakte für Abholung und Empfang erfassen",
        "Sendungsart und Größe angeben"
      ],
      notice: "Gefährliche oder gesetzlich verbotene Güter sind ausgeschlossen. Eine Beauftragung erfolgt erst nach persönlicher Bestätigung.",
      fields: [
        { id: "name", label: "Name", type: "text", required: true },
        { id: "phone", label: "Telefonnummer", type: "tel", required: true },
        { id: "pickup", label: "Abholadresse", type: "text", required: true },
        { id: "destination", label: "Zieladresse", type: "text", required: true },
        { id: "shipmentType", label: "Art der Sendung", type: "text", required: true },
        { id: "shipmentSize", label: "Ungefähre Größe", type: "select", required: true, options: ["Dokumente", "Kleine Sendung", "Mittelgroße Sendung"] },
        { id: "pickupTime", label: "Abholzeit", type: "time", required: true },
        { id: "latestDelivery", label: "Späteste Zustellung", type: "time", required: true },
        { id: "pickupContact", label: "Ansprechpartner Abholung", type: "text", required: true },
        { id: "dropContact", label: "Ansprechpartner Empfang", type: "text", required: true }
      ]
    }
  };

  var LIST = ["medical", "dialysis", "chemo", "wheelchair", "series", "airport", "business", "student", "courier"];

  function q(id) {
    return document.getElementById(id);
  }

  function getConfig(service) {
    var current = SERVICE_CONFIG[service] || SERVICE_CONFIG.medical;
    if (!current.alias) return current;
    var merged = Object.assign({}, SERVICE_CONFIG[current.alias], current);
    return merged;
  }

  function fieldElement(field, presetValue) {
    var wrap = document.createElement("div");
    wrap.className = "special-field";
    wrap.dataset.field = field.id;

    var label = document.createElement("label");
    label.setAttribute("for", "sf-" + field.id);
    label.textContent = field.label;
    if (field.required) {
      var star = document.createElement("span");
      star.className = "special-required";
      star.textContent = "*";
      label.appendChild(star);
    }
    wrap.appendChild(label);

    var input;
    if (field.type === "textarea") {
      input = document.createElement("textarea");
    } else if (field.type === "select") {
      input = document.createElement("select");
      var placeholderOpt = document.createElement("option");
      placeholderOpt.value = "";
      placeholderOpt.textContent = "Bitte wählen";
      input.appendChild(placeholderOpt);
      (field.options || []).forEach(function (opt) {
        var option = document.createElement("option");
        option.value = opt;
        option.textContent = opt;
        input.appendChild(option);
      });
    } else if (field.type === "multicheck") {
      input = document.createElement("div");
      input.className = "special-choice-grid";
      input.dataset.multi = field.id;
      (field.options || []).forEach(function (opt) {
        var row = document.createElement("label");
        row.innerHTML = '<input type="checkbox" value="' + opt + '" /> ' + opt;
        input.appendChild(row);
      });
    } else {
      input = document.createElement("input");
      input.type = field.type === "number" ? "number" : field.type;
      if (field.type === "number") input.min = "0";
    }

    if (field.type !== "multicheck") {
      input.id = "sf-" + field.id;
      input.name = field.id;
      if (field.placeholder) input.placeholder = field.placeholder;
      if (presetValue) input.value = presetValue;
      if (field.required) {
        input.setAttribute("data-required", "1");
        input.setAttribute("required", "required");
        input.setAttribute("aria-required", "true");
      }
    } else {
      input.id = "sf-" + field.id;
      if (field.required) {
        input.setAttribute("data-required", "1");
        input.setAttribute("aria-required", "true");
      }
    }

    wrap.appendChild(input);

    var err = document.createElement("p");
    err.className = "special-field-error";
    err.id = "sf-error-" + field.id;
    err.setAttribute("role", "status");
    err.setAttribute("aria-live", "polite");
    if (field.type !== "multicheck") {
      input.setAttribute("aria-describedby", err.id);
    }
    wrap.appendChild(err);

    return wrap;
  }

  function getFieldValue(field) {
    if (field.type === "multicheck") {
      var parent = q("sf-" + field.id);
      if (!parent) return [];
      var values = [];
      parent.querySelectorAll('input[type="checkbox"]').forEach(function (box) {
        if (box.checked) values.push(box.value);
      });
      return values;
    }

    var el = q("sf-" + field.id);
    if (!el) return "";
    return (el.value || "").trim();
  }

  function clearErrors(fields) {
    fields.forEach(function (field) {
      var err = q("sf-error-" + field.id);
      if (err) err.textContent = "";
    });
    var privacyErr = q("sf-privacy-error");
    if (privacyErr) privacyErr.textContent = "";
  }

  function validate(fields) {
    var ok = true;
    fields.forEach(function (field) {
      var err = q("sf-error-" + field.id);
      var value = getFieldValue(field);
      if (!err) return;

      if (!field.required) {
        err.textContent = "";
        return;
      }

      if (field.type === "multicheck") {
        if (!Array.isArray(value) || !value.length) {
          ok = false;
          err.textContent = "Bitte mindestens eine Option wählen.";
        } else {
          err.textContent = "";
        }
        return;
      }

      if (!value) {
        ok = false;
        err.textContent = "Bitte dieses Pflichtfeld ausfüllen.";
        return;
      }

      if (field.type === "email" && value.indexOf("@") === -1) {
        ok = false;
        err.textContent = "Bitte eine gültige E-Mail-Adresse eingeben.";
        return;
      }

      if (field.type === "tel" && value.length < 6) {
        ok = false;
        err.textContent = "Bitte eine gültige Telefonnummer eingeben.";
        return;
      }

      err.textContent = "";
    });

    return ok;
  }

  var lastModalTrigger = null;

  function openModal(triggerElement) {
    var modal = q("specialSummaryModal");
    if (!modal) return;
    lastModalTrigger = triggerElement || document.activeElement;
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("has-open-special-modal");

    var closeBtn = modal.querySelector("[data-close-special-modal]");
    if (closeBtn) closeBtn.focus();
  }

  function closeModal() {
    var modal = q("specialSummaryModal");
    if (!modal) return;
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("has-open-special-modal");
    if (lastModalTrigger && typeof lastModalTrigger.focus === "function") {
      lastModalTrigger.focus();
    }
  }

  function updateBookingBridge(serviceKey) {
    var link = q("bookingBridgeLink");
    if (!link) return;

    var pickup = q("sf-pickup");
    var destination = q("sf-destination");

    var params = ["page=booking", "specialService=" + encodeURIComponent(serviceKey)];
    if (pickup && (pickup.value || "").trim()) params.push("pickup=" + encodeURIComponent(pickup.value.trim()));
    if (destination && (destination.value || "").trim()) params.push("destination=" + encodeURIComponent(destination.value.trim()));

    link.href = "index.html?" + params.join("&");
  }

  function humanizeValue(value) {
    if (Array.isArray(value)) {
      return value.length ? value.join(", ") : "-";
    }
    return value || "-";
  }

  function mount() {
    if (!q("specialServiceForm")) return;

    var params = new URLSearchParams(window.location.search);
    var fromQuery = params.get("service");
    var initialService = LIST.indexOf(fromQuery || "") !== -1 ? fromQuery : "medical";
    var currentService = initialService;

    var sectionTitle = q("specialServiceTitle");
    var sectionDescription = q("specialServiceDescription");
    var sectionNotice = q("specialServiceNotice");
    var serviceIcon = q("specialServiceIcon");
    var benefits = q("specialServiceBenefits");
    var infoGrid = q("specialInfoGrid");
    var fieldsRoot = q("specialFormFields");
    var tabs = q("specialServiceTabs");
    var summaryList = q("specialSummaryList");
    var successText = q("specialSuccessText");
    var weekSummary = q("seriesWeekSummary");

    var reviewButton = q("showSummaryBtn");
    var editButton = q("editSummaryBtn");

    var activeFields = [];

    function setTabState() {
      if (!tabs) return;
      tabs.querySelectorAll(".special-tab").forEach(function (tab) {
        var isCurrent = tab.getAttribute("data-service") === currentService;
        tab.classList.toggle("is-active", isCurrent);
        tab.setAttribute("aria-selected", String(isCurrent));
      });
    }

    function renderWeekSummary() {
      if (!weekSummary) return;
      if (currentService !== "series") {
        weekSummary.hidden = true;
        return;
      }

      var weekdays = getFieldValue({ id: "weekdays", type: "multicheck" });
      var outbound = getFieldValue({ id: "outboundTime", type: "time" });
      var back = getFieldValue({ id: "returnTime", type: "time" });
      var direction = getFieldValue({ id: "direction", type: "select" });

      weekSummary.hidden = false;
      weekSummary.innerHTML =
        '<b>Wochenzusammenfassung</b>' +
        '<span>Tage: ' + humanizeValue(weekdays) + '</span>' +
        '<span>Hinfahrt: ' + (outbound || '-') + '</span>' +
        '<span>Rückfahrt: ' + (back || (direction === 'Nur Hinfahrt' ? 'Nicht erforderlich' : '-')) + '</span>' +
        '<span>Hinweis: Eine Serienfahrt wird erst nach persönlicher Bestätigung verbindlich.</span>';
    }

    function mountService(service) {
      currentService = service;
      var config = getConfig(service);
      activeFields = config.fields || [];
      clearErrors(activeFields);
      if (successText) successText.textContent = "";
      if (summaryList) summaryList.innerHTML = "";
      closeModal();

      if (sectionTitle) sectionTitle.textContent = config.title;
      if (sectionDescription) sectionDescription.textContent = config.description;
      if (sectionNotice) sectionNotice.textContent = config.notice;
      if (serviceIcon) serviceIcon.src = config.icon || "assets/icons/Route.svg";

      if (benefits) {
        benefits.innerHTML = "";
        (config.benefits || []).forEach(function (item) {
          var li = document.createElement("li");
          li.innerHTML = '<img src="assets/icons/Check%20Mark.svg" alt="" /> <span>' + item + '</span>';
          benefits.appendChild(li);
        });
      }

      if (infoGrid) {
        infoGrid.innerHTML = "";
        var infoRows = [
          { k: "Leistung", v: config.title },
          { k: "Planung", v: "Angaben lokal vorbereiten" },
          { k: "Übertragung", v: "Keine automatische Versendung" },
          { k: "Abschluss", v: "Persönliche Bestätigung erforderlich" }
        ];
        infoRows.forEach(function (row) {
          var box = document.createElement("div");
          box.className = "special-info-item";
          box.innerHTML = '<b>' + row.k + '</b><span>' + row.v + '</span>';
          infoGrid.appendChild(box);
        });
      }

      if (fieldsRoot) {
        fieldsRoot.innerHTML = "";
        activeFields.forEach(function (field) {
          var presetValue = config.preset && config.preset[field.id] ? config.preset[field.id] : "";
          fieldsRoot.appendChild(fieldElement(field, presetValue));
        });
      }

      setTabState();
      updateBookingBridge(currentService);
      renderWeekSummary();

      var nextUrl = new URL(window.location.href);
      nextUrl.searchParams.set("service", currentService);
      history.replaceState(null, "", nextUrl.toString());
    }

    function buildSummary() {
      if (!summaryList) return;
      summaryList.innerHTML = "";

      var config = getConfig(currentService);
      activeFields.forEach(function (field) {
        var li = document.createElement("li");
        var val = getFieldValue(field);
        li.innerHTML = '<b>' + field.label + '</b><span>' + humanizeValue(val) + '</span>';
        summaryList.appendChild(li);
      });

      var serviceRow = document.createElement("li");
      serviceRow.innerHTML = '<b>Leistung</b><span>' + config.title + '</span>';
      summaryList.prepend(serviceRow);
    }

    if (tabs) {
      tabs.addEventListener("click", function (event) {
        var btn = event.target.closest("[data-service]");
        if (!btn) return;
        mountService(btn.getAttribute("data-service"));
      });
    }

    if (fieldsRoot) {
      fieldsRoot.addEventListener("input", function () {
        updateBookingBridge(currentService);
        renderWeekSummary();
      });
      fieldsRoot.addEventListener("change", function () {
        updateBookingBridge(currentService);
        renderWeekSummary();
      });
    }

    if (reviewButton) {
      reviewButton.addEventListener("click", function () {
        clearErrors(activeFields);
        if (!validate(activeFields)) return;
        buildSummary();
        openModal(reviewButton);
      });
    }

    if (editButton) {
      editButton.addEventListener("click", closeModal);
    }

    var modal = q("specialSummaryModal");
    if (modal) {
      modal.addEventListener("click", function (event) {
        if (event.target === modal) closeModal();
      });
    }

    document.querySelectorAll("[data-close-special-modal]").forEach(function (button) {
      button.addEventListener("click", closeModal);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeModal();
    });

    mountService(initialService);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount, { once: true });
  } else {
    mount();
  }

  window.SpecialServices = {
    keys: SERVICE_KEY,
    list: LIST.slice(),
    getConfig: getConfig
  };
})();
