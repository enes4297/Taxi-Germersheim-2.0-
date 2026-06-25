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

function startCanvasSplash() {
  const canvas = document.getElementById('splashCanvas');
  const splash = document.getElementById('splash');
  if (!canvas || !splash) {
    go('home');
    return;
  }

  const ctx = canvas.getContext('2d', { alpha: false });
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const shellWidth = Math.min(window.innerWidth, 430);
  const w = shellWidth;
  const h = window.innerHeight;

  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const img = new Image();
  img.src = 'logo.png';

  const logoSize = 174;
  const logoX = (w - logoSize) / 2;
  const logoY = (h - logoSize) / 2 - 12;
  const particles = [];

  let start = performance.now();
  let imageReady = false;
  let sampleDone = false;

  function sampleImage() {
    if (sampleDone) return;
    sampleDone = true;

    const off = document.createElement('canvas');
    off.width = logoSize;
    off.height = logoSize;
    const octx = off.getContext('2d');
    octx.clearRect(0, 0, logoSize, logoSize);
    octx.drawImage(img, 0, 0, logoSize, logoSize);
    const data = octx.getImageData(0, 0, logoSize, logoSize).data;

    for (let y = 0; y < logoSize; y += 5) {
      for (let x = 0; x < logoSize; x += 5) {
        const i = (y * logoSize + x) * 4;
        const a = data[i + 3];
        const r = data[i], g = data[i + 1], b = data[i + 2];

        if (a > 35 && (r + g + b) > 90) {
          const px = logoX + x;
          const py = logoY + y;
          const sideForce = (x / logoSize) * 1.2 + 0.35;
          const angle = -0.85 + Math.random() * 1.7;

          particles.push({
            x: px,
            y: py,
            ox: px,
            oy: py,
            vx: Math.cos(angle) * (90 + Math.random() * 250) * sideForce,
            vy: Math.sin(angle) * (80 + Math.random() * 220),
            size: 1.4 + Math.random() * 2.4,
            delay: Math.random() * 0.18,
            life: 0.9 + Math.random() * 0.45
          });
        }
      }
    }
  }

  img.onload = () => {
    imageReady = true;
    sampleImage();
  };

  function draw(t) {
    const elapsed = (t - start) / 1000;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);

    const glow = ctx.createRadialGradient(w / 2, logoY + logoSize * 0.55, 10, w / 2, logoY + logoSize * 0.55, 165);
    glow.addColorStop(0, 'rgba(255,217,106,0.19)');
    glow.addColorStop(1, 'rgba(255,217,106,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    const floor = ctx.createRadialGradient(w / 2, logoY + logoSize + 76, 5, w / 2, logoY + logoSize + 76, 120);
    floor.addColorStop(0, 'rgba(255,217,106,0.25)');
    floor.addColorStop(1, 'rgba(255,217,106,0)');
    ctx.fillStyle = floor;
    ctx.fillRect(0, 0, w, h);

    if (imageReady && elapsed < 0.92) {
      const intro = Math.min(elapsed / 0.45, 1);
      const float = Math.sin(elapsed * 3.4) * 6;
      ctx.save();
      ctx.globalAlpha = intro;
      ctx.shadowColor = 'rgba(255,217,106,.75)';
      ctx.shadowBlur = 28;
      ctx.drawImage(img, logoX, logoY + float, logoSize, logoSize);
      ctx.restore();
    }

    if (elapsed >= 0.72) {
      const pTime = elapsed - 0.72;
      particles.forEach(p => {
        const local = Math.max(0, (pTime - p.delay) / p.life);
        if (local <= 0 || local >= 1) return;

        const ease = 1 - Math.pow(1 - local, 3);
        const x = p.ox + p.vx * ease;
        const y = p.oy + p.vy * ease + 40 * local * local;
        const alpha = 1 - local;

        ctx.beginPath();
        ctx.fillStyle = `rgba(255,217,106,${alpha})`;
        ctx.shadowColor = 'rgba(255,217,106,.9)';
        ctx.shadowBlur = 10;
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Bright right-side sparks
      for (let i = 0; i < 42; i++) {
        const local = Math.min(Math.max((pTime - i * 0.006) / 0.85, 0), 1);
        if (local <= 0 || local >= 1) continue;
        const sx = w / 2 + 42 + local * (105 + (i % 9) * 18);
        const sy = logoY + 38 + (i * 17 % 140) + Math.sin(i) * 25 + (local - 0.5) * 90;
        ctx.strokeStyle = `rgba(255,217,106,${1 - local})`;
        ctx.lineWidth = 1.4;
        ctx.shadowColor = 'rgba(255,217,106,.9)';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + 14 + (i % 5) * 4, sy - 8 + (i % 3) * 6);
        ctx.stroke();
      }
    }

    if (elapsed < 2.45) {
      requestAnimationFrame(draw);
    } else {
      splash.classList.remove('active');
      go('home');
    }
  }

  requestAnimationFrame(draw);
}

window.addEventListener('load', startCanvasSplash);
