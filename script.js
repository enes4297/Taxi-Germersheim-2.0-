const screens = [...document.querySelectorAll('.screen')];
const nav = [...document.querySelectorAll('.bottom-nav button')];

function go(id) {
  screens.forEach(s => s.classList.toggle('active', s.id === id));
  nav.forEach(b => {
    b.classList.toggle(
      'active',
      b.dataset.go === id || (id === 'home' && b.dataset.go === 'home')
    );
  });
  window.scrollTo(0, 0);
}

document.addEventListener('click', e => {
  const btn = e.target.closest('[data-go]');
  if (btn) {
    e.preventDefault();
    go(btn.dataset.go);
  }
});

window.addEventListener('load', () => {
  const splash = document.querySelector('#splash');
  const particles = document.querySelector('.particle-field');

  setTimeout(() => {
    splash?.classList.add('bursting');
    particles?.classList.add('burst');
  }, 700);

  setTimeout(() => {
    go('home');
  }, 1900);
});
