
const screens = [...document.querySelectorAll('.screen')];
const nav = [...document.querySelectorAll('.bottom-nav button')];

function go(id) {
  screens.forEach(screen => screen.classList.toggle('active', screen.id === id));
  nav.forEach(button => {
    button.classList.toggle('active', button.dataset.go === id || (id === 'home' && button.dataset.go === 'home'));
  });
  if (id !== 'home') document.body.classList.add('app-started');
  window.scrollTo(0, 0);
}

document.addEventListener('click', event => {
  const trigger = event.target.closest('[data-go]');
  if (!trigger) return;
  event.preventDefault();
  go(trigger.dataset.go);
});

function createDust() {
  const layer = document.getElementById('dustLayer');
  if (!layer) return;
  layer.innerHTML = '';
  for (let i = 0; i < 72; i++) {
    const dot = document.createElement('i');
    dot.style.left = (8 + Math.random() * 84) + '%';
    dot.style.top = (22 + Math.random() * 52) + '%';
    const size = 1 + Math.random() * 2.5;
    dot.style.width = size + 'px';
    dot.style.height = size + 'px';
    dot.style.setProperty('--delay', (Math.random() * 2.6) + 's');
    dot.style.setProperty('--dur', (3.5 + Math.random() * 3.7) + 's');
    dot.style.setProperty('--alpha', (0.10 + Math.random() * 0.40).toFixed(2));
    layer.appendChild(dot);
  }
}

function transitionLogoToHeader() {
  const logo = document.getElementById('transitionLogo');
  const target = document.getElementById('targetLogo');
  const overlay = document.getElementById('splashOverlay');
  if (!logo || !target || !overlay) return;

  const first = logo.getBoundingClientRect();
  const last = target.getBoundingClientRect();

  document.body.classList.add('transitioning', 'app-started');

  const dx = last.left + last.width / 2 - (first.left + first.width / 2);
  const dy = last.top + last.height / 2 - (first.top + first.height / 2);
  const scale = last.width / first.width;

  logo.style.transition = 'transform 980ms cubic-bezier(.18,.86,.24,1), opacity 980ms ease';
  logo.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;

  setTimeout(() => {
    target.style.opacity = '1';
    logo.style.opacity = '0';
    document.body.classList.add('transition-finished');
  }, 1030);
}

window.addEventListener('load', () => {
  createDust();
  document.body.classList.add('splash-start');
  setTimeout(transitionLogoToHeader, 2300);
});
