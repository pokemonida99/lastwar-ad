// 末日小隊：Last War 廣告小遊戲玩法原型
// 小隊沿著街道往前衝，選門加人、閃陷阱、開槍掃殭屍，最後打 Boss。
// 世界座標：前進方向是 -z，馬路中線 x=0。
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CONFIG, TRACKS } from './data.js?v=0.4.0';
import { parseGate } from './calc.js?v=0.4.0';

const ROAD = 6;            // 馬路半寬
const WALK = 4;            // 人行道寬
const EDGE = ROAD + WALK;  // 建築物起點
const S = 2.1;             // 小兵大小
const SPACING = 0.62;      // 隊形間距
const GA = Math.PI * (3 - Math.sqrt(5));
const MAX_SOLDIER = CONFIG.maxCount + 40;
const MAX_ZOMBIE = 700;

const $ = (id) => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------- 渲染 ----------
const wrap = $('game');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
wrap.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#a9c9e2');
scene.fog = new THREE.Fog('#a9c9e2', 75, 150);
const camera = new THREE.PerspectiveCamera(38, 0.5, 1, 220);

scene.add(new THREE.HemisphereLight('#ffffff', '#8c7c68', 1.5));
const sun = new THREE.DirectionalLight('#fff4e0', 2.2);
sun.position.set(-14, 30, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 30, bottom: -30, near: 1, far: 90 });
sun.shadow.bias = -0.0015;
scene.add(sun, sun.target);

function resize() {
  const w = wrap.clientWidth, h = wrap.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

// ---------- 小工具：程式畫貼圖、上色後合併的幾何 ----------
function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
}
function part(geo, color, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const c = new THREE.Color(color), n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  g.deleteAttribute('uv');
  g.rotateX(rx); g.rotateY(ry); g.rotateZ(rz); g.translate(x, y, z);
  return g;
}
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cyl = (rt, rb, h, s = 10) => new THREE.CylinderGeometry(rt, rb, h, s);
const ball = (r, ws = 12, hs = 10) => new THREE.SphereGeometry(r, ws, hs);
const vcMat = new THREE.MeshLambertMaterial({ vertexColors: true });

// 小兵：奶油色制服、藍色鋼盔、胸前藍徽章，面向 -z
function soldierGeo() {
  const g = mergeGeometries([
    part(box(0.13, 0.26, 0.15), '#2f3e66', -0.08, 0.13, 0),
    part(box(0.13, 0.26, 0.15), '#2f3e66', 0.08, 0.13, 0),
    part(cyl(0.19, 0.22, 0.36), '#efe6d1', 0, 0.44, 0),
    part(box(0.15, 0.13, 0.03), '#2f6fd6', 0, 0.47, -0.205),
    part(box(0.08, 0.24, 0.09), '#efe6d1', -0.24, 0.45, -0.06, -0.9),
    part(box(0.08, 0.24, 0.09), '#efe6d1', 0.24, 0.45, -0.06, -0.9),
    part(box(0.06, 0.07, 0.42), '#2a2a2a', 0.1, 0.5, -0.3),
    part(ball(0.16), '#f1c9a1', 0, 0.76, 0),
    part(new THREE.SphereGeometry(0.2, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), '#2f7ae5', 0, 0.78, 0),
    part(cyl(0.21, 0.21, 0.045, 14), '#2564c0', 0, 0.78, 0),
  ]);
  g.scale(S, S, S);
  return g;
}
// 隊長：咖啡色夾克、大背包、長槍
function heroGeo() {
  const g = mergeGeometries([
    part(box(0.14, 0.28, 0.16), '#3a2f28', -0.09, 0.14, 0),
    part(box(0.14, 0.28, 0.16), '#3a2f28', 0.09, 0.14, 0),
    part(cyl(0.21, 0.24, 0.4), '#7b4b2a', 0, 0.47, 0),
    part(box(0.34, 0.36, 0.2), '#5a4632', 0, 0.5, 0.22),
    part(box(0.36, 0.08, 0.22), '#3f3122', 0, 0.7, 0.22),
    part(box(0.09, 0.26, 0.1), '#7b4b2a', -0.26, 0.48, -0.06, -0.9),
    part(box(0.09, 0.26, 0.1), '#7b4b2a', 0.26, 0.48, -0.06, -0.9),
    part(box(0.07, 0.08, 0.6), '#1d1d1d', 0.11, 0.54, -0.36),
    part(ball(0.17), '#e8b98f', 0, 0.82, 0),
    part(new THREE.SphereGeometry(0.185, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2.2), '#2a1d14', 0, 0.84, 0.02),
    part(box(0.3, 0.05, 0.05), '#b33a2a', 0, 0.86, -0.15),
  ]);
  g.scale(S * 1.25, S * 1.25, S * 1.25);
  return g;
}
// 殭屍：灰綠皮膚、破襯衫、手往前伸、紅眼睛，面向 +z
function zombieGeo(shirt = '#7a8794', skin = '#9db896', scale = S) {
  const g = mergeGeometries([
    part(box(0.13, 0.26, 0.15), '#434a3a', -0.08, 0.13, 0),
    part(box(0.13, 0.26, 0.15), '#434a3a', 0.08, 0.13, 0),
    part(cyl(0.19, 0.21, 0.36, 8), shirt, 0, 0.44, 0),
    part(box(0.2, 0.06, 0.03), '#5a3b3b', 0.02, 0.38, 0.2),
    part(box(0.08, 0.3, 0.09), skin, -0.22, 0.52, 0.16, 1.35),
    part(box(0.08, 0.3, 0.09), skin, 0.22, 0.52, 0.16, 1.35),
    part(ball(0.17, 10, 8), skin, 0, 0.76, 0.03),
    part(box(0.05, 0.04, 0.02), '#e01a1a', -0.065, 0.79, 0.19),
    part(box(0.05, 0.04, 0.02), '#e01a1a', 0.065, 0.79, 0.19),
    part(box(0.1, 0.03, 0.02), '#3a1a1a', 0, 0.7, 0.19),
  ]);
  g.scale(scale, scale, scale);
  return g;
}

// ---------- 貼圖 ----------
const asphalt = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#6f6a65'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 2600; i++) {
    const v = 90 + Math.random() * 40 | 0;
    g.fillStyle = `rgba(${v},${v - 4},${v - 8},0.35)`;
    g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
  }
  g.fillStyle = 'rgba(40,36,34,0.18)';
  for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, rand(10, 30), rand(6, 16), rand(0, 3), 0, 7); g.fill(); }
}, [3, 30]);
const tiles = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#b88a6e'; g.fillRect(0, 0, w, h);
  const n = 8, s = w / n;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const v = Math.random() * 18 - 9;
    g.fillStyle = `rgb(${200 + v},${158 + v},${128 + v})`;
    g.fillRect(x * s + 2, y * s + 2, s - 4, s - 4);
  }
}, [1, 1]);
const paving = canvasTex(128, 128, (g, w, h) => {
  g.fillStyle = '#c9c4ba'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#b3ada2'; g.lineWidth = 3;
  for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(0, i * 32); g.lineTo(w, i * 32); g.stroke(); g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32, h); g.stroke(); }
}, [1, 1]);
const WALLS = ['#c8564b', '#5d8fd3', '#e6d6b2', '#7fae86', '#d99a4e'];
const wallTex = WALLS.map((col) => canvasTex(128, 256, (g, w, h) => {
  g.fillStyle = col; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, h - 70, w, 70);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) {
    const x = 16 + c * 60, y = 18 + r * 58;
    g.fillStyle = '#f4f0e6'; g.fillRect(x - 3, y - 3, 42, 44);
    g.fillStyle = '#3f5f7c'; g.fillRect(x, y, 36, 38);
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(x + 3, y + 3, 10, 32);
  }
  g.fillStyle = '#3b3530'; g.fillRect(44, h - 60, 40, 60);
}));

// ---------- 共用網格 ----------
const soldierMesh = new THREE.InstancedMesh(soldierGeo(), vcMat, MAX_SOLDIER);
const zombieMesh = new THREE.InstancedMesh(zombieGeo(), vcMat, MAX_ZOMBIE);
for (const m of [soldierMesh, zombieMesh]) {
  m.castShadow = true; m.frustumCulled = false; m.count = 0;
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
}
zombieMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_ZOMBIE * 3).fill(1), 3);
scene.add(soldierMesh, zombieMesh);

const hero = new THREE.Mesh(heroGeo(), vcMat);
hero.castShadow = true;
scene.add(hero);

const bulletMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.09, 0.09, 0.7), new THREE.MeshBasicMaterial({ color: '#ffe36b' }), 160);
bulletMesh.frustumCulled = false; bulletMesh.count = 0;
scene.add(bulletMesh);

const partMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), new THREE.MeshLambertMaterial(), 420);
partMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(420 * 3), 3);
partMesh.frustumCulled = false; partMesh.count = 0;
scene.add(partMesh);

const splatMesh = new THREE.InstancedMesh(new THREE.CircleGeometry(0.55, 9).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({ color: '#7c231d', transparent: true, opacity: 0.75, depthWrite: false }), 160);
splatMesh.frustumCulled = false; splatMesh.count = 0; splatMesh.renderOrder = 1;
scene.add(splatMesh);

const dummy = new THREE.Object3D();
const tmpC = new THREE.Color();

// ---------- 音效（WebAudio 合成，都很小聲） ----------
let ac = null, muted = false, lastShot = 0;
try { muted = localStorage.getItem('lastwar-ad-mute') === '1'; } catch {}
function audio() {
  if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; } }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}
function tone(f1, f2, dur, type = 'sine', vol = 0.06) {
  if (muted || !ac) return;
  const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime;
  o.type = type; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ac.destination); o.start(t); o.stop(t + dur);
}
let noiseBuf = null;
function noise(dur, vol, freq) {
  if (muted || !ac) return;
  if (!noiseBuf) {
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.3, ac.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(), t = ac.currentTime;
  s.buffer = noiseBuf; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.8;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(ac.destination); s.start(t); s.stop(t + dur);
}
const sfx = {
  shot() { const n = performance.now(); if (n - lastShot < 70) return; lastShot = n; noise(0.06, 0.05, rand(1800, 2600)); },
  gate(good) { good ? (tone(660, 990, 0.12, 'square', 0.035), setTimeout(() => tone(990, 1480, 0.18, 'square', 0.035), 90)) : tone(400, 180, 0.3, 'sawtooth', 0.04); },
  splat() { noise(0.12, 0.05, 500); },
  boss() { tone(120, 50, 0.6, 'sawtooth', 0.07); },
  win() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, f, 0.22, 'square', 0.04), i * 130)); },
  lose() { [392, 330, 262].forEach((f, i) => setTimeout(() => tone(f, f * 0.97, 0.3, 'triangle', 0.07), i * 200)); },
};

// ---------- 關卡狀態 ----------
let world = null;          // 這關的場景物件
let L = null;              // 目前關卡資料
let trackIdx = 0, levelIdx = 0;
// 每個版本各自解鎖到第幾關
const progress = {};
try { Object.assign(progress, JSON.parse(localStorage.getItem('lastwar-ad-progress') || '{}')); } catch {}
const unlockedIn = (t) => clamp(progress[TRACKS[t].id] || 1, 1, TRACKS[t].levels.length);
try { trackIdx = clamp(+localStorage.getItem('lastwar-ad-track') || 0, 0, TRACKS.length - 1); } catch {}
let state = 'cover';       // cover | ready | run | win | lose
const sq = { x: 0, z: 0, tx: 0, speed: 0, heroFall: 0 };
let soldiers = [], fallers = [], hordes = [], gates = [], traps = [], boss = null;
let regroupAt = 0;
const stats = { trap: 0, horde: 0, boss: 0 };   // 測試用：士兵怎麼死的
let bullets = [], parts = [], splats = 0, shotAcc = 0, heroAcc = 0, endT = 0, time = 0;

const marks = $('marks');
const squadBadge = document.createElement('div');
squadBadge.className = 'badge';
marks.appendChild(squadBadge);

function slot(i) { const r = SPACING * Math.sqrt(i + 2.4), a = i * GA; return [Math.cos(a) * r, Math.sin(a) * r]; }
const squadRadius = (n) => SPACING * Math.sqrt(n + 2.4) + 0.4;
const hordeRadius = (n) => SPACING * 0.96 * Math.sqrt(n + 1.5) + 0.4;

function clearWorld() {
  if (world) {
    scene.remove(world);
    world.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      for (const m of [].concat(o.material || [])) { if (m.map && m.map.userData.own) m.map.dispose(); m.dispose(); }
    });
  }
  for (const h of hordes) h.badge.remove();
  marks.querySelectorAll('.pop').forEach((e) => e.remove());
  if (boss) scene.remove(boss.mesh);
  world = new THREE.Group();
  scene.add(world);
}

// ---------- 場景：街道、路口、建築、路燈 ----------
function buildStreet(len, crossings) {
  const zEnd = -(len + 60), zStart = 40, total = zStart - zEnd, mid = (zStart + zEnd) / 2;
  const add = (m) => { world.add(m); return m; };
  const flat = (w, d, mat, x, y, z) => { const m = add(new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), mat)); m.position.set(x, y, z); m.receiveShadow = true; return m; };

  // 地面（人行道磚）與馬路
  const tileMat = new THREE.MeshLambertMaterial({ map: tiles.clone() });
  tileMat.map.repeat.set(80 / 8, total / 8); tileMat.map.needsUpdate = true; tileMat.map.userData.own = true;
  flat(80, total, tileMat, 0, 0, mid);
  const roadMat = new THREE.MeshLambertMaterial({ map: asphalt.clone() });
  roadMat.map.repeat.set(2, total / 12); roadMat.map.needsUpdate = true; roadMat.map.userData.own = true;
  flat(ROAD * 2, total, roadMat, 0, 0.01, mid);

  // 路口：橫向馬路＋斑馬線
  const inCross = (z, pad = 0) => crossings.some((c) => Math.abs(z - c) < 6.5 + pad);
  const crossMat = new THREE.MeshLambertMaterial({ map: asphalt.clone() });
  crossMat.map.repeat.set(8, 1); crossMat.map.needsUpdate = true; crossMat.map.userData.own = true;
  const white = new THREE.MeshLambertMaterial({ color: '#e9e6df' });
  for (const c of crossings) {
    flat(80, 11, crossMat, 0, 0.015, c);
    for (const side of [-1, 1]) {
      for (let x = -ROAD + 0.7; x < ROAD; x += 1.25) flat(0.7, 2.2, white, x + 0.3, 0.025, c + side * 7.3);
      for (let z = -4.6; z <= 4.6; z += 1.25) flat(2.2, 0.7, white, side * (ROAD + 1.6), 0.025, c + z);
    }
  }
  // 中線虛線、路緣石
  const curbMat = new THREE.MeshLambertMaterial({ color: '#d9d4c8' });
  for (let z = zStart; z > zEnd; z -= 5) if (!inCross(z, 3)) flat(0.28, 2.2, white, 0, 0.02, z);
  const segs = [];
  let a = zStart;
  for (const c of [...crossings].sort((p, q) => q - p)) { segs.push([a, c + 5.5]); a = c - 5.5; }
  segs.push([a, zEnd]);
  for (const [z0, z1] of segs) {
    const d = z0 - z1; if (d <= 0) continue;
    for (const side of [-1, 1]) {
      const curb = add(new THREE.Mesh(box(0.35, 0.16, d), curbMat));
      curb.position.set(side * (ROAD + 0.17), 0.08, (z0 + z1) / 2); curb.receiveShadow = true;
      const pt = paving.clone();
      pt.wrapS = pt.wrapT = THREE.RepeatWrapping; pt.repeat.set(1, d / 1.6); pt.needsUpdate = true; pt.userData.own = true;
      flat(1.6, d, new THREE.MeshLambertMaterial({ map: pt }), side * (ROAD + 1.15), 0.012, (z0 + z1) / 2);
    }
  }

  // 建築：每段路兩側排房子
  for (const [z0, z1] of segs) {
    for (const side of [-1, 1]) {
      let z = z0 - 0.5;
      while (z - 6 > z1 + 0.5) {
        const w = Math.min(rand(7, 10), z - z1 - 0.5);
        if (w < 5) break;
        const h = rand(5.5, 9), d = 9, k = Math.random() * WALLS.length | 0;
        const mats = [];
        const wm = new THREE.MeshLambertMaterial({ map: wallTex[k] });
        const roof = new THREE.MeshLambertMaterial({ color: '#8b857c' });
        for (let i = 0; i < 6; i++) mats.push(i === 2 ? roof : wm);
        const b = add(new THREE.Mesh(box(d, h, w), mats));
        b.position.set(side * (EDGE + d / 2 + 0.2), h / 2, z - w / 2);
        b.castShadow = b.receiveShadow = true;
        const rim = add(new THREE.Mesh(box(d + 0.3, 0.35, w + 0.3), new THREE.MeshLambertMaterial({ color: '#efe9dc' })));
        rim.position.set(b.position.x, h, b.position.z);
        for (let i = 0; i < 2; i++) {
          const acu = add(new THREE.Mesh(box(1, 0.7, 1.2), new THREE.MeshLambertMaterial({ color: '#e8e8e6' })));
          acu.position.set(b.position.x + rand(-2.5, 2.5), h + 0.5, b.position.z + rand(-w / 3, w / 3));
          acu.castShadow = true;
        }
        z -= w + 0.4;
      }
    }
  }
  // 路燈、垃圾桶
  const poleMat = new THREE.MeshLambertMaterial({ color: '#4c7a3d' });
  const lampMat = new THREE.MeshLambertMaterial({ color: '#fff3c4', emissive: '#8a7a3a' });
  const binMat = new THREE.MeshLambertMaterial({ color: '#3a3d40' });
  for (let z = zStart - 4; z > zEnd; z -= 14) {
    if (inCross(z, 2)) continue;
    for (const side of [-1, 1]) {
      const pole = add(new THREE.Mesh(cyl(0.09, 0.14, 3.2, 8), poleMat));
      pole.position.set(side * (ROAD + 1.1), 1.6, z); pole.castShadow = true;
      const lamp = add(new THREE.Mesh(box(0.42, 0.55, 0.42), lampMat));
      lamp.position.set(side * (ROAD + 1.1), 3.35, z);
      const cap = add(new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.3, 4), poleMat));
      cap.position.set(side * (ROAD + 1.1), 3.75, z); cap.rotation.y = Math.PI / 4;
      if (Math.random() < 0.5) {
        const bin = add(new THREE.Mesh(cyl(0.32, 0.27, 0.8, 10), binMat));
        bin.position.set(side * (ROAD + 2.3), 0.4, z - 3); bin.castShadow = true;
      }
    }
  }
  // 終點線
  const finish = canvasTex(256, 32, (g, w, h) => {
    for (let x = 0; x < 16; x++) for (let y = 0; y < 2; y++) { g.fillStyle = (x + y) % 2 ? '#111' : '#fff'; g.fillRect(x * 16, y * 16, 16, 16); }
  });
  flat(ROAD * 2, 1.5, new THREE.MeshLambertMaterial({ map: finish }), 0, 0.03, -len);
}

// ---------- 門 ----------
// 門的算式在 calc.js：顏色只看開頭符號，實際加減看算出來的數字（藍門會倒扣、紅門會反加）
const OPS_CH = '+−×÷';
// 長算式拆兩行：找最靠近中間的運算符號斷開（不拆開括號裡面）
function splitLabel(label) {
  let best = -1, depth = 0;
  for (let i = 2; i < label.length; i++) {
    const c = label[i];
    if (c === '(') depth++; else if (c === ')') depth--;
    else if (depth === 0 && OPS_CH.includes(c) && (best < 0 || Math.abs(i - label.length / 2) < Math.abs(best - label.length / 2))) best = i;
  }
  return best < 0 ? [label] : [label.slice(0, best), label.slice(best)];
}
function gatePanel(gate, w) {
  const good = gate.blue;
  // 先試一行；壓到 7 成還放不下就拆兩行，門板變高
  const probe = document.createElement('canvas').getContext('2d');
  probe.font = '900 84px "Arial Black", "PingFang TC", sans-serif';
  const lines = probe.measureText(gate.label).width * 0.7 > 512 - 44 ? splitLabel(gate.label) : [gate.label];
  const CH = lines.length > 1 ? 210 : 128;
  const tex = canvasTex(512, CH, (g, cw, ch) => {
    g.fillStyle = good ? 'rgba(60,150,255,0.72)' : 'rgba(235,60,60,0.72)';
    g.fillRect(6, 6, cw - 12, ch - 12);
    g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(6, 6, cw - 12, 30);
    g.strokeStyle = good ? 'rgba(200,235,255,0.95)' : 'rgba(255,215,215,0.95)'; g.lineWidth = 7; g.strokeRect(6, 6, cw - 12, ch - 12);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    // 算式長就先把字壓扁（最多 6 成寬），還放不下才縮小字
    const maxW = cw - 44, lh = ch / lines.length;
    lines.forEach((line, k) => {
      let size = lines.length > 1 ? 84 : 92, sx = 1;
      for (;;) {
        g.font = `900 ${size}px "Arial Black", "PingFang TC", sans-serif`;
        sx = Math.min(1, maxW / g.measureText(line).width);
        if (sx >= 0.6 || size <= 48) break;
        size -= 4;
      }
      g.save(); g.translate(cw / 2, lh * (k + 0.5) + (lines.length > 1 ? (k ? -6 : 8) : 4)); g.scale(sx, 1);
      g.lineWidth = 10; g.strokeStyle = good ? 'rgba(18,64,140,0.85)' : 'rgba(120,16,18,0.85)';
      g.strokeText(line, 0, 0); g.fillStyle = '#fff'; g.fillText(line, 0, 0);
      g.restore();
    });
  });
  tex.userData.own = true;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * CH / 512), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
  m.rotation.x = -0.55;
  m.renderOrder = 2;
  // 亮晶晶
  const n = 14, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { pos[i * 3] = rand(-w / 2, w / 2); pos[i * 3 + 1] = rand(0, 1.4); pos[i * 3 + 2] = rand(-0.4, 0.4); }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const sp = new THREE.Points(pg, new THREE.PointsMaterial({ color: good ? '#d8f0ff' : '#ffd8d8', size: 0.16, transparent: true, depthWrite: false }));
  sp.rotation.x = 0.55;
  m.add(sp);
  return m;
}
function addGate(z, x0, x1, spec, g) {
  const gate = parseGate(spec), w = x1 - x0, mesh = gatePanel(gate, w);
  mesh.position.set((x0 + x1) / 2, 1.9, z);
  world.add(mesh);
  g.panels.push({ x0, x1, ...gate, mesh });
}

// ---------- 陷阱 ----------
function addSpikes(it) {
  const z = -it.z, grp = new THREE.Group();
  const slab = new THREE.Mesh(box(it.w, 0.18, it.d), new THREE.MeshLambertMaterial({ color: '#5d6157' }));
  slab.position.y = 0.09; slab.receiveShadow = true; grp.add(slab);
  const rim = new THREE.Mesh(box(it.w - 0.3, 0.02, it.d - 0.3), new THREE.MeshLambertMaterial({ color: '#4a4e46' }));
  rim.position.y = 0.19; grp.add(rim);
  const nx = Math.max(2, Math.round(it.w / 1.5)), nz = Math.max(2, Math.round(it.d / 1.6));
  const coneMat = new THREE.MeshLambertMaterial({ color: '#6c7487' });
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.34, 2.6, 6), coneMat);
    c.position.set(-it.w / 2 + (i + 0.5) * it.w / nx, 1.48, -it.d / 2 + (j + 0.5) * it.d / nz);
    c.castShadow = true; grp.add(c);
    const base = new THREE.Mesh(cyl(0.26, 0.3, 0.12, 8), new THREE.MeshLambertMaterial({ color: '#2e302d' }));
    base.position.set(c.position.x, 0.24, c.position.z); grp.add(base);
  }
  grp.position.set(it.x, 0, z);
  world.add(grp);
  traps.push({ kind: 'spikes', x0: it.x - it.w / 2, x1: it.x + it.w / 2, z0: z - it.d / 2, z1: z + it.d / 2 });
}
function addHoles(it) {
  const z = -it.z, grp = new THREE.Group(), holes = [];
  const slab = new THREE.Mesh(box(it.w, 0.1, it.d), new THREE.MeshLambertMaterial({ color: '#6b685f' }));
  slab.position.y = 0.05; slab.receiveShadow = true; grp.add(slab);
  const holeMat = new THREE.MeshBasicMaterial({ color: '#141414' });
  const nx = Math.max(2, Math.round(it.w / 1.55)), nz = Math.max(2, Math.round(it.d / 1.55));
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const hx = -it.w / 2 + (i + 0.5) * it.w / nx, hz = -it.d / 2 + (j + 0.5) * it.d / nz;
    const h = new THREE.Mesh(cyl(0.62, 0.62, 0.02, 8), holeMat);
    h.position.set(hx, 0.11, hz); h.rotation.y = Math.PI / 8; grp.add(h);
    holes.push([it.x + hx, z + hz]);
  }
  grp.position.set(it.x, 0, z);
  world.add(grp);
  traps.push({ kind: 'holes', holes, x0: it.x - it.w / 2, x1: it.x + it.w / 2, z0: z - it.d / 2, z1: z + it.d / 2 });
}

// ---------- 殭屍群與 Boss ----------
function addHorde(x, z, n) {
  const h = { x, z, n0: n, zs: [], active: false, battleT: 0, ring: null, badge: document.createElement('div') };
  for (let i = 0; i < n; i++) {
    const [ox, oz] = slot(i);
    const zb = { x: x + ox * 0.96, z: z + oz * 0.96, hp: CONFIG.zombieHp, alive: true, ph: rand(0, 6.28), tint: rand(0.8, 1.08) };
    h.zs.push(zb);
  }
  const r = hordeRadius(n);
  h.ring = new THREE.Mesh(new THREE.RingGeometry(r, r + 0.28, 40).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: '#ff3b30', transparent: true, opacity: 0.85, depthWrite: false }));
  h.ring.position.set(x, 0.04, z);
  h.disc = new THREE.Mesh(new THREE.CircleGeometry(r, 40).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: '#ff3b30', transparent: true, opacity: 0.16, depthWrite: false }));
  h.disc.position.copy(h.ring.position);
  world.add(h.ring, h.disc);
  h.badge.className = 'badge red';
  marks.appendChild(h.badge);
  hordes.push(h);
  return h;
}
const aliveZ = (h) => h.zs.reduce((s, zb) => s + (zb.alive ? 1 : 0), 0);

function addBoss(it) {
  const mesh = new THREE.Mesh(zombieGeo('#5b3b78', '#7fa07a', S * 3.3), vcMat);
  mesh.castShadow = true;
  mesh.position.set(it.x, 0, -it.z);
  scene.add(mesh);
  boss = { x: it.x, z: -it.z, hp: it.hp, max: it.hp, mesh, active: false, hitT: 0, dead: 0, flash: 0 };
  if (it.n) addHorde(it.x, -it.z + 5, it.n);
}

// ---------- 開局 ----------
function startLevel(t, i) {
  trackIdx = t; levelIdx = i; L = TRACKS[t].levels[i];
  clearWorld();
  soldiers = []; fallers = []; hordes = []; gates = []; traps = []; boss = null; bullets = []; parts = [];
  splats = 0; splatMesh.count = 0; shotAcc = heroAcc = 0; endT = 0;
  const crossings = [];
  for (const it of L.items) {
    if (it.type === 'gate' || it.type === 'gates') {
      let g = gates.find((q) => q.z === -it.z);
      if (!g) { g = { z: -it.z, panels: [], used: false, fade: 0 }; gates.push(g); }
      if (it.type === 'gate') addGate(-it.z, it.x - it.w / 2, it.x + it.w / 2, it.f || [it.op, it.v], g);
      else { addGate(-it.z, -ROAD + 0.15, -0.1, it.left, g); addGate(-it.z, 0.1, ROAD - 0.15, it.right, g); }
    } else if (it.type === 'spikes') addSpikes(it);
    else if (it.type === 'holes') addHoles(it);
    else if (it.type === 'horde') { addHorde(it.x, -it.z, it.n); crossings.push(-it.z); }
    else if (it.type === 'boss') { addBoss(it); crossings.push(-it.z); }
  }
  buildStreet(L.length, crossings);
  Object.assign(sq, { x: 0, z: 0, tx: 0, speed: 0, heroFall: 0 });
  hero.rotation.set(0, 0, 0); hero.position.set(0, 0, 0);
  setCount(L.start, true);
  $('lvl').textContent = `${TRACKS[t].name} ${L.name}`;
  $('bossbar').style.display = 'none';
  $('hint').style.display = $('cover').classList.contains('on') ? 'none' : '';
  state = 'ready';
}

function setCount(n, instant) {
  n = clamp(Math.round(n), 0, CONFIG.maxCount);
  if (soldiers.length < n) soldiers.forEach((q, i) => { q.k = i; });
  while (soldiers.length < n) {
    const sx = instant ? null : sq.x + rand(-0.3, 0.3);
    const s = { x: sx ?? 0, z: sq.z, y: 0, ph: rand(0, 6.28), k: soldiers.length };
    if (instant) { const [ox, oz] = slot(soldiers.length); s.x = sq.x + ox; s.z = sq.z + oz; }
    soldiers.push(s);
  }
  while (soldiers.length > n) killSoldier(soldiers.length - 1);
}
function killSoldier(i, fall) {
  const s = soldiers[i];
  soldiers.splice(i, 1);
  regroupAt = time + 0.6;   // 晚一點才補位，不然後面的人會一直補進坑裡
  if (fall) { s.vy = 0; s.t = 0; fallers.push(s); }
  else burst(s.x, 0.9, s.z, '#2f7ae5', 4, '#efe6d1');
}
function killZombie(h, zb) {
  if (!zb.alive) return;
  zb.alive = false;
  burst(zb.x, 0.8, zb.z, '#7d9a77', 4, '#8a2a22');
  splat(zb.x, zb.z);
  if (Math.random() < 0.3) sfx.splat();
}

// ---------- 粒子、血跡 ----------
function burst(x, y, z, c1, n, c2) {
  for (let k = 0; k < n; k++) {
    if (parts.length >= 420) parts.shift();
    parts.push({ x, y, z, vx: rand(-4, 4), vy: rand(3, 7), vz: rand(-4, 4), life: rand(0.4, 0.7), c: k % 2 && c2 ? c2 : c1, s: rand(0.6, 1.2) });
  }
}
function splat(x, z) {
  const i = splats++ % 160;
  dummy.position.set(x + rand(-0.2, 0.2), 0.03, z); dummy.rotation.set(0, rand(0, 6.28), 0); dummy.scale.setScalar(rand(0.7, 1.4));
  dummy.updateMatrix(); splatMesh.setMatrixAt(i, dummy.matrix);
  splatMesh.count = Math.min(160, splats); splatMesh.instanceMatrix.needsUpdate = true;
}

// ---------- 畫面上的字 ----------
const v3 = new THREE.Vector3();
function toScreen(x, y, z) {
  v3.set(x, y, z).project(camera);
  return [(v3.x + 1) / 2 * wrap.clientWidth, (1 - v3.y) / 2 * wrap.clientHeight, v3.z < 1];
}
function pop(text, neg) {
  const [px, py] = toScreen(sq.x, 3.6, sq.z);
  const d = document.createElement('div');
  d.className = 'pop' + (neg ? ' neg' : ''); d.textContent = text;
  d.style.left = px + 'px'; d.style.top = py - 40 + 'px';
  marks.appendChild(d);
  setTimeout(() => d.remove(), 950);
}
function bumpBadge() { squadBadge.classList.remove('bump'); void squadBadge.offsetWidth; squadBadge.classList.add('bump'); }

// ---------- 操作 ----------
let drag = null;
wrap.addEventListener('pointerdown', (e) => {
  if (e.target.closest('.btn-sq, .screen')) return;
  audio();
  if (state === 'ready') { state = 'run'; $('hint').style.display = 'none'; }
  drag = { x: e.clientX, tx: sq.tx, id: e.pointerId };
});
addEventListener('pointermove', (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  sq.tx = clamp(drag.tx + (e.clientX - drag.x) / wrap.clientWidth * 15, -ROAD + 0.8, ROAD - 0.8);
});
addEventListener('pointerup', () => { drag = null; });
addEventListener('pointercancel', () => { drag = null; });
const keys = {};
addEventListener('keydown', (e) => {
  keys[e.key] = true;
  if (state === 'ready' && /Arrow|^[ad]$/i.test(e.key)) { audio(); state = 'run'; $('hint').style.display = 'none'; }
});
addEventListener('keyup', (e) => { keys[e.key] = false; });

// ---------- 遊戲迴圈 ----------
function nearestTarget() {
  // 射程從隊伍最前排算，人很多時才打得到停在隊伍外圍的 Boss
  const front = squadRadius(soldiers.length) * 0.8;
  let best = null, bd = CONFIG.range + front;
  for (const h of hordes) {
    if (!h.zs.some((zb) => zb.alive)) continue;
    const d = sq.z - h.z;
    if (d > -3 && d < bd) { bd = d; best = h; }
  }
  if (boss && boss.hp > 0) { const d = sq.z - boss.z; if (d > -3 && d < bd) best = boss; }
  return best;
}
function fire(from, tgt) {
  let tz = null;
  if (tgt === boss) tz = { x: boss.x + rand(-0.8, 0.8), y: rand(2.2, 3.4), z: boss.z };
  else {
    const al = tgt.zs.filter((zb) => zb.alive);
    if (!al.length) return;
    const zb = al[Math.random() * Math.min(al.length, 12) | 0];
    tz = { x: zb.x, y: 0.9, z: zb.z, zb };
  }
  const b = { x: from.x, y: 1.0, z: from.z - 0.4, tgt, zb: tz.zb, tx: tz.x, ty: tz.y, tz: tz.z };
  if (bullets.length >= 160) { hit(b); return; }
  bullets.push(b);
  sfx.shot();
}
function hit(b) {
  if (b.tgt === boss) {
    if (boss.hp > 0) { boss.hp -= CONFIG.bossBulletDamage; boss.flash = 0.08; if (Math.random() < 0.3) burst(b.tx, b.ty, b.tz, '#a0c495', 1); }
    return;
  }
  let zb = b.zb;
  if (!zb || !zb.alive) zb = b.tgt.zs.find((q) => q.alive);
  if (!zb) return;
  zb.hp -= CONFIG.bulletDamage;
  if (zb.hp <= 0) killZombie(b.tgt, zb);
}

function update(dt) {
  time += dt;
  const running = state === 'run';
  const n = soldiers.length;
  const rs = squadRadius(n);

  // 前進與左右
  if (keys.ArrowLeft || keys.a || keys.A) sq.tx = clamp(sq.tx - 13 * dt, -ROAD + 0.8, ROAD - 0.8);
  if (keys.ArrowRight || keys.d || keys.D) sq.tx = clamp(sq.tx + 13 * dt, -ROAD + 0.8, ROAD - 0.8);
  let want = 0;
  // 壓在陷阱上時不減速、也不補位，免得整隊卡在尖刺上被絞光
  const overTrap = traps.some((t) => sq.z - rs < t.z1 && sq.z + rs > t.z0 && sq.x + rs > t.x0 && sq.x - rs < t.x1);
  if (overTrap && regroupAt) regroupAt = Math.max(regroupAt, time + 0.3);
  if (running) {
    want = CONFIG.runSpeed;
    if (!overTrap) for (const h of hordes) if (h.zs.some((zb) => zb.alive) && sq.z - h.z < hordeRadius(aliveZ(h)) + rs + 2.5 && sq.z - h.z > -4) want = CONFIG.runSpeed * 0.18;
    if (boss && boss.hp > 0 && sq.z - boss.z < rs + 4) want = 0;
  } else if (state === 'win') want = CONFIG.runSpeed * 0.5;
  sq.speed += (want - sq.speed) * Math.min(1, dt * 5);
  sq.z -= sq.speed * dt;
  sq.x += (sq.tx - sq.x) * Math.min(1, dt * 9);

  // 過門
  for (const g of gates) {
    if (!g.used && running && sq.z <= g.z) {
      g.used = true;
      const p = g.panels.find((q) => sq.x >= q.x0 - 0.3 && sq.x <= q.x1 + 0.3);
      if (p) {
        const c = soldiers.length, next = Math.min(CONFIG.maxCount, p.apply(c)), d = next - c;
        setCount(next);
        pop(d >= 0 ? `+${d}` : `−${-d}`, d < 0);   // 跳出實際加減多少，被騙了一看就知道
        sfx.gate(d >= 0); bumpBadge();
        p.hit = true;
      }
    }
    if (g.used) {
      g.fade += dt;
      for (const p of g.panels) {
        const k = Math.max(0, 1 - g.fade * (p.hit ? 3 : 1.5));
        p.mesh.material.opacity = k;
        if (p.hit) p.mesh.scale.setScalar(1 + g.fade * 1.5);
        p.mesh.visible = k > 0;
      }
    } else for (const p of g.panels) p.mesh.children[0].material.opacity = 0.5 + 0.5 * Math.sin(time * 6 + p.x0);
  }

  // 隊形：每個小兵往自己的格子跑；有人倒下後停一下才重新排
  if (regroupAt && time > regroupAt) { regroupAt = 0; soldiers.forEach((q, i) => { q.k = i; }); }
  for (let i = 0; i < soldiers.length; i++) {
    const s = soldiers[i], [ox, oz] = slot(s.k);
    const k = Math.min(1, dt * 7);
    s.x += (sq.x + ox - s.x) * k;
    s.z += (sq.z + oz - s.z) * k;
    s.x = clamp(s.x, -ROAD - 1.4, ROAD + 1.4);
  }

  // 陷阱：每個小兵自己判定，邊邊的會被削掉
  if (running) {
    for (const t of traps) {
      if (sq.z - t.z1 > 12 || t.z0 - sq.z > 8) continue;
      for (let i = soldiers.length - 1; i >= 0; i--) {
        const s = soldiers[i];
        if (s.x < t.x0 || s.x > t.x1 || s.z < t.z0 || s.z > t.z1) continue;
        if (t.kind === 'spikes') { killSoldier(i); stats.trap++; }
        else if (t.holes.some(([hx, hz]) => (s.x - hx) ** 2 + (s.z - hz) ** 2 < 0.55)) { killSoldier(i, true); stats.trap++; }
      }
    }
  }

  // 殭屍群
  for (const h of hordes) {
    const al = aliveZ(h);
    if (!al) { h.badge.classList.add('hide'); h.ring.visible = h.disc.visible = false; continue; }
    const rh = hordeRadius(al);
    if (!h.active && running && sq.z - h.z < 15) h.active = true;
    if (h.active && running) {
      const dx = sq.x - h.x, dz = sq.z - h.z, d = Math.hypot(dx, dz) || 1;
      const sp = 2.6;
      if (d > rh + rs - 1) { h.x += dx / d * sp * dt; h.z += dz / d * sp * dt; }
      if (d < rh + rs + 0.2 && soldiers.length) {
        h.battleT += dt * CONFIG.battleRate;
        while (h.battleT >= 1 && soldiers.length) {
          h.battleT -= 1;
          let bi = 0, bd = 1e9;
          for (let i = 0; i < soldiers.length; i++) { const s = soldiers[i], q = (s.x - h.x) ** 2 + (s.z - h.z) ** 2; if (q < bd) { bd = q; bi = i; } }
          killSoldier(bi); stats.horde++;
          let bz = null; bd = 1e9;
          for (const zb of h.zs) if (zb.alive) { const q = (zb.x - sq.x) ** 2 + (zb.z - sq.z) ** 2; if (q < bd) { bd = q; bz = zb; } }
          if (bz) killZombie(h, bz);
          if (!h.zs.some((zb) => zb.alive)) break;
        }
      }
    }
    // 活著的殭屍往格子靠攏（死掉的空位會補上）
    let j = 0;
    for (const zb of h.zs) {
      if (!zb.alive) continue;
      const [ox, oz] = slot(j++);
      const k = Math.min(1, dt * 3);
      zb.x += (h.x + ox * 0.96 - zb.x) * k;
      zb.z += (h.z + oz * 0.96 - zb.z) * k;
    }
    h.ring.position.set(h.x, 0.04, h.z); h.disc.position.copy(h.ring.position);
    const sc = rh / hordeRadius(h.n0);
    h.ring.scale.set(sc, 1, sc); h.disc.scale.set(sc, 1, sc);
    h.badge.textContent = al;
    const [px, py, vis] = toScreen(h.x, 3.2, h.z);
    h.badge.style.left = px + 'px'; h.badge.style.top = py + 'px';
    h.badge.classList.toggle('hide', !vis || py < 40);
  }

  // Boss
  if (boss) {
    const bb = $('bossbar');
    if (boss.hp > 0) {
      if (!boss.active && running && sq.z - boss.z < 22) { boss.active = true; bb.style.display = 'block'; sfx.boss(); }
      if (boss.active && running) {
        const dx = sq.x - boss.x, dz = sq.z - boss.z, d = Math.hypot(dx, dz) || 1;
        if (d > rs + 1.6) { boss.x += dx / d * CONFIG.bossSpeed * dt; boss.z += dz / d * CONFIG.bossSpeed * dt; }
        boss.mesh.rotation.y = Math.atan2(dx, dz);
        if (d < rs + 2.2 && soldiers.length) {
          boss.hitT += dt * CONFIG.bossHitRate;
          while (boss.hitT >= 1 && soldiers.length) {
            boss.hitT -= 1;
            let bi = 0, bd = 1e9;
            for (let i = 0; i < soldiers.length; i++) { const s = soldiers[i], q = (s.x - boss.x) ** 2 + (s.z - boss.z) ** 2; if (q < bd) { bd = q; bi = i; } }
            killSoldier(bi); stats.boss++;
            boss.hp -= CONFIG.bossContactDamage;
          }
        }
      }
      const stomp = boss.active ? Math.abs(Math.sin(time * 3)) * 0.25 : 0;
      boss.mesh.position.set(boss.x, stomp, boss.z);
      boss.mesh.rotation.z = Math.sin(time * 3) * 0.06;
      if (boss.hp <= 0) { boss.hp = 0; burst(boss.x, 3, boss.z, '#5b3b78', 40, '#7fa07a'); splat(boss.x, boss.z); splat(boss.x + 1, boss.z + 0.5); sfx.boss(); }
      bb.querySelector('.fill').style.width = (boss.hp / boss.max * 100) + '%';
    } else {
      boss.dead += dt;
      boss.mesh.rotation.x = Math.min(Math.PI / 2, boss.dead * 3);
      boss.mesh.position.y = Math.max(-1, -boss.dead);
      if (boss.dead > 1.2) { bb.style.display = 'none'; boss.mesh.visible = false; }
    }
    boss.flash = Math.max(0, boss.flash - dt);
  }

  // 開槍
  if (running && soldiers.length) {
    const tgt = nearestTarget();
    if (tgt) {
      shotAcc += soldiers.length * CONFIG.fireRate * dt;
      heroAcc += CONFIG.heroFireRate * dt;
      while (heroAcc >= 1) { heroAcc -= 1; fire(sq, tgt); }
      let guard = 0;
      while (shotAcc >= 1 && guard++ < 200) { shotAcc -= 1; fire(soldiers[Math.random() * soldiers.length | 0], tgt); }
    } else { shotAcc = 0; heroAcc = 0; }
  }
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    if (b.zb && b.zb.alive) { b.tx = b.zb.x; b.tz = b.zb.z; }
    const dx = b.tx - b.x, dy = b.ty - b.y, dz = b.tz - b.z, d = Math.hypot(dx, dy, dz), step = 55 * dt;
    if (d <= step) { hit(b); bullets.splice(i, 1); continue; }
    b.x += dx / d * step; b.y += dy / d * step; b.z += dz / d * step; b.dx = dx / d; b.dz = dz / d;
  }

  // 輸贏
  if (running) {
    const enemies = hordes.some((h) => h.zs.some((zb) => zb.alive)) || (boss && boss.hp > 0);
    if (!soldiers.length) {
      state = 'lose'; endT = 0; sfx.lose();
    } else if (!enemies && sq.z <= -L.length) {
      state = 'win'; endT = 0; sfx.win();
      const id = TRACKS[trackIdx].id;
      if (levelIdx + 1 < TRACKS[trackIdx].levels.length && unlockedIn(trackIdx) < levelIdx + 2) {
        progress[id] = levelIdx + 2;
        try { localStorage.setItem('lastwar-ad-progress', JSON.stringify(progress)); } catch {}
      }
    }
  }
  if (state === 'win' || state === 'lose') {
    endT += dt;
    if (state === 'lose') sq.heroFall = Math.min(1, sq.heroFall + dt * 2.5);
    if (endT > 1.3 && !$('result').classList.contains('on')) showResult();
  }

  // 落坑的小兵
  for (let i = fallers.length - 1; i >= 0; i--) {
    const f = fallers[i];
    f.t += dt; f.vy -= 20 * dt; f.y += f.vy * dt;
    if (f.t > 0.7) fallers.splice(i, 1);
  }
  // 粒子
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.life -= dt; p.vy -= 22 * dt; p.x += p.vx * dt; p.y = Math.max(0.1, p.y + p.vy * dt); p.z += p.vz * dt;
    if (p.life <= 0) parts.splice(i, 1);
  }
}

function render() {
  // 小兵
  const runAnim = sq.speed > 0.5 || state === 'win';
  let k = 0;
  for (const s of soldiers) {
    const bob = runAnim ? Math.abs(Math.sin(time * 12 + s.ph)) * 0.18 : 0;
    const jump = state === 'win' ? Math.max(0, Math.sin(time * 7 + s.ph)) * 0.8 : 0;
    dummy.position.set(s.x, bob + jump, s.z);
    dummy.rotation.set(0, Math.sin(time * 12 + s.ph) * 0.08, runAnim ? Math.sin(time * 12 + s.ph) * 0.06 : 0);
    dummy.scale.setScalar(1);
    dummy.updateMatrix(); soldierMesh.setMatrixAt(k++, dummy.matrix);
  }
  for (const f of fallers) {
    dummy.position.set(f.x, f.y, f.z); dummy.rotation.set(f.t * 4, 0, f.t * 3); dummy.scale.setScalar(Math.max(0.2, 1 - f.t));
    dummy.updateMatrix(); soldierMesh.setMatrixAt(k++, dummy.matrix);
  }
  soldierMesh.count = k; soldierMesh.instanceMatrix.needsUpdate = true;

  // 隊長
  const hb = sq.speed > 0.5 ? Math.abs(Math.sin(time * 11)) * 0.2 : 0;
  hero.position.set(sq.x, hb, sq.z);
  hero.rotation.set(-sq.heroFall * Math.PI / 2, 0, 0);

  // 殭屍
  k = 0;
  for (const h of hordes) for (const zb of h.zs) {
    if (!zb.alive || k >= MAX_ZOMBIE) continue;
    const walk = h.active ? time * 6 : time * 1.5;
    dummy.position.set(zb.x, Math.abs(Math.sin(walk + zb.ph)) * 0.1, zb.z);
    const face = h.active ? Math.atan2(sq.x - zb.x, sq.z - zb.z) * 0.6 : Math.sin(time * 0.7 + zb.ph) * 0.4;
    dummy.rotation.set(0.1, face, Math.sin(walk + zb.ph) * 0.12);
    dummy.scale.setScalar(1);
    dummy.updateMatrix(); zombieMesh.setMatrixAt(k, dummy.matrix);
    zombieMesh.setColorAt(k, tmpC.setScalar(zb.tint));
    k++;
  }
  zombieMesh.count = k; zombieMesh.instanceMatrix.needsUpdate = true;
  if (zombieMesh.instanceColor) zombieMesh.instanceColor.needsUpdate = true;
  if (boss) boss.mesh.scale.setScalar(boss.flash > 0 ? 1.04 : 1);

  // 子彈
  k = 0;
  for (const b of bullets) {
    dummy.position.set(b.x, b.y, b.z); dummy.rotation.set(0, Math.atan2(b.dx || 0, b.dz || -1), 0); dummy.scale.setScalar(1);
    dummy.updateMatrix(); bulletMesh.setMatrixAt(k++, dummy.matrix);
  }
  bulletMesh.count = k; bulletMesh.instanceMatrix.needsUpdate = true;

  // 粒子
  k = 0;
  for (const p of parts) {
    dummy.position.set(p.x, p.y, p.z); dummy.rotation.set(p.life * 9, p.life * 7, 0); dummy.scale.setScalar(p.s * Math.min(1, p.life * 3));
    dummy.updateMatrix(); partMesh.setMatrixAt(k, dummy.matrix); partMesh.setColorAt(k, tmpC.set(p.c)); k++;
  }
  partMesh.count = k; partMesh.instanceMatrix.needsUpdate = true;
  if (partMesh.instanceColor) partMesh.instanceColor.needsUpdate = true;

  // 鏡頭：從斜上方往前看，小隊在畫面下方三分之一
  const dist = 58;
  const cx = sq.x * 0.3;
  const tz = sq.z - 10;
  camera.position.set(cx, dist * 0.84, tz + dist * 0.54);
  camera.lookAt(cx, 0, tz);
  sun.position.set(cx - 14, 30, tz + 14); sun.target.position.set(cx, 0, tz);

  // 人數牌
  const [px, py] = toScreen(sq.x, 3.6, sq.z);
  squadBadge.textContent = soldiers.length;
  squadBadge.style.left = px + 'px'; squadBadge.style.top = py + 'px';
  squadBadge.classList.toggle('hide', state === 'cover');
  $('prog').firstElementChild.style.width = clamp(-sq.z / L.length * 100, 0, 100) + '%';

  renderer.render(scene, camera);
}

// ---------- 封面與結算 ----------
function showCover() {
  state = 'cover';
  $('hint').style.display = 'none';
  $('result').classList.remove('on');
  $('cover').classList.add('on');
  const tabs = $('tracks'); tabs.innerHTML = '';
  TRACKS.forEach((tr, t) => {
    const b = document.createElement('div');
    b.className = 'tab' + (t === trackIdx ? ' cur' : '');
    b.textContent = tr.name;
    b.onclick = () => { if (t !== trackIdx) { pick(t, unlockedIn(t) - 1); } };
    tabs.appendChild(b);
  });
  $('trackNote').textContent = TRACKS[trackIdx].note;
  const box = $('levels'); box.innerHTML = '';
  const open = unlockedIn(trackIdx);
  TRACKS[trackIdx].levels.forEach((lv, i) => {
    const b = document.createElement('div');
    b.className = 'lv' + (i === levelIdx ? ' cur' : '') + (i >= open ? ' lock' : '');
    b.textContent = i + 1;
    b.onclick = () => { if (i < open && i !== levelIdx) pick(trackIdx, i); };
    box.appendChild(b);
  });
}
function pick(t, i) {
  try { localStorage.setItem('lastwar-ad-track', t); } catch {}
  startLevel(t, i); showCover();
}
function showResult() {
  const win = state === 'win', r = $('result'), tr = TRACKS[trackIdx];
  const last = levelIdx + 1 >= tr.levels.length, nextTrack = TRACKS[trackIdx + 1];
  $('resT').textContent = win ? (last ? `${tr.name}全破！` : '勝利！') : '失敗';
  $('resT').className = 'res ' + (win ? 'win' : 'lose');
  $('resD').textContent = win ? `剩下 ${soldiers.length} 名士兵` : '小隊全滅了，換條路再試一次';
  let go;
  if (!win) { $('resGo').textContent = '再試一次'; go = () => startLevel(trackIdx, levelIdx); }
  else if (!last) { $('resGo').textContent = '下一關'; go = () => startLevel(trackIdx, levelIdx + 1); }
  else if (nextTrack) { $('resGo').textContent = `挑戰${nextTrack.name}版`; go = () => startLevel(trackIdx + 1, unlockedIn(trackIdx + 1) - 1); }
  else { $('resGo').textContent = '從小學再玩'; go = () => startLevel(0, 0); }
  $('resGo').onclick = () => { r.classList.remove('on'); go(); };
  r.classList.add('on');
}
$('gTitle').textContent = CONFIG.title;
$('gSub').textContent = CONFIG.subtitle;
document.title = CONFIG.title;
$('play').onclick = () => { audio(); $('cover').classList.remove('on'); startLevel(trackIdx, levelIdx); };
$('resHome').onclick = () => { startLevel(trackIdx, levelIdx); showCover(); };
$('back').onclick = () => { startLevel(trackIdx, levelIdx); showCover(); };
function drawMute() {
  $('muteIcon').setAttribute('d', muted
    ? 'M3 9v6h4l5 5V4L7 9H3zm13.6 3 2.7-2.7-1.4-1.4-2.7 2.7-2.7-2.7-1.4 1.4 2.7 2.7-2.7 2.7 1.4 1.4 2.7-2.7 2.7 2.7 1.4-1.4z'
    : 'M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4z');
}
$('mute').onclick = () => { muted = !muted; try { localStorage.setItem('lastwar-ad-mute', muted ? '1' : '0'); } catch {} drawMute(); audio(); };
drawMute();

startLevel(trackIdx, unlockedIn(trackIdx) - 1);
showCover();

// 測試用：網址加 ?fast=4 會快轉
const FAST = clamp(+new URLSearchParams(location.search).get('fast') || 1, 1, 8);
let last = performance.now();
renderer.setAnimationLoop(() => {
  const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  for (let i = 0; i < FAST; i++) update(dt);
  render();
});
window.__game = { sq, get soldiers() { return soldiers; }, get state() { return state; }, get hordes() { return hordes; }, get boss() { return boss; }, get gates() { return gates; }, get traps() { return traps; }, stats, step: (n, dt = 1 / 30) => { for (let i = 0; i < n; i++) update(dt); }, startLevel };
