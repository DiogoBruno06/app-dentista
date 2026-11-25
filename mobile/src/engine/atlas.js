// Motor 3D do atlas: three.js num contexto WebGL do expo-gl (iPhone) ou do navegador (web).
// Não conhece React: a interface chama os métodos e escuta onChange (estado) e onFrame (linha de chamada).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildAnatomy, parseHead } from './anatomy';
import { CATS, ITEMS, COLORS } from '../data/data';
import { DEMOS, VIEWS, CUT_AXES as AXES } from './scripts';

const v3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const CAT = Object.fromEntries(CATS.map(c => [c.id, c]));
const ITEM = Object.fromEntries(ITEMS.map(i => [i.id, i]));

// Curva ease-in-out forte (0.77, 0, 0.175, 1) para movimentos na tela.
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
const XRAY = 0.3;
const JAW_STEPS = [
  'Rotação: o côndilo gira dentro da fossa, no compartimento inferior (primeiros ~20 mm).',
  'Translação: côndilo e disco deslizam juntos sobre a eminência, no compartimento superior.',
  'Fechamento: o caminho se inverte e o côndilo volta à fossa.',
];

export const currentItems = cat => cat === 'all'
  ? CATS.filter(c => c.id !== 'all').flatMap(c => ITEMS.filter(i => i.cat === c.id))
  : ITEMS.filter(i => i.cat === cat);

export class AtlasEngine {
  constructor(gl, { reduceMotion = false, background = '#f2ece2' } = {}) {
    this.gl = gl;
    this.reduce = reduceMotion;
    this.listeners = new Set();
    this.frameListeners = new Set();
    this.size = { w: 1, h: 1 };
    this.inset = 0; this.insetTarget = 0; this.insetR = 0; this.insetRTarget = 0;
    this.ui = { cat: 'face', sel: null, skin: false, skinReady: false, cut: { on: false, axis: 'x', depth: 0.5 }, view: null, side: 1, caption: null, motion: false, demo: false, jaw: false };
    this.cut = { on: false, axis: 'x', off: 0, sign: 1, plane: new THREE.Plane() };
    this.medialCut = false;
    this.fly = null;
    this.vel = { th: 0, ph: 0 };
    this.dragging = false;
    this.motion = null; this.demo = null; this.jawAnim = null;
    this.callout = { x: 0, y: 0, visible: false };

    // three.js num contexto que não é de um <canvas>: um "canvas" mínimo basta.
    const canvas = {
      width: gl.drawingBufferWidth, height: gl.drawingBufferHeight, style: {}, clientHeight: gl.drawingBufferHeight,
      addEventListener() {}, removeEventListener() {}, getContext: () => gl,
    };
    if (!gl.canvas) try { gl.canvas = canvas; } catch {}
    const r = this.renderer = new THREE.WebGLRenderer({ canvas: gl.canvas?.getContext ? gl.canvas : canvas, context: gl, antialias: true, alpha: false });
    r.setPixelRatio(1);
    r.toneMapping = THREE.NeutralToneMapping;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = this.scene = new THREE.Scene();
    scene.background = new THREE.Color(background);
    const camera = this.camera = new THREE.PerspectiveCamera(30, 1, 0.05, 40);
    scene.add(camera);
    // Reflexos de estúdio, se o aparelho desenha em ponto flutuante; senão só as luzes.
    try {
      if (gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float')) {
        const pmrem = new THREE.PMREMGenerator(r);
        scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
        scene.environmentIntensity = 0.55;
        pmrem.dispose();
      }
    } catch { scene.environment = null; }
    scene.add(new THREE.HemisphereLight(0xfff6ee, 0x6b5a50, scene.environment ? 0.5 : 1.1));
    const key = new THREE.DirectionalLight(0xfff4e8, 2.6);
    key.position.set(1.4, 2.2, 1.6);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -1.6, right: 1.6, top: 1.6, bottom: -1.6, near: 0.5, far: 8 });
    key.shadow.bias = -0.0012; key.shadow.normalBias = 0.03; key.shadow.radius = 4;
    camera.add(key); key.target.position.set(0, 0, -4); camera.add(key.target);
    const fill = new THREE.DirectionalLight(0xffeadd, scene.environment ? 0 : 0.7);
    fill.position.set(-1.5, 0.2, 1); camera.add(fill);
    const rim = new THREE.DirectionalLight(0xdfe9ff, 0.9);
    rim.position.set(-2.5, 1.2, -2.5); scene.add(rim);

    // Órbita: alvo + coordenadas esféricas da câmera.
    this.target = v3();
    this.sph = new THREE.Spherical(5, 1.2, 0.4);
  }

  // ---------- Assinaturas ----------
  onChange(cb) { this.listeners.add(cb); cb(this.ui); return () => this.listeners.delete(cb); }
  onFrame(cb) { this.frameListeners.add(cb); return () => this.frameListeners.delete(cb); }
  emit() { this.ui = { ...this.ui }; for (const cb of this.listeners) cb(this.ui); }
  setUI(patch) { Object.assign(this.ui, patch); this.emit(); }

  // ---------- Modelo ----------
  load(headBuf) {
    const A = buildAnatomy(parseHead(headBuf));
    const { scene } = this;
    const PIVOT = this.PIVOT = A.pivot;
    const root = this.root = new THREE.Group(); scene.add(root);
    const jaw = this.jaw = new THREE.Group(); jaw.position.copy(PIVOT); root.add(jaw);
    const jawIn = new THREE.Group(); jawIn.position.copy(PIVOT).negate(); jaw.add(jawIn);
    const disc = this.disc = new THREE.Group(); root.add(disc);
    const PARENT = { skull: root, jaw: jawIn, disc };

    const mat = (color, o = {}, physical = false) => new (physical ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial)({ color, roughness: 0.75, metalness: 0, ...o });
    const skel = this.skel = [];
    const skelMat = (color, o) => { const m = mat(color, o); m.userData = { kind: 'skel', base: new THREE.Color(color), op: 1, em: 0 }; m.userData.col = m.userData.base; skel.push(m); return m; };
    this.boneMat = skelMat(COLORS.bone, { roughness: 0.62, side: THREE.DoubleSide });
    this.teethMat = skelMat(COLORS.teeth, { roughness: 0.22, side: THREE.DoubleSide });
    const addMesh = (g, m, parent) => { const me = new THREE.Mesh(g, m); me.castShadow = me.receiveShadow = true; parent.add(me); return me; };
    this.addMesh = addMesh;
    const boneMeshes = this.boneMeshes = [];
    for (const g of A.bones.cranium) boneMeshes.push(addMesh(g, this.boneMat, root));
    for (const g of A.bones.jaw) boneMeshes.push(addMesh(g, this.boneMat, jawIn));
    for (const g of A.bones.teethU) boneMeshes.push(addMesh(g, this.teethMat, root));
    for (const g of A.bones.teethL) boneMeshes.push(addMesh(g, this.teethMat, jawIn));

    const skinMat = this.skinMat = mat(COLORS.skin, { roughness: 0.55, sheen: 0.5, sheenColor: new THREE.Color('#ffd9c7'), sheenRoughness: 0.6, opacity: 0, transparent: true, depthWrite: false }, true);
    skinMat.userData = { kind: 'skin', base: new THREE.Color(COLORS.skin), op: 0, em: 0, sheen0: 0.5 };
    skinMat.userData.col = skinMat.userData.base;
    skel.push(skinMat);

    const keyCat = this.keyCat = {}, keyItem = this.keyItem = {};
    for (const it of ITEMS) for (const k of it.keys) {
      keyCat[k] ??= it.cat;
      if (!keyItem[k] || keyItem[k].keys.length > it.keys.length) keyItem[k] = it;
    }
    const BONE_KEYS = new Set(['condilo', 'fossa', 'eminencia']);
    const colorFor = k => BONE_KEYS.has(k) ? COLORS.bone : COLORS[k] || (keyCat[k] === 'trig' ? COLORS.nerve : keyCat[k] === 'mast' ? COLORS.mast : COLORS.face);
    const mats = this.mats = {}, meshesByKey = this.meshesByKey = {}, pickables = this.pickables = [];
    for (const p of A.parts) {
      if (!mats[p.key]) {
        const bone = BONE_KEYS.has(p.key), nerve = keyCat[p.key] === 'trig' || p.key === 'facial';
        const color = colorFor(p.key), muscle = !bone && !nerve && !COLORS[p.key];
        const m = mat(color, {
          roughness: bone ? 0.62 : nerve ? 0.38 : 0.48, opacity: bone ? 1 : 0, emissive: color, emissiveIntensity: 0,
          side: p.key === 'fossa' || p.key === 'capsula' ? THREE.DoubleSide : THREE.FrontSide,
          ...(muscle ? { sheen: 0.6, sheenColor: new THREE.Color('#ffb3a6'), sheenRoughness: 0.45, clearcoat: 0.18, clearcoatRoughness: 0.45 } : {}),
          ...(nerve ? { clearcoat: 0.3, clearcoatRoughness: 0.3 } : {}),
          polygonOffset: true, polygonOffsetFactor: bone ? -2 : -1, polygonOffsetUnits: bone ? -2 : -6,
        }, muscle || nerve);
        m.userData = { kind: bone ? 'bone' : 'soft', base: new THREE.Color(color), op: m.opacity, em: 0, sheen0: m.sheen || 0, cc0: m.clearcoat || 0 };
        m.userData.col = m.userData.base;
        mats[p.key] = m; meshesByKey[p.key] = [];
      }
      // Afasta músculos e nervos do osso uma fração de milímetro, para o osso não "furar" a superfície.
      const lift = BONE_KEYS.has(p.key) ? 0 : p.key === 'temporal' ? 0.012 : keyCat[p.key] === 'trig' || p.key === 'facial' ? 0.003 : 0.007;
      if (lift) {
        const pos = p.geo.attributes.position, nor = p.geo.attributes.normal;
        for (let i = 0; i < pos.count; i++) pos.setXYZ(i, pos.getX(i) + nor.getX(i) * lift, pos.getY(i) + nor.getY(i) * lift, pos.getZ(i) + nor.getZ(i) * lift);
      }
      const me = addMesh(p.geo, mats[p.key], PARENT[p.where]);
      me.renderOrder = BONE_KEYS.has(p.key) ? 0 : 2;
      if (!BONE_KEYS.has(p.key)) me.castShadow = me.receiveShadow = false;
      me.userData = { key: p.key, side: p.side };
      meshesByKey[p.key].push(me); pickables.push(me);
    }
    root.updateMatrixWorld(true);

    // Ponto de encosto da linha de chamada: vértice voltado para a vista, perto do centro da estrutura.
    const anchors = this.anchors = {};
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
        const dd = p.fromBufferAttribute(pos, i).distanceToSquared(c);
        if (dd < bd) { bd = dd; best = p.clone(); }
      }
      anchors[it.id] = { local: best || c, mesh: m, mirror: ms.find(x => x.userData.side === -1), size: g.boundingBox.getSize(v3()).length() };
    }
    const mouthBox = new THREE.Box3();
    for (const m of meshesByKey.orbicular_boca || []) mouthBox.expandByObject(m);
    this.mouthC = mouthBox.getCenter(v3());

    const v = CAT.face.view;
    this.target.set(...v.target);
    this.sph.setFromVector3(v3(...v.dir).normalize().multiplyScalar(this.fit(v.dist)));
    this.fitted = this.size.w > 10 && this.size.h > 10;
    this.applyTargets();
    for (const m of [...skel, ...Object.values(mats)]) m.opacity = m.userData.op;
    this.ready = true;
  }
  loadSkin(buf) {
    const g = parseHead(buf)['skin|0'];
    if (!g) return;
    const me = this.addMesh(g, this.skinMat, this.root);
    me.castShadow = false; me.renderOrder = 3;
    this.setUI({ skinReady: true });
  }

  // ---------- Tamanho ----------
  resize(w, h) {
    const first = !this.fitted && w > 10 && h > 10;
    this.size = { w, h };
    this.renderer.setSize(this.gl.drawingBufferWidth, this.gl.drawingBufferHeight, false);
    this.camera.aspect = w / h;
    this.updateProjection();
    // Primeiro tamanho de verdade: reenquadra a vista inicial para a proporção da tela.
    if (first && this.ready) { this.fitted = true; const v = CAT[this.ui.cat].view; this.sph.radius = this.fit(v.dist); }
  }
  // Área coberta embaixo (ficha aberta): o modelo é centralizado no espaço que sobra.
  setInsetBottom(px) { this.insetTarget = px; }
  // Área coberta à direita (ficha lateral em telas largas).
  setInsetRight(px) { this.insetRTarget = px; }
  updateProjection() {
    const { w, h } = this.size, c = this.camera, k = this.inset, r = this.insetR;
    // Desloca o quadro metade da área coberta (para cima ou para a esquerda), sem mudar a escala.
    if (k > 0.5 || r > 0.5) c.setViewOffset(w, h, r / 2, k / 2, w, h); else c.clearViewOffset();
    c.updateProjectionMatrix();
  }
  fit(d) {
    const { w, h } = this.size, a = w > 10 && h > 10 ? (w - this.insetRTarget) / h : this.camera.aspect || 1;
    return d * Math.max(1, Math.pow(0.95 / a, 0.75));
  }

  // ---------- Câmera ----------
  flyTo(v) {
    const dir = v3(...v.dir).normalize(), tgt = v3(...v.target);
    const camX = Math.sin(this.sph.phi) * Math.sin(this.sph.theta);
    if (!v.abs && camX < -0.02) { dir.x *= -1; tgt.x *= -1; }
    const s1 = new THREE.Spherical().setFromVector3(dir.multiplyScalar(this.fit(v.dist)));
    const s0 = this.sph.clone();
    const dth = Math.atan2(Math.sin(s1.theta - s0.theta), Math.cos(s1.theta - s0.theta));
    this.vel = { th: 0, ph: 0 };
    this.fly = { t0: now(), dur: this.reduce ? 1 : 900, s0, s1, dth, from: this.target.clone(), to: tgt };
  }
  stepFly(t) {
    const f = this.fly;
    if (!f) return;
    const k = clamp((t - f.t0) / f.dur, 0, 1), e = easeInOut(k);
    this.target.lerpVectors(f.from, f.to, e);
    this.sph.radius = lerp(f.s0.radius, f.s1.radius, e);
    this.sph.phi = lerp(f.s0.phi, f.s1.phi, e);
    this.sph.theta = f.s0.theta + f.dth * e;
    if (k >= 1) this.fly = null;
  }
  // Gestos: arrastar gira, pinça aproxima.
  orbit(dx, dy) {
    this.fly = null;
    const k = 2.6 / Math.max(240, this.size.h);
    this.sph.theta -= dx * k; this.sph.phi = clamp(this.sph.phi - dy * k, 0.12, Math.PI - 0.12);
    this.vel = { th: -dx * k, ph: -dy * k };
    this.dragging = true;
  }
  release(vx = 0, vy = 0) {
    this.dragging = false;
    const k = 2.6 / Math.max(240, this.size.h) / 60;
    this.vel = { th: -vx * k, ph: -vy * k };
  }
  // O limite de afastamento acompanha a proporção da tela (no celular em pé a câmera precisa ir mais longe).
  zoom(scale) { this.fly = null; this.sph.radius = clamp(this.sph.radius / scale, 0.8, Math.max(this.fit(7.5), this.sph.radius)); }
  stepOrbit(dt) {
    if (this.dragging || this.fly) return;
    const d = Math.exp(-dt / 0.12);
    this.sph.theta += this.vel.th; this.sph.phi = clamp(this.sph.phi + this.vel.ph, 0.12, Math.PI - 0.12);
    this.vel.th *= d; this.vel.ph *= d;
    if (Math.abs(this.vel.th) < 1e-5) this.vel.th = 0;
    if (Math.abs(this.vel.ph) < 1e-5) this.vel.ph = 0;
  }
  resetView() { this.deselect(); this.stopJaw(); this.flyTo(CAT[this.ui.cat].view); }

  // ---------- Estado visual ----------
  inCat(k) { return this.ui.cat === 'all' || this.keyCat[k] === this.ui.cat; }
  applyTargets() {
    const c = CAT[this.ui.cat], sel = this.ui.sel ? ITEM[this.ui.sel] : null, accent = this.accent || new THREE.Color(c.accent);
    const { demo, skinMat, mats, skel } = this, skinOn = this.ui.skin;
    if (demo) {
      for (const m of skel) m.userData.op = demo.bone;
      skinMat.userData.op = skinOn ? 0.18 : 0;
      for (const k in mats) {
        const u = mats[k].userData, on = demo.active.has(k);
        if (u.kind === 'bone') { u.op = on ? 1 : demo.bone; u.col = on ? accent : u.base; u.em = on ? 0.12 : 0; }
        else { u.op = !this.inCat(k) ? 0 : on ? 1 : 0.22; u.em = on ? 0.3 : 0; }
      }
      return;
    }
    const boneOp = sel ? (this.cut.on ? 1 : sel.xray ?? XRAY) : c.bone;
    for (const m of skel) m.userData.op = boneOp;
    skinMat.userData.op = skinOn ? (sel ? 0.18 : 1) : 0;
    for (const k in mats) {
      const u = mats[k].userData, on = !!sel?.keys.includes(k);
      if (u.kind === 'bone') { u.op = on ? 1 : boneOp; u.col = on ? accent : u.base; u.em = on ? 0.12 : 0; }
      else {
        u.op = !this.inCat(k) || (this.jawAnim && (k === 'capsula' || k === 'ligamento')) ? 0 : sel && !on ? 0.06 : 1;
        u.em = on ? 0.32 : 0;
      }
    }
  }
  stepMaterials(dt) {
    const f = 1 - Math.exp(-dt / (this.reduce ? 0.05 : 0.09));
    for (const m of [...this.skel, ...Object.values(this.mats)]) {
      const u = m.userData;
      m.opacity += (u.op - m.opacity) * f;
      m.color.lerp(u.col, f);
      m.emissiveIntensity += (u.em - m.emissiveIntensity) * f;
      m.visible = m.opacity > 0.01;
      if (u.sheen0) m.sheen = Math.max(0.001, u.sheen0 * m.opacity * m.opacity);
      if (u.cc0) m.clearcoat = Math.max(0.001, u.cc0 * m.opacity * m.opacity);
      m.depthWrite = m.opacity > 0.97;
      const tr = u.kind === 'skin' || m.opacity < 0.995 || (u.kind === 'soft' && this.boneMat.opacity < 0.9);
      if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; }
      if (m === this.boneMat || m === this.teethMat) {
        const side = m.opacity < 0.9 ? THREE.FrontSide : THREE.DoubleSide;
        if (m.side !== side) { m.side = side; m.needsUpdate = true; }
      }
    }
  }

  // ---------- Categoria e seleção ----------
  setCat(id, move = true) {
    this.stopDemo();
    if (this.ui.cat === 'atm' && id !== 'atm') this.stopJaw();
    this.stopMotion();
    this.accent = new THREE.Color(CAT[id].accent);
    this.ui.cat = id; this.ui.sel = null;
    this.applyTargets();
    if (move) this.flyTo(CAT[id].view);
    this.emit();
  }
  anchorWorld(it) {
    const a = this.anchors[it.id];
    a.mesh.updateWorldMatrix(true, false);
    const p = a.local.clone().applyMatrix4(a.mesh.matrixWorld);
    if (a.mirror) {
      a.mirror.updateWorldMatrix(true, false);
      const q = v3(-a.local.x, a.local.y, a.local.z).applyMatrix4(a.mirror.matrixWorld);
      if (q.distanceToSquared(this.camera.position) < p.distanceToSquared(this.camera.position)) return q;
    }
    return p;
  }
  viewFor(it) {
    const c = CAT[it.cat].view, v = it.view || {}, a = this.anchors[it.id];
    return { dir: v.dir || c.dir, dist: v.dist || clamp(a.size * 4, 2.8, 4.6), target: [a.local.x, a.local.y, a.local.z] };
  }
  select(id) {
    const it = ITEM[id];
    if (!it) return;
    if (it.cat !== this.ui.cat && this.ui.cat !== 'all') this.setCat(it.cat, false);
    this.accent = new THREE.Color(CAT[it.cat].accent);
    this.stopJaw(); this.stopMotion(); this.stopDemo();
    this.ui.sel = id;
    this.applyTargets();
    if (this.cut.on) this.focusCut(it); else this.flyTo(this.viewFor(it));
    this.emit();
  }
  deselect() {
    this.stopMotion();
    if (!this.ui.sel) return;
    this.ui.sel = null;
    this.applyTargets();
    this.emit();
  }
  step(d) {
    const sel = this.ui.sel && ITEM[this.ui.sel];
    if (!sel) return;
    const items = currentItems(this.ui.cat);
    this.select(items[(items.indexOf(sel) + d + items.length) % items.length].id);
  }
  setSkin(on) { this.ui.skin = on; this.applyTargets(); this.emit(); }

  // Toque direto no modelo (coordenadas em pontos, relativas à área 3D).
  tap(x, y) {
    if (!this.ready) return;
    const ndc = new THREE.Vector2((x / this.size.w) * 2 - 1, -(y / this.size.h) * 2 + 1);
    const ray = new THREE.Raycaster();
    this.camera.updateMatrixWorld();
    ray.setFromCamera(ndc, this.camera);
    const cands = this.pickables.filter(m => m.material.visible && m.material.opacity > 0.05 && this.inCat(m.userData.key));
    const occl = this.boneMat.opacity > 0.9 ? this.boneMeshes : [];
    const hit = ray.intersectObjects([...cands, ...occl], false).find(h => !this.isCut(h.point));
    if (hit?.object.userData.key) { this.select(this.keyItem[hit.object.userData.key].id); return true; }
    if (!hit && this.ui.sel) this.deselect();
    return false;
  }

  // ---------- Corte ----------
  isCut(p) { return this.cut.on && this.cut.plane.distanceToPoint(p) < 0; }
  updateCut() {
    const c = this.cut, a = AXES[c.axis];
    c.plane.normal.copy(a.v).multiplyScalar(-c.sign);
    c.plane.constant = c.sign * c.off;
    this.renderer.clippingPlanes = c.on ? [c.plane] : [];
    this.ui.cut = { on: c.on, axis: c.axis, depth: clamp((c.off - a.min) / (a.max - a.min), 0, 1) };
  }
  setCut(on) {
    this.cut.on = on;
    this.medialCut = false;
    if (on && this.ui.view === 'medial') this.ui.view = null;
    this.applyTargets();
    const sel = this.ui.sel && ITEM[this.ui.sel];
    if (on && sel) this.focusCut(sel); else if (on) this.setCutAxis(this.cut.axis); else this.updateCut();
    this.emit();
  }
  setCutAxis(axis) {
    const c = this.cut, a = AXES[axis];
    c.axis = axis;
    const sel = this.ui.sel && ITEM[this.ui.sel];
    if (sel) { this.focusCut(sel, axis); this.emit(); return; }
    this.camera.updateMatrixWorld();
    c.sign = Math.sign(this.camera.position.dot(a.v) - this.target.dot(a.v)) || 1;
    c.off = a.def;
    this.updateCut(); this.emit();
  }
  setCutDepth(t) {
    const a = AXES[this.cut.axis];
    this.cut.off = a.min + (a.max - a.min) * t;
    this.updateCut(); this.emit();
  }
  // Corta logo antes da estrutura, do lado da câmera, e gira a câmera para olhar a face cortada.
  focusCut(it, forced) {
    const p = this.anchorWorld(it);
    const axis = forced || (Math.abs(p.x) > 0.18 ? 'x' : 'z');
    const av = AXES[axis].v, sign = axis === 'x' ? Math.sign(p.x) || 1 : 1;
    const box = new THREE.Box3(), all = this.meshesByKey[it.keys[0]] || [];
    const ms = all.filter(m => axis !== 'x' || Math.sign(m.userData.side || sign) === sign || m.userData.side === 0);
    for (const m of ms.length ? ms : all) box.expandByObject(m);
    const hi = sign > 0 ? box.max.dot(av) : box.min.dot(av);
    Object.assign(this.cut, { axis, sign, off: hi + sign * 0.012 });
    this.updateCut();
    const dir = axis === 'x' ? [sign, 0.12, 0.2] : axis === 'z' ? [0.2, 0.12, 1] : [0.2, 1, 0.3];
    this.flyTo({ dir, dist: clamp(this.anchors[it.id].size * 3.4, 2.4, 4), target: [p.x, p.y, p.z], abs: true });
  }

  // ---------- Vistas anatômicas (plano de Frankfurt na horizontal) ----------
  setView(name, side = this.ui.side) {
    this.ui.view = name; this.ui.side = side;
    if (!name) { this.emit(); return; }
    if (name === 'medial') {
      this.medialCut = !this.cut.on || this.medialCut;
      this.cut.on = true;
      Object.assign(this.cut, { axis: 'x', sign: -side, off: 0 });
      this.applyTargets(); this.updateCut();
    } else if (this.medialCut) {
      this.medialCut = false; this.cut.on = false;
      this.applyTargets(); this.updateCut();
    }
    let target = [0, 0.02, 0.12], dist = 5.4;
    const sel = this.ui.sel && ITEM[this.ui.sel];
    if (sel) {
      const p = this.anchorWorld(sel);
      target = [name === 'frontal' ? p.x : Math.abs(p.x) * side, p.y, p.z];
      dist = clamp(this.anchors[sel.id].size * 3.4, 2.4, 4);
    } else if (this.ui.cat === 'atm') { target = [0.42 * side, -0.1, -0.08]; dist = 2.2; }
    if (name === 'medial' && !sel) target = [0.05 * side, -0.1, 0.1];
    this.flyTo({ dir: VIEWS[name].dir(side), dist, target, abs: true });
    this.emit();
  }
  currentSide() { return Math.sin(this.sph.phi) * Math.sin(this.sph.theta) < 0 ? -1 : 1; }

  // ---------- Abertura da boca (ATM) ----------
  setJaw(p) {
    const rot = p < 0.4 ? (p / 0.4) * 0.2 : 0.2 + ((p - 0.4) / 0.6) * 0.3;
    const tr = p < 0.4 ? 0 : (p - 0.4) / 0.6;
    this.jaw.rotation.x = rot;
    this.jaw.position.set(this.PIVOT.x, this.PIVOT.y - 0.035 * tr, this.PIVOT.z + 0.12 * tr);
    this.disc.position.set(0, -0.03 * tr, 0.1 * tr);
  }
  setJawPose(rot, dy, dz) { this.jaw.rotation.x = rot; this.jaw.position.set(this.PIVOT.x, this.PIVOT.y - dy, this.PIVOT.z + dz); }
  stopJaw() {
    if (!this.jawAnim) return;
    this.jawAnim = null; this.setJaw(0);
    this.ui.jaw = false; this.ui.caption = null;
    this.applyTargets(); this.emit();
  }
  stepJaw(t) {
    const j = this.jawAnim;
    if (!j) return;
    const T = (t - j.t0) / 1000;
    if (T < 0) return;
    let p, step;
    if (T < 1.8) { p = easeInOut(T / 1.8); step = p < 0.4 ? 0 : 1; }
    else if (T < 2.6) { p = 1; step = 1; }
    else if (T < 4.2) { p = 1 - easeInOut((T - 2.6) / 1.6); step = 2; }
    else { this.stopJaw(); return; }
    this.setJaw(p);
    if (j.step !== step) { j.step = step; this.setUI({ caption: JAW_STEPS[step] }); }
  }

  // ---------- Movimento de cada músculo (contração ao longo do eixo do feixe) ----------
  muscleAxis(mesh, rule) {
    const pos = mesh.geometry.attributes.position, c = v3(), p = v3();
    for (let i = 0; i < pos.count; i++) c.add(p.fromBufferAttribute(pos, i));
    c.divideScalar(pos.count);
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
    const e0 = c.clone().addScaledVector(ax, lo), e1 = c.clone().addScaledVector(ax, hi), mc = this.mouthC;
    const score = e => rule === 'top' ? e.y : rule === 'bottom' ? -e.y : rule === 'medial' ? -Math.abs(e.x) : rule === 'lateral' ? Math.abs(e.x)
      : rule === 'front' ? e.z : rule === 'back' ? -e.z : e.distanceTo(mc);
    const [fixed, moving] = score(e0) >= score(e1) ? [e0, e1] : [e1, e0];
    return { c, ax, fixed, moving };
  }
  scaleAlong(f, ax, s) {
    const m = new THREE.Matrix4(), k = s - 1;
    m.set(1 + k * ax.x * ax.x, k * ax.x * ax.y, k * ax.x * ax.z, 0,
      k * ax.y * ax.x, 1 + k * ax.y * ax.y, k * ax.y * ax.z, 0,
      k * ax.z * ax.x, k * ax.z * ax.y, 1 + k * ax.z * ax.z, 0, 0, 0, 0, 1);
    return new THREE.Matrix4().makeTranslation(f.x, f.y, f.z).multiply(m).multiply(new THREE.Matrix4().makeTranslation(-f.x, -f.y, -f.z));
  }
  pulseMatrix(part, mv, p) {
    if (part.info) return this.scaleAlong(part.info.fixed, part.info.ax, 1 - (mv.amount ?? 0.16) * p);
    const c = part.center, s = 1 - 0.1 * p;
    return new THREE.Matrix4().makeTranslation(c.x, c.y, c.z).multiply(new THREE.Matrix4().makeScale(s, s, s)).multiply(new THREE.Matrix4().makeTranslation(-c.x, -c.y, -c.z));
  }
  makeParts(it, arrows) {
    const mv = it.motion;
    return (this.meshesByKey[it.keys[0]] || []).map(mesh => {
      const info = mv.fixed === 'ring' ? null : this.muscleAxis(mesh, mv.fixed);
      let arrow = null;
      if (info && arrows) {
        const dir = info.fixed.clone().sub(info.moving).normalize();
        arrow = new THREE.ArrowHelper(dir, info.moving.clone().addScaledVector(dir, -0.09), 0.11, 0x1b1d20, 0.04, 0.028);
        arrow.traverse(o => { if (o.material) { o.material.depthTest = false; o.material.transparent = true; } o.renderOrder = 10; });
        mesh.parent.add(arrow);
      }
      mesh.geometry.boundingBox || mesh.geometry.computeBoundingBox();
      mesh.matrixAutoUpdate = false;
      return { mesh, info, arrow, mv, center: mesh.geometry.boundingBox.getCenter(v3()) };
    });
  }
  playMotion() {
    const it = this.ui.sel && ITEM[this.ui.sel];
    if (!it?.motion) return;
    this.stopMotion(); this.stopJaw();
    this.motion = { it, parts: this.makeParts(it, true), t0: now() };
    this.setUI({ motion: true, caption: it.motion.text });
  }
  stopMotion() {
    if (!this.motion) return;
    for (const p of this.motion.parts) { p.mesh.matrix.identity(); p.mesh.matrixAutoUpdate = true; p.arrow?.removeFromParent(); }
    this.motion = null;
    this.setJawPose(0, 0, 0);
    this.setUI({ motion: false, caption: null });
  }
  stepMotion(t) {
    const m = this.motion;
    if (!m) return;
    const T = (t - m.t0) / 1000, cycle = 1.8;
    if (T > cycle * 3) { this.stopMotion(); return; }
    const p = (1 - Math.cos(((T % cycle) / cycle) * Math.PI * 2)) / 2, mv = m.it.motion;
    for (const part of m.parts) {
      part.mesh.matrix.copy(this.pulseMatrix(part, mv, p));
      part.mesh.matrixWorldNeedsUpdate = true;
      if (part.arrow) part.arrow.visible = p > 0.08;
    }
    if (mv.jaw === 'close') this.setJawPose(0.32 * (1 - p), 0.012 * (1 - p), 0.03 * (1 - p));
    else if (mv.jaw === 'protrude') this.setJawPose(0.05 * p, 0.015 * p, 0.07 * p);
  }

  // ---------- Demonstração: as estruturas da aba funcionando juntas ----------
  startDemo() {
    this.stopMotion(); this.stopJaw();
    if (this.ui.sel) this.deselect();
    const steps = DEMOS[this.ui.cat] || [];
    if (!steps.length) return;
    this.demo = { steps, i: -1, t0: 0, parts: [] };
    const v = this.ui.cat === 'atm' ? { dir: [1, 0.05, 0.25], dist: 3.2, target: [0.3, -0.2, 0.05] } : CAT[this.ui.cat].view;
    this.flyTo(v);
    this.ui.demo = true;
    this.nextDemoStep(now() + (this.reduce ? 0 : 500));
  }
  nextDemoStep(t) {
    const d = this.demo;
    this.clearDemoParts();
    d.i++;
    if (d.i >= d.steps.length) { this.stopDemo(); return; }
    const st = d.steps[d.i], items = st.ids.map(id => ITEM[id]).filter(Boolean);
    d.active = new Set(items.flatMap(i => i.keys));
    d.bone = st.bone ?? 1;
    d.t0 = t;
    d.parts = items.filter(i => i.motion).flatMap(i => this.makeParts(i, false));
    this.applyTargets();
    this.setUI({ caption: st.text, demoStep: `${d.i + 1}/${d.steps.length}` });
  }
  clearDemoParts() {
    for (const p of this.demo?.parts || []) { p.mesh.matrix.identity(); p.mesh.matrixAutoUpdate = true; }
    if (this.demo) this.demo.parts = [];
  }
  stopDemo() {
    if (!this.demo) return;
    this.clearDemoParts();
    this.demo = null;
    this.jaw.rotation.set(0, 0, 0);
    this.setJaw(0);
    this.applyTargets();
    this.setUI({ demo: false, caption: null, demoStep: null });
  }
  stepDemo(t) {
    const d = this.demo;
    if (!d || t < d.t0) return;
    const T = (t - d.t0) / 1000, DUR = 3.2;
    if (T >= DUR) { this.nextDemoStep(t); return; }
    const u = T / DUR, pulse = (1 - Math.cos(u * Math.PI * 2)) / 2, ramp = easeInOut(Math.min(1, u * 1.4));
    for (const p of d.parts) { p.mesh.matrix.copy(this.pulseMatrix(p, p.mv, pulse)); p.mesh.matrixWorldNeedsUpdate = true; }
    const mode = d.steps[d.i].jaw;
    this.jaw.rotation.y = 0;
    if (mode === 'open') this.setJawPose(0.32 * ramp, 0.012 * ramp, 0.03 * ramp);
    else if (mode === 'close') this.setJawPose(0.32 * (1 - ramp), 0.012 * (1 - ramp), 0.03 * (1 - ramp));
    else if (mode === 'side') { this.setJawPose(0.06, 0.004, 0.01); this.jaw.rotation.y = 0.07 * Math.sin(u * Math.PI); }
    else if (mode === 'atmOpen') this.setJaw(ramp);
    else if (mode === 'atmClose') this.setJaw(1 - ramp);
  }

  // ---------- Linha de chamada ----------
  stepCallout() {
    const sel = this.ui.sel && ITEM[this.ui.sel];
    const c = this.callout;
    if (!sel) { c.visible = false; return; }
    const p = this.anchorWorld(sel).project(this.camera);
    c.visible = p.z < 1 && Math.abs(p.x) < 1.2 && Math.abs(p.y) < 1.2;
    c.x = ((p.x + 1) / 2) * this.size.w;
    c.y = ((1 - p.y) / 2) * this.size.h;
  }

  // ---------- Laço ----------
  frame(t) {
    if (!this.ready) return;
    const dt = Math.min(0.05, (t - (this.last ?? t)) / 1000);
    this.last = t;
    if (Math.abs(this.insetTarget - this.inset) > 0.5 || Math.abs(this.insetRTarget - this.insetR) > 0.5) {
      const f = 1 - Math.exp(-dt / 0.1);
      this.inset += (this.insetTarget - this.inset) * f;
      this.insetR += (this.insetRTarget - this.insetR) * f;
      this.updateProjection();
    }
    this.stepFly(t); this.stepOrbit(dt);
    this.stepJaw(t); this.stepMotion(t); this.stepDemo(t);
    this.camera.position.setFromSpherical(this.sph).add(this.target);
    this.camera.lookAt(this.target);
    this.stepMaterials(dt);
    this.renderer.render(this.scene, this.camera);
    this.gl.endFrameEXP?.();
    this.stepCallout();
    for (const cb of this.frameListeners) cb(this.callout);
  }
  dispose() {
    this.ready = false;
    this.listeners.clear(); this.frameListeners.clear();
    try { this.renderer.dispose(); } catch {}
  }
}
const now = () => (globalThis.performance?.now ? performance.now() : Date.now());
