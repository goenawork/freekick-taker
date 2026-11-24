// Data level (data/levels.json) dan daftar pilihan misi
import { S, $, store } from './state.js';

export async function loadLevels() { S.levels = await (await fetch('data/levels.json')).json() }

export function renderLevels(onPick) {
  const u = store.get('unlocked', 1), L = $('lvList'); L.innerHTML = '';
  S.levels.forEach((l, i) => {
    const b = document.createElement('button'); b.className = 'card'; b.disabled = i >= u;
    b.innerHTML = `<b class="num">Level ${i + 1}: ${l.t}</b><small>${i >= u ? 'Terkunci. Selesaikan level sebelumnya.' : `${l.d} Butuh ${l.need} gol dari ${l.shots} tendangan.`}</small>`;
    b.onclick = () => onPick(i); L.appendChild(b);
  });
}
