// State bersama + utilitas
export const $ = id => document.getElementById(id);
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) * 1.6;
export const WALLZ = 9.15;
export const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem('ft-' + k)) ?? d } catch (e) { return d } },
  set(k, v) { try { localStorage.setItem('ft-' + k, JSON.stringify(v)) } catch (e) {} }
};
export const S = {
  levels: [], takers: [], tk: null, cfg: null, mode: '', lvIdx: 0,
  phase: 'menu', goals: 0, used: 0, aim: { x: 0, y: 1.2 }, k0: 0, shot: null, t: 0, meter: 0
};
