// Titik masuk: navigasi, alur permainan, kontrol, loop
import { S, $, clamp, store } from './state.js';
import { loadLevels, renderLevels } from './levels.js';
import { loadTakers, renderTakers } from './takers.js';
import { makeShot } from './physics.js';
import { draw, proj } from './render.js';

const c = $('c');

// ----- Navigasi -----
function show(n) { document.querySelectorAll('.screen').forEach(s => s.hidden = s.id !== n); $('hud').hidden = n !== ''; if (n !== '') S.phase = 'menu' }
const refreshMenu = () => { if (S.tk) $('curTk').textContent = S.tk.name };
document.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { show(b.dataset.go); refreshMenu() });
$('mMission').onclick = () => { renderLevels(startMission); show('levels') };
$('mTaker').onclick = () => { renderTakers(); show('takers') };
$('mFree').onclick = () => { drawMap(); show('free') };
$('bBack').onclick = () => { show('menu'); refreshMenu() };

// ----- Mode Bebas (peta titik tendangan) -----
const mc = $('map'), m = mc.getContext('2d'); let fp = { x: 0, d: 22 };
const MX = v => 160 + v * 6.4, MY = v => 14 + v * 7.6;
function drawMap() {
  m.fillStyle = '#1f5a3a'; m.fillRect(0, 0, 320, 300); m.strokeStyle = '#f4f1e6'; m.lineWidth = 2;
  m.strokeRect(MX(-20.15), MY(0), 40.3 * 6.4, 16.5 * 7.6); m.strokeRect(MX(-9.16), MY(0), 18.32 * 6.4, 5.5 * 7.6);
  m.fillStyle = '#f4f1e6'; m.fillRect(MX(-3.66), MY(0) - 4, 7.32 * 6.4, 6);
  m.fillStyle = '#ffc94d'; m.beginPath(); m.arc(MX(fp.x), MY(fp.d), 7, 0, 7); m.fill();
}
mc.onpointerdown = mc.onpointermove = e => {
  if (e.type === 'pointermove' && !e.buttons) return;
  const r = mc.getBoundingClientRect();
  fp.x = clamp(((e.clientX - r.left) / r.width * 320 - 160) / 6.4, -24, 24);
  fp.d = clamp(((e.clientY - r.top) / r.height * 300 - 14) / 7.6, 14, 34); drawMap();
};
$('fWall').oninput = e => $('fWallV').textContent = e.target.value;
$('fStart').onclick = () => {
  S.mode = 'free';
  S.cfg = { t: 'Bebas', dist: Math.round(fp.d), x: Math.round(fp.x * 2) / 2, wall: +$('fWall').value, keeper: $('fKeeper').checked ? 1 : 0, skill: $('fSkill').value / 100, jump: 0, pr: 0 };
  begin();
};

// ----- Alur ronde -----
function startMission(i) { S.mode = 'mission'; S.lvIdx = i; S.cfg = S.levels[i]; begin() }
function begin() { S.goals = 0; S.used = 0; show(''); $('tkName').textContent = S.tk.name; newShot() }
function newShot() {
  S.phase = 'aim'; S.shot = null; S.t = 0; S.k0 = S.cfg.keeper ? (Math.random() - .5) * 1.6 : 0; S.aim = { x: 0, y: 1.2 };
  $('bKick').disabled = false; info();
}
function info() {
  const { cfg, mode, lvIdx, goals, used } = S;
  $('info').textContent = mode === 'mission' ? `Level ${lvIdx + 1}  Gol ${goals}/${cfg.need}  Sisa ${cfg.shots - used}` : `Latihan  Gol ${goals}/${used} tendangan`;
}
function fire() {
  if (S.phase !== 'aim') return;
  S.phase = 'fly'; $('bKick').disabled = true; S.shot = makeShot(S.meter, +$('curve').value);
}
$('bKick').onclick = fire;
addEventListener('keydown', e => { if (e.code === 'Space' && !$('hud').hidden) { e.preventDefault(); fire() } });

function finish() {
  if (S.shot.out === 'goal') S.goals++; S.used++; info();
  if (S.mode === 'free') return newShot();
  const { cfg } = S;
  if (S.goals >= cfg.need) {
    if (S.lvIdx + 1 >= store.get('unlocked', 1)) store.set('unlocked', Math.min(S.levels.length, S.lvIdx + 2));
    endScreen(true);
  } else if (S.used >= cfg.shots) endScreen(false); else newShot();
}
function endScreen(win) {
  show('end'); S.phase = 'end';
  $('eTitle').textContent = win ? 'Level selesai' : 'Belum berhasil';
  $('eDesc').textContent = `${S.goals} gol dari ${S.used} tendangan. Target ${S.cfg.need} gol.`;
  $('eNext').style.display = win && S.lvIdx < S.levels.length - 1 ? '' : 'none';
}
$('eNext').onclick = () => startMission(S.lvIdx + 1);
$('eRetry').onclick = () => startMission(S.lvIdx);

// ----- Bidikan -----
const aimAt = e => {
  if (S.phase !== 'aim') return;
  if (e.type === 'pointermove' && !e.buttons && e.pointerType !== 'mouse') return;
  const r = c.getBoundingClientRect(), px = (e.clientX - r.left) / r.width * 480, py = (e.clientY - r.top) / r.height * 720, s = proj.F / (S.cfg.dist - proj.CZ);
  S.aim.x = clamp(S.cfg.x + (px - proj.CX) / s, -5.2, 5.2); S.aim.y = clamp(proj.CH - (py - proj.HY) / s, 0, 3.8);
};
c.onpointerdown = c.onpointermove = aimAt;

// ----- Loop -----
let last = 0;
function loop(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  if (S.phase === 'aim') { S.meter = (1 - Math.cos(now / 450)) / 2; document.querySelector('#meter i').style.width = S.meter * 100 + '%' }
  if (S.phase === 'fly') { S.t += dt; if (S.t > S.shot.end) finish() }
  if (S.cfg && (!$('hud').hidden || S.phase === 'end')) draw();
  requestAnimationFrame(loop);
}

// ----- Mulai -----
(async () => {
  show('menu');
  try { await Promise.all([loadLevels(), loadTakers()]); refreshMenu() }
  catch (e) { $('err').textContent = 'Data gagal dimuat. Jalankan lewat server (GitHub Pages atau Live Server), bukan membuka file langsung.' }
  requestAnimationFrame(loop);
})();
