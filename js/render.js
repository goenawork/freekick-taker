// Menggambar adegan ke canvas
import { S, WALLZ } from './state.js';
import { wallX, jump, ballPos } from './physics.js';

const c = document.getElementById('c'), x = c.getContext('2d');
const F = 1066, CX = 240, HY = 290, CH = 1.5, CZ = -6;
export const proj = { F, CX, HY, CH, CZ };
let camX = 0;
const pr = (a, b, z) => { const s = F / (z - CZ); return [CX + (a - camX) * s, HY + (CH - b) * s, s] };
const line = (a, b, w, col) => { x.strokeStyle = col; x.lineWidth = w; x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.stroke() };
function quad(pts, col) { x.fillStyle = col; x.beginPath(); pts.forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.fill() }

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
function ballAt(p) {
  const [a, b, s] = pr(p.x, p.y + .11, p.z), [, g] = pr(p.x, 0, p.z), r = Math.max(2, .11 * s);
  x.fillStyle = 'rgba(0,0,0,.3)'; x.beginPath(); x.ellipse(a, g, r * 1.1, r * .35, 0, 0, 7); x.fill();
  x.fillStyle = '#fff'; x.beginPath(); x.arc(a, b, r, 0, 7); x.fill();
  x.fillStyle = '#222'; x.beginPath(); x.arc(a - r * .2, b - r * .1, r * .35, 0, 7); x.fill();
}

function drawField(D) {
  let g = x.createLinearGradient(0, 0, 0, HY); g.addColorStop(0, '#08141f'); g.addColorStop(1, '#1c3a4a');
  x.fillStyle = g; x.fillRect(0, 0, 480, HY);
  x.fillStyle = '#10242c'; x.fillRect(0, HY - 70, 480, 70); x.fillStyle = 'rgba(255,201,77,.5)';
  for (let i = 0; i < 70; i++) x.fillRect((i * 97) % 480, HY - 68 + (i * 53) % 62, 2, 2);
  x.fillStyle = '#1b5233'; x.fillRect(0, HY, 480, 720 - HY);
  for (let k = 0; k < 14; k += 2) { const z0 = -5 + k * 4, z1 = z0 + 4; quad([pr(-40, 0, z0), pr(40, 0, z0), pr(40, 0, z1), pr(-40, 0, z1)], '#237045') }
  quad([pr(-40, 0, D + 6), pr(40, 0, D + 6), pr(40, .9, D + 6), pr(-40, .9, D + 6)], '#0d1a22');
  const ch = 'rgba(244,241,230,.7)';
  line(pr(-40, 0, D), pr(40, 0, D), 2, ch);
  if (D - 16.5 > -4) { line(pr(-20.15, 0, D - 16.5), pr(20.15, 0, D - 16.5), 2, ch); line(pr(-20.15, 0, D - 16.5), pr(-20.15, 0, D), 2, ch); line(pr(20.15, 0, D - 16.5), pr(20.15, 0, D), 2, ch) }
  line(pr(-9.16, 0, D - 5.5), pr(9.16, 0, D - 5.5), 2, ch); line(pr(-9.16, 0, D - 5.5), pr(-9.16, 0, D), 2, ch); line(pr(9.16, 0, D - 5.5), pr(9.16, 0, D), 2, ch);
}
function drawGoal(D) {
  const B = [pr(-3.66, 0, D + 2.2), pr(3.66, 0, D + 2.2), pr(3.66, 2.44, D + 2.2), pr(-3.66, 2.44, D + 2.2)], net = 'rgba(255,255,255,.22)';
  quad(B, 'rgba(255,255,255,.07)');
  for (let i = 0; i <= 12; i++) { const u = -3.66 + i * .61; line(pr(u, 0, D + 2.2), pr(u, 2.44, D + 2.2), 1, net) }
  for (let i = 0; i <= 6; i++) line(pr(-3.66, i * .407, D + 2.2), pr(3.66, i * .407, D + 2.2), 1, net);
  line(pr(-3.66, 2.44, D), B[3], 1, 'rgba(255,255,255,.3)'); line(pr(3.66, 2.44, D), B[2], 1, 'rgba(255,255,255,.3)');
  const w = Math.max(3, .12 * pr(0, 0, D)[2]);
  line(pr(-3.66, 0, D), pr(-3.66, 2.44, D), w, '#fff'); line(pr(3.66, 0, D), pr(3.66, 2.44, D), w, '#fff'); line(pr(-3.66, 2.44, D), pr(3.66, 2.44, D), w, '#fff');
}

export function draw() {
  const { cfg, shot, phase, t, aim } = S, D = cfg.dist; camX = cfg.x;
  drawField(D); drawGoal(D);
  const flying = phase === 'fly' && shot, bp = flying ? ballPos(shot, t) : { x: cfg.x, y: 0, z: 0 };
  if (bp.z > D) ballAt(bp);
  if (cfg.keeper) { const kx = flying ? shot.kx(t) : S.k0; man(kx, D, 1.85, '#c6f432', .6, flying ? Math.max(-.5, Math.min(.5, (kx - S.k0) * .18)) : 0, 1) }
  if (bp.z > WALLZ && bp.z <= D) ballAt(bp);
  const j = flying ? jump(t) : 0;
  for (let i = 0; i < cfg.wall; i++) man(wallX(i), WALLZ, 1.8, '#2f6bff', .5, 0, 0, j);
  if (bp.z <= WALLZ) ballAt(bp);
  if (phase === 'aim') {
    const [a, b] = pr(aim.x, aim.y, D);
    x.strokeStyle = '#ffc94d'; x.lineWidth = 3; x.beginPath(); x.arc(a, b, 13, 0, 7);
    x.moveTo(a - 20, b); x.lineTo(a + 20, b); x.moveTo(a, b - 20); x.lineTo(a, b + 20); x.stroke();
  }
  if (flying && t >= shot.stop * .98) {
    x.font = '800 64px "Barlow Condensed",Impact,sans-serif'; x.textAlign = 'center'; x.lineWidth = 8; x.strokeStyle = '#08141f';
    x.fillStyle = shot.out === 'goal' ? '#ffc94d' : '#f4f1e6'; x.strokeText(shot.msg, 240, 230); x.fillText(shot.msg, 240, 230);
  }
}
