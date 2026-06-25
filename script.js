
const screens = [...document.querySelectorAll('.screen')];
const nav = [...document.querySelectorAll('.bottom-nav button')];

function go(id) {
  screens.forEach(screen => screen.classList.toggle('active', screen.id === id));
  nav.forEach(button => button.classList.toggle('active', button.dataset.go === id || (id === 'home' && button.dataset.go === 'home')));
  window.scrollTo(0, 0);
}

document.addEventListener('click', event => {
  const trigger = event.target.closest('[data-go]');
  if (!trigger) return;
  event.preventDefault();
  go(trigger.dataset.go);
});

function flyLogoToHome() {
  const logo = document.getElementById('flyLogo');
  const target = document.getElementById('targetLogo') || document.getElementById('homeLogo');
  const home = document.getElementById('home');
  if (!logo || !target || !home) return;

  const rect = target.getBoundingClientRect();
  const targetCenterX = rect.left + rect.width / 2;
  const targetCenterY = rect.top + rect.height / 2;

  document.body.classList.add('app-started');
  home.style.opacity = '1';

  // Freeze exact visible middle state first
  logo.style.left = '50%';
  logo.style.top = '50%';
  logo.style.width = '160px';
  logo.style.height = '160px';
  logo.style.transform = 'translate(-50%, -50%) scale(1)';
  logo.style.opacity = '1';

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.body.classList.add('launch-fly');
      logo.style.left = targetCenterX + 'px';
      logo.style.top = targetCenterY + 'px';
      logo.style.transform = 'translate(-50%, -50%) scale(0.25)';
    });
  });

  setTimeout(() => {
    document.body.classList.add('logo-arrived');
    logo.style.opacity = '0';
  }, 1180);

  setTimeout(() => {
    document.body.classList.add('launch-done', 'transition-finished');
  }, 1420);
}

window.addEventListener('load', () => {
  document.body.classList.add('launch-phase-1');

  setTimeout(() => {
    document.body.classList.add('launch-hold');
  }, 1180);

  setTimeout(flyLogoToHome, 1720);
});
