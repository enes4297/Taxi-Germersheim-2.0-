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

function premiumSplash() {
  const canvas = document.getElementById('splashCanvas');
  const splash = document.getElementById('splash');
  if (!canvas || !splash) { go('home'); return; }

  const ctx = canvas.getContext('2d', { alpha:false });
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.min(window.innerWidth, 430);
  const h = window.innerHeight;
  canvas.width = Math.floor(w*dpr);
  canvas.height = Math.floor(h*dpr);
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  ctx.setTransform(dpr,0,0,dpr,0,0);

  const img = new Image();
  img.src = 'logo.png';

  const dust = Array.from({length:44},()=>({
    x: Math.random()*w,
    y: Math.random()*h,
    r: .7+Math.random()*1.7,
    a: .08+Math.random()*.22,
    s: .12+Math.random()*.35
  }));

  let start = performance.now();
  const logo = 178;
  const x = (w-logo)/2;
  const y = h/2-logo/2-20;

  function draw(t) {
    const time = (t-start)/1000;
    ctx.fillStyle = '#000';
    ctx.fillRect(0,0,w,h);

    const bg = ctx.createRadialGradient(w/2,y+logo*.56,12,w/2,y+logo*.56,190);
    bg.addColorStop(0,'rgba(255,217,106,.13)');
    bg.addColorStop(.42,'rgba(216,168,61,.045)');
    bg.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle = bg;
    ctx.fillRect(0,0,w,h);

    dust.forEach((p,i)=>{
      const yy = (p.y + Math.sin(time*p.s+i)*10) % h;
      ctx.beginPath();
      ctx.fillStyle = `rgba(255,217,106,${p.a*(.65+Math.sin(time*1.5+i)*.25)})`;
      ctx.shadowColor='rgba(255,217,106,.45)';
      ctx.shadowBlur=8;
      ctx.arc(p.x,yy,p.r,0,Math.PI*2);
      ctx.fill();
    });

    const intro = Math.min(time/.55,1);
    const hold = time < 1.75 ? 1 : Math.max(0,1-(time-1.75)/.45);
    const scale = .92 + intro*.08 + Math.sin(time*2.1)*.012;
    const float = Math.sin(time*2.4)*5;
    const alpha = intro*hold;

    if (img.complete) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(w/2, y+logo/2+float);
      ctx.scale(scale, scale);
      ctx.shadowColor = 'rgba(255,217,106,.72)';
      ctx.shadowBlur = 34 + Math.sin(time*2)*8;
      ctx.drawImage(img, -logo/2, -logo/2, logo, logo);
      ctx.restore();
    }

    const floor = ctx.createRadialGradient(w/2,y+logo+72,4,w/2,y+logo+72,120);
    floor.addColorStop(0,`rgba(255,217,106,${.20*alpha})`);
    floor.addColorStop(1,'rgba(255,217,106,0)');
    ctx.fillStyle=floor;
    ctx.fillRect(0,0,w,h);

    if(time<2.35){ requestAnimationFrame(draw); }
    else { splash.classList.remove('active'); go('home'); }
  }

  requestAnimationFrame(draw);
}
window.addEventListener('load', premiumSplash);
