const screens = [...document.querySelectorAll('.screen')];
const nav = [...document.querySelectorAll('.bottom-nav button')];

function go(id) {
  screens.forEach(screen => screen.classList.toggle('active', screen.id === id));
  nav.forEach(button => {
    button.classList.toggle(
      'active',
      button.dataset.go === id || (id === 'home' && button.dataset.go === 'home')
    );
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

function createBreakEffect() {
  const layer = document.getElementById('particleLayer');
  if (!layer) return;
  layer.innerHTML = '';

  const width = Math.min(window.innerWidth, 430);
  const centerX = width / 2;
  const centerY = window.innerHeight / 2;

  for (let i = 0; i < 220; i++) {
    const p = document.createElement('i');
    p.className = 'particle';

    const startX = centerX + 22 + Math.random() * 78;
    const startY = centerY - 78 + Math.random() * 152;
    const tx = 70 + Math.random() * 240;
    const ty = -190 + Math.random() * 380;

    p.style.left = startX + 'px';
    p.style.top = startY + 'px';
    p.style.setProperty('--tx', tx + 'px');
    p.style.setProperty('--ty', ty + 'px');
    p.style.setProperty('--delay', (Math.random() * 0.18) + 's');
    p.style.opacity = 0.35 + Math.random() * 0.65;
    layer.appendChild(p);
  }

  for (let i = 0; i < 90; i++) {
    const s = document.createElement('i');
    s.className = i % 2 ? 'spark' : 'shard';

    const startX = centerX + 30 + Math.random() * 86;
    const startY = centerY - 82 + Math.random() * 164;
    const tx = 95 + Math.random() * 280;
    const ty = -210 + Math.random() * 420;

    s.style.left = startX + 'px';
    s.style.top = startY + 'px';
    s.style.setProperty('--tx', tx + 'px');
    s.style.setProperty('--ty', ty + 'px');
    s.style.setProperty('--rot', (Math.random() * 140 - 25) + 'deg');
    s.style.setProperty('--delay', (Math.random() * 0.2) + 's');
    layer.appendChild(s);
  }
}

window.addEventListener('load', () => {
  createBreakEffect();
  const splash = document.getElementById('splash');

  setTimeout(() => splash?.classList.add('burst'), 750);
  setTimeout(() => splash?.classList.add('fadeout'), 2050);
  setTimeout(() => go('home'), 2380);
});
