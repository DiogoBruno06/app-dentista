// Modelo anatômico real da cabeça: Z-Anatomy (baseado no BodyParts3D), CC BY-SA 4.0.
// assets/head.json traz cada estrutura já simplificada, como "chave|lado" (lado 1 = esquerdo do paciente, -1 = direito, 0 = mediano).
// Unidades: 1 = 10 cm. x = lado esquerdo do paciente, y = cima, z = frente.
import * as THREE from 'three';

const v3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const range = n => [...Array(n).keys()];

export async function loadHead(url) {
  const meta = await fetch(url).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
  const raw = atob(meta.bin), bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  const buf = bytes.buffer, geos = {};
  for (const [name, g] of Object.entries(meta.groups)) {
    const q = new Int16Array(buf, g.vOff, g.v * 3), pos = new Float32Array(g.v * 3);
    for (let i = 0; i < pos.length; i++) pos[i] = q[i] * meta.scale;
    const idx = g.big ? new Uint32Array(buf.slice(g.iOff, g.iOff + g.i * 4)) : new Uint16Array(buf.slice(g.iOff, g.iOff + g.i * 2));
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    if (!/^(cranium|mandible|teeth)/.test(name)) fixWinding(geo); // ossos já são desenhados dos dois lados
    geo.computeVertexNormals();
    geos[name] = geo;
  }
  return geos;
}

// As peças espelhadas do Z-Anatomy vêm com a ordem dos triângulos invertida (normais para dentro).
// Se a maioria das faces aponta para o centro da peça, inverte a ordem.
function fixWinding(geo) {
  const pos = geo.attributes.position, idx = geo.index.array, c = v3(), a = v3(), b = v3(), d = v3(), n = v3(), m = v3();
  for (let i = 0; i < pos.count; i++) c.add(a.fromBufferAttribute(pos, i));
  c.divideScalar(pos.count);
  let score = 0;
  for (let t = 0; t < idx.length; t += 3) {
    a.fromBufferAttribute(pos, idx[t]); b.fromBufferAttribute(pos, idx[t + 1]); d.fromBufferAttribute(pos, idx[t + 2]);
    n.crossVectors(b.clone().sub(a), d.clone().sub(a));
    m.copy(a).add(b).add(d).divideScalar(3).sub(c);
    score += n.dot(m);
  }
  if (score < 0) for (let t = 0; t < idx.length; t += 3) { const k = idx[t + 1]; idx[t + 1] = idx[t + 2]; idx[t + 2] = k; }
  return score < 0;
}

// Triângulos de uma malha dentro de um elipsoide, como peça separada (para destacar parte de um osso).
function region(geo, center, radii, test = () => true) {
  const pos = geo.attributes.position, idx = geo.index.array, out = [];
  const a = v3(), b = v3(), c = v3(), m = v3(), n = v3(), e1 = v3(), e2 = v3();
  for (let t = 0; t < idx.length; t += 3) {
    a.fromBufferAttribute(pos, idx[t]); b.fromBufferAttribute(pos, idx[t + 1]); c.fromBufferAttribute(pos, idx[t + 2]);
    m.copy(a).add(b).add(c).divideScalar(3);
    const q = ((m.x - center.x) / radii[0]) ** 2 + ((m.y - center.y) / radii[1]) ** 2 + ((m.z - center.z) / radii[2]) ** 2;
    if (q > 1) continue;
    n.crossVectors(e1.subVectors(b, a), e2.subVectors(c, a)).normalize();
    if (!test(n, m)) continue;
    out.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
  g.computeVertexNormals();
  return g;
}

// Feixe muscular achatado ao longo de uma curva (usado só no bucinador, que o Z-Anatomy não tem).
function band(pts, w, th) {
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const n = 40, radial = 10, pos = [], idx = [], T = v3(), S = v3(), U = v3();
  for (let i = 0; i <= n; i++) {
    const t = i / n, p = curve.getPointAt(t), k = 0.45 + 0.55 * Math.sin(Math.PI * t) ** 0.6;
    curve.getTangentAt(t, T);
    S.set(0, 1, 0); U.crossVectors(T, S).normalize(); S.crossVectors(U, T).normalize();
    for (let j = 0; j < radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      pos.push(...p.clone().addScaledVector(S, Math.cos(a) * w * k).addScaledVector(U, Math.sin(a) * th * k).toArray());
    }
  }
  for (let i = 0; i < n; i++) for (let j = 0; j < radial; j++) {
    const j2 = (j + 1) % radial, A = i * radial + j, B = (i + 1) * radial + j, C = (i + 1) * radial + j2, D = i * radial + j2;
    idx.push(A, D, B, B, D, C);
  }
  return { pos, idx };
}
function mergeList(list) {
  const pos = [], idx = [];
  for (const g of list) { const base = pos.length / 3; pos.push(...g.pos); idx.push(...g.idx.map(i => i + base)); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

const JAW_KEYS = new Set(['alveolar_inferior', 'mentual_n']);

export function buildAnatomy(geos) {
  const parts = [], SIDES = [1, -1];
  const add = (key, side, geo, where) => parts.push({ key, side, geo, where: where || (JAW_KEYS.has(key) ? 'jaw' : key === 'disco' ? 'disc' : 'skull') });
  const bones = { cranium: [], jaw: [], teethU: [], teethL: [] };
  for (const [name, geo] of Object.entries(geos)) {
    const [key, s] = name.split('|');
    if (key === 'cranium') bones.cranium.push(geo);
    else if (key === 'mandible') bones.jaw.push(geo);
    else if (key === 'teethU') bones.teethU.push(geo);
    else if (key === 'teethL') bones.teethL.push(geo);
    else add(key, +s, geo);
  }

  // Côndilos: a região mais alta de cada lado da mandíbula.
  const mp = geos['mandible|0'].attributes.position, C = {};
  const mbox = new THREE.Box3().setFromBufferAttribute(mp);
  const back = mbox.min.z + (mbox.max.z - mbox.min.z) * 0.3; // côndilo fica no terço posterior; o coronoide, à frente
  const ok = (i, s) => mp.getX(i) * s > 0.2 && mp.getZ(i) < back;
  for (const s of SIDES) {
    let top = -1e9;
    for (let i = 0; i < mp.count; i++) if (ok(i, s)) top = Math.max(top, mp.getY(i));
    const sum = v3(); let n = 0;
    for (let i = 0; i < mp.count; i++) if (ok(i, s) && mp.getY(i) > top - 0.05) { sum.add(v3(mp.getX(i), mp.getY(i), mp.getZ(i))); n++; }
    C[s] = sum.divideScalar(n).add(v3(0, -0.035, 0));
  }
  const pivot = v3(0, (C[1].y + C[-1].y) / 2, (C[1].z + C[-1].z) / 2);

  // ATM: côndilo, fossa e eminência recortados do osso real.
  for (const s of SIDES) {
    const c = C[s], temporal = geos['cranium|' + s];
    add('condilo', s, region(geos['mandible|0'], c, [0.09, 0.06, 0.07], (nn, m) => m.x * s > 0 && m.y > c.y - 0.05), 'jaw');
    add('fossa', s, region(temporal, c.clone().add(v3(0, 0.035, -0.005)), [0.085, 0.06, 0.07], nn => Math.abs(nn.y) > 0.25));
    add('eminencia', s, region(temporal, c.clone().add(v3(0, 0.01, 0.11)), [0.08, 0.05, 0.055], nn => Math.abs(nn.y) > 0.2));
  }

  // Bucinador: dos processos alveolares dos molares até o ângulo da boca.
  for (const s of SIDES) {
    const ub = new THREE.Box3().setFromBufferAttribute(geos['teethU|' + s].attributes.position);
    const lb = new THREE.Box3().setFromBufferAttribute(geos['teethL|' + s].attributes.position);
    const ob = new THREE.Box3().setFromBufferAttribute(geos['orbicular_boca|' + s].attributes.position);
    const occl = (ub.min.y + lb.max.y) / 2, back = Math.min(ub.min.z, lb.min.z) - 0.06;
    const lat = Math.max(...[ub.max.x, ub.min.x, lb.max.x, lb.min.x].map(Math.abs));
    const mod = v3(s > 0 ? ob.max.x : ob.min.x, (ob.min.y + ob.max.y) / 2, ob.min.z + (ob.max.z - ob.min.z) * 0.35);
    add('bucinador', s, mergeList(range(9).map(i => {
      const y = occl + (i - 4) * 0.026;
      return band([v3(s * (lat - 0.01), y, back), v3(s * (lat + 0.08), y, back + 0.18), v3(s * (lat + 0.06), y * 0.6 + mod.y * 0.4, back + 0.38), mod.clone().add(v3(-s * 0.01, (i - 4) * 0.006, 0))], 0.02, 0.008);
    })));
  }

  return { parts, bones, pivot, condyles: C };
}
