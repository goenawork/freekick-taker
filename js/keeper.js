// Perilaku kiper
import { S, clamp, gauss } from './state.js';

// Mengembalikan fungsi posisi kiper terhadap waktu, berdasarkan tebakan arah bola.
export function planKeeper(ballX) {
  const { cfg, k0 } = S;
  const kd = clamp(ballX + gauss() * (1 - cfg.skill) * 2.5, -3.3, 3.3);
  const delay = .18 + (1 - cfg.skill) * .25, speed = 3 + 5 * cfg.skill;
  return q => cfg.keeper ? k0 + Math.sign(kd - k0) * Math.min(Math.abs(kd - k0), speed * Math.max(0, q - delay)) : 0;
}

export const saves = (p, kx) =>
  S.cfg.keeper && Math.abs(p.x - kx) < .9 + .4 * S.cfg.skill && p.y < 1.8 + .6 * S.cfg.skill;
