// Menggambar adegan ke canvas (gaya pixel retro: canvas 240x360, koordinat logis 480x720)
import { S, WALLZ } from './state.js';
import { wallX, jump, ballPos } from './physics.js';

const c = document.getElementById('c'), x = c.getContext('2d');
const F = 800, CX = 240, HY = 259, CH = 3, CZ = -10;
export const proj = { F, CX, HY, CH, CZ };
let camX = 0, camD = 20;
// Kamera menghadap gawang: garis bola-gawang selalu tegak di tengah layar
const pr = (a, b, z) => { const s = F / (z - CZ); return [CX + (a - camX * (1 - z / camD)) * s, HY + (CH - b) * s, s] };
const line = (a, b, w, col) => { x.strokeStyle = col; x.lineWidth = w; x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.stroke() };
function quad(pts, col) { x.fillStyle = col; x.beginPath(); pts.forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.fill() }
function pent(cx, cy, R, rot) { x.beginPath(); for (let i = 0; i < 5; i++) { const a = rot + i * 1.2566; i ? x.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R) : x.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R) } x.closePath(); x.fill() }

// ----- Tribun penonton (digambar sekali) -----
let stands;
function buildStands() {
  stands = document.createElement('canvas'); stands.width = 480; stands.height = 360;
  const s = stands.getContext('2d');
  let g = s.createLinearGradient(0, 0, 0, 360); g.addColorStop(0, '#070d14'); g.addColorStop(1, '#1b2733'); s.fillStyle = g; s.fillRect(0, 0, 480, 360);
  let seed = 7; const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
  const mix = ['#f4f1e6', '#ffc94d', '#1a1a22', '#7ddc6f'], skin = ['#d9a47c', '#b57a52', '#8a5a3a', '#f0c8a0'];
  for (let r = 0; r < 34; r++) {
    const y = 38 + r * 9.4;
    for (let cx = -3 + (r % 2) * 3; cx < 490; cx += 6) {
      s.fillStyle = rnd() < .72 ? (cx < 240 ? '#e4412f' : '#2f6bff') : mix[Math.floor(rnd() * 4)]; s.fillRect(cx, y + 3, 5, 6);
      s.fillStyle = skin[Math.floor(rnd() * 4)]; s.fillRect(cx + 1, y, 3, 3);
      if (rnd() < .06) { s.fillStyle = '#f4f1e6'; s.fillRect(cx - 1, y - 5, 2, 6) }   // tangan terangkat
    }
    s.fillStyle = '#0a1018'; s.fillRect(0, y + 8.4, 480, 1.4);
  }
  [[24, 95, 130, '#e4412f'], [300, 128, 150, '#2f6bff'], [150, 190, 120, '#ffc94d'], [340, 235, 110, '#e4412f']].forEach(([bx, by, bw, col]) => {
    s.fillStyle = col; s.fillRect(bx, by, bw, 15); s.fillStyle = '#f4f1e6'; for (let i = 0; i < bw; i += 14) s.fillRect(bx + i + 3, by + 5, 7, 5);
  });
  for (let i = 0; i < 16; i++) { const fx = 20 + i * 30 + (i % 3) * 7, fy = 55 + (i * 37) % 200; s.fillStyle = i % 2 ? '#e4412f' : '#2f6bff'; s.fillRect(fx, fy, 14, 9); s.fillStyle = '#ddd'; s.fillRect(fx - 2, fy, 2, 22) }
  s.fillStyle = '#05090e'; s.fillRect(0, 0, 480, 34);                       // atap tribun
  [[50, 22], [430, 22], [240, 18]].forEach(([lx, ly]) => { const gr = s.createRadialGradient(lx, ly, 2, lx, ly, 150); gr.addColorStop(0, 'rgba(255,244,200,.9)'); gr.addColorStop(.2, 'rgba(255,230,160,.3)'); gr.addColorStop(1, 'rgba(255,230,160,0)'); s.fillStyle = gr; s.fillRect(0, 0, 480, 360) });
}

// ----- Pemain -----
function man(px, pz, h, col, w, tilt, arms, lift) {
  const [a, b, s] = pr(px, lift || 0, pz), k = h / 1.8;
  x.save(); x.translate(a, b); x.rotate(tilt || 0);
  x.fillStyle = '#14201a'; x.fillRect(-w * .4 * s, -.85 * k * s, w * .8 * s, .85 * k * s);
  x.fillStyle = col; x.fillRect(-w / 2 * s, -1.5 * k * s, w * s, .7 * k * s);
  if (arms) {
    x.strokeStyle = col; x.lineWidth = .14 * s; x.lineCap = 'round'; x.beginPath();
    x.moveTo(-w / 2 * s, -1.4 * k * s); x.lineTo(-(w / 2 + .3) * s, -1.95 * k * s);
    x.moveTo(w / 2 * s, -1.4 * k * s); x.lineTo((w / 2 + .3) * s, -1.95 * k * s); x.stroke();
  }
  x.fillStyle = '#d9a47c'; x.beginPath(); x.arc(0, -1.65 * k * s, .13 * k * s, 0, 7); x.fill(); x.restore();
}
// Penendang dari belakang, lengkap dengan nomor punggung
function taker() {
  const { cfg, tk, phase, t } = S, z = -1.4, [a, b, s] = pr(cfg.x * (1 - z / cfg.dist) - 1.15, 0, z), k = phase === 'fly' ? Math.min(1, t * 6) : 0;
  x.save(); x.translate(a, b); x.rotate(-.16 * k);
  x.fillStyle = '#d9a47c'; x.fillRect(-.3 * s, -.85 * s, .2 * s, .85 * s);
  x.save(); x.translate(.2 * s, -.85 * s); x.rotate(.9 * k); x.fillRect(-.1 * s, 0, .2 * s, .85 * s); x.restore();
  x.fillStyle = '#16202a'; x.fillRect(-.34 * s, -1.12 * s, .68 * s, .3 * s);
  x.fillStyle = tk.kit; x.fillRect(-.36 * s, -1.65 * s, .72 * s, .56 * s);
  x.fillRect(-.5 * s, -1.62 * s, .14 * s, .5 * s); x.fillRect(.36 * s, -1.62 * s, .14 * s, .5 * s);
  x.fillStyle = '#d9a47c'; x.fillRect(-.5 * s, -1.14 * s, .14 * s, .12 * s); x.fillRect(.36 * s, -1.14 * s, .14 * s, .12 * s);
  x.beginPath(); x.arc(0, -1.8 * s, .15 * s, 0, 7); x.fill();
  x.fillStyle = '#2a1b12'; x.beginPath(); x.arc(0, -1.82 * s, .15 * s, Math.PI, 0); x.fill();
  const dark = /f4f1e6|ffc94d|7ddc6f/.test(tk.kit); x.fillStyle = dark ? '#111' : '#fff';
  x.font = `700 ${.4 * s}px Silkscreen,monospace`; x.textAlign = 'center'; x.fillText(tk.number, 0, -1.22 * s);
  x.restore();
}

// Bola hitam putih standar
function ballAt(p) {
  const [a, b, s] = pr(p.x, p.y + .11, p.z), [, g] = pr(p.x, 0, p.z), r = Math.max(3, .11 * s);
  x.fillStyle = 'rgba(0,0,0,.3)'; x.beginPath(); x.ellipse(a, g, r * 1.1, r * .35, 0, 0, 7); x.fill();
  x.save(); x.translate(a, b); x.beginPath(); x.arc(0, 0, r, 0, 7); x.clip(); x.rotate(p.z * .5);
  x.fillStyle = '#fff'; x.fillRect(-r, -r, 2 * r, 2 * r); x.fillStyle = '#111'; x.strokeStyle = '#111'; x.lineWidth = Math.max(.8, r * .09);
  pent(0, 0, r * .4, -1.5708);
  for (let i = 0; i < 5; i++) {
    const an = -1.5708 + i * 1.2566, ca = Math.cos(an), sa = Math.sin(an);
    x.beginPath(); x.moveTo(ca * r * .4, sa * r * .4); x.lineTo(ca * r * .68, sa * r * .68); x.stroke();
    pent(ca * r * .98, sa * r * .98, r * .36, an + Math.PI);
  }
  x.restore(); x.strokeStyle = '#111'; x.lineWidth = 1; x.beginPath(); x.arc(a, b, r, 0, 7); x.stroke();
}

function drawField(D) {
  x.fillStyle = '#1b5233'; x.fillRect(0, 0, 480, 720);
  for (let k = 0; k < 18; k += 2) { const z0 = -8 + k * 4, z1 = z0 + 4; quad([pr(-60, 0, z0), pr(60, 0, z0), pr(60, 0, z1), pr(-60, 0, z1)], '#237045') }
  const bb = Math.min(360, Math.ceil(pr(0, 0, D + 6)[1]));
  x.drawImage(stands, 0, 0, 480, bb, 0, 0, 480, bb);
  const now = S.now || 0;
  x.fillStyle = 'rgba(255,255,255,.07)'; x.fillRect(((now / 6) % 700) - 100, 40, 70, bb - 40);   // gelombang penonton
  for (let i = 0; i < 8; i++) {                                                                      // blitz kamera
    const h = ((Math.floor(now / 140) + i * 97) * 2654435761 >>> 0) % 1000;
    if (h < 260) { const fx = (h * 13 + i * 71) % 480, fy = 60 + (h * 7) % (bb - 80); x.fillStyle = 'rgba(255,255,255,.28)'; x.fillRect(fx - 4, fy - 4, 12, 12); x.fillStyle = '#fff'; x.fillRect(fx, fy, 4, 4) }
  }
  const bc = ['#14323d', '#1f4a57', '#a8321f', '#14323d'];
  for (let i = -14; i < 14; i++) quad([pr(i * 4, 0, D + 6), pr(i * 4 + 4, 0, D + 6), pr(i * 4 + 4, .9, D + 6), pr(i * 4, .9, D + 6)], bc[(i + 14) % 4]);
  const ch = 'rgba(244,241,230,.75)';
  line(pr(-60, 0, D), pr(60, 0, D), 2, ch);
  if (D - 16.5 > -6) { line(pr(-20.15, 0, D - 16.5), pr(20.15, 0, D - 16.5), 2, ch); line(pr(-20.15, 0, D - 16.5), pr(-20.15, 0, D), 2, ch); line(pr(20.15, 0, D - 16.5), pr(20.15, 0, D), 2, ch) }
  line(pr(-9.16, 0, D - 5.5), pr(9.16, 0, D - 5.5), 2, ch); line(pr(-9.16, 0, D - 5.5), pr(-9.16, 0, D), 2, ch); line(pr(9.16, 0, D - 5.5), pr(9.16, 0, D), 2, ch);
}
function drawGoal(D) {
  const B = [pr(-3.66, 0, D + 2.2), pr(3.66, 0, D + 2.2), pr(3.66, 2.44, D + 2.2), pr(-3.66, 2.44, D + 2.2)], net = 'rgba(255,255,255,.3)';
  quad(B, 'rgba(255,255,255,.1)');
  for (let i = 0; i <= 12; i++) { const u = -3.66 + i * .61; line(pr(u, 0, D + 2.2), pr(u, 2.44, D + 2.2), 1, net) }
  for (let i = 0; i <= 6; i++) line(pr(-3.66, i * .407, D + 2.2), pr(3.66, i * .407, D + 2.2), 1, net);
  line(pr(-3.66, 2.44, D), B[3], 1, net); line(pr(3.66, 2.44, D), B[2], 1, net);
  const w = Math.max(3, .12 * pr(0, 0, D)[2]);
  line(pr(-3.66, 0, D), pr(-3.66, 2.44, D), w, '#fff'); line(pr(3.66, 0, D), pr(3.66, 2.44, D), w, '#fff'); line(pr(-3.66, 2.44, D), pr(3.66, 2.44, D), w, '#fff');
}

export function draw() {
  const { cfg, shot, phase, t, aim } = S, D = cfg.dist; camX = cfg.x; camD = D;
  x.setTransform(.5, 0, 0, .5, 0, 0); x.imageSmoothingEnabled = false;
  if (!stands) buildStands();
  drawField(D); drawGoal(D);
  const flying = phase === 'fly' && shot, bp = flying ? ballPos(shot, t) : { x: cfg.x, y: 0, z: 0 };
  if (bp.z > D) ballAt(bp);
  if (cfg.keeper) { const kx = flying ? shot.kx(t) : S.k0; man(kx, D, 1.85, '#c6f432', .6, flying ? Math.max(-.5, Math.min(.5, (kx - S.k0) * .18)) : 0, 1) }
  if (bp.z > WALLZ && bp.z <= D) ballAt(bp);
  const j = flying ? jump(t) : 0;
  for (let i = 0; i < cfg.wall; i++) man(wallX(i), WALLZ, 1.8, '#2f6bff', .5, 0, 0, j);
  if (bp.z <= WALLZ) ballAt(bp);
  taker();
  if (phase === 'aim') {
    const [a, b] = pr(aim.x, aim.y, D);
    x.strokeStyle = '#ffc94d'; x.lineWidth = 3; x.beginPath(); x.arc(a, b, 13, 0, 7);
    x.moveTo(a - 20, b); x.lineTo(a + 20, b); x.moveTo(a, b - 20); x.lineTo(a, b + 20); x.stroke();
  }
  if (flying && t >= shot.stop * .98) {
    x.font = '700 40px Silkscreen,monospace'; x.textAlign = 'center'; x.lineWidth = 8; x.strokeStyle = '#08141f';
    x.fillStyle = shot.out === 'goal' ? '#ffc94d' : '#f4f1e6'; x.strokeText(shot.msg, 240, 190); x.fillText(shot.msg, 240, 190);
  }
}
