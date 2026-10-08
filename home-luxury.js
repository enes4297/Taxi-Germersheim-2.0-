(function () {
  'use strict';

  const home = document.querySelector('#home.hl-home');
  if (!home) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  function initializeHeroReveal() {
    if (reduceMotion) {
      home.classList.add('hl-ready');
      return;
    }

    let started = false;
    const start = function () {
      if (started) return;
      started = true;
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () {
          home.classList.add('hl-ready');
        });
      });
    };

    const splash = document.querySelector('#splash');
    if (!splash) {
      window.setTimeout(start, 80);
      return;
    }

    const observer = new MutationObserver(function () {
      if (!splash.isConnected || splash.hidden) {
        observer.disconnect();
        start();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
    window.setTimeout(function () {
      observer.disconnect();
      start();
    }, 2300);
  }

  function initializeReveals() {
    const elements = Array.from(home.querySelectorAll('[data-reveal]'));
    if (!elements.length || reduceMotion || !('IntersectionObserver' in window)) {
      elements.forEach(function (element) {
        element.classList.add('is-visible');
      });
      return;
    }

    home.classList.add('hl-motion');

    const reveal = function (element) {
      element.classList.add('is-visible');
      observer.unobserve(element);
    };

    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) reveal(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    elements.forEach(function (element) {
      observer.observe(element);
    });

    let scrollFrame = 0;
    const revealPassedElements = function () {
      scrollFrame = 0;
      elements.forEach(function (element) {
        if (element.classList.contains('is-visible')) return;
        const rect = element.getBoundingClientRect();
        if (rect.top < window.innerHeight) reveal(element);
      });
    };

    window.addEventListener('scroll', function () {
      if (scrollFrame) return;
      scrollFrame = window.requestAnimationFrame(revealPassedElements);
    }, { passive: true });

    revealPassedElements();
  }

  function initializeServices() {
    const root = home.querySelector('[data-service-experience]');
    if (!root) return;

    const tabs = Array.from(root.querySelectorAll('[data-service-tab]'));
    const number = root.querySelector('[data-service-number]');
    const title = root.querySelector('[data-service-title]');
    const description = root.querySelector('[data-service-description]');
    const copy = root.querySelector('.hl-service-display-copy');
    let swapTimer = 0;

    const activate = function (tab, immediate) {
      if (!tab || tab.classList.contains('is-active')) return;

      tabs.forEach(function (candidate) {
        const active = candidate === tab;
        candidate.classList.toggle('is-active', active);
        candidate.setAttribute('aria-pressed', active ? 'true' : 'false');
      });

      window.clearTimeout(swapTimer);
      const swap = function () {
        if (number) number.textContent = tab.dataset.number || '';
        if (title) title.textContent = tab.dataset.title || '';
        if (description) description.textContent = tab.dataset.description || '';
        copy && copy.classList.remove('is-switching');
      };

      if (immediate || reduceMotion || !copy) {
        swap();
        return;
      }

      copy.classList.add('is-switching');
      swapTimer = window.setTimeout(swap, 150);
    };

    tabs.forEach(function (tab, index) {
      tab.addEventListener('mouseenter', function () { activate(tab, false); });
      tab.addEventListener('focus', function () { activate(tab, false); });
      tab.addEventListener('click', function (event) {
        event.preventDefault();
        activate(tab, false);
      });
      tab.addEventListener('keydown', function (event) {
        const forward = event.key === 'ArrowDown' || event.key === 'ArrowRight';
        const backward = event.key === 'ArrowUp' || event.key === 'ArrowLeft';
        if (!forward && !backward) return;
        event.preventDefault();
        const nextIndex = (index + (forward ? 1 : -1) + tabs.length) % tabs.length;
        tabs[nextIndex].focus();
      });
    });
  }

  function initializePointerGlow() {
    if (reduceMotion || !finePointer) return;

    home.querySelectorAll('.hl-glow-scene').forEach(function (scene) {
      let frame = 0;
      let pointerX = 50;
      let pointerY = 50;

      const update = function () {
        frame = 0;
        scene.style.setProperty('--hl-glow-x', pointerX + '%');
        scene.style.setProperty('--hl-glow-y', pointerY + '%');
      };

      scene.addEventListener('pointermove', function (event) {
        const rect = scene.getBoundingClientRect();
        pointerX = Math.max(18, Math.min(82, ((event.clientX - rect.left) / rect.width) * 100));
        pointerY = Math.max(20, Math.min(80, ((event.clientY - rect.top) / rect.height) * 100));
        if (!frame) frame = window.requestAnimationFrame(update);
      });

      scene.addEventListener('pointerleave', function () {
        pointerX = 50;
        pointerY = 50;
        if (!frame) frame = window.requestAnimationFrame(update);
      });
    });
  }

  function initializeFleetParallax() {
    if (reduceMotion || !finePointer) return;

    const images = Array.from(home.querySelectorAll('[data-fleet-stage] img'));
    if (!images.length) return;

    let frame = 0;
    const update = function () {
      frame = 0;
      images.forEach(function (image) {
        const rect = image.parentElement.getBoundingClientRect();
        const distance = (rect.top + rect.height / 2) - window.innerHeight / 2;
        const offset = Math.max(-6, Math.min(6, distance * -0.012));
        image.style.setProperty('--hl-parallax-y', offset.toFixed(2) + 'px');
      });
    };

    const requestUpdate = function () {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate, { passive: true });
    update();
  }

  initializeReveals();
  initializeHeroReveal();
  initializeServices();
  initializePointerGlow();
  initializeFleetParallax();
})();