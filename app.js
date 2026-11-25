import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { buildAnatomy, loadHead } from './anatomy.js';
import { CATS, ITEMS, COLORS } from './data.js';
import { notes, setNote, flushNotes, onNotes, setEditing } from './notes.js';

const $ = s => document.querySelector(s);
const v3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const wide = matchMedia('(min-width: 900px)');
const CAT = Object.fromEntries(CATS.map(c => [c.id, c]));

// Curvas de easing (Emil Kowalski): forte ease-in-out para movimento na tela, ease-out para entradas.
function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = t => ((ax * t + bx) * t + cx) * t, sy = t => ((ay * t + by) * t + cy) * t, dx = t => (3 * ax * t + 2 * bx) * t + cx;
  return x => {
    let t = x;
    for (let i = 0; i < 8; i++) { const e = sx(t) - x, d = dx(t); if (Math.abs(e) < 1e-5 || Math.abs(d) < 1e-6) break; t -= e / d; }
    return sy(clamp(t, 0, 1));
  };
}
const easeInOut = bezier(0.77, 0, 0.175, 1);
const easeOut = 'cubic-bezier(0.23, 1, 0.32, 1)';

const viewer = $('#viewer'), canvas = $('#c'), loading = $('#loading');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
} catch {
  loading.textContent = 'Este navegador não conseguiu abrir o modelo 3D. Tente atualizar o navegador do celular.';
  throw new Error('WebGL indisponível');
}
const coarse = matchMedia('(pointer: coarse)').matches;
let pixelRatio = Math.min(devicePixelRatio || 1, 2.5);
renderer.setPixelRatio(pixelRatio);
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 40);
scene.add(camera);
const controls = new OrbitControls(camera, canvas);
Object.assign(controls, { enableDamping: true, dampingFactor: 0.08, minDistance: 0.8, maxDistance: 5.5, enablePan: false, rotateSpeed: 0.8 });
// Luz de estúdio: ambiente refletido (PBR), luz principal com sombras suaves e uma luz de recorte.
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.55;
scene.add(new THREE.HemisphereLight(0xfff6ee, 0x6b5a50, 0.5));
const keyLight = new THREE.DirectionalLight(0xfff4e8, 2.6);
keyLight.position.set(1.4, 2.2, 1.6);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
Object.assign(keyLight.shadow.camera, { left: -1.6, right: 1.6, top: 1.6, bottom: -1.6, near: 0.5, far: 8 });
keyLight.shadow.bias = -0.0012;
keyLight.shadow.normalBias = 0.03;
keyLight.shadow.radius = 4;
camera.add(keyLight);
keyLight.target.position.set(0, 0, -4);
camera.add(keyLight.target);
const rim = new THREE.DirectionalLight(0xdfe9ff, 0.9);
rim.position.set(-2.5, 1.2, -2.5);
scene.add(rim);

// ---------- Modelo ----------
let head;
try { head = await loadHead('assets/head.json'); } catch {
  loading.textContent = 'Não foi possível carregar o modelo do crânio. Verifique a conexão e recarregue a página.';
  throw new Error('modelo indisponível');
}
const A = buildAnatomy(head);
const PIVOT = A.pivot;
const root = new THREE.Group(); scene.add(root);
const jaw = new THREE.Group(); jaw.position.copy(PIVOT); root.add(jaw);
const jawIn = new THREE.Group(); jawIn.position.copy(PIVOT).negate(); jaw.add(jawIn);
const discGroup = new THREE.Group(); root.add(discGroup);
const PARENT = { skull: root, jaw: jawIn, disc: discGroup };

const mat = (color, o = {}, physical = false) => new (physical ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial)({ color, roughness: 0.75, metalness: 0, ...o });
const skel = [];
const skelMat = (color, o) => { const m = mat(color, o); m.userData = { kind: 'skel', base: new THREE.Color(color), op: 1, em: 0 }; m.userData.col = m.userData.base; skel.push(m); return m; };
const boneMat = skelMat(COLORS.bone, { roughness: 0.62, side: THREE.DoubleSide });
const teethMat = skelMat(COLORS.teeth, { roughness: 0.22, side: THREE.DoubleSide });
const boneMeshes = [];
const addMesh = (g, m, parent) => { const me = new THREE.Mesh(g, m); me.castShadow = me.receiveShadow = true; parent.add(me); return me; };
renderer.localClippingEnabled = false;
const B = A.bones;
for (const g of B.cranium) boneMeshes.push(addMesh(g, boneMat, root));
for (const g of B.jaw) boneMeshes.push(addMesh(g, boneMat, jawIn));
for (const g of B.teethU) boneMeshes.push(addMesh(g, teethMat, root));
for (const g of B.teethL) boneMeshes.push(addMesh(g, teethMat, jawIn));

// Pele (regiões de superfície do Z-Anatomy), opcional.
let skinOn = false;
const skinMat = mat(COLORS.skin, { roughness: 0.55, sheen: 0.5, sheenColor: new THREE.Color('#ffd9c7'), sheenRoughness: 0.6, opacity: 0, transparent: true, depthWrite: false }, true);
skinMat.userData = { kind: 'skin', base: new THREE.Color(COLORS.skin), op: 0, em: 0, sheen0: 0.5 };
skinMat.userData.col = skinMat.userData.base;
skel.push(skinMat);
loadHead('assets/skin.json').then(g => {
  const me = addMesh(g['skin|0'], skinMat, root);
  me.castShadow = false;
  me.renderOrder = 3;
  $('#skin').hidden = false;
}).catch(() => {});

const keyCat = {}, keyItem = {};
for (const it of ITEMS) for (const k of it.keys) {
  keyCat[k] ??= it.cat;
  if (!keyItem[k] || keyItem[k].keys.length > it.keys.length) keyItem[k] = it;
}
const BONE_KEYS = new Set(['condilo', 'fossa', 'eminencia']);
function colorFor(key) {
  if (BONE_KEYS.has(key)) return COLORS.bone;
  if (COLORS[key]) return COLORS[key];
  const c = keyCat[key];
  return c === 'trig' ? COLORS.nerve : c === 'mast' ? COLORS.mast : COLORS.face;
}
const mats = {}, meshesByKey = {}, pickables = [];
for (const p of A.parts) {
  if (!mats[p.key]) {
    const bone = BONE_KEYS.has(p.key), nerve = keyCat[p.key] === 'trig' || p.key === 'facial';
    const color = colorFor(p.key);
    const muscle = !bone && !nerve && !COLORS[p.key];
    // Músculo: tecido úmido (sheen + verniz leve). Nervo: cordão brilhante. Osso: fosco.
    const m = mat(color, {
      roughness: bone ? 0.62 : nerve ? 0.38 : 0.48, opacity: bone ? 1 : 0, emissive: color, emissiveIntensity: 0,
      side: p.key === 'fossa' || p.key === 'capsula' ? THREE.DoubleSide : THREE.FrontSide,
      ...(muscle ? { sheen: 0.6, sheenColor: new THREE.Color('#ffb3a6'), sheenRoughness: 0.45, clearcoat: 0.18, clearcoatRoughness: 0.45 } : {}),
      ...(nerve ? { clearcoat: 0.3, clearcoatRoughness: 0.3 } : {}),
      ...(!bone ? { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -6 } : {}),
      ...(bone ? { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 } : {}),
    }, muscle || nerve);
    m.userData = { kind: bone ? 'bone' : 'soft', base: new THREE.Color(color), op: m.opacity, em: 0, sheen0: m.sheen || 0, cc0: m.clearcoat || 0 };
    m.userData.col = m.userData.base;
    mats[p.key] = m;
    meshesByKey[p.key] = [];
  }
  // Afasta músculos e nervos do osso uma fração de milímetro, para o osso não "furar" a superfície.
  const lift = BONE_KEYS.has(p.key) ? 0 : p.key === 'temporal' ? 0.012 : keyCat[p.key] === 'trig' || p.key === 'facial' ? 0.003 : 0.007;
  if (lift) {
    const pos = p.geo.attributes.position, nor = p.geo.attributes.normal;
    for (let i = 0; i < pos.count; i++) pos.setXYZ(i, pos.getX(i) + nor.getX(i) * lift, pos.getY(i) + nor.getY(i) * lift, pos.getZ(i) + nor.getZ(i) * lift);
    pos.needsUpdate = true;
  }
  const me = addMesh(p.geo, mats[p.key], PARENT[p.where]);
  me.renderOrder = BONE_KEYS.has(p.key) ? 0 : 2;
  // Músculos e nervos não projetam sombra: lâminas finas sombreando a si mesmas causavam riscos escuros.
  if (!BONE_KEYS.has(p.key)) me.castShadow = me.receiveShadow = false;
  me.userData = { key: p.key, side: p.side };
  meshesByKey[p.key].push(me);
  pickables.push(me);
}
root.updateMatrixWorld(true);

// Ponto onde a linha de chamada encosta: vértice voltado para a câmera, mais perto do centro da estrutura.
const anchors = {};
for (const it of ITEMS) {
  const ms = meshesByKey[it.keys[0]];
  const m = ms.find(x => x.userData.side >= 0) || ms[0];
  const g = m.geometry, pos = g.attributes.position, nor = g.attributes.normal;
  g.computeBoundingBox();
  const c = g.boundingBox.getCenter(v3());
  const d = v3(...(it.view?.dir || CAT[it.cat].view.dir)).normalize();
  const p = v3(), n = v3();
  let best = null, bd = Infinity;
  for (let i = 0; i < pos.count; i++) {
    n.fromBufferAttribute(nor, i);
    if (n.dot(d) < 0.3) continue;
    p.fromBufferAttribute(pos, i);
    const dd = p.distanceToSquared(c);
    if (dd < bd) { bd = dd; best = p.clone(); }
  }
  anchors[it.id] = { local: best || c, mesh: m, mirror: ms.find(x => x.userData.side === -1), size: g.boundingBox.getSize(v3()).length() };
}
function viewFor(it) {
  const c = CAT[it.cat].view, v = it.view || {}, a = anchors[it.id];
  return { dir: v.dir || c.dir, dist: v.dist || clamp(a.size * 3.4, 2.4, 4), target: [a.local.x, a.local.y, a.local.z] };
}

// ---------- Estado ----------
const state = { cat: 'face', sel: null };
const XRAY = 0.3;
const cutState = { on: false };
const inCat = k => state.cat === 'all' || keyCat[k] === state.cat;
const currentItems = () => state.cat === 'all' ? CATS.filter(c => c.id !== 'all').flatMap(c => ITEMS.filter(i => i.cat === c.id)) : ITEMS.filter(i => i.cat === state.cat);
let accent = new THREE.Color(CAT.face.accent);

function applyTargets() {
  const c = CAT[state.cat], sel = state.sel;
  if (demo) {
    for (const m of skel) m.userData.op = demo.bone;
    skinMat.userData.op = skinOn ? 0.18 : 0;
    for (const k in mats) {
      const u = mats[k].userData, on = demo.active.has(k);
      if (u.kind === 'bone') { u.op = on ? 1 : demo.bone; u.col = on ? accent : u.base; u.em = on ? 0.12 : 0; }
      else { u.op = !inCat(k) ? 0 : on ? 1 : 0.22; u.em = on ? 0.3 : 0; }
    }
    return;
  }
  const boneOp = sel ? (cutState.on ? 1 : sel.xray ?? XRAY) : c.bone;
  for (const m of skel) m.userData.op = boneOp;
  skinMat.userData.op = skinOn ? (sel ? 0.18 : 1) : 0;
  for (const k in mats) {
    const u = mats[k].userData, on = !!sel?.keys.includes(k);
    if (u.kind === 'bone') {
      u.op = on ? 1 : boneOp; u.col = on ? accent : u.base; u.em = on ? 0.12 : 0;
    } else {
      u.op = !inCat(k) || (jawAnim && (k === 'capsula' || k === 'ligamento')) ? 0 : sel && !on ? 0.06 : 1;
      u.em = on ? 0.32 : 0;
    }
  }
}
function stepMaterials(dt) {
  const f = 1 - Math.exp(-dt / (reduce ? 0.05 : 0.09));
  const all = [...skel, ...Object.values(mats)];
  for (const m of all) {
    const u = m.userData;
    m.opacity += (u.op - m.opacity) * f;
    m.color.lerp(u.col, f);
    m.emissiveIntensity += (u.em - m.emissiveIntensity) * f;
    m.visible = m.opacity > 0.01;
    // Brilho (sheen e verniz) não respeita a transparência: acompanha a opacidade, com um mínimo para não recompilar o shader.
    if (u.sheen0) m.sheen = Math.max(0.001, u.sheen0 * m.opacity * m.opacity);
    if (u.cc0) m.clearcoat = Math.max(0.001, u.cc0 * m.opacity * m.opacity);
    m.depthWrite = m.opacity > 0.97;
    // Com o osso translúcido (modo raio X), nervos e músculos são desenhados depois dele e aparecem por inteiro.
    const tr = u.kind === 'skin' || m.opacity < 0.995 || (u.kind === 'soft' && boneMat.opacity < 0.9);
    // O shader opaco força alfa = 1; trocar para transparente exige recompilar.
    if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; }
    // Osso opaco: dois lados (algumas malhas têm faces invertidas). Translúcido: só a face externa, para não embaralhar.
    if (m === boneMat || m === teethMat) {
      const side = m.opacity < 0.9 ? THREE.FrontSide : THREE.DoubleSide;
      if (m.side !== side) { m.side = side; m.needsUpdate = true; }
    }
  }
}

// ---------- Câmera ----------
let fly = null;
const fit = d => d * Math.max(1, Math.pow(0.95 / camera.aspect, 0.75));
function flyTo(v) {
  const dir = v3(...v.dir).normalize(), tgt = v3(...v.target);
  if (!v.abs && camera.position.x < -0.02) { dir.x *= -1; tgt.x *= -1; }
  const s0 = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
  const s1 = new THREE.Spherical().setFromVector3(dir.multiplyScalar(fit(v.dist)));
  const dth = Math.atan2(Math.sin(s1.theta - s0.theta), Math.cos(s1.theta - s0.theta));
  fly = { t0: performance.now(), dur: reduce ? 1 : 900, s0, s1, dth, from: controls.target.clone(), to: tgt };
}
function stepFly(now) {
  if (!fly) return;
  const k = clamp((now - fly.t0) / fly.dur, 0, 1), e = easeInOut(k);
  controls.target.lerpVectors(fly.from, fly.to, e);
  camera.position.setFromSphericalCoords(lerp(fly.s0.radius, fly.s1.radius, e), lerp(fly.s0.phi, fly.s1.phi, e), fly.s0.theta + fly.dth * e).add(controls.target);
  if (k >= 1) fly = null;
}
{
  const v = CAT.face.view, d = v3(...v.dir).normalize().multiplyScalar(v.dist);
  controls.target.set(...v.target);
  camera.position.copy(controls.target).add(d);
}
const hint = $('#hint');
controls.addEventListener('start', () => { fly = null; hint.classList.add('off'); });

// ---------- Linha de chamada ----------
const lines = $('#lines'), lead = $('#lead'), dot = $('#dot'), halo = $('#halo'), tag = $('#tag');
let tagW = 0, tagH = 0, side = 1;
lines.classList.add('off');
function showCallout(it) {
  tag.textContent = it.name;
  tagW = tag.offsetWidth; tagH = tag.offsetHeight;
  tag.classList.remove('on');
  void tag.offsetWidth;
  tag.classList.add('on');
  lines.classList.remove('off');
  if (!reduce) {
    lead.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 320, delay: 380, easing: easeOut, fill: 'backwards' });
    halo.animate([{ opacity: 0, transform: 'scale(0.6)' }, { opacity: 0.55, transform: 'scale(1)' }], { duration: 260, delay: 600, easing: easeOut, fill: 'backwards' });
  }
}
function hideCallout() { tag.classList.remove('on'); lines.classList.add('off'); }
const tmp = v3(), tmp2 = v3();
function stepCallout() {
  const it = state.sel;
  if (!it) return;
  const a = anchors[it.id];
  a.mesh.updateWorldMatrix(true, false);
  tmp.copy(a.local).applyMatrix4(a.mesh.matrixWorld);
  if (a.mirror) {
    a.mirror.updateWorldMatrix(true, false);
    tmp2.set(-a.local.x, a.local.y, a.local.z).applyMatrix4(a.mirror.matrixWorld);
    if (tmp2.distanceToSquared(camera.position) < tmp.distanceToSquared(camera.position)) tmp.copy(tmp2);
  }
  tmp.project(camera);
  const w = viewer.clientWidth, h = viewer.clientHeight;
  if (tmp.z > 1) { lines.classList.add('off'); return; }
  lines.classList.remove('off');
  const usable = sheetOpen() && wide.matches ? w - 420 : w;
  const x = ((tmp.x + 1) / 2) * w, y = ((1 - tmp.y) / 2) * h;
  if (x < usable * 0.4) side = -1; else if (x > usable * 0.6) side = 1;
  let ly = y - 64;
  if (ly < tagH) ly = y + 64;
  ly = clamp(ly, tagH / 2 + 8, h - tagH / 2 - 8);
  const lx = x + side * 54;
  const left = clamp(side > 0 ? lx : lx - tagW, 10, Math.max(10, usable - tagW - 10));
  const endX = side > 0 ? left : left + tagW;
  tag.style.transform = `translate(${left}px, ${ly - tagH / 2}px)`;
  lead.setAttribute('x1', endX); lead.setAttribute('y1', ly);
  lead.setAttribute('x2', x); lead.setAttribute('y2', y);
  for (const c of [dot, halo]) { c.setAttribute('cx', x); c.setAttribute('cy', y); c.style.transformOrigin = `${x}px ${y}px`; }
}

// ---------- Abertura da boca (ATM) ----------
const caption = $('#caption');
let jawAnim = null;
const STEPS = [
  'Rotação: o côndilo gira dentro da fossa, no compartimento inferior (primeiros ~20 mm).',
  'Translação: côndilo e disco deslizam juntos sobre a eminência, no compartimento superior.',
  'Fechamento: o caminho se inverte e o côndilo volta à fossa.',
];
function setJaw(p) {
  const rot = p < 0.4 ? (p / 0.4) * 0.2 : 0.2 + ((p - 0.4) / 0.6) * 0.3;
  const tr = p < 0.4 ? 0 : (p - 0.4) / 0.6;
  jaw.rotation.x = rot;
  jaw.position.set(PIVOT.x, PIVOT.y - 0.035 * tr, PIVOT.z + 0.12 * tr);
  discGroup.position.set(0, -0.03 * tr, 0.1 * tr);
}
function stepJaw(now) {
  if (!jawAnim) return;
  const T = (now - jawAnim.t0) / 1000;
  if (T < 0) return;
  let p, step;
  if (T < 1.8) { p = easeInOut(T / 1.8); step = p < 0.4 ? 0 : 1; }
  else if (T < 2.6) { p = 1; step = 1; }
  else if (T < 4.2) { p = 1 - easeInOut((T - 2.6) / 1.6); step = 2; }
  else { p = 0; jawAnim = null; caption.classList.remove('on'); applyTargets(); }
  setJaw(p);
  if (jawAnim && caption.dataset.step !== String(step)) {
    caption.dataset.step = step;
    caption.textContent = STEPS[step];
    caption.classList.add('on');
  }
}
function playJaw() {
  deselect();
  stopMotion();
  hint.classList.add('off');
  flyTo({ dir: [1, 0.05, 0.2], dist: 3, target: [0.3, -0.22, 0.12] });
  jawAnim = { t0: performance.now() + (reduce ? 0 : 700) };
  caption.dataset.step = '';
  applyTargets();
}
function stopJaw() { jawAnim = null; setJaw(0); caption.classList.remove('on'); applyTargets(); }

// ---------- Interface ----------
const tabs = $('#tabs'), list = $('#list'), sheet = $('#sheet');
const PLAY_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10-6.5z"/></svg>';
const sheetOpen = () => sheet.hasAttribute('data-open');

function renderTabs() {
  tabs.innerHTML = CATS.map(c => `<button role="tab" data-cat="${c.id}" aria-selected="${c.id === state.cat}">${c.name}</button>`).join('');
}
const chip = i => `<button class="chip" data-id="${i.id}" style="--accent:${CAT[i.cat].accent}" aria-pressed="${state.sel?.id === i.id}"${notes[i.id]?.trim() ? ' data-note' : ''}><span class="dot"></span>${i.name}</button>`;
function renderList() {
  const groups = state.cat === 'all' ? CATS.filter(c => c.id !== 'all') : [CAT[state.cat]];
  list.innerHTML =
    demoButton() +
    groups.map(g => (state.cat === 'all' ? `<h3 class="group">${g.name}</h3>` : '') + ITEMS.filter(i => i.cat === g.id).map(chip).join('')).join('') +
    '<p class="fine">Para estudo. Modelo 3D: <a href="https://www.z-anatomy.com/">Z-Anatomy</a>, baseado no <a href="https://dbarchive.biosciencedbc.jp/en/bodyparts3d/">BodyParts3D</a> (© The Database Center for Life Science), licença CC BY-SA 4.0; simplificado e recortado para este app. O bucinador foi modelado à parte. Textos revisados com base em Rossi, <i>Anatomia craniofacial aplicada à odontologia</i> (2ª ed., Santos, 2017), e em descrições anatômicas clássicas; confira na fonte antes de usar na clínica.</p>';
}
function setCat(id, move = true) {
  stopDemo();
  if (state.cat === 'atm' && id !== 'atm') stopJaw();
  state.cat = id;
  state.sel = null;
  const c = CAT[id];
  accent = new THREE.Color(c.accent);
  document.documentElement.style.setProperty('--accent', c.accent);
  $('#catNote').textContent = c.note;
  closeSheet();
  hideCallout();
  renderTabs();
  renderList();
  list.scrollTop = 0;
  applyTargets();
  if (move) flyTo(c.view);
}
// ---------- Vista geral (gerada do próprio 3D) e prancha do Gray ----------
const ovCanvas = $('#ov'), ovDot = $('#ovdot');
const ovCam = new THREE.PerspectiveCamera(26, 480 / 300, 0.05, 40);
let ovRenderer = null, ovTimer = 0;
function anchorWorld(it) {
  const a = anchors[it.id];
  a.mesh.updateWorldMatrix(true, false);
  const p = a.local.clone().applyMatrix4(a.mesh.matrixWorld);
  if (a.mirror) {
    a.mirror.updateWorldMatrix(true, false);
    const q = v3(-a.local.x, a.local.y, a.local.z).applyMatrix4(a.mirror.matrixWorld);
    if (q.distanceToSquared(camera.position) < p.distanceToSquared(camera.position)) return q;
  }
  return p;
}
function renderOverview(it) {
  try {
    if (!ovRenderer) {
      ovRenderer = new THREE.WebGLRenderer({ canvas: ovCanvas, antialias: true, alpha: true });
      ovRenderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
      ovRenderer.setSize(480, 300, false);
      ovRenderer.toneMapping = renderer.toneMapping;
    }
  } catch { ovCanvas.parentElement.hidden = true; return; }
  const p = anchorWorld(it), lateral = it.cat !== 'face' || Math.abs(p.x) > 0.3;
  const dir = lateral ? v3(Math.sign(p.x) || 1, 0.15, 0.35) : v3(0.3, 0.1, 1);
  const c = v3(0, 0.12, -0.05);
  ovCam.position.copy(c).addScaledVector(dir.normalize(), 6.6);
  ovCam.lookAt(c);
  ovCam.updateMatrixWorld();
  ovRenderer.render(scene, ovCam);
  const q = p.project(ovCam);
  ovDot.style.left = ovCanvas.offsetLeft + ((q.x + 1) / 2) * ovCanvas.clientWidth + 'px';
  ovDot.style.top = ovCanvas.offsetTop + ((1 - q.y) / 2) * ovCanvas.clientHeight + 'px';
}
const PLATES = {
  Gray378: 'Músculos da cabeça, da face e do pescoço', Gray381: 'Músculos ao redor da boca', Gray382: 'Músculo temporal',
  Gray309: 'Articulação temporomandibular, vista lateral', Gray311: 'Corte sagital da articulação temporomandibular',
  Gray777: 'Nervos da órbita (nervo oftálmico), vista lateral', Gray778: 'Distribuição dos nervos maxilar e mandibular', Gray788: 'Esquema do nervo facial e suas comunicações',
};
const PLATE_FOR = { orbicular_boca: 'Gray381', bucinador: 'Gray381', levantador_angulo: 'Gray381', depressor: 'Gray381', facial: 'Gray788', temporal: 'Gray382', disco: 'Gray311', pterigoideo_lateral: 'Gray311', v1: 'Gray777' };
const PLATE_CAT = { face: 'Gray378', mast: 'Gray378', atm: 'Gray309', trig: 'Gray778' };
const plateImg = $('#plateImg'), lightbox = $('#lightbox');
$('#plateBtn').addEventListener('click', () => { $('#lbImg').src = plateImg.src; $('#lbImg').alt = plateImg.alt; lightbox.hidden = false; $('#lbClose').focus(); });
lightbox.addEventListener('click', () => { lightbox.hidden = true; $('#plateBtn').focus(); });
// ---------- Corte do crânio (plano de corte global, inclusive na oclusão de ambiente) ----------
const CUT_AXES = { x: { v: v3(1, 0, 0), min: -0.6, max: 0.6, def: 0 }, z: { v: v3(0, 0, 1), min: -1.2, max: 0.8, def: -0.12 }, y: { v: v3(0, 1, 0), min: -0.9, max: 1.3, def: -0.05 } };
const cut = { on: false, axis: 'x', off: 0, sign: 1, plane: new THREE.Plane() };
const cutBar = $('#cutbar'), cutRange = $('#cutRange');
function updateCut() {
  const a = CUT_AXES[cut.axis];
  // remove a metade voltada para a câmera, para ver o lado de dentro
  cut.plane.normal.copy(a.v).multiplyScalar(-cut.sign);
  cut.plane.constant = cut.sign * cut.off;
  renderer.clippingPlanes = cut.on ? [cut.plane] : [];
}
function syncCutUI() {
  const a = CUT_AXES[cut.axis];
  cutRange.value = String(Math.round(clamp((cut.off - a.min) / (a.max - a.min), 0, 1) * 100));
  for (const b of cutBar.querySelectorAll('[data-axis]')) b.setAttribute('aria-pressed', b.dataset.axis === cut.axis);
}
function setCutAxis(axis) {
  cut.axis = axis;
  const a = CUT_AXES[axis];
  if (state.sel) return focusCut(state.sel, axis);
  cut.sign = Math.sign(camera.position.dot(a.v) - controls.target.dot(a.v)) || 1;
  cut.off = a.def;
  syncCutUI();
  updateCut();
}
// Corta logo antes da estrutura, do lado da câmera, e gira a câmera para olhar a face cortada.
function focusCut(it, forced) {
  const p = anchorWorld(it);
  const axis = forced || (Math.abs(p.x) > 0.18 ? 'x' : 'z');
  const av = CUT_AXES[axis].v;
  const sign = axis === 'x' ? Math.sign(p.x) || 1 : axis === 'z' ? 1 : 1;
  // extensão da estrutura ao longo do eixo (malha do lado mais perto)
  const box = new THREE.Box3();
  const ms = (meshesByKey[it.keys[0]] || []).filter(m => axis !== 'x' || Math.sign(m.userData.side || sign) === sign || m.userData.side === 0);
  for (const m of ms.length ? ms : meshesByKey[it.keys[0]] || []) box.expandByObject(m);
  const hi = sign > 0 ? box.max.dot(av) : box.min.dot(av);
  cut.axis = axis; cut.sign = sign;
  cut.off = hi + sign * 0.012;
  syncCutUI();
  updateCut();
  const dir = axis === 'x' ? [sign, 0.12, 0.2] : axis === 'z' ? [0.2, 0.12, 1] : [0.2, 1, 0.3];
  flyTo({ dir, dist: clamp(anchors[it.id].size * 3.4, 2.4, 4), target: [p.x, p.y, p.z] });
}
$('#cut').addEventListener('click', e => {
  cut.on = cutState.on = !cut.on;
  applyTargets();
  vstate.medialCut = false;
  if (cut.on) { viewBar.hidden = true; viewBtn.setAttribute('aria-pressed', 'false'); }
  if (cut.on && state.sel) { e.currentTarget.setAttribute('aria-pressed', 'true'); cutBar.hidden = false; hint.classList.add('off'); focusCut(state.sel); return; }
  e.currentTarget.setAttribute('aria-pressed', cut.on);
  cutBar.hidden = !cut.on;
  hint.classList.add('off');
  if (cut.on) setCutAxis(cut.axis); else updateCut();
});
// ---------- Vistas anatômicas (normas do crânio, plano de Frankfurt na horizontal) ----------
const VIEWS = {
  lateral: { dir: s => [s, 0, 0], text: '<b>Norma lateral</b> (Frankfurt na horizontal): masseter, temporal, mímica e ligamento lateral da ATM.' },
  oblique: { dir: s => [s * 0.8, 0.12, 0.6], text: '<b>Anterolateral ¾</b>: mímica, masseter e temporal juntos, como nos atlas.' },
  frontal: { dir: () => [0, 0, 1], text: '<b>Norma frontal</b>: mímica, simetria e forames supraorbital, infraorbital e mentual.' },
  medial: { dir: s => [-s, 0.05, 0.12], text: '<b>Medial</b>, corte sagital visto por dentro: pterigóideos, ligamentos esfenomandibular e estilomandibular, forame mandibular.' },
};
const viewBar = $('#viewbar'), viewBtn = $('#view'), vnote = $('#vnote');
const vstate = { view: null, side: 1, medialCut: false };
function syncViewUI() {
  for (const b of viewBar.querySelectorAll('[data-norma]')) b.setAttribute('aria-pressed', b.dataset.norma === vstate.view);
  for (const b of viewBar.querySelectorAll('[data-side]')) b.setAttribute('aria-pressed', +b.dataset.side === vstate.side);
  vnote.innerHTML = vstate.view ? VIEWS[vstate.view].text : '';
}
function setCutOn(on) {
  cut.on = cutState.on = on;
  $('#cut').setAttribute('aria-pressed', on);
  applyTargets();
}
function applyView() {
  const name = vstate.view, s = vstate.side;
  if (!name) return;
  if (name === 'medial') {
    // corte sagital na linha média, mantendo a metade do lado escolhido; a câmera olha a face de dentro
    vstate.medialCut = !cut.on || vstate.medialCut;
    setCutOn(true);
    cut.axis = 'x'; cut.sign = -s; cut.off = 0;
    syncCutUI(); updateCut();
  } else if (vstate.medialCut) {
    vstate.medialCut = false;
    setCutOn(false); updateCut();
  }
  let target = [0, -0.22, 0.12], dist = 5.8; // cabeça inteira, acima da barra de vistas
  if (state.sel) {
    const p = anchorWorld(state.sel);
    const x = name === 'frontal' ? p.x : Math.abs(p.x) * s;
    target = [x, p.y, p.z];
    dist = clamp(anchors[state.sel.id].size * 3.4, 2.4, 4);
  } else if (state.cat === 'atm') { target = [0.42 * s, -0.1, -0.08]; dist = 2.2; }
  if (name === 'medial' && !state.sel) target = [0.05 * s, -0.1, 0.1];
  hint.classList.add('off');
  flyTo({ dir: VIEWS[name].dir(s), dist, target, abs: true });
}
viewBtn.addEventListener('click', () => {
  const open = viewBar.hidden;
  viewBar.hidden = !open;
  viewBtn.setAttribute('aria-pressed', open);
  if (open) {
    cutBar.hidden = true;
    vstate.side = camera.position.x - controls.target.x < 0 ? -1 : 1;
    vstate.view = vstate.view || 'lateral';
    syncViewUI();
    applyView();
  }
});
viewBar.addEventListener('click', e => {
  const v = e.target.closest('[data-norma]'), sd = e.target.closest('[data-side]');
  if (v) vstate.view = v.dataset.norma;
  else if (sd) vstate.side = +sd.dataset.side;
  else return;
  syncViewUI();
  applyView();
});
cutBar.addEventListener('click', e => { const b = e.target.closest('[data-axis]'); if (b) setCutAxis(b.dataset.axis); });
cutRange.addEventListener('input', () => {
  const a = CUT_AXES[cut.axis];
  cut.off = a.min + (a.max - a.min) * (+cutRange.value / 100);
  updateCut();
});
const isCut = p => cut.on && cut.plane.distanceToPoint(p) < 0;

// ---------- Movimento de cada músculo (contração ao longo do eixo do feixe) ----------
const mouthBox = new THREE.Box3();
for (const m of meshesByKey.orbicular_boca || []) mouthBox.expandByObject(m);
const mouthC = mouthBox.getCenter(v3());
function muscleAxis(mesh, rule) {
  const pos = mesh.geometry.attributes.position, c = v3(), p = v3();
  for (let i = 0; i < pos.count; i++) c.add(p.fromBufferAttribute(pos, i));
  c.divideScalar(pos.count);
  // eixo principal por iteração de potência sobre a covariância
  const C = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i).sub(c);
    const q = [p.x, p.y, p.z];
    for (let r = 0; r < 3; r++) for (let k = 0; k < 3; k++) C[r * 3 + k] += q[r] * q[k];
  }
  let ax = v3(0.3, 1, 0.2).normalize();
  for (let it = 0; it < 24; it++) ax = v3(C[0] * ax.x + C[1] * ax.y + C[2] * ax.z, C[3] * ax.x + C[4] * ax.y + C[5] * ax.z, C[6] * ax.x + C[7] * ax.y + C[8] * ax.z).normalize();
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < pos.count; i++) { const t = p.fromBufferAttribute(pos, i).sub(c).dot(ax); lo = Math.min(lo, t); hi = Math.max(hi, t); }
  const e0 = c.clone().addScaledVector(ax, lo), e1 = c.clone().addScaledVector(ax, hi);
  const score = e => rule === 'top' ? e.y : rule === 'bottom' ? -e.y : rule === 'medial' ? -Math.abs(e.x) : rule === 'lateral' ? Math.abs(e.x)
    : rule === 'front' ? e.z : rule === 'back' ? -e.z : e.distanceTo(mouthC);
  const [fixed, moving] = score(e0) >= score(e1) ? [e0, e1] : [e1, e0];
  return { c, ax, fixed, moving };
}
let motion = null;
const motionBtn = $('#mplay');
function scaleAlong(f, ax, s) {
  // escala s ao longo de ax, mantendo o ponto f parado
  const m = new THREE.Matrix4(), k = s - 1;
  m.set(1 + k * ax.x * ax.x, k * ax.x * ax.y, k * ax.x * ax.z, 0,
    k * ax.y * ax.x, 1 + k * ax.y * ax.y, k * ax.y * ax.z, 0,
    k * ax.z * ax.x, k * ax.z * ax.y, 1 + k * ax.z * ax.z, 0, 0, 0, 0, 1);
  return new THREE.Matrix4().makeTranslation(f.x, f.y, f.z).multiply(m).multiply(new THREE.Matrix4().makeTranslation(-f.x, -f.y, -f.z));
}
function playMotion(it) {
  stopMotion();
  if (jawAnim) stopJaw();
  const mv = it.motion, meshes = meshesByKey[it.keys[0]] || [];
  const parts = meshes.map(mesh => {
    const info = mv.fixed === 'ring' ? null : muscleAxis(mesh, mv.fixed);
    let arrow = null;
    if (info) {
      const dir = info.fixed.clone().sub(info.moving).normalize();
      arrow = new THREE.ArrowHelper(dir, info.moving.clone().addScaledVector(dir, -0.09), 0.11, 0x1b1d20, 0.04, 0.028);
      arrow.traverse(o => { if (o.material) { o.material.depthTest = false; o.material.transparent = true; } o.renderOrder = 10; });
      mesh.parent.add(arrow);
    }
    mesh.matrixAutoUpdate = false;
    return { mesh, info, arrow, center: mesh.geometry.boundingBox?.getCenter(v3()) || (mesh.geometry.computeBoundingBox(), mesh.geometry.boundingBox.getCenter(v3())) };
  });
  motion = { it, parts, t0: performance.now() };
  caption.textContent = mv.text;
  caption.classList.add('on');
  motionBtn.setAttribute('aria-pressed', 'true');
}
function stopMotion() {
  if (!motion) return;
  for (const p of motion.parts) { p.mesh.matrix.identity(); p.mesh.matrixAutoUpdate = true; p.arrow?.removeFromParent(); }
  motion = null;
  setJawPose(0, 0, 0);
  caption.classList.remove('on');
  motionBtn.setAttribute('aria-pressed', 'false');
}
function setJawPose(rot, dy, dz) {
  jaw.rotation.x = rot;
  jaw.position.set(PIVOT.x, PIVOT.y - dy, PIVOT.z + dz);
}
function stepMotion(now) {
  if (!motion) return;
  const T = (now - motion.t0) / 1000, cycle = 1.8, n = 3;
  if (T > cycle * n) { stopMotion(); return; }
  const ph = (T % cycle) / cycle, p = (1 - Math.cos(ph * Math.PI * 2)) / 2; // 0 → contraído → 0
  const mv = motion.it.motion;
  for (const part of motion.parts) {
    if (part.info) part.mesh.matrix.copy(scaleAlong(part.info.fixed, part.info.ax, 1 - (mv.amount ?? 0.16) * p));
    else part.mesh.matrix.makeTranslation(part.center.x, part.center.y, part.center.z).multiply(new THREE.Matrix4().makeScale(1 - 0.1 * p, 1 - 0.1 * p, 1 - 0.1 * p)).multiply(new THREE.Matrix4().makeTranslation(-part.center.x, -part.center.y, -part.center.z));
    part.mesh.matrixWorldNeedsUpdate = true;
    if (part.arrow) part.arrow.visible = p > 0.08;
  }
  if (mv.jaw === 'close') setJawPose(0.32 * (1 - p), 0.012 * (1 - p), 0.03 * (1 - p));
  else if (mv.jaw === 'protrude') setJawPose(0.05 * p, 0.015 * p, 0.07 * p);
}
// ---------- Demonstração: as estruturas da aba funcionando juntas ----------
const DEMOS = {
  face: [
    { ids: ['zigomatico_maior', 'zigomatico_menor', 'risorio', 'levantador_angulo'], text: 'Sorriso: zigomáticos maior e menor, risório e levantador do ângulo da boca puxam os cantos da boca para cima e para fora.' },
    { ids: ['frontal'], text: 'Surpresa: o frontal eleva os supercílios e enruga a fronte.' },
    { ids: ['corrugador', 'procero'], text: 'Franzir: o corrugador aproxima os supercílios e o prócero abaixa a pele da glabela.' },
    { ids: ['orbicular_olho'], text: 'Fechar os olhos com força: orbicular do olho.' },
    { ids: ['orbicular_boca', 'bucinador', 'mentual_m'], text: 'Bico e sopro: o orbicular da boca projeta os lábios, o bucinador comprime as bochechas e o mentual eleva o queixo.' },
    { ids: ['depressor', 'depressor_labio'], text: 'Tristeza: os depressores do ângulo da boca e do lábio inferior puxam para baixo.' },
    { ids: ['levantador_labio', 'nasal'], text: 'Desdém: o levantador do lábio superior eleva o lábio e o nasal comprime a narina.' },
  ],
  mast: [
    { ids: ['pterigoideo_lateral'], jaw: 'open', text: 'Abertura: o pterigóideo lateral puxa côndilo e disco para a frente enquanto a boca abre.' },
    { ids: ['masseter', 'temporal', 'pterigoideo_medial'], jaw: 'close', text: 'Fechamento: masseter, temporal e pterigóideo medial elevam a mandíbula.' },
    { ids: ['pterigoideo_lateral', 'pterigoideo_medial'], jaw: 'side', text: 'Lateralidade: os pterigóideos de um lado levam a mandíbula para o lado oposto, na moagem.' },
    { ids: ['masseter', 'temporal', 'pterigoideo_medial'], jaw: 'close', text: 'Novo fechamento: o ciclo mastigatório se repete.' },
  ],
  atm: [
    { ids: ['condilo', 'disco'], jaw: 'atmOpen', bone: 0.55, text: 'Abertura: primeiro o côndilo gira; depois côndilo e disco deslizam juntos sobre a eminência.' },
    { ids: ['condilo', 'disco', 'fossa'], jaw: 'atmClose', bone: 0.55, text: 'Fechamento: côndilo e disco voltam à fossa mandibular.' },
  ],
  trig: [
    { ids: ['ganglio'], bone: 0.25, text: 'Gânglio trigeminal: dele partem os nervos oftálmico (V1), maxilar (V2) e mandibular (V3).' },
    { ids: ['v1'], bone: 0.25, text: 'V1, oftálmico: fronte, pálpebra superior, córnea e dorso do nariz.' },
    { ids: ['v2'], bone: 0.25, text: 'V2, maxilar: dentes e gengiva superiores, palato, bochecha e lábio superior.' },
    { ids: ['v3'], bone: 0.25, text: 'V3, mandibular: dentes inferiores, língua, lábio inferior e os músculos da mastigação.' },
    { ids: ['alveolar_inferior', 'mentual_n'], bone: 0.25, text: 'Alveolar inferior e mentual: o alvo do bloqueio mandibular.' },
    { ids: ['lingual', 'bucal'], bone: 0.25, text: 'Lingual (língua e gengiva lingual) e bucal (bochecha e gengiva vestibular dos molares).' },
  ],
};
DEMOS.all = [...DEMOS.face, ...DEMOS.mast];
const DEMO_STEP = 3.2;
let demo = null;
function demoButton() { return `<button class="play" id="demo" aria-pressed="${!!demo}">${PLAY_ICON}${demo ? 'Parar a demonstração' : 'Demonstração'}</button>`; }
function startDemo() {
  stopMotion(); if (jawAnim) stopJaw();
  if (state.sel) deselect();
  const steps = DEMOS[state.cat] || [];
  if (!steps.length) return;
  demo = { steps, i: -1, t0: 0 };
  hint.classList.add('off');
  const v = state.cat === 'atm' ? { dir: [1, 0.05, 0.25], dist: 3.2, target: [0.3, -0.2, 0.05] } : CAT[state.cat].view;
  flyTo(v);
  renderList();
  nextDemoStep(performance.now() + (reduce ? 0 : 500));
}
function nextDemoStep(now) {
  clearDemoParts();
  demo.i++;
  if (demo.i >= demo.steps.length) { stopDemo(); return; }
  const st = demo.steps[demo.i], items = st.ids.map(id => ITEMS.find(i => i.id === id)).filter(Boolean);
  demo.active = new Set(items.flatMap(i => i.keys));
  demo.bone = st.bone ?? 1;
  demo.t0 = now;
  demo.parts = items.filter(i => i.motion).flatMap(i => (meshesByKey[i.keys[0]] || []).map(mesh => {
    mesh.geometry.boundingBox || mesh.geometry.computeBoundingBox();
    mesh.matrixAutoUpdate = false;
    return { mesh, mv: i.motion, info: i.motion.fixed === 'ring' ? null : muscleAxis(mesh, i.motion.fixed), center: mesh.geometry.boundingBox.getCenter(v3()) };
  }));
  caption.textContent = `${demo.i + 1}/${demo.steps.length} · ${st.text}`;
  caption.classList.add('on');
  applyTargets();
}
function clearDemoParts() {
  for (const p of demo?.parts || []) { p.mesh.matrix.identity(); p.mesh.matrixAutoUpdate = true; }
  if (demo) demo.parts = [];
}
function stopDemo() {
  if (!demo) return;
  clearDemoParts();
  demo = null;
  jaw.rotation.set(0, 0, 0);
  setJaw(0);
  caption.classList.remove('on');
  applyTargets();
  renderList();
}
function stepDemo(now) {
  if (!demo || now < demo.t0) return;
  const t = (now - demo.t0) / 1000;
  if (t >= DEMO_STEP) { nextDemoStep(now); return; }
  const u = t / DEMO_STEP, pulse = (1 - Math.cos(u * Math.PI * 2)) / 2, ramp = easeInOut(Math.min(1, u * 1.4));
  for (const p of demo.parts) {
    if (p.info) p.mesh.matrix.copy(scaleAlong(p.info.fixed, p.info.ax, 1 - (p.mv.amount ?? 0.16) * pulse));
    else p.mesh.matrix.makeTranslation(p.center.x, p.center.y, p.center.z).multiply(new THREE.Matrix4().makeScale(1 - 0.1 * pulse, 1 - 0.1 * pulse, 1 - 0.1 * pulse)).multiply(new THREE.Matrix4().makeTranslation(-p.center.x, -p.center.y, -p.center.z));
    p.mesh.matrixWorldNeedsUpdate = true;
  }
  const mode = demo.steps[demo.i].jaw;
  jaw.rotation.y = 0;
  if (mode === 'open') setJawPose(0.32 * ramp, 0.012 * ramp, 0.03 * ramp);
  else if (mode === 'close') setJawPose(0.32 * (1 - ramp), 0.012 * (1 - ramp), 0.03 * (1 - ramp));
  else if (mode === 'side') { setJawPose(0.06, 0.004, 0.01); jaw.rotation.y = 0.07 * Math.sin(u * Math.PI); }
  else if (mode === 'atmOpen') setJaw(ramp);
  else if (mode === 'atmClose') setJaw(1 - ramp);
}

motionBtn.addEventListener('click', () => { if (motion) stopMotion(); else if (state.sel?.motion) playMotion(state.sel); });

$('#skin').addEventListener('click', e => { skinOn = !skinOn; e.currentTarget.setAttribute('aria-pressed', skinOn); applyTargets(); });

function fillSheet(it) {
  const pl = PLATE_FOR[it.id] || PLATE_CAT[it.cat];
  plateImg.src = 'assets/gray/' + pl + '.png';
  plateImg.alt = PLATES[pl];
  $('#plateCap').textContent = `${PLATES[pl]}. Gray's Anatomy (1918), prancha ${pl.slice(4)}, domínio público.`;
  clearTimeout(ovTimer);
  ovTimer = setTimeout(() => renderOverview(it), reduce ? 60 : 700);
  $('#sTitle').textContent = it.name;
  $('#sAlt').textContent = it.alt || CAT[it.cat].name;
  $('#sRows').innerHTML = it.rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
  $('#sBody').scrollTop = 0;
  noteEl.value = notes[it.id] || '';
  nstatus.textContent = '';
  const items = currentItems();
  $('#count').textContent = `${items.indexOf(it) + 1} de ${items.length}`;
}
function select(it) {
  if (!it) return;
  if (it.cat !== state.cat && state.cat !== 'all') setCat(it.cat, false);
  accent = new THREE.Color(CAT[it.cat].accent);
  sheet.style.setProperty('--accent', CAT[it.cat].accent);
  if (jawAnim) stopJaw();
  stopMotion();
  if (demo) stopDemo();
  state.sel = it;
  motionBtn.hidden = !it.motion;
  for (const b of list.querySelectorAll('.chip')) b.setAttribute('aria-pressed', b.dataset.id === it.id);
  fillSheet(it);
  sheet.setAttribute('data-open', '');
  sheet.setAttribute('aria-hidden', 'false');
  hint.classList.add('off');
  applyTargets();
  if (cutState.on) focusCut(it); else flyTo(viewFor(it));
  showCallout(it);
}
function closeSheet() { sheet.removeAttribute('data-open'); sheet.setAttribute('aria-hidden', 'true'); }
function deselect() {
  stopMotion();
  state.sel = null;
  closeSheet();
  hideCallout();
  for (const b of list.querySelectorAll('.chip')) b.setAttribute('aria-pressed', 'false');
  applyTargets();
}
function step(d) {
  if (!state.sel) return;
  const items = currentItems();
  select(items[(items.indexOf(state.sel) + d + items.length) % items.length]);
  list.querySelector(`[data-id="${state.sel.id}"]`)?.scrollIntoView({ block: 'nearest' });
}

tabs.addEventListener('click', e => { const b = e.target.closest('button'); if (b && b.dataset.cat !== state.cat) setCat(b.dataset.cat); });
list.addEventListener('click', e => {
  if (e.target.closest('#demo')) return demo ? stopDemo() : startDemo();
  const b = e.target.closest('.chip');
  if (b) select(ITEMS.find(i => i.id === b.dataset.id));
});
$('#close').addEventListener('click', deselect);
$('#prev').addEventListener('click', () => step(-1));
$('#next').addEventListener('click', () => step(1));
$('#reset').addEventListener('click', () => { deselect(); if (jawAnim) stopJaw(); flyTo(CAT[state.cat].view); });
addEventListener('keydown', e => {
  if (e.key === 'Escape' && !lightbox.hidden) { lightbox.hidden = true; return; }
  if (e.key === 'Escape' && state.sel) deselect();
  if (sheetOpen() && (e.key === 'ArrowRight' || e.key === 'ArrowLeft') && !e.target.closest?.('input, textarea')) step(e.key === 'ArrowRight' ? 1 : -1);
});

// Toque direto no modelo.
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
let down = null;
canvas.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
canvas.addEventListener('pointerup', e => {
  if (!down) return;
  const moved = Math.hypot(e.clientX - down[0], e.clientY - down[1]);
  down = null;
  if (moved > 6) return;
  const r = canvas.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const cands = pickables.filter(m => m.material.visible && m.material.opacity > 0.05 && inCat(m.userData.key));
  const occl = boneMat.opacity > 0.9 ? boneMeshes : [];
  const hit = ray.intersectObjects([...cands, ...occl], false).find(h => !isCut(h.point));
  if (hit?.object.userData.key) select(keyItem[hit.object.userData.key]);
  else if (!hit && state.sel) deselect();
});

// ---------- Anotações (módulo notes.js, compartilhado com a tela de anotações) ----------
const noteEl = $('#note'), nstatus = $('#nstatus');
function markChip(id) { list.querySelector(`[data-id="${id}"]`)?.toggleAttribute('data-note', !!notes[id]?.trim()); }
noteEl.addEventListener('input', () => {
  if (!state.sel) return;
  nstatus.textContent = 'Salvando…';
  setNote(state.sel.id, noteEl.value, t => { nstatus.textContent = t; });
});
noteEl.addEventListener('focus', () => setEditing(state.sel?.id ?? null));
noteEl.addEventListener('blur', () => { setEditing(null); flushNotes(); });
onNotes(() => {
  for (const it of ITEMS) markChip(it.id);
  if (state.sel && document.activeElement !== noteEl) noteEl.value = notes[state.sel.id] || '';
});

// ---------- Laço de desenho (com oclusão de ambiente) ----------
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 }));
composer.addPass(new RenderPass(scene, camera));
const gtao = new GTAOPass(scene, camera, 1, 1);
gtao.blendIntensity = 1;
gtao.updateGtaoMaterial({ radius: 0.12, distanceExponent: 1.4, thickness: 0.6, scale: 1.1, samples: coarse ? 12 : 16 });
composer.addPass(gtao);
composer.addPass(new OutputPass());
function syncBackground() {
  scene.background = new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#f4f4f1');
}
syncBackground();
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', syncBackground);
new MutationObserver(syncBackground).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
let viewOff = 0;
function resize() {
  const w = viewer.clientWidth, h = viewer.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

new ResizeObserver(resize).observe(viewer);
let last = performance.now();
const perf = { n: 0, t: 0, checked: false };
function frame(now) {
  const rawDt = (now - last) / 1000;
  const dt = Math.min(0.05, rawDt);
  last = now;
  if (document.body.dataset.view !== 'atlas' || document.hidden) { requestAnimationFrame(frame); return; }
  if (!perf.checked && rawDt < 0.5) {
    perf.n++; perf.t += rawDt;
    if (perf.n === 90) {
      perf.checked = true;
      if (perf.n / perf.t < 32 && pixelRatio > 1.5) { pixelRatio = 1.5; renderer.setPixelRatio(pixelRatio); resize(); }
    }
  }
  const target = sheetOpen() && wide.matches ? 420 : 0;
  if (Math.abs(target - viewOff) > 0.5) {
    viewOff += (target - viewOff) * (1 - Math.exp(-dt / 0.12));
    const w = viewer.clientWidth, h = viewer.clientHeight;
    if (viewOff > 0.5) camera.setViewOffset(w + viewOff, h, viewOff, 0, w, h); else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }
  stepFly(now);
  stepJaw(now);
  stepMotion(now);
  stepDemo(now);
  controls.update();
  stepMaterials(dt);
  gtao.enabled = boneMat.opacity > 0.9;
  composer.render();
  stepCallout();
  requestAnimationFrame(frame);
}

resize();
{
  const v = CAT.face.view;
  controls.target.set(...v.target);
  camera.position.copy(controls.target).add(v3(...v.dir).normalize().multiplyScalar(fit(v.dist)));
}
setCat('face', false);
for (const m of [...skel, ...Object.values(mats)]) m.opacity = m.userData.op;
resize();
loading.hidden = true;
requestAnimationFrame(frame);

// Ponte com a tela inicial e a tela de anotações (home.js).
window.addEventListener('atlas:show', () => { resize(); camera.updateProjectionMatrix(); });
window.addEventListener('atlas:open', e => { const it = ITEMS.find(i => i.id === e.detail); if (it) select(it); });
if (window.__atlasPending) { const it = ITEMS.find(i => i.id === window.__atlasPending); window.__atlasPending = null; if (it) select(it); }
// Imagem da tela inicial, gerada do próprio modelo.
setTimeout(() => {
  try {
    if (!ovRenderer) renderOverview(ITEMS[0]);
    const cam = new THREE.PerspectiveCamera(24, 0.82, 0.05, 40), c = v3(0, 0.12, 0.05);
    cam.position.copy(c).addScaledVector(v3(0.55, 0.12, 1).normalize(), 7.4);
    cam.lookAt(c);
    ovRenderer.setSize(820, 1000, false);
    const bg = scene.background;
    scene.background = null;
    ovRenderer.setClearColor(0x000000, 0);
    ovRenderer.render(scene, cam);
    scene.background = bg;
    const url = ovCanvas.toDataURL('image/webp', 0.9);
    ovRenderer.setSize(480, 300, false);
    window.__atlasHero = url;
    window.dispatchEvent(new CustomEvent('atlas:hero', { detail: url }));
  } catch {}
}, reduce ? 50 : 900);
window.__atlasReady = true;
window.dispatchEvent(new Event('atlas:ready'));
