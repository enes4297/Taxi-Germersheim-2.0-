(() => {
  const LEVEL_ORDER = { Bronze: 1, Silber: 2, Gold: 3, Platin: 4, VIP: 5 };
  const LEVEL_CLASS = { Bronze: "is-bronze", Silber: "is-silver", Gold: "is-gold", Platin: "is-platin", VIP: "is-vip" };
  const LEVEL_LABEL = { bronze: "Bronze", silver: "Silber", gold: "Gold", platinum: "Platin", vip: "VIP" };
  const STATUS_LABEL = { active: "Aktiv", paused: "Pausiert", blocked: "Gesperrt" };
  const STATUS_VALUE = { Aktiv: "active", Pausiert: "paused", Gesperrt: "blocked" };
  const NEXT_LEVEL = { Bronze: "Silber", Silber: "Gold", Gold: "Platin", Platin: "VIP", VIP: "Höchstes Level erreicht" };
  const TRANSACTION_LABEL = {
    ride_reward: "Fahrtgutschrift",
    birthday_bonus: "Geburtstagsbonus",
    manual_credit: "Manuelle Gutschrift",
    manual_debit: "Manueller Abzug",
    voucher_redemption: "Gutschein eingelöst",
    adjustment: "Korrektur"
  };

  const state = {
    client: null,
    members: [],
    vouchers: [],
    histories: {},
    transactions: [],
    spinTransactions: [],
    wheelSpins: [],
    loading: true,
    loadError: "",
    selectedMemberId: "",
    drawerTab: "overview",
    toastTimer: null,
    pendingAction: null
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatPoints(value) {
    return new Intl.NumberFormat("de-DE").format(Number(value || 0));
  }

  function formatMoney(value) {
    return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(Number(value || 0));
  }

  function formatVoucherCurrency(valueCents) {
    return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format((Number(valueCents || 0) / 100));
  }

  function parseEuroInput(value) {
    const raw = String(value ?? "").trim();
    if (!raw) return 0;
    const normalized = raw.replace(/\./g, "").replace(",", ".");
    const number = Number(normalized);
    if (!Number.isFinite(number) || number <= 0) return 0;
    return Math.round(number * 100);
  }

  function dateValue(value) {
    const match = String(value || "").match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    return match ? `${match[3]}-${match[2]}-${match[1]}` : "";
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
  }

  function formatGermanDate(value) {
    if (!value) return "Nicht hinterlegt";
    const raw = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      const [year, month, day] = raw.split("-");
      return `${day}.${month}.${year}`;
    }
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(raw)) return raw;
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return "Nicht hinterlegt";
    return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
  }

  function formatShortDate(value) {
    if (!value) return "-";
    const raw = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      const [year, month, day] = raw.split("-");
      return `${day}.${month}.${year}`;
    }
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
  }

  function transactionHistory(row) {
    return {
      date: formatDate(row.created_at),
      type: TRANSACTION_LABEL[row.transaction_type] || row.transaction_type,
      description: row.reason,
      points: Number(row.points || 0),
      actor: row.created_by_name || (row.created_by ? "Mitarbeiter" : "System")
    };
  }

  function birthdayBonusStatusForMember(member) {
    if (!member.birthDate || member.birthDate === "Nicht hinterlegt") {
      return "Geburtsdatum fehlt";
    }
    if (member.status === "Pausiert") return "Konto pausiert";
    if (member.status === "Gesperrt") return "Konto gesperrt";
    if (!member.isBirthdayToday) return "Heute nicht berechtigt";
    if (member.birthdayBonusGrantedThisYear) return `Vergeben am ${formatGermanDate(member.birthdayBonusGrantedThisYear)}`;
    return "Noch nicht vergeben";
  }

  function mapAccount(row, latestTransaction, birthdayBonusByAccount) {
    const customer = Array.isArray(row.customers) ? row.customers[0] : row.customers;
    const level = LEVEL_LABEL[row.level] || "Bronze";
    const birthDateFields = [customer?.birth_date, customer?.birthday, customer?.date_of_birth, customer?.dob, customer?.birthDate].find((value) => value !== null && value !== undefined && String(value).trim() !== "");
    const birthdayBonus = birthdayBonusByAccount.get(row.id) || null;
    const birthDate = birthDateFields ? formatGermanDate(birthDateFields) : "Nicht hinterlegt";
    const isBirthdayToday = (() => {
      if (!birthDateFields) return false;
      const current = new Date();
      const date = new Date(birthDateFields);
      if (Number.isNaN(date.getTime())) return false;
      return date.getMonth() === current.getMonth() && date.getDate() === current.getDate();
    })();
    return {
      id: row.id,
      customerId: row.customer_id,
      name: customer?.name || customer?.facility || "Unbekannter Kunde",
      phone: customer?.phone || "-",
      email: customer?.email || "-",
      birthDate,
      birthDateValue: birthDateFields || null,
      level,
      points: Number(row.points_balance || 0),
      rides: Number(row.qualifying_rides || 0),
      nextLevel: NEXT_LEVEL[level] || "-",
      nextTarget: level === "Platin" || level === "VIP" ? 100 : null,
      activity: formatDate(latestTransaction?.created_at || row.updated_at || row.created_at),
      vouchers: 0,
      status: STATUS_LABEL[row.status] || "Gesperrt",
      birthdayBonusGrantedThisYear: birthdayBonus ? birthdayBonus.created_at : null,
      birthdayBonusStatus: "",
      isBirthdayToday,
      notes: []
    };
  }

  async function getSupabaseClient() {
    const bridge = window.TaxiSupabaseAuth;
    if (!bridge || typeof bridge.getClient !== "function") throw new Error("Supabase-Verbindung ist nicht verfügbar.");
    if (typeof bridge.restoreSupabaseSession === "function") await bridge.restoreSupabaseSession();
    const client = await bridge.getClient();
    if (!client) throw new Error("Supabase-Verbindung ist nicht konfiguriert.");
    const { data, error } = await client.auth.getSession();
    if (error || !data?.session?.user) throw new Error("Keine aktive Supabase-Sitzung.");
    return client;
  }

  function renderLoadState(message, isError = false) {
    const body = document.querySelector("[data-rewards-members]");
    const count = document.querySelector("[data-rewards-result-count]");
    const empty = document.querySelector("[data-rewards-members-empty]");
    const kpis = document.querySelector("[data-rewards-kpis]");
    if (count) count.textContent = isError ? "Ladefehler" : "Wird geladen …";
    if (body) body.innerHTML = `<tr><td colspan="9">${escapeHtml(message)}</td></tr>`;
    if (empty) empty.hidden = true;
    if (kpis) kpis.innerHTML = ["Rewards-Mitglieder", "Aktive Mitglieder", "Vergebene Punkte", "Eingelöste Punkte", "Offene Gutscheine", "VIP-Mitglieder"].map((label) => `<article class="rewards-kpi"><small>${label}</small><strong>–</strong></article>`).join("");
  }

  async function loadRewardsData() {
    state.loading = true;
    state.loadError = "";
    renderLoadState("Rewards-Mitglieder werden geladen …");
    try {
      state.client = state.client || await getSupabaseClient();
      const [accountsResult, transactionsResult, vouchersResult, spinTransactionsResult, wheelSpinsResult] = await Promise.all([
        state.client.from("rewards_accounts").select("id, customer_id, points_balance, qualifying_rides, level, status, created_at, updated_at, customers(name, facility, phone, email, birth_date)").order("updated_at", { ascending: false }),
        state.client.from("rewards_transactions").select("id, rewards_account_id, customer_id, transaction_type, points, reason, note, created_by, created_by_name, created_at, reward_year").order("created_at", { ascending: false }),
        state.client.from("rewards_vouchers").select("id, rewards_account_id, customer_id, code, value_cents, status, issued_at, valid_until, redeemed_at, note, blocked_at, block_reason").order("issued_at", { ascending: false }),
        state.client.from("rewards_spin_transactions").select("id, rewards_account_id, customer_id, amount, transaction_type, reason, note, created_by, created_at").order("created_at", { ascending: false }),
        state.client.from("rewards_wheel_spins").select("id, rewards_account_id, customer_id, prize_type, points_awarded, voucher_id, yumaks_box_won, fulfillment_status, fulfilled_at, fulfilled_by, spin_source, created_by, created_at").order("created_at", { ascending: false })
      ]);
      if (accountsResult.error) throw accountsResult.error;
      if (transactionsResult.error) throw transactionsResult.error;
      if (vouchersResult.error) throw vouchersResult.error;
      if (spinTransactionsResult.error) throw spinTransactionsResult.error;
      if (wheelSpinsResult.error) throw wheelSpinsResult.error;

      state.transactions = transactionsResult.data || [];
      state.spinTransactions = spinTransactionsResult.data || [];
      state.wheelSpins = wheelSpinsResult.data || [];
      state.histories = {};
      const birthdayBonusByAccount = new Map();
      state.transactions.forEach((row) => {
        state.histories[row.rewards_account_id] = state.histories[row.rewards_account_id] || [];
        state.histories[row.rewards_account_id].push(transactionHistory(row));
        if (row.transaction_type === "birthday_bonus" && row.reward_year === new Date().getFullYear()) {
          birthdayBonusByAccount.set(row.rewards_account_id, row);
        }
      });
      const latestByAccount = new Map();
      state.transactions.forEach((row) => {
        if (!latestByAccount.has(row.rewards_account_id)) latestByAccount.set(row.rewards_account_id, row);
      });
      state.members = (accountsResult.data || []).map((row) => {
        const member = mapAccount(row, latestByAccount.get(row.id), birthdayBonusByAccount);
        member.birthdayBonusStatus = birthdayBonusStatusForMember(member);
        return member;
      });

      const memberNameByCustomerId = new Map();
      state.members.forEach((member) => memberNameByCustomerId.set(member.customerId, member.name));
      state.vouchers = (vouchersResult.data || []).map((row) => {
        const voucherStatus = row.status === "open" && new Date(row.valid_until) < new Date(new Date().setHours(0, 0, 0, 0)) ? "expired" : row.status;
        return {
          id: row.id,
          rewardsAccountId: row.rewards_account_id,
          customerId: row.customer_id,
          memberId: row.rewards_account_id,
          code: row.code,
          value: Number(row.value_cents || 0),
          valueCents: Number(row.value_cents || 0),
          status: row.status,
          displayStatus: voucherStatus === "open" ? "Offen" : voucherStatus === "redeemed" ? "Eingelöst" : voucherStatus === "blocked" ? "Gesperrt" : "Abgelaufen",
          issuedAt: row.issued_at,
          issued: formatGermanDate(row.issued_at),
          validUntil: formatGermanDate(row.valid_until),
          validUntilIso: row.valid_until,
          redeemedAt: row.redeemed_at ? formatGermanDate(row.redeemed_at) : "-",
          note: row.note || "",
          blockReason: row.block_reason || "",
          customer: memberNameByCustomerId.get(row.customer_id) || "Unbekannter Kunde"
        };
      });

      const spinBalanceByAccount = new Map();
      state.spinTransactions.forEach((entry) => {
        const prev = spinBalanceByAccount.get(entry.rewards_account_id) || 0;
        spinBalanceByAccount.set(entry.rewards_account_id, prev + Number(entry.amount || 0));
      });
      state.members = state.members.map((member) => {
        const ledgerEntries = state.spinTransactions.filter((entry) => entry.rewards_account_id === member.id);
        const totalEarned = ledgerEntries.filter((entry) => Number(entry.amount) > 0).reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
        const totalUsed = ledgerEntries.filter((entry) => Number(entry.amount) < 0).reduce((sum, entry) => sum + Math.abs(Number(entry.amount || 0)), 0);
        const availableSpins = spinBalanceByAccount.get(member.id) || 0;
        return {
          ...member,
          spinsEarned: totalEarned,
          spinsUsed: totalUsed,
          availableSpins,
          vouchers: state.vouchers.filter((voucher) => voucher.memberId === member.id).filter((voucher) => voucher.status === "open" && new Date(voucher.validUntilIso) >= new Date(new Date().setHours(0, 0, 0, 0))).length
        };
      });

      state.loading = false;
      renderAll();
    } catch (error) {
      console.error("Rewards konnten nicht geladen werden:", error);
      state.loading = false;
      state.loadError = "Fehler beim Laden der Rewards-Daten.";
      state.members = [];
      state.transactions = [];
      state.histories = {};
      state.vouchers = [];
      renderLoadState(state.loadError, true);
    }
  }

  function statusClass(status) {
    if (status === "Aktiv" || status === "Offen" || status === "Eingelöst") return "is-active";
    if (status === "Pausiert") return "is-paused";
    return "is-blocked";
  }

  function levelBadge(level) {
    return `<span class="rewards-level ${LEVEL_CLASS[level] || ""}">${escapeHtml(level)}</span>`;
  }

  function statusBadge(status) {
    return `<span class="rewards-status ${statusClass(status)}">${escapeHtml(status)}</span>`;
  }

  function memberById(memberId) {
    return state.members.find((member) => member.id === memberId) || null;
  }

  function renderKpis() {
    const node = document.querySelector("[data-rewards-kpis]");
    if (!node) return;
    const openVouchers = state.vouchers.filter((voucher) => voucher.status === "open" && new Date(voucher.validUntilIso) >= new Date(new Date().setHours(0, 0, 0, 0))).length;
    const awardedPoints = state.transactions.filter((row) => Number(row.points) > 0).reduce((total, row) => total + Number(row.points), 0);
    const redeemedPoints = Math.abs(state.transactions.filter((row) => row.transaction_type === "voucher_redemption").reduce((total, row) => total + Number(row.points), 0));
    const today = new Date();
    const wheelSpinsToday = state.wheelSpins.filter((spin) => new Date(spin.created_at).toDateString() === today.toDateString()).length;
    const pointsWinToday = state.wheelSpins.filter((spin) => spin.prize_type.startsWith("points_") && new Date(spin.created_at).toDateString() === today.toDateString()).reduce((sum, spin) => sum + Number(spin.points_awarded || 0), 0);
    const vouchersToday = state.wheelSpins.filter((spin) => spin.prize_type === "voucher_20" && new Date(spin.created_at).toDateString() === today.toDateString()).length;
    const yumaksToday = state.wheelSpins.filter((spin) => spin.prize_type === "yumaks_box" && new Date(spin.created_at).toDateString() === today.toDateString()).length;
    const cards = [
      ["Rewards-Mitglieder", state.members.length],
      ["Aktive Mitglieder", state.members.filter((member) => member.status === "Aktiv").length],
      ["Vergebene Punkte", formatPoints(awardedPoints)],
      ["Eingelöste Punkte", formatPoints(redeemedPoints)],
      ["Offene Gutscheine", openVouchers],
      ["VIP-Mitglieder", state.members.filter((member) => member.level === "VIP").length],
      ["Teilnahmen heute", wheelSpinsToday],
      ["Punktegewinne heute", formatPoints(pointsWinToday)],
      ["Gutscheine heute", vouchersToday],
      ["Yumaks Box heute", yumaksToday]
    ];
    node.innerHTML = cards.map(([label, value]) => `<article class="rewards-kpi"><small>${label}</small><strong>${value}</strong></article>`).join("");
  }

  function renderWheelPanelStats() {
    const today = new Date();
    const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const wheelSpinsToday = state.wheelSpins.filter((spin) => {
      const value = new Date(spin.created_at);
      return value >= dayStart && value < new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    }).length;

    const wheelWinsToday = state.wheelSpins.filter((spin) => {
      const value = new Date(spin.created_at);
      return spin.prize_type !== "yumaks_box" && value >= dayStart && value < new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    }).length;

    const wheelIssuedVoucherToday = state.wheelSpins.filter((spin) => {
      const value = new Date(spin.created_at);
      return spin.prize_type === "voucher_20" && value >= dayStart && value < new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    }).length;

    const yumaksToday = state.wheelSpins.filter((spin) => {
      const value = new Date(spin.created_at);
      return spin.prize_type === "yumaks_box" && value >= dayStart && value < new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    }).length;

    const yumaksMonth = state.wheelSpins.filter((spin) => {
      const value = new Date(spin.created_at);
      return spin.prize_type === "yumaks_box" && value >= monthStart;
    }).length;

    const yumaksPending = state.wheelSpins.filter((spin) => spin.prize_type === "yumaks_box" && spin.fulfillment_status === "pending").length;

    const yumaksTodayNode = document.querySelector("[data-yumaks-today]");
    const yumaksMonthNode = document.querySelector("[data-yumaks-month]");
    const yumaksPendingNode = document.querySelector("[data-yumaks-pending]");
    const wheelStatusNode = document.querySelector("[data-wheel-status]");
    const wheelParticipationsNode = document.querySelector("[data-wheel-participations]");
    const wheelWinsNode = document.querySelector("[data-wheel-wins]");
    const wheelGiftVouchersNode = document.querySelector("[data-wheel-gift-vouchers]");

    if (yumaksTodayNode) yumaksTodayNode.textContent = String(yumaksToday);
    if (yumaksMonthNode) yumaksMonthNode.textContent = String(yumaksMonth);
    if (yumaksPendingNode) yumaksPendingNode.textContent = String(yumaksPending);
    if (wheelStatusNode) wheelStatusNode.textContent = "Aktiv";
    if (wheelParticipationsNode) wheelParticipationsNode.textContent = String(wheelSpinsToday);
    if (wheelWinsNode) wheelWinsNode.textContent = String(wheelWinsToday);
    if (wheelGiftVouchersNode) wheelGiftVouchersNode.textContent = String(wheelIssuedVoucherToday);
  }

  function filteredMembers() {
    const search = String(document.querySelector("[data-rewards-search]")?.value || "").trim().toLocaleLowerCase("de-DE");
    const level = document.querySelector("[data-rewards-level-filter]")?.value || "Alle";
    const status = document.querySelector("[data-rewards-status-filter]")?.value || "Alle";
    const voucherOnly = Boolean(document.querySelector("[data-rewards-voucher-only]")?.checked);
    const sort = document.querySelector("[data-rewards-sort]")?.value || "points-desc";

    const rows = state.members.filter((member) => {
      const haystack = `${member.name} ${member.phone} ${member.email}`.toLocaleLowerCase("de-DE");
      return (!search || haystack.includes(search))
        && (level === "Alle" || member.level === level)
        && (status === "Alle" || member.status === status)
        && (!voucherOnly || member.vouchers > 0);
    });

    rows.sort((a, b) => {
      if (sort === "level-desc") return LEVEL_ORDER[b.level] - LEVEL_ORDER[a.level] || b.points - a.points;
      if (sort === "activity-desc") return dateValue(b.activity).localeCompare(dateValue(a.activity));
      if (sort === "rides-desc") return b.rides - a.rides;
      return b.points - a.points;
    });
    return rows;
  }

  function renderMembers() {
    const body = document.querySelector("[data-rewards-members]");
    const empty = document.querySelector("[data-rewards-members-empty]");
    const count = document.querySelector("[data-rewards-result-count]");
    if (!body || !empty || !count) return;

    const rows = filteredMembers();
    const hasRows = rows.length > 0;
    const emptyTitle = empty.querySelector("strong");
    const emptyText = empty.querySelector("p");
    const resetButton = empty.querySelector("[data-rewards-reset-filter]");
    count.textContent = `${rows.length} von ${state.members.length}`;
    body.innerHTML = rows.map((member) => {
      const wheelDisabled = member.availableSpins < 1 || member.status !== "Aktiv";
      const wheelHint = wheelDisabled ? "Kein Dreh verfügbar" : "";
      return `
      <tr>
        <td><strong>${escapeHtml(member.name)}</strong><small>${escapeHtml(member.email)}</small></td>
        <td>${escapeHtml(member.phone)}</td>
        <td>${levelBadge(member.level)}</td>
        <td><strong>${formatPoints(member.points)}</strong></td>
        <td>${member.rides}</td>
        <td>${member.activity}</td>
        <td>${member.vouchers}</td>
        <td>${statusBadge(member.status)}</td>
        <td><div class="rewards-actions">
          <button class="rewards-action-btn" type="button" data-member-action="details" data-member-id="${member.id}">Details</button>
          <button class="rewards-action-btn" type="button" data-member-action="points-add" data-member-id="${member.id}">Punkte hinzufügen</button>
          <button class="rewards-action-btn" type="button" data-member-action="points-subtract" data-member-id="${member.id}">Punkte abziehen</button>
          <button class="rewards-action-btn" type="button" data-member-action="voucher-issue" data-member-id="${member.id}">Gutschein ausstellen</button>
          <button class="rewards-action-btn" type="button" data-member-action="spin-grant" data-member-id="${member.id}">Dreh vergeben</button>
          <button class="rewards-action-btn ${wheelDisabled ? "is-wheel-disabled" : ""}" type="button" data-member-action="wheel-spin" data-member-id="${member.id}" ${wheelDisabled ? "disabled" : ""} title="${wheelHint || "Glücksrad drehen"}">
            <span class="wheel-label">Glücksrad drehen</span>${wheelDisabled ? '<span class="wheel-status">Kein Dreh verfügbar</span>' : ""}
          </button>
          <button class="rewards-action-btn" type="button" data-member-action="status-change" data-member-id="${member.id}">Status ändern</button>
        </div></td>
      </tr>
    `;
    }).join("");
    if (emptyTitle) emptyTitle.textContent = state.members.length ? "Keine Rewards-Mitglieder gefunden." : "Keine Rewards-Mitglieder vorhanden.";
    if (emptyText) emptyText.textContent = state.members.length ? "Keine Ergebnisse für diese Filter." : "In Supabase sind noch keine Rewards-Konten vorhanden.";
    if (resetButton) resetButton.style.display = state.members.length ? "" : "none";
    empty.toggleAttribute("hidden", hasRows);
  }

  function renderVouchers() {
    const body = document.querySelector("[data-rewards-vouchers]");
    const empty = document.querySelector("[data-rewards-vouchers-empty]");
    if (!body || !empty) return;
    const rows = state.vouchers;
    const hasRows = rows.length > 0;
    body.innerHTML = rows.map((voucher) => `
      <tr>
        <td><strong>${escapeHtml(voucher.code)}</strong></td>
        <td>${escapeHtml(voucher.customer)}</td>
        <td>${formatVoucherCurrency(voucher.valueCents)}</td>
        <td>${statusBadge(voucher.displayStatus)}</td>
        <td>${escapeHtml(voucher.issued)}</td>
        <td>${escapeHtml(voucher.validUntil)}</td>
        <td>${escapeHtml(voucher.redeemedAt)}</td>
        <td>
          <div class="rewards-actions">
            <button class="rewards-action-btn" type="button" data-voucher-action="details" data-voucher-id="${voucher.id}">Details</button>
            ${voucher.status === "open" && new Date(voucher.validUntilIso) >= new Date(new Date().setHours(0, 0, 0, 0)) ? `<button class="rewards-action-btn" type="button" data-voucher-action="redeem" data-voucher-id="${voucher.id}">Einlösen</button>` : ""}
            ${voucher.status === "open" ? `<button class="rewards-action-btn" type="button" data-voucher-action="block" data-voucher-id="${voucher.id}">Sperren</button>` : ""}
          </div>
        </td>
      </tr>
    `).join("");
    empty.toggleAttribute("hidden", hasRows);
  }

  function progressPercent(member) {
    if (member.level === "VIP") return 100;
    if (member.level === "Platin") return Math.max(0, Math.min(100, Math.round((member.rides / 100) * 100)));
    return 0;
  }

  function detailOverview(member) {
    return `
      <div class="rewards-detail-grid">
        <div><small>Name</small><strong>${escapeHtml(member.name)}</strong></div><div><small>Telefon</small><strong>${escapeHtml(member.phone)}</strong></div>
        <div><small>E-Mail</small><strong>${escapeHtml(member.email)}</strong></div><div><small>Rewards-Status</small>${statusBadge(member.status)}</div>
        <div><small>Geburtsdatum</small><strong>${escapeHtml(member.birthDate)}</strong></div><div><small>Geburtstagsbonus ${new Date().getFullYear()}</small><strong>${escapeHtml(member.birthdayBonusStatus || "Noch nicht vergeben")}</strong></div>
        <div><small>Aktuelles Level</small>${levelBadge(member.level)}</div><div><small>Punktestand</small><strong>${formatPoints(member.points)}</strong></div>
        <div><small>Qualifizierende Fahrten</small><strong>${member.rides}</strong></div><div><small>Offene Gutscheine</small><strong>${member.vouchers}</strong></div>
        <div><small>Letzte Aktivität</small><strong>${member.activity}</strong></div><div><small>Nächstes Level</small><strong>${member.level === "VIP" ? "Höchstes Level erreicht" : member.nextLevel}</strong></div>
      </div>
      <section><div class="admin-panel-head"><h3>Fortschritt zum nächsten Level</h3><strong>${progressPercent(member)} %</strong></div><div class="rewards-progress" role="progressbar" aria-label="Fortschritt zum nächsten Level" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progressPercent(member)}"><span style="width:${progressPercent(member)}%"></span></div><p>${member.level === "VIP" ? "VIP-Ziel erreicht" : member.level === "Platin" ? `${member.rides} von 100 qualifizierenden Fahrten bis VIP` : "Levelgrenze ist im bestehenden Projekt nicht eindeutig hinterlegt."}</p></section>
      <div class="rewards-actions">
        <button class="admin-btn${member.status === "Aktiv" && member.birthDateValue && member.isBirthdayToday && !member.birthdayBonusGrantedThisYear ? "" : " admin-btn-secondary"}" type="button" data-member-action="birthday-bonus" data-member-id="${member.id}" ${member.status === "Aktiv" && member.birthDateValue && member.isBirthdayToday && !member.birthdayBonusGrantedThisYear ? "" : "disabled"}>200 Punkte Geburtstagsbonus</button>
      </div>
    `;
  }

  function detailHistory(member) {
    const rows = state.histories[member.id] || [];
    if (!rows.length) return '<div class="admin-empty-state"><strong>Kein Punkteverlauf vorhanden.</strong><p>Für dieses Mitglied wurden noch keine Buchungen erfasst.</p></div>';
    return `<div class="rewards-history">${rows.map((row) => `<article><small>${row.date} · ${escapeHtml(row.type)}</small><strong>${escapeHtml(row.description)}</strong><p>${row.points > 0 ? "+" : ""}${formatPoints(row.points)} Punkte · ${escapeHtml(row.actor)}</p></article>`).join("")}</div>`;
  }

  function detailVouchers(member) {
    const rows = state.vouchers.filter((voucher) => voucher.memberId === member.id);
    if (!rows.length) return '<div class="admin-empty-state"><strong>Keine Gutscheine vorhanden.</strong><p>Für dieses Mitglied wurden keine Gutscheine ausgestellt.</p></div>';
    return `<div class="rewards-history">${rows.map((voucher) => `<article><small>${voucher.code} · ${voucher.displayStatus}</small><strong>${formatVoucherCurrency(voucher.valueCents)}</strong><p>Gültig bis ${voucher.validUntil}</p></article>`).join("")}</div>`;
  }

  function detailNotes(member) {
    if (!member.notes.length) return '<div class="admin-empty-state"><strong>Keine Notizen vorhanden.</strong><p>Für dieses Mitglied wurden keine internen Notizen erfasst.</p></div>';
    return `<div class="rewards-note-list">${member.notes.map((note) => `<article><small>Interne Notiz</small><strong>${escapeHtml(note)}</strong></article>`).join("")}</div>`;
  }

  function yumaksFulfillmentButton(spin) {
    if (!spin || spin.prize_type !== "yumaks_box") return "";
    if (spin.fulfillment_status === "fulfilled") {
      const fulfilledAt = spin.fulfilled_at ? formatShortDate(spin.fulfilled_at) : "-";
      return `<div class="rewards-actions"><button class="rewards-action-btn" type="button" disabled>Ausgegeben</button>${fulfilledAt !== "-" ? `<small>Ausgegeben am: ${fulfilledAt}</small>` : ""}</div>`;
    }
    if (spin.fulfillment_status === "pending") {
      return `<div class="rewards-actions"><button class="rewards-action-btn" type="button" data-wheel-fulfill="${spin.id}">Als ausgegeben markieren</button></div>`;
    }
    return "";
  }

  function renderDrawer() {
    const drawer = document.querySelector("[data-rewards-drawer]");
    const backdrop = document.querySelector(".rewards-drawer-backdrop");
    const title = document.querySelector("[data-rewards-drawer-title]");
    const body = document.querySelector("[data-rewards-drawer-body]");
    const member = memberById(state.selectedMemberId);
    if (!drawer || !backdrop || !title || !body || !member) return;

    title.textContent = member.name;
    const wheelHistory = state.wheelSpins.filter((spin) => spin.rewards_account_id === member.id).slice(0, 6);
    const wheelSummary = `
      <div class="rewards-detail-grid">
        <div><small>Verfügbare Drehs</small><strong>${member.availableSpins ?? 0}</strong></div>
        <div><small>Drehs insgesamt erhalten</small><strong>${member.spinsEarned ?? 0}</strong></div>
        <div><small>Drehs genutzt</small><strong>${member.spinsUsed ?? 0}</strong></div>
        <div><small>Yumaks Box offen</small><strong>${state.wheelSpins.filter((spin) => spin.rewards_account_id === member.id && spin.prize_type === "yumaks_box" && spin.fulfillment_status !== "fulfilled").length}</strong></div>
      </div>
      <section>
        <div class="admin-panel-head"><h3>Letzte Glücksrad-Gewinne</h3></div>
        ${wheelHistory.length ? `<div class="rewards-history">${wheelHistory.map((spin) => `<article><small>${formatShortDate(spin.created_at)}</small><strong>${spin.prize_type === "voucher_20" ? "20,00 € Gutschein" : spin.prize_type === "yumaks_box" ? "Yumaks Box" : `${spin.points_awarded || 0} Punkte`}</strong><p>${spin.prize_type === "yumaks_box" ? spin.fulfillment_status === "fulfilled" ? "Ausgegeben" : "Ausstehend" : "Gewinn"}</p>${yumaksFulfillmentButton(spin)}</article>`).join("")}</div>` : '<div class="admin-empty-state"><strong>Keine Glücksrad-Gewinne.</strong><p>Für dieses Mitglied wurden noch keine Spins gelandet.</p></div>'}
      </section>
    `;
    const panels = {
      overview: `${detailOverview(member)}${wheelSummary}`,
      history: detailHistory(member),
      vouchers: detailVouchers(member),
      notes: detailNotes(member)
    };
    body.innerHTML = `
      <div class="rewards-tabs" role="tablist" aria-label="Mitgliedbereiche">
        <button class="rewards-tab${state.drawerTab === "overview" ? " is-active" : ""}" type="button" data-rewards-tab="overview">Übersicht</button>
        <button class="rewards-tab${state.drawerTab === "history" ? " is-active" : ""}" type="button" data-rewards-tab="history">Punkteverlauf</button>
        <button class="rewards-tab${state.drawerTab === "vouchers" ? " is-active" : ""}" type="button" data-rewards-tab="vouchers">Gutscheine</button>
        <button class="rewards-tab${state.drawerTab === "notes" ? " is-active" : ""}" type="button" data-rewards-tab="notes">Notizen</button>
      </div>
      ${panels[state.drawerTab] || panels.overview}
      <div class="rewards-actions"><button class="admin-btn" type="button" data-member-action="points-add" data-member-id="${member.id}">Punkte hinzufügen</button><button class="admin-btn admin-btn-secondary" type="button" data-member-action="voucher-issue" data-member-id="${member.id}">Gutschein ausstellen</button></div>
    `;
    drawer.hidden = false;
    backdrop.hidden = false;
    document.body.classList.add("admin-modal-open");
  }

  function closeDrawer() {
    const drawer = document.querySelector("[data-rewards-drawer]");
    const backdrop = document.querySelector(".rewards-drawer-backdrop");
    if (drawer) drawer.hidden = true;
    if (backdrop) backdrop.hidden = true;
    document.body.classList.remove("admin-modal-open");
  }

  function memberOptions(selectedId = "") {
    return state.members.map((member) => `<option value="${member.id}"${member.id === selectedId ? " selected" : ""}>${escapeHtml(member.name)}</option>`).join("");
  }

  function openModal(title, bodyHtml, confirmLabel = "Aktion bestätigen", confirmClass = "") {
    const modal = document.querySelector("[data-rewards-modal]");
    const titleNode = document.querySelector("[data-rewards-modal-title]");
    const body = document.querySelector("[data-rewards-modal-body]");
    const foot = document.querySelector("[data-rewards-modal-foot]");
    if (!modal || !titleNode || !body || !foot) return;
    titleNode.textContent = title;
    body.innerHTML = bodyHtml;
    foot.innerHTML = `<button class="admin-btn admin-btn-secondary" type="button" data-rewards-modal-close>Abbrechen</button><button class="admin-btn ${confirmClass}" type="button" data-rewards-modal-confirm>${confirmLabel}</button>`;
    modal.hidden = false;
    document.body.classList.add("admin-modal-open");
    body.querySelector("input, select, textarea")?.focus();
  }

  function closeModal() {
    const modal = document.querySelector("[data-rewards-modal]");
    if (modal) modal.hidden = true;
    state.pendingAction = null;
    if (document.querySelector("[data-rewards-drawer]")?.hidden !== false) document.body.classList.remove("admin-modal-open");
  }

  function showToast(message) {
    const toast = document.querySelector("[data-rewards-toast]");
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    window.clearTimeout(state.toastTimer);
    state.toastTimer = window.setTimeout(() => { toast.hidden = true; }, 3200);
  }

  function memberStatusBlockedMessage(member) {
    if (!member) return "";
    if (member.status === "Pausiert") return "Das Rewards-Konto ist pausiert. Punktebuchungen sind derzeit nicht möglich.";
    if (member.status === "Gesperrt") return "Das Rewards-Konto ist gesperrt. Punktebuchungen sind derzeit nicht möglich.";
    return "";
  }

  function ensureActiveStatusForManualPoints(member, action) {
    if (!member || member.status === "Aktiv") return true;
    const message = memberStatusBlockedMessage(member);
    if (message) {
      showToast(message);
      if (action && typeof action === "string") {
        state.pendingAction = null;
      }
    }
    return false;
  }

  function pointsForm(memberId, subtract = false) {
    const member = memberById(memberId);
    if (!ensureActiveStatusForManualPoints(member, "points")) return;
    state.pendingAction = { type: subtract ? "points-subtract" : "points-add", memberId };
    openModal(subtract ? "Punkte abziehen" : "Punkte hinzufügen", `
      <form class="rewards-form" data-rewards-form>
        <div class="rewards-form-grid">
          <label class="rewards-form-field"><span>Mitglied</span><select name="memberId" required>${memberOptions(memberId)}</select></label>
          <label class="rewards-form-field"><span>Punkte</span><input name="points" type="number" min="1" step="1" value="50" required></label>
        </div>
        <label class="rewards-form-field"><span>Grund</span><select name="reason" required><option>Kulanz</option><option>Service</option><option>Aktion</option><option>Korrektur</option><option>Sonstiges</option></select></label>
        <label class="rewards-form-field"><span>Interne Notiz</span><textarea name="note" placeholder="Optionale interne Notiz"></textarea></label>
        ${subtract ? '<p class="rewards-warning">Diese Aktion reduziert den Punktestand des Mitglieds. Ein negativer Punktestand ist nicht zulässig.</p>' : ""}
        <div class="rewards-confirmation" data-rewards-summary>50 Punkte ${subtract ? "abziehen" : "hinzufügen"}. Grund: Kulanz.</div>
      </form>
    `, subtract ? "Abzug bestätigen" : "Buchung bestätigen", subtract ? "admin-btn-danger" : "");
    bindFormSummary();
  }

  function voucherForm(memberId = "") {
    const member = memberById(memberId) || state.members[0];
    if (!member) {
      infoModal("Gutschein ausstellen", "Es ist noch kein Rewards-Konto vorhanden.");
      return;
    }
    if (member.status === "Pausiert") {
      showToast("Das Rewards-Konto ist pausiert. Gutscheine können derzeit nicht ausgestellt werden.");
      return;
    }
    if (member.status === "Gesperrt") {
      showToast("Das Rewards-Konto ist gesperrt. Gutscheine können derzeit nicht ausgestellt werden.");
      return;
    }

    const todayIso = new Date().toISOString().split("T")[0];
    const defaultExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    state.pendingAction = { type: "voucher-issue", memberId: member.id };
    openModal("Gutschein ausstellen", `
      <form class="rewards-form" data-rewards-form>
        <label class="rewards-form-field"><span>Mitglied</span><select name="memberId" required>${memberOptions(member.id)}</select></label>
        <label class="rewards-form-field"><span>Wert (€)</span><input name="value" type="text" inputmode="decimal" value="20,00" required></label>
        <label class="rewards-form-field"><span>Gültig bis</span><input name="validUntil" type="date" min="${todayIso}" value="${defaultExpiry}" required></label>
        <label class="rewards-form-field"><span>Notiz</span><textarea name="note" placeholder="Optionale Notiz"></textarea></label>
        <div class="rewards-confirmation">Echter Supabase-Gutschein mit 20,00 € Wert und gültigem Ausstellungsdatum.</div>
      </form>
    `, "Gutschein ausstellen");
  }

  function statusForm(memberId) {
    const member = memberById(memberId) || state.members[0];
    state.pendingAction = { type: "status-change", memberId: member.id };
    openModal("Status ändern", `<form class="rewards-form" data-rewards-form><label class="rewards-form-field"><span>Mitglied</span><input value="${escapeHtml(member.name)}" disabled></label><label class="rewards-form-field"><span>Neuer Status</span><select name="status"><option${member.status === "Aktiv" ? " selected" : ""}>Aktiv</option><option${member.status === "Pausiert" ? " selected" : ""}>Pausiert</option><option${member.status === "Gesperrt" ? " selected" : ""}>Gesperrt</option></select></label><div class="rewards-confirmation">Der Status wird im Rewards-Konto gespeichert.</div></form>`, "Status speichern");
  }

  function birthdayBonusForm(memberId) {
    const member = memberById(memberId);
    if (!member) return;
    if (member.status !== "Aktiv") {
      showToast(member.status === "Pausiert" ? "Das Rewards-Konto ist pausiert. Der Geburtstagsbonus kann derzeit nicht vergeben werden." : "Das Rewards-Konto ist gesperrt. Der Geburtstagsbonus kann derzeit nicht vergeben werden.");
      return;
    }
    if (!member.birthDateValue) {
      showToast("Für diesen Kunden ist kein Geburtsdatum hinterlegt.");
      return;
    }
    if (!member.isBirthdayToday) {
      showToast("Der Geburtstagsbonus kann nur am hinterlegten Geburtstag vergeben werden.");
      return;
    }
    if (member.birthdayBonusGrantedThisYear) {
      showToast("Der Geburtstagsbonus wurde für dieses Jahr bereits vergeben.");
      return;
    }
    state.pendingAction = { type: "birthday-bonus", memberId: member.id };
    openModal("Geburtstagsbonus vergeben", `<form class="rewards-form" data-rewards-form><label class="rewards-form-field"><span>Kunde</span><input value="${escapeHtml(member.name)}" disabled></label><label class="rewards-form-field"><span>Bonus</span><input value="200 Punkte" disabled></label><label class="rewards-form-field"><span>Jahr</span><input value="${new Date().getFullYear()}" disabled></label><div class="rewards-confirmation">Der Bonus wird direkt im Rewards-Ledger und im Kontostand gespeichert.</div></form>`, "200 Punkte vergeben", "");
  }

  function memberForm() {
    infoModal("Rewards-Mitglied hinzufügen", "Rewards-Konten werden automatisch für bestehende Kunden angelegt. Neue Kundendaten werden weiterhin in der Kundenverwaltung erfasst.");
  }

  function infoModal(title, text) {
    state.pendingAction = { type: "info" };
    openModal(title, `<div class="rewards-form"><p>${text}</p></div>`, "Schließen");
  }

  function bindFormSummary() {
    const form = document.querySelector("[data-rewards-form]");
    const summary = document.querySelector("[data-rewards-summary]");
    if (!form || !summary) return;
    form.addEventListener("input", () => {
      const data = new FormData(form);
      summary.textContent = `${Number(data.get("points") || 0)} Punkte ${state.pendingAction?.type === "points-subtract" ? "abziehen" : "hinzufügen"}. Grund: ${data.get("reason") || "-"}.`;
    });
  }

  async function applyPendingAction() {
    const action = state.pendingAction;
    const form = document.querySelector("[data-rewards-form]");
    if (!action) return;
    if (action.type === "dismiss" || action.type === "info") {
      closeModal();
      return;
    }
    if (!form || !form.reportValidity()) return;
    const data = new FormData(form);
    const memberId = String(data.get("memberId") || action.memberId || "");
    const member = action.type === "voucher-redeem" || action.type === "voucher-block" ? null : memberById(memberId);
    if (!member && action.type !== "voucher-redeem" && action.type !== "voucher-block") return;
    const confirmButton = document.querySelector("[data-rewards-modal-confirm]");
    if (confirmButton) {
      confirmButton.disabled = true;
      const defaultLabel = confirmButton.dataset.defaultLabel || confirmButton.textContent || "Bestätigen";
      confirmButton.dataset.defaultLabel = defaultLabel;
      confirmButton.textContent = action.type === "voucher-redeem" ? "Wird eingelöst …" : defaultLabel;
    }

    try {
      if (action.type === "points-add" || action.type === "points-subtract") {
        const amount = Math.max(1, Math.round(Number(data.get("points") || 0)));
        if (action.type === "points-subtract" && amount > member.points) {
          showToast("Der Punktestand darf nicht negativ werden.");
          return;
        }
        const delta = action.type === "points-subtract" ? -amount : amount;
        const { error } = await state.client.rpc("book_rewards_points", {
          p_rewards_account_id: member.id,
          p_points: delta,
          p_reason: String(data.get("reason") || "Korrektur"),
          p_note: String(data.get("note") || "") || null
        });
        if (error) throw error;
        closeModal();
        await loadRewardsData();
        showToast(action.type === "points-subtract" ? "Punkte wurden abgezogen." : "Punkte wurden hinzugefügt.");
        return;
      }

      if (action.type === "birthday-bonus") {
        const { error } = await state.client.rpc("book_rewards_birthday_bonus", {
          p_rewards_account_id: member.id
        });
        if (error) throw error;
        closeModal();
        await loadRewardsData();
        showToast("200 Punkte Geburtstagsbonus wurden vergeben.");
        return;
      }

      if (action.type === "voucher-issue") {
        const valueCents = parseEuroInput(String(data.get("value") || "20,00"));
        const validUntil = String(data.get("validUntil") || "");
        if (!validUntil) {
          showToast("Das Gültigkeitsdatum des Gutscheins ist ungültig.");
          return;
        }
        const { error } = await state.client.rpc("issue_rewards_voucher", {
          p_rewards_account_id: member.id,
          p_value_cents: valueCents,
          p_valid_until: validUntil,
          p_note: String(data.get("note") || "") || null
        });
        if (error) throw error;
        closeModal();
        await loadRewardsData();
        showToast("Gutschein wurde erfolgreich ausgestellt.");
        return;
      }

      if (action.type === "grant-spin") {
        const amount = Math.max(1, Math.round(Number(data.get("amount") || 0)));
        const { error } = await state.client.rpc("grant_rewards_spin", {
          p_rewards_account_id: member.id,
          p_amount: amount,
          p_reason: String(data.get("reason") || "Kulanz"),
          p_note: String(data.get("note") || "") || null
        });
        if (error) throw error;
        closeModal();
        await loadRewardsData();
        showToast("Dreh wurde erfolgreich vergeben.");
        return;
      }

      if (action.type === "wheel-spin") {
        const { data: spinData, error } = await state.client.rpc("spin_rewards_wheel", {
          p_rewards_account_id: member.id
        });
        if (error) throw error;
        closeModal();
        await loadRewardsData();
        showToast(spinData?.message || "Glücksrad gewonnen.");
        return;
      }

      if (action.type === "yumaks-fulfill") {
        const { error } = await state.client.rpc("fulfill_yumaks_box", {
          p_spin_id: action.spinId
        });
        if (error) throw error;
        closeModal();
        await loadRewardsData();
        showToast("Yumaks Box wurde als ausgegeben markiert.");
        return;
      }

      if (action.type === "voucher-redeem") {
        const voucherId = action.voucherId;
        if (!voucherId) {
          showToast("Gutschein konnte nicht verarbeitet werden.");
          closeModal();
          return;
        }
        const { error } = await state.client.rpc("redeem_rewards_voucher", {
          p_voucher_id: voucherId
        });
        if (error) throw error;
        closeModal();
        await loadRewardsData();
        showToast("Gutschein wurde erfolgreich eingelöst.");
        return;
      }

      if (action.type === "voucher-block") {
        const reason = String(data.get("reason") || "").trim();
        const { error } = await state.client.rpc("block_rewards_voucher", {
          p_voucher_id: action.voucherId,
          p_reason: reason
        });
        if (error) throw error;
        closeModal();
        await loadRewardsData();
        showToast("Gutschein wurde gesperrt.");
        return;
      }

      if (action.type === "status-change") {
        const status = STATUS_VALUE[String(data.get("status") || member.status)];
        const { error } = await state.client.from("rewards_accounts").update({ status }).eq("id", member.id);
        if (error) throw error;
        closeModal();
        await loadRewardsData();
        showToast("Rewards-Status wurde gespeichert.");
      }
    } catch (error) {
      console.error("Rewards-Aktion fehlgeschlagen:", error);
      const message = String(error?.message || error?.details || "");
      if (action.type === "birthday-bonus") {
        if (message.includes("REWARDS_ACCOUNT_PAUSED")) {
          showToast("Das Rewards-Konto ist pausiert. Der Geburtstagsbonus kann derzeit nicht vergeben werden.");
        } else if (message.includes("REWARDS_ACCOUNT_BLOCKED")) {
          showToast("Das Rewards-Konto ist gesperrt. Der Geburtstagsbonus kann derzeit nicht vergeben werden.");
        } else if (message.includes("REWARDS_BIRTH_DATE_MISSING")) {
          showToast("Für diesen Kunden ist kein Geburtsdatum hinterlegt.");
        } else if (message.includes("REWARDS_NOT_BIRTHDAY")) {
          showToast("Der Geburtstagsbonus kann nur am hinterlegten Geburtstag vergeben werden.");
        } else if (message.includes("REWARDS_BIRTHDAY_ALREADY_GRANTED")) {
          showToast("Der Geburtstagsbonus wurde für dieses Jahr bereits vergeben.");
        } else {
          showToast("Geburtstagsbonus konnte nicht vergeben werden.");
        }
      } else if (action.type === "voucher-issue") {
        if (message.includes("REWARDS_ACCOUNT_PAUSED")) {
          showToast("Das Rewards-Konto ist pausiert. Gutscheine können derzeit nicht ausgestellt werden.");
        } else if (message.includes("REWARDS_ACCOUNT_BLOCKED")) {
          showToast("Das Rewards-Konto ist gesperrt. Gutscheine können derzeit nicht ausgestellt werden.");
        } else if (message.includes("REWARDS_VOUCHER_INVALID_EXPIRY")) {
          showToast("Das Gültigkeitsdatum des Gutscheins ist ungültig.");
        } else {
          showToast("Gutschein konnte nicht verarbeitet werden.");
        }
      } else if (action.type === "grant-spin") {
        if (message.includes("REWARDS_ACCOUNT_PAUSED")) {
          showToast("Das Rewards-Konto ist pausiert. Das Glücksrad kann derzeit nicht verwendet werden.");
        } else if (message.includes("REWARDS_ACCOUNT_BLOCKED")) {
          showToast("Das Rewards-Konto ist gesperrt. Das Glücksrad kann derzeit nicht verwendet werden.");
        } else {
          showToast("Dreh konnte nicht vergeben werden.");
        }
      } else if (action.type === "wheel-spin") {
        if (message.includes("REWARDS_ACCOUNT_PAUSED")) {
          showToast("Das Rewards-Konto ist pausiert. Das Glücksrad kann derzeit nicht verwendet werden.");
        } else if (message.includes("REWARDS_ACCOUNT_BLOCKED")) {
          showToast("Das Rewards-Konto ist gesperrt. Das Glücksrad kann derzeit nicht verwendet werden.");
        } else if (message.includes("REWARDS_NO_SPINS_AVAILABLE")) {
          showToast("Für dieses Rewards-Konto ist aktuell kein Dreh verfügbar.");
        } else {
          showToast("Glücksrad konnte nicht ausgeführt werden.");
        }
      } else if (action.type === "yumaks-fulfill") {
        if (message.includes("REWARDS_YUMAKS_ALREADY_FULFILLED")) {
          showToast("Diese Yumaks Box wurde bereits als ausgegeben markiert.");
        } else if (message.includes("REWARDS_NOT_YUMAKS_BOX")) {
          showToast("Dieser Glücksrad-Gewinn ist keine Yumaks Box.");
        } else if (message.includes("REWARDS_YUMAKS_INVALID_STATUS")) {
          showToast("Der Status dieser Yumaks Box ist ungültig.");
        } else {
          showToast("Yumaks Box konnte nicht aktualisiert werden.");
        }
      } else if (action.type === "voucher-redeem") {
        if (message.includes("REWARDS_ACCOUNT_PAUSED")) {
          showToast("Das Rewards-Konto ist pausiert. Gutscheine können derzeit nicht verwendet werden.");
        } else if (message.includes("REWARDS_ACCOUNT_BLOCKED")) {
          showToast("Das Rewards-Konto ist gesperrt. Gutscheine können derzeit nicht verwendet werden.");
        } else if (message.includes("REWARDS_VOUCHER_ALREADY_REDEEMED")) {
          showToast("Dieser Gutschein wurde bereits eingelöst.");
        } else if (message.includes("REWARDS_VOUCHER_EXPIRED")) {
          showToast("Dieser Gutschein ist abgelaufen und kann nicht mehr eingelöst werden.");
        } else if (message.includes("REWARDS_VOUCHER_BLOCKED")) {
          showToast("Dieser Gutschein ist gesperrt und kann nicht eingelöst werden.");
        } else {
          showToast("Gutschein konnte nicht verarbeitet werden.");
        }
      } else if (action.type === "voucher-block") {
        if (message.includes("REWARDS_VOUCHER_ALREADY_REDEEMED")) {
          showToast("Dieser Gutschein wurde bereits eingelöst.");
        } else {
          showToast("Gutschein konnte nicht verarbeitet werden.");
        }
      } else if (message.includes("REWARDS_ACCOUNT_PAUSED")) {
        showToast("Das Rewards-Konto ist pausiert. Punktebuchungen sind derzeit nicht möglich.");
      } else if (message.includes("REWARDS_ACCOUNT_BLOCKED")) {
        showToast("Das Rewards-Konto ist gesperrt. Punktebuchungen sind derzeit nicht möglich.");
      } else if (action.type === "status-change") {
        showToast("Rewards-Status konnte nicht gespeichert werden.");
      } else {
        showToast("Punkte konnten nicht gebucht werden.");
      }
      await loadRewardsData();
    } finally {
      if (confirmButton?.isConnected) {
        confirmButton.disabled = false;
        if (confirmButton.dataset.defaultLabel) confirmButton.textContent = confirmButton.dataset.defaultLabel;
      }
    }
  }

  function grantSpinForm(memberId) {
    const member = memberById(memberId);
    if (!member) return;
    if (member.status !== "Aktiv") {
      showToast(member.status === "Pausiert" ? "Das Rewards-Konto ist pausiert. Manuelle Drehvergabe ist derzeit nicht möglich." : "Das Rewards-Konto ist gesperrt. Manuelle Drehvergabe ist derzeit nicht möglich.");
      return;
    }
    state.pendingAction = { type: "grant-spin", memberId: member.id };
    openModal("Dreh vergeben", `
      <form class="rewards-form" data-rewards-form>
        <label class="rewards-form-field"><span>Mitglied</span><select name="memberId" required>${memberOptions(member.id)}</select></label>
        <label class="rewards-form-field"><span>Anzahl</span><input name="amount" type="number" min="1" step="1" value="1" required></label>
        <label class="rewards-form-field"><span>Grund</span><select name="reason" required><option>Kulanz</option><option>Aktion</option><option>Korrektur</option><option>Sonstiges</option></select></label>
        <label class="rewards-form-field"><span>Notiz</span><textarea name="note" placeholder="Optionale interne Notiz"></textarea></label>
      </form>
    `, "Dreh vergeben");
  }

  function spinWheelForm(memberId) {
    const member = memberById(memberId);
    if (!member) return;
    if (member.status !== "Aktiv") {
      showToast(member.status === "Pausiert" ? "Das Rewards-Konto ist pausiert. Das Glücksrad kann derzeit nicht verwendet werden." : "Das Rewards-Konto ist gesperrt. Das Glücksrad kann derzeit nicht verwendet werden.");
      return;
    }
    if ((member.availableSpins || 0) < 1) {
      showToast("Für dieses Rewards-Konto ist aktuell kein Dreh verfügbar.");
      return;
    }
    state.pendingAction = { type: "wheel-spin", memberId: member.id };
    openModal("Glücksrad drehen", `<form class="rewards-form" data-rewards-form><label class="rewards-form-field"><span>Kunde</span><input value="${escapeHtml(member.name)}" disabled></label><label class="rewards-form-field"><span>Verfügbare Drehs</span><input value="${member.availableSpins}" disabled></label><div class="rewards-confirmation">Der Gewinn wird serverseitig per PostgreSQL-Zufall bestimmt. Der Browser sendet keinen Gewinnwert.</div></form>`, "Glücksrad drehen");
  }

  function openVoucherDetails(voucherId) {
    const voucher = state.vouchers.find((item) => item.id === voucherId);
    if (!voucher) return;
    state.pendingAction = { type: "dismiss" };
    openModal("Gutscheindetails", `<div class="rewards-detail-grid"><div><small>Gutscheincode</small><strong>${escapeHtml(voucher.code)}</strong></div><div><small>Kunde</small><strong>${escapeHtml(voucher.customer)}</strong></div><div><small>Wert</small><strong>${formatVoucherCurrency(voucher.valueCents)}</strong></div><div><small>Status</small>${statusBadge(voucher.displayStatus)}</div><div><small>Ausgestellt am</small><strong>${escapeHtml(voucher.issued)}</strong></div><div><small>Gültig bis</small><strong>${escapeHtml(voucher.validUntil)}</strong></div><div><small>Eingelöst am</small><strong>${escapeHtml(voucher.redeemedAt)}</strong></div><div><small>Notiz</small><strong>${escapeHtml(voucher.note || "-")}</strong></div>${voucher.blockReason ? `<div><small>Sperrgrund</small><strong>${escapeHtml(voucher.blockReason)}</strong></div>` : ""}</div>`, "Schließen");
  }

  function redeemVoucherForm(voucherId) {
    const voucher = state.vouchers.find((item) => item.id === voucherId);
    if (!voucher) return;
    const account = state.members.find((member) => member.id === voucher.memberId) || null;
    if (account && account.status !== "Aktiv") {
      showToast(account.status === "Pausiert" ? "Das Rewards-Konto ist pausiert. Gutscheine können derzeit nicht verwendet werden." : "Das Rewards-Konto ist gesperrt. Gutscheine können derzeit nicht verwendet werden.");
      return;
    }
    if (voucher.status !== "open" || new Date(voucher.validUntilIso) < new Date(new Date().setHours(0, 0, 0, 0))) {
      showToast(voucher.status === "blocked" ? "Dieser Gutschein ist gesperrt und kann nicht eingelöst werden." : "Dieser Gutschein ist abgelaufen und kann nicht mehr eingelöst werden.");
      return;
    }
    state.pendingAction = { type: "voucher-redeem", voucherId: voucher.id };
    openModal("Gutschein einlösen", `<form class="rewards-form" data-rewards-form><label class="rewards-form-field"><span>Code</span><input value="${escapeHtml(voucher.code)}" disabled></label><label class="rewards-form-field"><span>Kunde</span><input value="${escapeHtml(voucher.customer)}" disabled></label><label class="rewards-form-field"><span>Wert</span><input value="${formatVoucherCurrency(voucher.valueCents)}" disabled></label><div class="rewards-confirmation">Der Gutschein kann nach der Einlösung nicht erneut verwendet werden.</div></form>`, "Gutschein einlösen");
  }

  function blockVoucherForm(voucherId) {
    const voucher = state.vouchers.find((item) => item.id === voucherId);
    if (!voucher || voucher.status !== "open") return;
    state.pendingAction = { type: "voucher-block", voucherId: voucher.id };
    openModal("Gutschein sperren", `<form class="rewards-form" data-rewards-form><label class="rewards-form-field"><span>Code</span><input value="${escapeHtml(voucher.code)}" disabled></label><label class="rewards-form-field"><span>Grund</span><textarea name="reason" placeholder="Sperrgrund" required></textarea></label></form>`, "Gutschein sperren");
  }

  function fulfillYumaksBoxForm(spinId) {
    const spin = state.wheelSpins.find((item) => item.id === spinId);
    if (!spin || spin.prize_type !== "yumaks_box") return;
    const member = state.members.find((item) => item.id === spin.rewards_account_id);
    state.pendingAction = { type: "yumaks-fulfill", spinId: spin.id, memberId: spin.rewards_account_id };
    openModal("Yumaks Box ausgeben", `<div class="rewards-form"><label class="rewards-form-field"><span>Kunde</span><input value="${escapeHtml(member?.name || "Unbekannt")}" disabled></label><label class="rewards-form-field"><span>Gewinn</span><input value="Yumaks Box" disabled></label><div class="rewards-confirmation">Möchtest du bestätigen, dass die Yumaks Box an diesen Kunden ausgegeben wurde?</div></div>`, "Als ausgegeben markieren");
  }

  function resetFilters() {
    document.querySelector("[data-rewards-search]").value = "";
    document.querySelector("[data-rewards-level-filter]").value = "Alle";
    document.querySelector("[data-rewards-status-filter]").value = "Alle";
    document.querySelector("[data-rewards-sort]").value = "points-desc";
    document.querySelector("[data-rewards-voucher-only]").checked = false;
    renderMembers();
  }

  function renderAll() {
    renderKpis();
    renderWheelPanelStats();
    renderMembers();
    renderVouchers();
    if (state.selectedMemberId && !document.querySelector("[data-rewards-drawer]")?.hidden) renderDrawer();
  }

  function bind() {
    ["[data-rewards-search]", "[data-rewards-level-filter]", "[data-rewards-status-filter]", "[data-rewards-sort]", "[data-rewards-voucher-only]"].forEach((selector) => {
      document.querySelector(selector)?.addEventListener(selector.includes("search") ? "input" : "change", renderMembers);
    });

    document.querySelectorAll(".rewards-toggle input").forEach((input) => {
      input.addEventListener("change", () => {
        const label = input.closest(".rewards-toggle")?.querySelector("span");
        if (label) label.textContent = input.checked ? "Aktiv" : "Pausiert";
      });
    });

    document.addEventListener("click", (event) => {
      const memberAction = event.target.closest("[data-member-action]");
      if (memberAction) {
        const action = memberAction.getAttribute("data-member-action");
        const memberId = memberAction.getAttribute("data-member-id") || "";
        if (action === "details") { state.selectedMemberId = memberId; state.drawerTab = "overview"; renderDrawer(); }
        if (action === "points-add") pointsForm(memberId, false);
        if (action === "points-subtract") pointsForm(memberId, true);
        if (action === "birthday-bonus") birthdayBonusForm(memberId);
        if (action === "voucher-issue") voucherForm(memberId);
        if (action === "spin-grant") grantSpinForm(memberId);
        if (action === "wheel-spin") spinWheelForm(memberId);
        if (action === "status-change") statusForm(memberId);
        return;
      }

      const pageAction = event.target.closest("[data-rewards-action]")?.getAttribute("data-rewards-action");
      if (pageAction === "member-add") memberForm();
      if (pageAction === "points-add") state.members.length ? pointsForm(state.members[0].id, false) : infoModal("Punkte buchen", "Es ist noch kein Rewards-Konto vorhanden.");
      if (pageAction === "voucher-issue") voucherForm(state.members[0]?.id || "");
      if (pageAction === "wheel-config") infoModal("Glücksrad konfigurieren", "1 Dreh je 5 qualifizierende Fahrten · Drehs ansammelbar · Kosten: 0 Punkte · Gewinnverteilung: 5 Punkte 35 %, 10 Punkte 25 %, 20 Punkte 18 %, 30 Punkte 10 %, 50 Punkte 7 %, 20,00 € Gutschein 4 %, Yumaks Box 1 % · Gutschein gültig 90 Tage · Nur read-only sichtbar. Keine Fahrtenintegration im aktuellen Sprint.");
      if (pageAction === "settings-review") infoModal("Rewards-Einstellungen prüfen", "Automatische Fahrtverbuchung wartet auf echte Fahrtenintegration. Manuelle Punktebuchungen werden bereits im Rewards-Ledger gespeichert.");

      const wheelFulfillAction = event.target.closest("[data-wheel-fulfill]");
      if (wheelFulfillAction) {
        const spinId = wheelFulfillAction.getAttribute("data-wheel-fulfill") || "";
        fulfillYumaksBoxForm(spinId);
      }

      const tab = event.target.closest("[data-rewards-tab]");
      if (tab) { state.drawerTab = tab.getAttribute("data-rewards-tab") || "overview"; renderDrawer(); }
      if (event.target.closest("[data-rewards-drawer-close]")) closeDrawer();
      if (event.target.closest("[data-rewards-modal-close]")) closeModal();
      if (event.target.closest("[data-rewards-modal-confirm]")) applyPendingAction();
      if (event.target.closest("[data-rewards-reset-filter]")) resetFilters();

      const voucherAction = event.target.closest("[data-voucher-action]");
      if (voucherAction) {
        const action = voucherAction.getAttribute("data-voucher-action");
        const voucherId = voucherAction.getAttribute("data-voucher-id") || "";
        if (action === "details") openVoucherDetails(voucherId);
        if (action === "redeem") redeemVoucherForm(voucherId);
        if (action === "block") blockVoucherForm(voucherId);
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      if (!document.querySelector("[data-rewards-modal]")?.hidden) closeModal();
      else closeDrawer();
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    bind();
    loadRewardsData();
  });
})();
