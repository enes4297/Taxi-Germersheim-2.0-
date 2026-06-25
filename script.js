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

  const width = Math.min(window.innerWidth, 430);
  const centerX = width / 2;
  const centerY = window.innerHeight / 2;

  for (let i = 0; i < 240; i++) {
    const particle = document.createElement('i');
    particle.className = 'particle';

    const angle = (-0.9 + Math.random() * 1.8);
    const startX = centerX + (Math.random() * 86 - 8);
    const startY = centerY + (Math.random() * 142 - 72);
    const tx = 80 + Math.random() * 270;
    const ty = Math.sin(angle) * (90 + Math.random() * 210);

    particle.style.left = startX + 'px';
    particle.style.top = startY + 'px';
    particle.style.setProperty('--tx', tx + 'px');
    particle.style.setProperty('--ty', ty + 'px');
    particle.style.setProperty('--delay', (Math.random() * 0.22) + 's');
    particle.style.opacity = 0.32 + Math.random() * 0.68;
    layer.appendChild(particle);
  }

  for (let i = 0; i < 75; i++) {
    const shard = document.createElement('i');
    shard.className = 'shard';

    const startX = centerX + (Math.random() * 95 - 4);
    const startY = centerY + (Math.random() * 150 - 76);
    const tx = 100 + Math.random() * 290;
    const ty = -170 + Math.random() * 340;

    shard.style.left = startX + 'px';
    shard.style.top = startY + 'px';
    shard.style.setProperty('--tx', tx + 'px');
    shard.style.setProperty('--ty', ty + 'px');
    shard.style.setProperty('--rot', (Math.random() * 140 - 30) + 'deg');
    shard.style.setProperty('--delay', (Math.random() * 0.24) + 's');
    layer.appendChild(shard);
  }

  for (let i = 0; i < 46; i++) {
    const spark = document.createElement('i');
    spark.className = 'spark';

    const startX = centerX + (Math.random() * 100 - 4);
    const startY = centerY + (Math.random() * 130 - 64);
    const tx = 115 + Math.random() * 300;
    const ty = -190 + Math.random() * 380;

    spark.style.left = startX + 'px';
    spark.style.top = startY + 'px';
    spark.style.setProperty('--tx', tx + 'px');
    spark.style.setProperty('--ty', ty + 'px');
    spark.style.setProperty('--rot', (20 + Math.random() * 95) + 'deg');
    spark.style.setProperty('--delay', (Math.random() * 0.22) + 's');
    layer.appendChild(spark);
  }
}

window.addEventListener('load', () => {
  createBreakEffect();
  const splash = document.getElementById('splash');

  setTimeout(() => splash?.classList.add('burst'), 650);
  setTimeout(() => splash?.classList.add('fadeout'), 1950);
  setTimeout(() => go('home'), 2280);
});
