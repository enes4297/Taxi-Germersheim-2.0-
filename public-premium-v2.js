(function () {
  function closeNavigation() {
    const navigation = document.querySelector('.site-nav');
    const menuToggle = document.querySelector('.menu-toggle');
    const services = document.querySelector('.nav-item-services');
    const servicesTrigger = services && services.querySelector('.nav-trigger');

    navigation && navigation.classList.remove('open');
    services && services.classList.remove('is-open');
    menuToggle && menuToggle.setAttribute('aria-expanded', 'false');
    servicesTrigger && servicesTrigger.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('nav-open');
  }

  async function initializePublicPremium() {
    const auth = window.CustomerAuth || null;
    if (auth && typeof auth.hydrateSession === 'function') {
      await auth.hydrateSession();
    }

    const isLoggedIn = auth && typeof auth.isLoggedIn === 'function' && auth.isLoggedIn();
    document.querySelectorAll('[data-session-link]').forEach(function (link) {
      link.href = isLoggedIn ? 'meinkonto.html' : 'anmelden.html';
      link.textContent = isLoggedIn ? 'Mein Konto' : 'Anmelden';
    });

    document.querySelectorAll('.site-nav a').forEach(function (link) {
      link.addEventListener('click', closeNavigation);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePublicPremium, { once: true });
  } else {
    initializePublicPremium();
  }
})();