const screens = [...document.querySelectorAll('.screen')];
const nav = [...document.querySelectorAll('.bottom-nav button')];

function go(id) {
  screens.forEach(screen => screen.classList.toggle('active', screen.id === id));
  nav.forEach(button => {
    button.classList.toggle('active', button.dataset.go === id || (id === 'home' && button.dataset.go === 'home'));
  });
  if (id !== 'splash') document.body.classList.add('app-started');
  window.scrollTo(0, 0);
}

document.addEventListener('click', event => {
  const trigger = event.target.closest('[data-go]');
  if (!trigger) return;
  event.preventDefault();
  go(trigger.dataset.go);
});

function createGoldDust() {
  const layer = document.getElementById('goldDust');
  if (!layer) return;
  layer.innerHTML = '';

  for (let i = 0; i < 58; i++) {
    const dot = document.createElement('i');
    dot.style.left = (8 + Math.random() * 84) + '%';
    dot.style.top = (28 + Math.random() * 42) + '%';
    dot.style.setProperty('--delay', (Math.random() * 2.2) + 's');
    dot.style.setProperty('--dur', (3.2 + Math.random() * 3.4) + 's');
    dot.style.setProperty('--alpha', (0.12 + Math.random() * 0.46).toFixed(2));
    const size = 1 + Math.random() * 2.8;
    dot.style.width = size + 'px';
    dot.style.height = size + 'px';
    layer.appendChild(dot);
  }
}

window.addEventListener('load', () => {
  createGoldDust();
  const splash = document.getElementById('splash');
  setTimeout(() => splash?.classList.add('fadeout'), 2450);
  setTimeout(() => go('home'), 3040);
});
