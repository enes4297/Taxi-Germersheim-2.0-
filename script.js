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

function createParticles() {
  const layer = document.getElementById('particleLayer');
  if (!layer) return;

  const width = Math.min(window.innerWidth, 430);
  const centerX = width / 2;
  const centerY = window.innerHeight / 2;

  for (let i = 0; i < 170; i++) {
    const particle = document.createElement('i');
    particle.className = 'particle';

    const angle = Math.random() * Math.PI * 2;
    const radiusX = 18 + Math.random() * 92;
    const radiusY = 18 + Math.random() * 118;

    const startX = centerX + Math.cos(angle) * radiusX * 0.65;
    const startY = centerY + Math.sin(angle) * radiusY;

    const distance = 120 + Math.random() * 230;
    const tx = Math.cos(angle) * distance + (Math.random() * 90 - 10);
    const ty = Math.sin(angle) * distance + (Math.random() * 90 - 45);

    particle.style.left = startX + 'px';
    particle.style.top = startY + 'px';
    particle.style.setProperty('--tx', tx + 'px');
    particle.style.setProperty('--ty', ty + 'px');
    particle.style.setProperty('--delay', (Math.random() * 0.18) + 's');
    particle.style.opacity = 0.35 + Math.random() * 0.65;

    layer.appendChild(particle);
  }

  for (let i = 0; i < 42; i++) {
    const spark = document.createElement('i');
    spark.className = 'spark';

    const startX = centerX + (Math.random() * 110 - 25);
    const startY = centerY + (Math.random() * 120 - 60);
    const tx = 80 + Math.random() * 260;
    const ty = -170 + Math.random() * 330;

    spark.style.left = startX + 'px';
    spark.style.top = startY + 'px';
    spark.style.setProperty('--tx', tx + 'px');
    spark.style.setProperty('--ty', ty + 'px');
    spark.style.setProperty('--rot', (20 + Math.random() * 85) + 'deg');
    spark.style.setProperty('--delay', (Math.random() * 0.22) + 's');

    layer.appendChild(spark);
  }
}

window.addEventListener('load', () => {
  createParticles();

  const splash = document.getElementById('splash');

  setTimeout(() => splash?.classList.add('burst'), 650);
  setTimeout(() => splash?.classList.add('fadeout'), 1920);
  setTimeout(() => go('home'), 2260);
});
