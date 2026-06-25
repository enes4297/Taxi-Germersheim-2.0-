
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

window.addEventListener('load', () => {
  setTimeout(() => {
    document.body.classList.add('app-started', 'splash-finished', 'logo-arrived', 'content-in');
    const home = document.getElementById('home');
    if (home) home.style.opacity = '1';
  }, 3200);
});
