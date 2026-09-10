(function () {
  'use strict';

  const body = document.body;
  if (!body || !body.classList.contains('tg-public')) return;

  function inferActivePage() {
    const path = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
    const page = new URLSearchParams(window.location.search).get('page') || '';
    if (path === 'index.html' && (!page || page === 'home')) return 'home';
    if (path === 'flotte.html') return 'fleet';
    if (path === 'spezialfahrten.html' || path === 'spezial-anfrage.html') return 'services';
    if (path === 'rewards.html' || path === 'spiele.html') return 'rewards';
    if (path === 'hilfe-kontakt.html') return 'contact';
    return '';
  }

  function headerMarkup() {
    return `
      <header class="tg-public-header">
        <div class="tg-brand">
          <a href="index.html" aria-label="Taxi Germersheim Startseite">
            <img src="assets/brand/taxi-germersheim-logo.svg" alt="Taxi Germersheim GmbH">
          </a>
        </div>
        <button class="tg-menu-toggle" type="button" aria-expanded="false" aria-label="Menü öffnen">
          <span class="menu-bars" aria-hidden="true"><i></i><i></i><i></i></span>
        </button>
        <nav class="tg-public-nav" aria-label="Hauptnavigation">
          <a href="index.html" data-tg-nav="home">Startseite</a>
          <div class="tg-nav-item tg-nav-services">
            <button type="button" class="tg-nav-trigger" data-nav-toggle="services" data-tg-nav="services" aria-expanded="false">Leistungen <span>▼</span></button>
            <div class="tg-nav-dropdown" aria-label="Leistungen">
              <a href="index.html?page=booking&amp;service=taxi">Taxi</a>
              <a href="index.html?page=medical">Krankenfahrten</a>
              <a href="index.html?page=booking&amp;service=wheelchair">Rollstuhlfahrten</a>
              <a href="index.html?page=booking&amp;service=airport">Flughafentransfer</a>
              <a href="index.html?page=booking&amp;service=courier">Kurierfahrten</a>
              <a href="spezialfahrten.html">Spezialfahrten</a>
            </div>
          </div>
          <a href="flotte.html" data-tg-nav="fleet">Fahrzeugflotte</a>
          <a href="rewards.html" data-tg-nav="rewards">Rewards</a>
          <a href="hilfe-kontakt.html" data-tg-nav="contact">Kontakt</a>
          <a class="tg-mobile-session-link" href="anmelden.html" data-session-link>Anmelden</a>
        </nav>
        <div class="tg-nav-backdrop" aria-hidden="true"></div>
        <div class="tg-header-actions">
          <a class="tg-session-link" href="anmelden.html" data-session-link>Anmelden</a>
        </div>
      </header>`;
  }

  function footerMarkup() {
    return `
      <footer id="kontakt" class="site-footer public-footer tg-public-footer">
        <div class="public-footer-row">
          <p>© 2026 Taxi Germersheim GmbH</p>
          <div class="public-footer-links">
            <a href="index.html?page=why">Über uns</a>
            <a href="datenschutz.html">Datenschutz</a>
            <a href="impressum.html">Impressum</a>
            <a href="hilfe-kontakt.html">Kontakt</a>
          </div>
        </div>
      </footer>`;
  }

  function createElement(markup) {
    const template = document.createElement('template');
    template.innerHTML = markup.trim();
    return template.content.firstElementChild;
  }

  function normalizeShell() {
    const currentHeader = document.querySelector('.tg-public-header, header.topbar, header.public-auth-header, header.container.nav, body.live-ride-body > header, nav.public-compact-nav');
    const header = createElement(headerMarkup());
    if (currentHeader) currentHeader.replaceWith(header);
    else body.insertBefore(header, body.firstChild);

    const main = document.querySelector('main');
    if (header && header.parentElement !== body) {
      const anchor = Array.from(body.children).find(function (child) {
        return child === main || child.contains(header) || Boolean(main && child.contains(main));
      });
      body.insertBefore(header, anchor || body.firstChild);
    }

    let footer = document.querySelector('.tg-public-footer');
    if (!body.classList.contains('public-home')) {
      const currentFooter = document.querySelector('body > footer, main + footer');
      footer = createElement(footerMarkup());
      if (currentFooter) currentFooter.replaceWith(footer);
      else body.appendChild(footer);
    } else if (footer) {
      footer.classList.add('tg-public-footer');
    }

    const activePage = inferActivePage();
    document.querySelectorAll('.tg-public-nav [data-tg-nav]').forEach(function (item) {
      const active = activePage && item.dataset.tgNav === activePage;
      item.classList.toggle('active', Boolean(active));
      if (active) item.setAttribute('aria-current', 'page');
      else item.removeAttribute('aria-current');
    });

    return { header, footer };
  }

  function closeNavigation() {
    const navigation = document.querySelector('.tg-public-nav');
    const toggle = document.querySelector('.tg-menu-toggle');
    const services = document.querySelector('.tg-public-nav .tg-nav-services');
    const trigger = services && services.querySelector('.tg-nav-trigger');
    navigation && navigation.classList.remove('open');
    services && services.classList.remove('is-open');
    toggle && toggle.setAttribute('aria-expanded', 'false');
    toggle && toggle.setAttribute('aria-label', 'Menü öffnen');
    trigger && trigger.setAttribute('aria-expanded', 'false');
    body.classList.remove('nav-open');
  }

  function initializeNavigation(header) {
    if (!header) return;
    const toggle = header.querySelector('.tg-menu-toggle');
    const navigation = header.querySelector('.tg-public-nav');
    const services = header.querySelector('.tg-nav-services');
    const trigger = services && services.querySelector('.tg-nav-trigger');
    const backdrop = header.querySelector('.tg-nav-backdrop');

    toggle && toggle.addEventListener('click', function () {
      const open = !navigation.classList.contains('open');
      closeNavigation();
      if (!open) return;
      navigation.classList.add('open');
      body.classList.add('nav-open');
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', 'Menü schließen');
    });

    trigger && trigger.addEventListener('click', function () {
      const open = !services.classList.contains('is-open');
      services.classList.toggle('is-open', open);
      trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    backdrop && backdrop.addEventListener('click', closeNavigation);
    navigation && navigation.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeNavigation);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeNavigation();
    });

    const updateHeader = function () {
      header.classList.toggle('is-scrolled', window.scrollY > 14);
    };
    window.addEventListener('scroll', updateHeader, { passive: true });
    updateHeader();
  }

  async function synchronizeSessionLinks() {
    const auth = window.CustomerAuth || null;
    if (auth && typeof auth.hydrateSession === 'function') {
      try {
        await auth.hydrateSession();
      } catch (_error) {
        // Keep the guest state when the session cannot be hydrated.
      }
    }
    const loggedIn = Boolean(auth && typeof auth.isLoggedIn === 'function' && auth.isLoggedIn());
    document.querySelectorAll('[data-session-link]').forEach(function (link) {
      link.href = loggedIn ? 'meinkonto.html' : 'anmelden.html';
      link.textContent = loggedIn ? 'Mein Konto' : 'Anmelden';
    });
  }

  function initializeReveals() {
    const targets = Array.from(document.querySelectorAll('[data-tg-reveal]'));
    if (!targets.length) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || !('IntersectionObserver' in window)) {
      targets.forEach(function (target) { target.classList.add('is-visible'); });
      return;
    }
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.04 });
    targets.forEach(function (target) {
      target.classList.add('tg-reveal-pending');
      observer.observe(target);
    });
  }

  const shell = normalizeShell();
  initializeNavigation(shell.header);
  initializeReveals();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', synchronizeSessionLinks, { once: true });
  } else {
    synchronizeSessionLinks();
  }
})();