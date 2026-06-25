
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
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  document.body.classList.add('app-started', 'launch-fly');
  home.style.opacity = '1';

  logo.style.left = cx + 'px';
  logo.style.top = cy + 'px';
  logo.style.width = '40px';
  logo.style.height = '40px';
  logo.style.maxWidth = '40px';
  logo.style.maxHeight = '40px';

  setTimeout(() => {
    document.body.classList.add('logo-arrived');
    logo.style.opacity = '0';
  }, 1040);

  setTimeout(() => {
    document.body.classList.add('launch-done');
  }, 1280);
}

window.addEventListener('load', () => {
  document.body.classList.add('launch-phase-1');

  setTimeout(() => {
    document.body.classList.add('launch-hold');
  }, 1180);

  setTimeout(flyLogoToHome, 1700);
});
