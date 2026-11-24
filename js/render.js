// Renderer 3D (Three.js). Koordinat game: x kanan, y atas, z menuju gawang. Di Three.js sumbu x dinegasikan.
import * as THREE from 'three';
import { S, WALLZ, clamp } from './state.js';
import { wallX, jump, ballPos } from './physics.js';

const c = document.getElementById('c'), msgEl = document.getElementById('msg');
const renderer = new THREE.WebGLRenderer({ canvas: c, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#16222e'); scene.fog = new THREE.Fog(0x16222e, 70, 150);
const camera = new THREE.PerspectiveCamera(50, 1, .1, 400);
scene.add(new THREE.HemisphereLight(0xdfeaff, 0x2d4a2d, .95));
const sun = new THREE.DirectionalLight(0xffffff, 1.1); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 140 }); sun.shadow.camera.updateProjectionMatrix(); sun.shadow.bias = -.0005;
scene.add(sun, sun.target);

// ----- Tekstur -----
function canvasTex(w, h, fn) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; fn(cv.getContext('2d')); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t }
const grassTex = canvasTex(256, 256, g => {
  g.fillStyle = '#2f7d3f'; g.fillRect(0, 0, 256, 128); g.fillStyle = '#276c36'; g.fillRect(0, 128, 256, 128);
  for (let i = 0; i < 5000; i++) { g.fillStyle = Math.random() < .5 ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.05)'; g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2) }
});
grassTex.wrapS = grassTex.wrapT = THREE.RepeatWrapping; grassTex.repeat.set(12, 12); grassTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
const netTex = canvasTex(64, 64, g => { g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 0); g.lineTo(64, 0); g.moveTo(0, 0); g.lineTo(0, 64); g.stroke() });
const ballTex = canvasTex(512, 256, g => {
  g.fillStyle = '#f5f5f5'; g.fillRect(0, 0, 512, 256); g.fillStyle = '#111';
  const patch = (lon, lat) => { const cx = (lon + 180) / 360 * 512, cy = (90 - lat) / 180 * 256, R = 22; g.beginPath(); for (let i = 0; i < 5; i++) { const a = i * 1.2566 - 1.5708, px = cx + Math.cos(a) * R * 1.15, py = cy + Math.sin(a) * R; i ? g.lineTo(px, py) : g.moveTo(px, py) } g.closePath(); g.fill() };
  g.fillRect(0, 0, 512, 22); g.fillRect(0, 234, 512, 22);
  for (let i = 0; i < 5; i++) { patch(-180 + i * 72, 26.565); patch(-144 + i * 72, -26.565) } patch(180, 26.565);
});
function jerseyTex(name, number, kit) {
  return canvasTex(256, 256, g => {
    let dark = false; if (/^#[0-9a-f]{6}$/i.test(kit)) { const n = parseInt(kit.slice(1), 16); dark = .299 * (n >> 16) + .587 * (n >> 8 & 255) + .114 * (n & 255) > 150 }
    g.fillStyle = dark ? '#111' : '#fff'; g.textAlign = 'center';
    const txt = String(name).split(' ').pop().toUpperCase(); let fs = 44; g.font = `700 ${fs}px Arial,sans-serif`;
    while (g.measureText(txt).width > 235 && fs > 16) { fs -= 2; g.font = `700 ${fs}px Arial,sans-serif` }
    g.fillText(txt, 128, 70);
    if (number !== '') { g.font = '800 170px Arial,sans-serif'; g.fillText(String(number), 128, 232) }
  });
}

// ----- Bahan -----
const mats = {}; const mat = (col, r = .7) => mats[col + r] || (mats[col + r] = new THREE.MeshStandardMaterial({ color: col, roughness: r }));
const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .88, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });

// ----- Objek statis -----
const ground = new THREE.Mesh(new THREE.PlaneGeometry(132, 132), new THREE.MeshStandardMaterial({ map: grassTex, roughness: 1 }));
ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0, 40); ground.receiveShadow = true; scene.add(ground);
const ball = new THREE.Mesh(new THREE.SphereGeometry(.11, 24, 16), new THREE.MeshStandardMaterial({ map: ballTex, roughness: .5 }));
ball.castShadow = true; scene.add(ball);
const aimMark = new THREE.Group(); {
  const m = new THREE.MeshBasicMaterial({ color: 0xffc94d, depthTest: false, transparent: true, side: THREE.DoubleSide });
  [new THREE.RingGeometry(.2, .26, 32), new THREE.PlaneGeometry(.55, .04), new THREE.PlaneGeometry(.04, .55)].forEach(g => { const o = new THREE.Mesh(g, m); o.renderOrder = 10; aimMark.add(o) });
  scene.add(aimMark);
}

// ----- Pemain dari bentuk dasar (menghadap +z, punggung di -z) -----
function player(o) {
  const { kit, shorts = '#161c26', skin = '#d9a47c', hair = '#2a1b12', gloves = null, tex = null, h = 1.9 } = o, g = new THREE.Group(), L = {};
  const add = (geo, m, x, y, z, p = g) => { const ms = new THREE.Mesh(geo, m); ms.position.set(x, y, z); ms.castShadow = true; p.add(ms); return ms };
  const leg = sx => { const p = new THREE.Group(); p.position.set(sx, .92, 0); g.add(p);
    add(new THREE.CylinderGeometry(.075, .065, .36, 8), mat(skin), 0, -.2, 0, p); add(new THREE.CylinderGeometry(.06, .055, .52, 8), mat(o.socks || kit), 0, -.64, 0, p);
    add(new THREE.BoxGeometry(.11, .07, .26), mat('#111'), 0, -.89, .05, p); return p };
  L.legL = leg(-.1); L.legR = leg(.1);
  add(new THREE.BoxGeometry(.38, .28, .25), mat(shorts), 0, 1, 0);
  add(new THREE.BoxGeometry(.44, .52, .26), mat(kit), 0, 1.4, 0);
  const arm = sx => { const p = new THREE.Group(); p.position.set(sx, 1.6, 0); g.add(p);
    add(new THREE.CylinderGeometry(.06, .055, .22, 8), mat(kit), 0, -.12, 0, p); add(new THREE.CylinderGeometry(.045, .04, .3, 8), mat(skin), 0, -.38, 0, p);
    add(new THREE.SphereGeometry(.055, 8, 6), mat(gloves || skin), 0, -.56, 0, p); p.rotation.z = sx < 0 ? -.2 : .2; return p };
  L.armL = arm(-.28); L.armR = arm(.28);
  add(new THREE.SphereGeometry(.115, 12, 10), mat(skin), 0, 1.78, 0);
  add(new THREE.SphereGeometry(.12, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(hair), 0, 1.79, -.005);
  if (tex) { const pl = new THREE.Mesh(new THREE.PlaneGeometry(.4, .4), new THREE.MeshBasicMaterial({ map: tex, transparent: true })); pl.position.set(0, 1.4, -.134); pl.rotation.y = Math.PI; g.add(pl) }
  g.scale.setScalar(h / 1.9); g.userData = L; return g;
}

// ----- Lapangan dan gawang (dibangun ulang per konfigurasi) -----
function seg(g, x1, z1, x2, z2, w = .13) {
  const X1 = -x1, X2 = -x2, dx = X2 - X1, dz = z2 - z1, geo = new THREE.PlaneGeometry(w, Math.hypot(dx, dz)); geo.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(geo, lineMat); m.position.set((X1 + X2) / 2, .02, (z1 + z2) / 2); m.rotation.y = Math.atan2(dx, dz); g.add(m);
}
function arc(g, cx, cz, r, a0, a1) {
  const pos = [], idx = [], n = 24;
  for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; for (const rr of [r - .065, r + .065]) pos.push(-(cx + Math.sin(a) * rr), .02, cz - Math.cos(a) * rr) }
  for (let i = 0; i < n; i++) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2) }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); g.add(new THREE.Mesh(geo, lineMat));
}
function buildField(D) {
  const g = new THREE.Group();
  seg(g, -34, D, 34, D); seg(g, -34, -80, -34, D); seg(g, 34, -80, 34, D);
  seg(g, -9.16, D - 5.5, 9.16, D - 5.5); seg(g, -9.16, D - 5.5, -9.16, D); seg(g, 9.16, D - 5.5, 9.16, D);
  seg(g, -20.16, D - 16.5, 20.16, D - 16.5); seg(g, -20.16, D - 16.5, -20.16, D); seg(g, 20.16, D - 16.5, 20.16, D);
  arc(g, 0, D - 11, 9.15, -.927, .927);
  const sp = new THREE.CircleGeometry(.16, 16); sp.rotateX(-Math.PI / 2); const spot = new THREE.Mesh(sp, lineMat); spot.position.set(0, .02, D - 11); g.add(spot);
  return g;
}
function buildGoal(D) {
  const g = new THREE.Group(), wm = mat('#ffffff', .4);
  [-3.66, 3.66].forEach(x => {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, 2.44, 10), wm); p.position.set(-x, 1.22, D); p.castShadow = true; g.add(p);
    const b = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, 2.44, 6), wm); b.position.set(-x, 1.22, D + 2); g.add(b);
  });
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, 7.44, 10), wm); bar.rotation.z = Math.PI / 2; bar.position.set(0, 2.44, D); bar.castShadow = true; g.add(bar);
  const np = (w, h, x, y, z, ry, rx) => {
    const t = netTex.clone(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(w / .4, h / .4); t.needsUpdate = true;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
    m.position.set(x, y, z); m.rotation.set(rx || 0, ry || 0, 0); g.add(m);
  };
  np(7.32, 2.44, 0, 1.22, D + 2, 0); np(2, 2.44, -3.66, 1.22, D + 1, Math.PI / 2); np(2, 2.44, 3.66, 1.22, D + 1, Math.PI / 2); np(7.32, 2, 0, 2.44, D + 1, 0, Math.PI / 2);
  return g;
}

let key = '', dyn = null, taker = null, keeperW = null, keeper = null, wallP = [];
function build() {
  const { cfg, tk } = S, D = cfg.dist;
  if (dyn) scene.remove(dyn);
  dyn = new THREE.Group(); scene.add(dyn); dyn.add(buildField(D), buildGoal(D));
  wallP = []; for (let i = 0; i < cfg.wall; i++) { const p = player({ kit: '#2f6bff' }); p.userData.armL.rotation.set(-.9, 0, .35); p.userData.armR.rotation.set(-.9, 0, -.35); dyn.add(p); wallP.push(p) }
  keeper = keeperW = null;
  if (cfg.keeper) { keeper = player({ kit: '#c6f432', shorts: '#1a1a22', gloves: '#ffffff', h: 1.95 }); keeperW = new THREE.Group(); keeperW.add(keeper); dyn.add(keeperW) }
  taker = player({ kit: tk.kit, shorts: '#161c26', tex: jerseyTex(tk.name, tk.number, tk.kit) }); dyn.add(taker);
  sun.target.position.set(-cfg.x / 2, 0, D / 2); sun.position.set(-cfg.x / 2 - 25, 45, D / 2 - 15);
}

// ----- Ukuran dan input -----
let W = 0, H = 0;
function resize() {
  const w = c.clientWidth, h = c.clientHeight; if (w === W && h === H || !w || !h) return; W = w; H = h;
  renderer.setSize(w, h, false); camera.aspect = w / h;
  camera.fov = THREE.MathUtils.radToDeg(clamp(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(37.5)) / camera.aspect), .7, 1.25)); camera.updateProjectionMatrix();
}
const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), pt = new THREE.Vector3(), ndc = new THREE.Vector2();
export function pickAim(e) {
  const r = c.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera); plane.constant = -S.cfg.dist;
  if (!ray.ray.intersectPlane(plane, pt)) return null;
  return { x: clamp(-pt.x, -5.2, 5.2), y: clamp(pt.y, 0, 3.8) };
}

// ----- Gambar tiap frame -----
let lastMsg = '';
export function draw() {
  resize();
  const { cfg, tk, shot, phase, t, aim } = S, D = cfg.dist;
  const k = [D, cfg.x, cfg.wall, cfg.keeper, tk.id, tk.number, tk.kit].join();
  if (k !== key) { key = k; build() }
  const n = Math.hypot(cfg.x, D), dir = { x: -cfg.x / n, z: D / n }, perp = { x: dir.z, z: -dir.x }, yaw = Math.atan2(-dir.x, dir.z);
  const flying = phase === 'fly' && shot;

  // kamera: di belakang bola, tinggi, menghadap gawang
  camera.position.set(-(cfg.x - dir.x * 6.5), 2.4, -dir.z * 6.5);
  camera.lookAt(-(cfg.x + dir.x * 8), .3, dir.z * 8);

  // penendang di kiri-belakang bola, ayunan kaki saat menendang
  let adv = 0, rr = 0, rl = 0;
  if (flying) {
    if (t < 0) { const p = clamp((t + .3) / .3, 0, 1); adv = .55 * p; rr = .9 * p }
    else { adv = .55; const q = clamp(t / .12, 0, 1); rr = t > .4 ? -1.1 * (1 - clamp((t - .4) / .5, 0, 1)) : .9 - 2 * q; rl = -.2 }
  }
  taker.position.set(-(cfg.x - dir.x * (1 - adv) - perp.x * .95), 0, -dir.z * (1 - adv) - perp.z * .95); taker.rotation.y = yaw;
  taker.userData.legR.rotation.x = rr; taker.userData.legL.rotation.x = rl;
  taker.userData.armL.rotation.x = -rr * .5; taker.userData.armR.rotation.x = rr * .5;

  // pagar betis menghadap bola, melompat
  const jy = flying ? jump(Math.max(0, t)) : 0;
  wallP.forEach((p, i) => { p.position.set(-wallX(i), jy, WALLZ); p.rotation.y = yaw + Math.PI });

  // kiper
  if (keeperW) {
    const kx = flying ? shot.kx(Math.max(0, t)) : S.k0, tilt = clamp((kx - S.k0) * .3, -1.1, 1.1), up = Math.abs(tilt) / 1.1;
    keeperW.position.set(-kx, Math.abs(tilt) * .45, D); keeperW.rotation.z = tilt; keeper.rotation.y = yaw + Math.PI;
    const a = .6 + 2.2 * up; keeper.userData.armL.rotation.z = -a; keeper.userData.armR.rotation.z = a;
  }

  // bola
  const bp = flying ? ballPos(shot, t) : { x: cfg.x, y: 0, z: 0 };
  ball.position.set(-bp.x, bp.y + .11, bp.z); ball.rotation.x = bp.z * 2.5;

  // bidikan
  aimMark.visible = phase === 'aim'; aimMark.position.set(-aim.x, aim.y, D - .02);

  // pesan hasil
  const txt = flying && t >= shot.stop * .98 ? shot.msg : '';
  if (txt !== lastMsg) { lastMsg = txt; msgEl.textContent = txt; msgEl.className = txt && shot.out === 'goal' ? 'goal' : '' }

  renderer.render(scene, camera);
}
