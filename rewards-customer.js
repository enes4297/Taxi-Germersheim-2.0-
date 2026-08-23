(function () {
  function formatNumber(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? new Intl.NumberFormat("de-DE").format(numeric) : "—";
  }

  function formatLevel(value) {
    const levels = {
      bronze: "Bronze",
      silver: "Silber",
      gold: "Gold",
      platinum: "Platin",
      vip: "VIP"
    };
    return levels[String(value || "").toLowerCase()] || "—";
  }

  function formatStatus(value) {
    const statuses = {
      active: "Aktiv",
      paused: "Pausiert",
      blocked: "Gesperrt"
    };
    return statuses[String(value || "").toLowerCase()] || "—";
  }

  function setText(selector, value) {
    const node = document.querySelector(selector);
    if (node) node.textContent = value;
  }

  async function load(auth) {
    const loading = document.querySelector("[data-rewards-loading]");
    const content = document.querySelector("[data-rewards-content]");
    const errorBox = document.querySelector("[data-rewards-error]");

    try {
      const client = auth && typeof auth.getClient === "function" ? await auth.getClient() : null;
      if (!client || typeof client.rpc !== "function") {
        throw new Error("REWARDS_CLIENT_UNAVAILABLE");
      }

      const result = await client.rpc("get_my_rewards_overview");
      if (result.error || !result.data) {
        throw result.error || new Error("REWARDS_OVERVIEW_UNAVAILABLE");
      }

      const rewards = result.data;
      const customerName = String(rewards.customer_name || "").trim();
      if (customerName) {
        setText("[data-rewards-customer-name]", customerName);
      }

      setText("[data-rewards-points]", formatNumber(rewards.points_balance));
      setText("[data-rewards-level]", formatLevel(rewards.level));
      setText("[data-rewards-rides]", formatNumber(rewards.qualifying_rides));
      setText("[data-rewards-spins]", formatNumber(rewards.available_spins));
      setText("[data-rewards-status]", formatStatus(rewards.status));
      setText(
        "[data-rewards-wheel-state]",
        Number(rewards.available_spins) > 0
          ? "Du hast verfügbare Drehs. Das Glücksrad wird bald für dein Konto freigeschaltet."
          : "Aktuell ist kein Dreh verfügbar."
      );

      if (loading) loading.hidden = true;
      if (content) content.hidden = false;
    } catch (_error) {
      if (loading) loading.hidden = true;
      if (content) content.hidden = true;
      if (errorBox) errorBox.hidden = false;
    }
  }

  window.CustomerRewards = { load };
})();