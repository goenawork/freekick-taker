// Fisika tendangan, pagar betis, dan hasil
import { S, WALLZ, clamp, gauss } from './state.js';
import { planKeeper, saves } from './keeper.js';

export const wallX = i => S.cfg.x * (1 - WALLZ / S.cfg.dist) + (i - (S.cfg.wall - 1) / 2) * .55;
export const jump = tt => S.cfg.jump ? .45 * clamp((tt - .12) / .25, 0, 1) : 0;

export function makeShot(pw, curveVal) {
  const { cfg, tk, aim } = S, D = cfg.dist, sx = cfg.x;
  const vz = (11 + 14 * pw) * (.7 + .3 * tk.power / 100), T = D / vz;
  const e = (1 - tk.accuracy / 100) * (.5 + pw) * (1 + (cfg.pr || 0) * (1 - tk.composure / 100));
  const tx = aim.x + gauss() * 1.5 * e, ty = Math.max(0, aim.y + gauss() * .8 * e);
  const ax = 12 * (curveVal / 100) * tk.curve / 100, G = 9.8 + 8 * tk.dip / 100;
  const vx = (tx - sx) / T - .5 * ax * T, vy = ty / T + .5 * G * T;
  const P = q => ({ x: sx + vx * q + .5 * ax * q * q, y: Math.max(0, vy * q - .5 * G * q * q), z: vz * q });
  const shot = { P, T, out: '', stop: T };

  let blocked = false;
  if (cfg.wall) {
    const tw = WALLZ / vz, p = P(tw), j = jump(tw);
    for (let i = 0; i < cfg.wall; i++) if (Math.abs(p.x - wallX(i)) < .4 && p.y < 1.85 + j) blocked = true;
    if (blocked) { shot.out = 'wall'; shot.stop = tw }
  }
  shot.kx = planKeeper(P(T).x);
  if (!blocked) {
    const p = P(T);
    if (Math.abs(p.x) < 3.66 && p.y < 2.44) shot.out = saves(p, shot.kx(T)) ? 'save' : 'goal';
    else if (Math.abs(p.x) < 3.8 && p.y < 2.56) shot.out = 'post';
    else { shot.out = 'miss'; shot.stop = T + .5 }
  }
  shot.end = shot.stop + (shot.out === 'miss' ? .4 : .9);
  shot.msg = { goal: 'GOL!', save: 'Ditangkap kiper', wall: 'Terhalang pagar', post: 'Kena tiang!' }[shot.out];
  if (shot.out === 'miss') shot.msg = P(T).y > 2.44 ? 'Di atas mistar' : 'Melebar';
  return shot;
}

// Posisi bola pada waktu t (termasuk setelah berhenti)
export function ballPos(shot, t) {
  const D = S.cfg.dist, p = shot.P(Math.min(t, shot.stop));
  if (t > shot.stop) {
    const d = t - shot.stop;
    if (shot.out === 'goal') { p.z = D + Math.min(d * 5, 1.5); p.y = Math.max(0, p.y - d * 4) }
    else if (shot.out !== 'miss') p.y = Math.max(0, p.y - d * 6);
  }
  return p;
}
