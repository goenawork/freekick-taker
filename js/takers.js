// Data taker (data/takers.json) dan daftar pilihan taker
import { S, $, store } from './state.js';

const STATS = [['power', 'Power'], ['accuracy', 'Akurasi'], ['curve', 'Lengkung'], ['dip', 'Dip'], ['composure', 'Ketenangan']];

export async function loadTakers() {
  S.takers = (await (await fetch('data/takers.json')).json()).map(k => ({ number: '', kit: '#e4412f', foot: 'right', ...k }));
  S.tk = S.takers.find(k => k.id === store.get('taker')) || S.takers[0];
}

export function renderTakers() {
  const L = $('tkList'); L.innerHTML = '';
  S.takers.forEach(k => {
    const b = document.createElement('button'); b.className = 'card' + (k.id === S.tk.id ? ' on' : '');
    b.innerHTML = `<b class="num">${k.number !== '' ? '#' + k.number + ' ' : ''}${k.name}</b><small>Kaki kuat: ${k.foot === 'left' ? 'kiri' : 'kanan'}</small><div class="st">${STATS.map(([s, n]) => `<span>${n}</span><div class="bar"><i style="width:${k[s]}%"></i></div>`).join('')}</div>`;
    b.onclick = () => { S.tk = k; store.set('taker', k.id); renderTakers() }; L.appendChild(b);
  });
}
