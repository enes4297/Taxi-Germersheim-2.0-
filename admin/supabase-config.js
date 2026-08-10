(() => {
  const config = {
    url: "https://rzqhzyzabakrsokuqebc.supabase.co",
    publishableKey: "sb_publishable_75RRXt_2KZ6J4552OS-Zlw_hiRRiMpM"
  };

  const isConfigured = Boolean(
    config.url &&
    config.publishableKey &&
    !config.url.includes("HIER_EINTRAGEN") &&
    !config.publishableKey.includes("HIER_EINTRAGEN")
  );

  window.TaxiSupabaseConfig = {
    ...config,
    isConfigured,
    client: null
  };
})();
