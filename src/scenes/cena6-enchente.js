// Cena 6 ("Durante a emergência"): bairro de baixada sob chuva. Um rio corta a
// rua por baixo de um pontilhão; a água sobe devagar, cobre a rua e a ponte e
// chega ao carro. A casa da família fica num terreno um pouco mais alto, de
// onde sai um caminho a pé, sem atravessar a água, até o local seguro no morro.
// Conteúdo: F1, F2 e F3. Tudo em código, sem créditos.

import * as THREE from 'three';
import * as TX from './texturas.js';
import { criarCasa } from './casa-realista.js';
import { grama, cerca, arbusto, pedras, bananeira, copaRealista } from './cenario-detalhes.js';

const LARGURA = 15;
const PROFUNDIDADE = 10;
const FUNDO = -1.6;
const LARANJA = 0xf77f00;

const smooth = (t) => {
  const x = Math.min(Math.max(t, 0), 1);
  return x * x * (3 - 2 * x);
};
const caixaSuave = (x, z, x0, x1, z0, z1, borda) =>
  smooth((x - x0) / borda) * smooth((x1 - x) / borda) * smooth((z - z0) / borda) * smooth((z1 - z) / borda);

// Lugares
const RIO_X = -1.8;
const RIO_MEIA = 0.55;
const RUA = { z0: 0.35, z1: 1.35, x1: 2.5 };
const CASA_FAMILIA = { x: 0.6, z: -1.9, w: 2.4, h: 1.45, d: 1.9 };
const PORTA = [0.0, -0.85];
const LOCAL_SEGURO = [5.3, -2.3];
const CARRO = [0.15, 0.85];
const NIVEL_RIO = -0.2;
const NIVEL_CHEIA = 0.2;

// Baixada plana; rio em calha; terreno da família um pouco acima; morro à direita.
export function relevo(x, z) {
  const morro = 1.25 * smooth((x - 2.4) / 2.4) * smooth((0.6 - z) / 2.2);
  const lote = 0.3 * caixaSuave(x, z, -0.95, 3.2, -3.6, -0.25, 0.35);
  const rio = -0.5 * smooth(1 - Math.abs(x - RIO_X) / RIO_MEIA);
  const ondula = 0.03 * Math.sin(x * 1.1 + z * 0.7);
  return Math.max(morro, lote) + rio + ondula * (1 - smooth(1 - Math.abs(x - RIO_X) / (RIO_MEIA + 0.3)));
}

export const ENQUADRAMENTOS_ENCHENTE = {
  geral: { centro: [0.3, 0.3, 0.2], largura: 15.5, altura: 10.5 },
  casa: { centro: [0.7, 0.7, -1.3], largura: 8.4, altura: 6.0 },
  rua: { centro: [-1.4, 0.2, 0.5], largura: 10.0, altura: 6.9 },
  carro: { centro: [0.6, 0.3, 0.6], largura: 8.0, altura: 5.6 },
  local: { centro: [2.9, 0.8, -1.3], largura: 9.8, altura: 6.8 },
  contato: { centro: [3.4, 0.9, -1.0], largura: 9.5, altura: 6.6 },
};

export const POSICOES_AGENTE_ENCHENTE = {
  geral: [2.3, -0.55],
  casa: [2.1, -0.6],
  rua: [-0.45, -0.55],
  carro: [1.5, -0.5],
  local: [4.5, -1.35],
  contato: [4.5, -1.35],
};

const POS_VIZINHO = [0.45, -0.6];
export const VIZINHOS_ENCHENTE = {
  encosta: { chave: 'vizinhoEncosta', pos: POS_VIZINHO },
  baixada: { chave: 'vizinhoBaixada', pos: POS_VIZINHO },
  aberto: { chave: 'vizinhoAberto', pos: POS_VIZINHO },
};

// Caminho a pé, pelo alto, da casa até o local seguro (não cruza a água).
export const CAMINHO_SEGURO = [
  [0.45, -0.6],
  [1.8, -0.55],
  [2.9, -0.95],
  [3.8, -1.5],
  [4.6, -2.0],
];

// ---------- Terreno ----------

function faixa(x0, x1, z0, z1, mat, dy = 0.012, seg = 40, alturaY = relevo) {
  const geo = new THREE.PlaneGeometry(x1 - x0, z1 - z0, seg, 4);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + (x0 + x1) / 2;
    const z = pos.getZ(i) + (z0 + z1) / 2;
    pos.setXYZ(i, x, alturaY(x, z) + dy, z);
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat);
  m.receiveShadow = true;
  return m;
}

function asfalto() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#4b4d50';
  g.fillRect(0, 0, 512, 64);
  for (let i = 0; i < 5000; i++) {
    g.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.1)';
    g.fillRect(Math.random() * 512, Math.random() * 64, 2, 2);
  }
  g.fillStyle = '#e8d36a';
  for (let x = 10; x < 512; x += 64) g.fillRect(x, 30, 34, 4);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.repeat.set(4, 1);
  return t;
}

// A rua fica plana (y = 0) e passa por cima do rio no pontilhão.
const alturaRua = (x, z) => (Math.abs(x - RIO_X) < RIO_MEIA + 0.1 ? 0 : Math.max(relevo(x, z), 0));

function terreno() {
  const g = new THREE.Group();
  const geo = new THREE.PlaneGeometry(LARGURA, PROFUNDIDADE, 120, 84);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const cores = [];
  const c = new THREE.Color();
  const g1 = new THREE.Color(0x8cbf6a);
  const g2 = new THREE.Color(0x6fa452);
  const barro = new THREE.Color(0x8a6c4a);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = relevo(x, z);
    pos.setY(i, y);
    const ruido = 0.5 + 0.25 * Math.sin(x * 1.3 + z * 0.8) + 0.25 * Math.sin(z * 2.1 - x * 0.6);
    c.copy(g1).lerp(g2, ruido * 0.5);
    if (y < -0.05) c.lerp(barro, smooth((-0.05 - y) / 0.25));
    cores.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cores, 3));
  geo.computeVertexNormals();
  const chao = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, map: TX.grama(), roughness: 0.95 }));
  chao.receiveShadow = true;
  g.add(chao);

  // Rua com calçadas, interrompida pelo pontilhão
  const x0 = -LARGURA / 2;
  const matRua = new THREE.MeshStandardMaterial({ map: asfalto(), roughness: 0.9 });
  const matCalcada = new THREE.MeshStandardMaterial({ map: TX.cimento(), roughness: 0.95 });
  for (const [a, b] of [
    [x0, RIO_X - RIO_MEIA - 0.05],
    [RIO_X + RIO_MEIA + 0.05, RUA.x1],
  ]) {
    g.add(faixa(a, b, RUA.z0, RUA.z1, matRua, 0.015, 40, alturaRua));
    g.add(faixa(a, b, RUA.z0 - 0.4, RUA.z0, matCalcada, 0.05, 40, alturaRua));
    g.add(faixa(a, b, RUA.z1, RUA.z1 + 0.4, matCalcada, 0.05, 40, alturaRua));
  }

  // Estrada de terra que sobe o morro a partir do fim da rua
  const terra = new THREE.MeshStandardMaterial({ color: 0xb79a72, roughness: 1 });
  g.add(fita([[2.3, 0.85], [3.3, 0.7], [4.4, 0.9], [5.6, 1.6], [6.9, 2.0]], 0.4, terra));
  // Caminho a pé de chão batido, da casa ao local seguro
  g.add(fita(CAMINHO_SEGURO, 0.22, new THREE.MeshStandardMaterial({ color: 0xc2a47c, roughness: 1 })));

  // Laterais do diorama
  const matSolo = new THREE.MeshStandardMaterial({ map: TX.solo(), roughness: 1, side: THREE.DoubleSide });
  const lados = [
    (u) => [-LARGURA / 2 + u * LARGURA, PROFUNDIDADE / 2],
    (u) => [LARGURA / 2, -PROFUNDIDADE / 2 + u * PROFUNDIDADE],
    (u) => [-LARGURA / 2 + u * LARGURA, -PROFUNDIDADE / 2],
    (u) => [-LARGURA / 2, -PROFUNDIDADE / 2 + u * PROFUNDIDADE],
  ];
  for (const ladoF of lados) {
    const n = 100;
    const pp = [];
    const uv = [];
    const ii = [];
    for (let i = 0; i <= n; i++) {
      const [x, z] = ladoF(i / n);
      pp.push(x, relevo(x, z), z, x, FUNDO, z);
      uv.push((i / n) * 3, 1, (i / n) * 3, 0);
      if (i < n) ii.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    }
    const gl = new THREE.BufferGeometry();
    gl.setAttribute('position', new THREE.Float32BufferAttribute(pp, 3));
    gl.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    gl.setIndex(ii);
    gl.computeVertexNormals();
    g.add(new THREE.Mesh(gl, matSolo));
  }
  return g;
}

// Faixa que acompanha o relevo ao longo de uma polilinha suavizada.
function fita(pontos, meia, mat) {
  const curva = new THREE.CatmullRomCurve3(pontos.map(([x, z]) => new THREE.Vector3(x, 0, z)));
  const N = 40;
  const p = [];
  const idx = [];
  const lado = new THREE.Vector3();
  const t = new THREE.Vector3();
  curva.getSpacedPoints(N).forEach((q, i) => {
    curva.getTangentAt(Math.min(i / N, 0.999), t);
    lado.set(-t.z, 0, t.x).normalize().multiplyScalar(meia);
    for (const s of [-1, 1]) {
      const v = q.clone().addScaledVector(lado, s);
      p.push(v.x, relevo(v.x, v.z) + 0.02, v.z);
    }
    if (i < N) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat);
  m.receiveShadow = true;
  return m;
}

// ---------- Objetos ----------

function casa({ x, z, w = 2.2, h = 1.35, d = 1.8, cor, semente, rot = 0, caixaDagua = true, aberturas }) {
  const g = criarCasa({ w, h, d, cor, semente, caixaDagua, aberturas });
  g.position.set(x, relevo(x, z), z);
  g.rotation.y = rot;
  return g;
}

function arvore(x, z, esc = 1, semente = 1) {
  const g = new THREE.Group();
  const tronco = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 0.8, 8), new THREE.MeshStandardMaterial({ color: 0x6b4a2e, roughness: 1 }));
  tronco.position.y = 0.4;
  tronco.castShadow = true;
  g.add(tronco);
  copaRealista(g, 0.7, { raio: 0.6, semente });
  g.scale.setScalar(esc);
  g.position.set(x, relevo(x, z), z);
  return g;
}

// Pontilhão de concreto baixo, com guarda-corpo, sobre o rio.
function pontilhao() {
  const g = new THREE.Group();
  const concreto = new THREE.MeshStandardMaterial({ map: TX.cimento(), roughness: 0.95 });
  const largura = RIO_MEIA * 2 + 0.3;
  const tab = new THREE.Mesh(new THREE.BoxGeometry(largura, 0.1, RUA.z1 - RUA.z0 + 0.8), concreto);
  tab.position.set(RIO_X, -0.035, (RUA.z0 + RUA.z1) / 2);
  tab.castShadow = tab.receiveShadow = true;
  g.add(tab);
  const asf = new THREE.Mesh(new THREE.PlaneGeometry(largura, RUA.z1 - RUA.z0), new THREE.MeshStandardMaterial({ color: 0x4b4d50, roughness: 0.9 }));
  asf.rotation.x = -Math.PI / 2;
  asf.position.set(RIO_X, 0.017, (RUA.z0 + RUA.z1) / 2);
  asf.receiveShadow = true;
  g.add(asf);
  for (const z of [RUA.z0 - 0.36, RUA.z1 + 0.36]) {
    const mureta = new THREE.Mesh(new THREE.BoxGeometry(largura, 0.14, 0.06), concreto);
    mureta.position.set(RIO_X, 0.085, z);
    mureta.castShadow = true;
    g.add(mureta);
  }
  // pilares
  for (const z of [RUA.z0 - 0.2, RUA.z1 + 0.2]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.5, 0.14), concreto);
    p.position.set(RIO_X, -0.3, z);
    g.add(p);
  }
  return g;
}

// Carro compacto estilizado (carroceria, cabine com vidros, rodas).
function carro() {
  const g = new THREE.Group();
  const pintura = new THREE.MeshPhysicalMaterial({ color: 0xb33a2e, roughness: 0.35, metalness: 0.3, clearcoat: 0.8 });
  const vidro = new THREE.MeshPhysicalMaterial({ color: 0x1f3442, roughness: 0.08, metalness: 0.2, clearcoat: 1 });
  const pneu = new THREE.MeshStandardMaterial({ color: 0x1d1d1f, roughness: 0.9 });
  const aro = new THREE.MeshStandardMaterial({ color: 0xbfc3c7, roughness: 0.3, metalness: 0.8 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.24, 0.52), pintura);
  base.position.y = 0.21;
  const cabine = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 0.48), pintura);
  cabine.position.set(-0.06, 0.42, 0);
  const vf = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.15, 0.42), vidro);
  vf.position.set(0.25, 0.42, 0);
  vf.rotation.z = -0.35;
  const vt = vf.clone();
  vt.position.x = -0.37;
  vt.rotation.z = 0.35;
  const vl = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.13, 0.49), vidro);
  vl.position.set(-0.06, 0.43, 0);
  g.add(base, cabine, vf, vt, vl);
  for (const [x, z] of [
    [0.33, 0.25],
    [-0.33, 0.25],
    [0.33, -0.25],
    [-0.33, -0.25],
  ]) {
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.08, 16), pneu);
    r.rotation.x = Math.PI / 2;
    r.position.set(x, 0.11, z);
    const a = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.085, 12), aro);
    a.rotation.x = Math.PI / 2;
    a.position.copy(r.position);
    g.add(r, a);
  }
  const farol = new THREE.MeshStandardMaterial({ color: 0xfff6d8, emissive: 0x332a10, roughness: 0.2 });
  for (const z of [-0.18, 0.18]) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.05, 0.1), farol);
    f.position.set(0.555, 0.25, z);
    g.add(f);
  }
  g.traverse((o) => o.isMesh && (o.castShadow = true));
  return g;
}

// Botijão de gás com registro (a borboleta gira ao fechar).
function botijao() {
  const g = new THREE.Group();
  const corpo = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.3, 18), new THREE.MeshStandardMaterial({ color: 0x5a7690, roughness: 0.5, metalness: 0.3 }));
  corpo.position.y = 0.18;
  const topo = new THREE.Mesh(new THREE.SphereGeometry(0.13, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), corpo.material);
  topo.position.y = 0.33;
  topo.scale.y = 0.45;
  const alca = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.012, 6, 16, Math.PI), new THREE.MeshStandardMaterial({ color: 0x5a7690, roughness: 0.5 }));
  alca.position.y = 0.42;
  const valvula = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.06, 8), new THREE.MeshStandardMaterial({ color: 0xb0a070, metalness: 0.7, roughness: 0.3 }));
  valvula.position.y = 0.42;
  const borboleta = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.02, 0.025), new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.5 }));
  borboleta.position.y = 0.46;
  const mangueira = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.44, 0), new THREE.Vector3(0.12, 0.38, 0), new THREE.Vector3(0.2, 0.3, -0.02)]), 12, 0.012, 6),
    new THREE.MeshStandardMaterial({ color: 0x555a5e, roughness: 0.8 }),
  );
  g.add(corpo, topo, alca, valvula, borboleta, mangueira);
  g.traverse((o) => o.isMesh && (o.castShadow = true));
  return { grupo: g, borboleta };
}

// Registro de água no muro da frente: cano, caixinha e volante azul.
function registroAgua() {
  const g = new THREE.Group();
  const caixa = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.24, 0.12), new THREE.MeshStandardMaterial({ color: 0xd9d6cf, roughness: 0.7 }));
  caixa.position.y = 0.2;
  const cano = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.18, 8), new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.4 }));
  cano.rotation.z = Math.PI / 2;
  cano.position.set(0, 0.2, 0.07);
  const volante = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.012, 6, 16), new THREE.MeshStandardMaterial({ color: 0x2f6fb0, roughness: 0.4 }));
  volante.position.set(0, 0.2, 0.1);
  const raio = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.012, 0.012), volante.material);
  volante.add(raio);
  g.add(caixa, cano, volante);
  g.traverse((o) => o.isMesh && (o.castShadow = true));
  return { grupo: g, volante };
}

// Água da cheia: plano único que sobe; o terreno alto fica por cima dele.
function aguaCheia() {
  const tex = TX.barrenta().clone();
  tex.needsUpdate = true;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 4);
  const geo = new THREE.PlaneGeometry(LARGURA - 0.02, PROFUNDIDADE - 0.02, 1, 1);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshStandardMaterial({ map: tex, color: 0xb59a78, roughness: 0.06, metalness: 0.1, transparent: true, opacity: 0.82 });
  const m = new THREE.Mesh(geo, mat);
  m.receiveShadow = true;
  m.renderOrder = 1;
  // Paredes da água nas bordas do diorama, para não ficar oca de lado
  const borda = new THREE.Group();
  const matBorda = new THREE.MeshStandardMaterial({ color: 0x7d6446, roughness: 0.3, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
  for (const [x, z, ry, l] of [
    [0, PROFUNDIDADE / 2 - 0.01, 0, LARGURA],
    [0, -PROFUNDIDADE / 2 + 0.01, 0, LARGURA],
    [-LARGURA / 2 + 0.01, 0, Math.PI / 2, PROFUNDIDADE],
  ]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(l, 1), matBorda);
    p.geometry.translate(0, -0.5, 0);
    p.position.set(x, 0, z);
    p.rotation.y = ry;
    borda.add(p);
  }
  return { malha: m, borda, tex, mat };
}

// Marca laranja de "não atravesse": X sobre um disco, sempre de frente.
function marcaX() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#f77f00';
  ctx.beginPath();
  ctx.arc(64, 64, 60, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 14;
  ctx.lineCap = 'square';
  ctx.beginPath();
  ctx.moveTo(40, 40);
  ctx.lineTo(88, 88);
  ctx.moveTo(88, 40);
  ctx.lineTo(40, 88);
  ctx.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0, depthTest: false }));
  s.scale.set(0.55, 0.55, 1);
  s.renderOrder = 10;
  return s;
}

// Pino com telefone e o número 199.
function pino199() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#f77f00';
  ctx.fillRect(0, 0, 256, 128);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(42, 34);
  ctx.quadraticCurveTo(26, 40, 32, 62);
  ctx.quadraticCurveTo(42, 88, 66, 96);
  ctx.quadraticCurveTo(84, 100, 88, 86);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 64px Montserrat, Arial, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText('199', 108, 68);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0, depthTest: false }));
  s.scale.set(1.0, 0.5, 1);
  s.renderOrder = 10;
  return s;
}

// Local seguro no alto: piso, cobertura simples e mastro com bandeira laranja.
function localSeguro() {
  const [x, z] = LOCAL_SEGURO;
  const g = new THREE.Group();
  g.position.set(x, relevo(x, z), z);
  const piso = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.05, 0.1, 40), new THREE.MeshStandardMaterial({ map: TX.cimento(), roughness: 0.95 }));
  piso.receiveShadow = true;
  g.add(piso);
  // cobertura de quatro pilares
  const metal = new THREE.MeshStandardMaterial({ color: 0xdedede, roughness: 0.4, metalness: 0.5 });
  for (const [px, pz] of [
    [-0.45, -0.35],
    [0.45, -0.35],
    [-0.45, 0.35],
    [0.45, 0.35],
  ]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.8, 8), metal);
    p.position.set(px - 0.2, 0.45, pz - 0.2);
    p.castShadow = true;
    g.add(p);
  }
  const teto = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.05, 0.9), new THREE.MeshStandardMaterial({ color: 0x3a4a8a, roughness: 0.6 }));
  teto.position.set(-0.2, 0.87, -0.2);
  teto.castShadow = true;
  g.add(teto);
  const madeira = new THREE.MeshStandardMaterial({ color: 0x8a5a36, roughness: 0.8 });
  const banco = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.05, 0.2), madeira);
  banco.position.set(-0.2, 0.25, -0.45);
  banco.castShadow = true;
  g.add(banco);

  const mastro = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 1.7, 8), new THREE.MeshStandardMaterial({ color: 0xd7d7d7, metalness: 0.6, roughness: 0.3 }));
  mastro.position.set(0.6, 0.85, 0.45);
  mastro.castShadow = true;
  g.add(mastro);
  const bandeira = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.32, 8, 2), new THREE.MeshStandardMaterial({ color: LARANJA, roughness: 0.7, side: THREE.DoubleSide }));
  bandeira.geometry.translate(0.25, -0.16, 0);
  bandeira.position.set(0.62, 0.4, 0.45);
  bandeira.castShadow = true;
  g.add(bandeira);
  const anel = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.25, 48), new THREE.MeshBasicMaterial({ color: LARANJA, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
  anel.rotation.x = -Math.PI / 2;
  anel.position.y = 0.07;
  anel.renderOrder = 3;
  g.add(anel);
  const ancora = new THREE.Object3D();
  ancora.position.set(0.2, 1.7, 0.3);
  g.add(ancora);
  return { grupo: g, bandeira, anel, ancora };
}

function pontosRota(caminho, espaco = 0.22) {
  const curva = new THREE.CatmullRomCurve3(caminho.map(([x, z]) => new THREE.Vector3(x, 0, z)));
  const n = Math.floor(curva.getLength() / espaco);
  const geo = new THREE.CylinderGeometry(0.06, 0.06, 0.03, 12);
  const inst = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: LARANJA }), n + 1);
  const m = new THREE.Matrix4();
  for (let i = 0; i <= n; i++) {
    const p = curva.getPointAt(i / n);
    m.makeTranslation(p.x, relevo(p.x, p.z) + 0.06, p.z);
    inst.setMatrixAt(i, m);
  }
  inst.count = 0;
  inst.userData.total = n + 1;
  inst.renderOrder = 4;
  return inst;
}

// Ondas concêntricas na água (contato com a água da enchente).
function ondas() {
  const g = new THREE.Group();
  const aneis = [];
  for (let i = 0; i < 3; i++) {
    const a = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.25, 40), new THREE.MeshBasicMaterial({ color: 0x5a3f22, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
    a.rotation.x = -Math.PI / 2;
    a.renderOrder = 3;
    g.add(a);
    aneis.push(a);
  }
  return { grupo: g, aneis };
}

// Chuva leve sobre o diorama.
function chuva() {
  const N = 600;
  const pos = new Float32Array(N * 6);
  for (let i = 0; i < N; i++) {
    const x = (Math.random() - 0.5) * LARGURA;
    const z = (Math.random() - 0.5) * PROFUNDIDADE;
    const y = Math.random() * 7;
    pos.set([x, y, z, x - 0.04, y + 0.38, z], i * 6);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xd6e6ff, transparent: true, opacity: 0, depthWrite: false }));
  m.frustumCulled = false;
  return m;
}

// ---------- Cena ----------

export function criarCenaEnchente({ palco }) {
  const raiz = new THREE.Group();
  raiz.name = 'cena-enchente';
  raiz.add(terreno());

  const { x: cx, z: cz, w, h, d } = CASA_FAMILIA;
  const casaFamilia = casa({
    ...CASA_FAMILIA,
    cor: '#f3e3c4',
    semente: 121,
    aberturas: [
      { face: 'frente', tipo: 'porta', u: 0.25, largura: 0.22, altura: 0.62 },
      { face: 'frente', tipo: 'janela', u: 0.62, v: 0.52, largura: 0.28, altura: 0.27 },
      { face: 'oeste', tipo: 'janela', u: 0.5, v: 0.52, largura: 0.34, altura: 0.27 },
      { face: 'leste', tipo: 'janela', u: 0.5, v: 0.52, largura: 0.3, altura: 0.27 },
    ],
  });
  raiz.add(casaFamilia);
  const yCasa = relevo(cx, cz);

  // Luz do relógio de energia (apaga ao desligar)
  const lampada = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), new THREE.MeshStandardMaterial({ color: 0x47d16b, emissive: 0x2fd35a, emissiveIntensity: 1.6 }));
  lampada.position.set(cx + w / 2 - 0.2, yCasa + h * 0.62 + 0.17, cz + d / 2 + 0.09);
  raiz.add(lampada);
  // Botijão encostado na lateral oeste; registro de água na frente
  const objGas = botijao();
  objGas.grupo.position.set(cx - w / 2 - 0.2, relevo(cx - w / 2 - 0.2, cz + 0.4), cz + 0.4);
  raiz.add(objGas.grupo);
  const objRegistro = registroAgua();
  objRegistro.grupo.position.set(cx + w / 2 - 0.55, relevo(cx + w / 2 - 0.55, cz + d / 2 + 0.25), cz + d / 2 + 0.25);
  raiz.add(objRegistro.grupo);

  // Vizinhança da baixada
  raiz.add(
    casa({ x: -4.4, z: -1.8, w: 2.2, cor: '#dfe7ea', semente: 123 }),
    casa({ x: -6.9, z: -1.9, w: 1.6, cor: '#efe0cf', semente: 125, caixaDagua: false }),
    casa({ x: -5.2, z: 3.3, rot: Math.PI, w: 2.3, cor: '#e6edd9', semente: 127 }),
    casa({ x: -0.2, z: 3.4, rot: Math.PI, w: 2.0, cor: '#e9dcc0', semente: 129, caixaDagua: false }),
    casa({ x: 5.8, z: 3.6, rot: Math.PI, w: 1.8, h: 1.2, d: 1.5, cor: '#d8e2e6', semente: 131 }),
  );
  raiz.add(pontilhao());
  const objCarro = carro();
  objCarro.position.set(CARRO[0], 0.016, CARRO[1]);
  objCarro.rotation.y = 0.08;
  raiz.add(objCarro);

  raiz.add(
    cerca(relevo, [-0.85, -0.3], [3.0, -0.3], { vao: [0.24, 0.4] }),
    arvore(-3.0, -3.8, 1.0, 3),
    arvore(-6.8, -4.0, 0.9, 5),
    arvore(2.6, -3.8, 1.0, 7),
    arvore(6.7, -3.9, 0.9, 9),
    arvore(6.6, -0.2, 0.9, 11),
    arvore(-2.7, 4.1, 0.9, 13),
    arvore(3.4, 3.2, 1.0, 15),
    bananeira(relevo, -0.9, -3.3, 0.9, 6),
    bananeira(relevo, 2.6, 4.3, 0.9, 8),
    arbusto(relevo, 2.9, -2.1, 1.0, 3),
    arbusto(relevo, -2.6, -1.2, 0.9, 5),
    arbusto(relevo, -1.1, -1.4, 0.8, 7),
    arbusto(relevo, 4.2, 0.0, 1.0, 9),
    pedras(relevo, [
      [-1.45, -2.4, 0.1],
      [-2.2, 2.6, 0.12],
      [4.0, -3.1, 0.12],
      [6.2, -1.2, 0.1],
    ]),
  );
  const ocupado = (x, z) => {
    if (z > RUA.z0 - 0.45 && z < RUA.z1 + 0.45 && x < RUA.x1 + 0.1) return true;
    if (Math.abs(x - RIO_X) < RIO_MEIA + 0.1) return true;
    if (Math.hypot(x - LOCAL_SEGURO[0], z - LOCAL_SEGURO[1]) < 1.15) return true;
    if (relevo(x, z) < 0.02 && x < 2.4) return false; // grama na baixada fica: some sob a água
    const casas = [
      [0.6, -1.9, 1.35, 1.1],
      [-4.4, -1.8, 1.25, 1.05],
      [-6.9, -1.9, 0.95, 1.05],
      [-5.2, 3.3, 1.3, 1.05],
      [-0.2, 3.4, 1.15, 1.05],
      [5.8, 3.6, 1.05, 0.9],
    ];
    return casas.some(([hx, hz, ax, az]) => Math.abs(x - hx) < ax && Math.abs(z - hz) < az);
  };
  raiz.add(
    grama(relevo, {
      area: [-LARGURA / 2 + 0.05, LARGURA / 2 - 0.05, -PROFUNDIDADE / 2 + 0.05, PROFUNDIDADE / 2 - 0.05],
      quantidade: 9000,
      pode: (x, z) => !ocupado(x, z),
      semente: 17,
    }),
  );

  // Efeitos
  const objAgua = aguaCheia();
  raiz.add(objAgua.malha, objAgua.borda);
  const objChuva = chuva();
  raiz.add(objChuva);
  const xRua = marcaX();
  xRua.position.set(-4.0, 0.75, (RUA.z0 + RUA.z1) / 2);
  const xPonte = marcaX();
  xPonte.position.set(RIO_X, 0.75, (RUA.z0 + RUA.z1) / 2);
  raiz.add(xRua, xPonte);
  const rota = pontosRota(CAMINHO_SEGURO);
  raiz.add(rota);
  const objLocal = localSeguro();
  raiz.add(objLocal.grupo);
  const pino = pino199();
  pino.position.set(LOCAL_SEGURO[0] - 0.2, relevo(...LOCAL_SEGURO) + 2.1, LOCAL_SEGURO[1] + 0.3);
  raiz.add(pino);
  const objOndas = ondas();
  objOndas.grupo.position.set(-0.9, 0, 0.85);
  raiz.add(objOndas.grupo);

  const ancora = (x, y, z) => {
    const o = new THREE.Object3D();
    o.position.set(x, y, z);
    raiz.add(o);
    return o;
  };
  const ancoras = {
    energia: ancora(lampada.position.x, lampada.position.y, lampada.position.z + 0.04),
    gas: ancora(objGas.grupo.position.x, objGas.grupo.position.y + 0.75, objGas.grupo.position.z),
    registro: ancora(objRegistro.grupo.position.x, objRegistro.grupo.position.y + 0.6, objRegistro.grupo.position.z),
    rua: xRua,
    ponte: xPonte,
    carro: ancora(CARRO[0], 0.95, CARRO[1]),
    caminho: ancora(2.9, relevo(2.9, -0.95) + 0.5, -0.95),
    local: objLocal.ancora,
    agua: ancora(-0.9, 0.7, 0.85),
    telefone: pino,
  };

  const estado = { chuva: 0, energia: 0, gas: 0, registro: 0, agua: 0, xrua: 0, xponte: 0, carro: 0, rota: 0, ponto: 0, contaminada: 0, telefone: 0 };
  const DURACAO = { chuva: 1.2, energia: 1.2, gas: 1.4, registro: 1.4, agua: 4.5, xrua: 1.0, xponte: 1.0, carro: 2.4, rota: 3.0, ponto: 2.0, contaminada: 2.0, telefone: 1.6 };
  const corLuz = new THREE.Color(0x2fd35a);
  const corApagada = new THREE.Color(0x000000);
  const lampVerde = new THREE.Color(0x47d16b);
  const lampCinza = new THREE.Color(0x5a5f62);
  const aguaLimpa = new THREE.Color(0xb59a78);
  const aguaSuja = new THREE.Color(0x8c6a44);

  const nivel = () => NIVEL_RIO + (NIVEL_CHEIA - NIVEL_RIO) * smooth(estado.agua);

  function desenhar() {
    objChuva.material.opacity = 0.38 * estado.chuva;
    lampada.material.emissive.copy(corLuz).lerp(corApagada, estado.energia);
    lampada.material.color.copy(lampVerde).lerp(lampCinza, estado.energia);
    objGas.borboleta.rotation.y = (Math.PI / 2) * smooth(estado.gas);
    objRegistro.volante.rotation.z = -Math.PI * 1.5 * smooth(estado.registro);
    const y = nivel();
    objAgua.malha.position.y = y;
    objAgua.borda.position.y = y;
    objAgua.borda.scale.y = Math.max(y - FUNDO, 0.01);
    objAgua.borda.children.forEach((p) => (p.scale.y = 1));
    objAgua.mat.color.copy(aguaLimpa).lerp(aguaSuja, estado.contaminada);
    xRua.material.opacity = estado.xrua;
    xPonte.material.opacity = estado.xponte;
    rota.count = Math.floor(estado.rota * rota.userData.total);
    objLocal.bandeira.position.y = 0.4 + 1.2 * smooth(estado.ponto);
    objLocal.anel.material.opacity = 0.85 * estado.ponto;
    pino.material.opacity = smooth(estado.telefone);
    objOndas.grupo.position.y = y + 0.01;
    objOndas.aneis.forEach((a) => (a.material.opacity = 0));
  }

  function aplicar(chave, { instantaneo = false } = {}) {
    if (!chave || !(chave in estado)) return Promise.resolve();
    const inst = instantaneo || palco.movimentoReduzido();
    if (inst) {
      estado[chave] = 1;
      desenhar();
      return Promise.resolve();
    }
    const de = estado[chave];
    return palco.tweens.animar({
      duracao: DURACAO[chave] * (1 - de),
      aoAtualizar: (p) => {
        estado[chave] = de + (1 - de) * p;
        desenhar();
      },
    });
  }

  function limpar() {
    for (const k of Object.keys(estado)) estado[k] = 0;
    objCarro.position.set(CARRO[0], 0.016, CARRO[1]);
    objCarro.rotation.set(0, 0.08, 0);
    desenhar();
  }
  limpar();

  function animar(tempo, dt, reduzido) {
    if (reduzido) return;
    if (estado.chuva > 0) {
      const a = objChuva.geometry.attributes.position.array;
      for (let i = 0; i < a.length; i += 6) {
        a[i + 1] -= dt * 7;
        a[i + 4] -= dt * 7;
        if (a[i + 1] < -1) {
          a[i + 1] += 8;
          a[i + 4] += 8;
        }
      }
      objChuva.geometry.attributes.position.needsUpdate = true;
    }
    objAgua.tex.offset.x = (objAgua.tex.offset.x + dt * 0.04) % 1;
    objAgua.tex.offset.y = (objAgua.tex.offset.y + dt * 0.015) % 1;
    // carro: com a água alta, balança e começa a ser arrastado devagar
    const k = smooth(estado.carro);
    objCarro.position.x = CARRO[0] - 0.35 * k;
    objCarro.position.y = 0.016 + k * (0.05 + 0.02 * Math.sin(tempo * 1.6));
    objCarro.rotation.y = 0.08 + 0.22 * k + 0.03 * k * Math.sin(tempo * 1.1);
    objCarro.rotation.z = 0.04 * k * Math.sin(tempo * 1.3);
    if (estado.contaminada > 0) {
      objOndas.aneis.forEach((a, i) => {
        const f = (tempo * 0.45 + i / 3) % 1;
        a.scale.setScalar(1 + f * 5);
        a.material.opacity = 0.7 * (1 - f) * estado.contaminada;
      });
    }
    const pos = objLocal.bandeira.geometry.attributes.position;
    if (!objLocal.bandeira.userData.base) objLocal.bandeira.userData.base = pos.array.slice();
    const base = objLocal.bandeira.userData.base;
    for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(tempo * 4 + base[i * 3] * 9) * 0.1 * base[i * 3]);
    pos.needsUpdate = true;
    if (estado.ponto > 0) objLocal.anel.scale.setScalar(1 + 0.05 * Math.sin(tempo * 3));
    if (estado.telefone > 0) pino.position.y = relevo(...LOCAL_SEGURO) + 2.1 + Math.sin(tempo * 2) * 0.07;
  }

  const efeitos = { grupo: raiz, ancoras, aplicar, limpar, animar };
  return { raiz, efeitos, alvos: [], enquadramento: ENQUADRAMENTOS_ENCHENTE.geral };
}
