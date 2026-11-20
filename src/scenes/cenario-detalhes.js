// Detalhes de cenário em código, reaproveitáveis entre cenas: grama em
// tufos (instâncias), cerca de madeira, varal, bananeira, arbustos, pedras e
// árvores com galhos. Cada função recebe o relevo da cena: relevo(x, z) → y.

import * as THREE from 'three';

function aleatorio(semente) {
  let s = semente >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

const sombras = (m) => {
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
};

/**
 * Tufos de grama espalhados onde pode(x, z) for verdadeiro.
 * Uma InstancedMesh com lâminas finas: barata no celular.
 */
export function grama(relevo, { area = [-6, 6, -5, 5], quantidade = 7000, pode = () => true, semente = 7 } = {}) {
  const r = aleatorio(semente);
  const lamina = new THREE.ConeGeometry(0.022, 0.16, 3, 1, true);
  lamina.translate(0, 0.08, 0);
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.9, side: THREE.DoubleSide });
  const inst = new THREE.InstancedMesh(lamina, mat, quantidade);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const pos = new THREE.Vector3();
  const esc = new THREE.Vector3();
  const c = new THREE.Color();
  const tons = [0x6f9e4c, 0x82b25a, 0x5c8b3f, 0x9cbf66, 0x739f48];
  let n = 0;
  for (let tent = 0; tent < quantidade * 4 && n < quantidade; tent++) {
    const x = area[0] + r() * (area[1] - area[0]);
    const z = area[2] + r() * (area[3] - area[2]);
    if (!pode(x, z)) continue;
    pos.set(x, relevo(x, z) - 0.01, z);
    e.set((r() - 0.5) * 0.5, r() * Math.PI * 2, (r() - 0.5) * 0.5);
    q.setFromEuler(e);
    const s = 0.6 + r() * 0.9;
    esc.set(s, s * (0.7 + r() * 0.7), s);
    m.compose(pos, q, esc);
    inst.setMatrixAt(n, m);
    c.set(tons[Math.floor(r() * tons.length)]).multiplyScalar(0.85 + r() * 0.3);
    inst.setColorAt(n, c);
    n++;
  }
  inst.count = n;
  inst.receiveShadow = true;
  return inst;
}

/** Cerca de madeira entre dois pontos [x, z], com abertura (portão) opcional em [t0, t1] de 0 a 1. */
export function cerca(relevo, a, b, { vao = null, cor = 0xe8e1d2, altura = 0.42 } = {}) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: cor, roughness: 0.85 });
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const comp = Math.hypot(dx, dz);
  const ang = Math.atan2(dx, dz);
  const n = Math.round(comp / 0.16);
  const ripa = new THREE.BoxGeometry(0.07, altura, 0.02);
  ripa.translate(0, altura / 2, 0);
  const fora = (t) => vao && t > vao[0] && t < vao[1];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    if (fora(t)) continue;
    const x = a[0] + dx * t;
    const z = a[1] + dz * t;
    const m = sombras(new THREE.Mesh(ripa, mat));
    m.position.set(x, relevo(x, z) - 0.03, z);
    m.rotation.y = ang + Math.PI / 2;
    m.scale.y = i % 2 ? 0.92 : 1;
    g.add(m);
  }
  // travessas em trechos contínuos
  const trechos = vao ? [[0, vao[0]], [vao[1], 1]] : [[0, 1]];
  for (const [t0, t1] of trechos) {
    for (const yRel of [0.12, 0.32]) {
      const l = comp * (t1 - t0);
      const tm = (t0 + t1) / 2;
      const x = a[0] + dx * tm;
      const z = a[1] + dz * tm;
      const trav = sombras(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.05, l), mat));
      trav.position.set(x, relevo(x, z) + yRel * (altura / 0.42), z - 0.0);
      trav.rotation.y = ang;
      trav.position.x += Math.cos(ang) * -0.02;
      trav.position.z += -Math.sin(ang) * -0.02;
      g.add(trav);
    }
  }
  return g;
}

/** Varal com duas estacas, fio e roupas penduradas. */
export function varal(relevo, a, b) {
  const g = new THREE.Group();
  const matPau = new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: 1 });
  const alt = 1.05;
  const pa = new THREE.Vector3(a[0], relevo(...a) + alt, a[1]);
  const pb = new THREE.Vector3(b[0], relevo(...b) + alt, b[1]);
  for (const [x, z] of [a, b]) {
    const est = sombras(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, alt + 0.05, 6), matPau));
    est.position.set(x, relevo(x, z) + alt / 2, z);
    g.add(est);
  }
  const fio = new THREE.Line(new THREE.BufferGeometry().setFromPoints([pa, pb]), new THREE.LineBasicMaterial({ color: 0x555555 }));
  g.add(fio);
  const cores = [0xd9534f, 0xf2f2f2, 0x3b6fb6, 0xf0c419, 0x5aa469];
  const roupas = [];
  for (let i = 0; i < 5; i++) {
    const t = 0.15 + i * 0.17;
    const p = pa.clone().lerp(pb, t);
    const w = 0.2 + (i % 2) * 0.08;
    const h = 0.28 + ((i * 7) % 3) * 0.06;
    const pano = new THREE.Mesh(new THREE.PlaneGeometry(w, h, 2, 3), new THREE.MeshStandardMaterial({ color: cores[i], roughness: 0.9, side: THREE.DoubleSide }));
    pano.castShadow = true;
    pano.position.set(p.x, p.y - h / 2, p.z);
    pano.rotation.y = Math.atan2(pb.x - pa.x, pb.z - pa.z) + Math.PI / 2;
    g.add(pano);
    roupas.push(pano);
  }
  g.userData.roupas = roupas;
  return g;
}

/** Bananeira: pseudocaule e folhas largas arqueadas. */
export function bananeira(relevo, x, z, esc = 1, semente = 3) {
  const r = aleatorio(semente);
  const g = new THREE.Group();
  const caule = sombras(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 1.1, 10), new THREE.MeshStandardMaterial({ color: 0x7e8a4a, roughness: 0.9 })));
  caule.position.y = 0.55;
  g.add(caule);
  const matFolha = new THREE.MeshStandardMaterial({ color: 0x5f9a3c, roughness: 0.7, side: THREE.DoubleSide });
  const forma = new THREE.Shape();
  forma.moveTo(0, 0);
  forma.quadraticCurveTo(0.16, 0.35, 0.02, 0.95);
  forma.lineTo(-0.02, 0.95);
  forma.quadraticCurveTo(-0.16, 0.35, 0, 0);
  const geo = new THREE.ShapeGeometry(forma, 8);
  // arqueia a folha para baixo na ponta
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    pos.setZ(i, -0.35 * y * y);
  }
  geo.computeVertexNormals();
  for (let i = 0; i < 7; i++) {
    const f = new THREE.Mesh(geo, matFolha);
    f.castShadow = true;
    f.position.y = 1.05;
    f.rotation.set(-0.5 - r() * 0.4, (i / 7) * Math.PI * 2 + r() * 0.4, 0, 'YXZ');
    f.scale.setScalar(0.9 + r() * 0.4);
    g.add(f);
  }
  g.scale.setScalar(esc);
  g.position.set(x, relevo(x, z), z);
  return g;
}

/** Arbusto: tufos de folhagem com tons variados. */
export function arbusto(relevo, x, z, esc = 1, semente = 1) {
  const r = aleatorio(semente);
  const g = new THREE.Group();
  const tons = [0x3f7d3a, 0x4f8f42, 0x356c33, 0x5e9a4a];
  for (let i = 0; i < 5; i++) {
    const m = sombras(new THREE.Mesh(new THREE.IcosahedronGeometry(0.18 + r() * 0.1, 1), new THREE.MeshStandardMaterial({ color: tons[i % 4], roughness: 0.9 })));
    m.position.set((r() - 0.5) * 0.35, 0.14 + r() * 0.14, (r() - 0.5) * 0.35);
    g.add(m);
  }
  g.scale.setScalar(esc);
  g.position.set(x, relevo(x, z), z);
  return g;
}

/** Pedras soltas, meio enterradas. */
export function pedras(relevo, pontos, semente = 11) {
  const r = aleatorio(semente);
  const g = new THREE.Group();
  for (const [x, z, t] of pontos) {
    const geo = new THREE.DodecahedronGeometry(t, 0);
    const p = sombras(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: new THREE.Color(0x8a8378).multiplyScalar(0.85 + r() * 0.3), roughness: 1, flatShading: true })));
    p.position.set(x, relevo(x, z) + t * 0.25, z);
    p.rotation.set(r() * 3, r() * 3, r() * 3);
    p.scale.set(1, 0.7, 1.1);
    g.add(p);
  }
  return g;
}

/**
 * Copa de árvore em muitos tufos, com galhos saindo do tronco.
 * Adiciona ao grupo g, a partir da altura do tronco.
 */
export function copaRealista(g, alturaTronco, { raio = 0.75, semente = 5, tons = [0x3f7d4a, 0x4b8b45, 0x356e3f, 0x5a9a4c, 0x447f3e] } = {}) {
  const r = aleatorio(semente);
  const matGalho = new THREE.MeshStandardMaterial({ color: 0x5f432b, roughness: 1 });
  for (let i = 0; i < 4; i++) {
    const galho = sombras(new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.05, raio * 0.9, 6), matGalho));
    galho.geometry.translate(0, raio * 0.45, 0);
    galho.position.y = alturaTronco - 0.1;
    galho.rotation.set(0.7 + r() * 0.3, (i / 4) * Math.PI * 2 + r(), 0, 'YXZ');
    g.add(galho);
  }
  for (let i = 0; i < 11; i++) {
    const ang = r() * Math.PI * 2;
    const dist = r() * raio * 0.75;
    const tuf = sombras(new THREE.Mesh(new THREE.IcosahedronGeometry(raio * (0.38 + r() * 0.22), 1), new THREE.MeshStandardMaterial({ color: tons[i % tons.length], roughness: 0.85 })));
    tuf.position.set(Math.cos(ang) * dist, alturaTronco + raio * 0.35 + r() * raio * 0.7, Math.sin(ang) * dist);
    tuf.scale.y = 0.85;
    g.add(tuf);
  }
}
