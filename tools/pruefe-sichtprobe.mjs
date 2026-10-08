// Prueft die oertliche Sichtprobe: Uebergaenge, Rueckfall, Laufclip.
// Voraussetzung: 'npm run sichtprobe' laeuft auf Port 5203.
const { chromium } = await import(new URL('../fahrer/tests/node_modules/playwright/index.mjs', import.meta.url).href);
const br=await chromium.launch({channel:'chrome'});
const p=await br.newPage({viewport:{width:1280,height:900}});
const ok=[],fehl=[];
const pr=(b,t)=>{(b?ok:fehl).push(t);console.log((b?'OK   ':'FEHL ')+t);};
await p.goto('http://127.0.0.1:5203/yumak.html',{waitUntil:'load'});
await p.waitForTimeout(1500);

// Abschnitt 4: Uebergaenge
const folge=p.locator('[data-buehne="folge"]');
await folge.scrollIntoViewIfNeeded(); await p.waitForTimeout(1800);
for (const [knopf, erwartet] of [['wave → idle','wave'],['curious → idle','curious']]) {
  await p.locator('button',{hasText:knopf}).first().click();
  await p.waitForTimeout(900);
  const q=await folge.evaluate(e=>e.querySelector('video')?.currentSrc||'');
  pr(q.includes(erwartet), `Übergang "${knopf}" startet mit ${erwartet} (${q.split('/').pop()})`);
  const n=await p.evaluate(()=>document.querySelectorAll('video').length);
  pr(n<=10, `dabei höchstens eine Blende gleichzeitig (${n} Elemente auf der ganzen Seite)`);
}
await p.locator('button',{hasText:'idle → sleep'}).first().click();
await p.waitForTimeout(900);
pr((await folge.evaluate(e=>e.querySelector('video')?.currentSrc||'')).includes('idle'), 'Übergang "idle → sleep" beginnt mit idle');

// Abschnitt 6: Rueckfall
const rf=p.locator('[data-buehne="rueckfall"]');
await rf.scrollIntoViewIfNeeded(); await p.waitForTimeout(1500);
for (const [knopf, text] of [['reduzierte Bewegung','reduzierte Bewegung'],['Autoplay abgelehnt','Autoplay'],['Ladefehler','Ladefehler']]) {
  await p.locator('[data-rueckfall]',{hasText:knopf}).first().click();
  await p.waitForTimeout(1200);
  const bild=await rf.evaluate(e=>Boolean(e.querySelector('img.yumak')));
  const video=await rf.evaluate(e=>Boolean(e.querySelector('video')));
  const info=await p.locator('#rueckfall-info').textContent();
  pr(bild && !video, `${knopf}: Standbild steht, kein Video mehr (${info.trim()})`);
}
// zurueck auf normal
await p.locator('[data-rueckfall]',{hasText:'normal'}).first().click();
await p.waitForTimeout(1200);
pr(await rf.evaluate(e=>Boolean(e.querySelector('video'))), 'normal: Video läuft wieder');

// Abschnitt 5: Laufclip mit Verschiebung
await p.locator('[data-lauf="mit"]').scrollIntoViewIfNeeded();
await p.locator('[data-lauf="mit"]').click();
await p.waitForTimeout(1500);
const tf=await p.locator('[data-buehne="lauf"] video').evaluate(e=>getComputedStyle(e).transform);
pr(tf!=='none', `Laufclip mit Verschiebung in der Bühne (${tf.slice(0,40)})`);

console.log(`\nbestanden: ${ok.length}   fehlgeschlagen: ${fehl.length}`);
await br.close();

if (fehl.length) process.exitCode = 1;
