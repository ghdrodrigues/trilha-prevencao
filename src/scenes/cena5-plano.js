// Cena 5 ("Plano de fuga da família"): um pedaço de bairro com rua, calçadas e
// casas. A casa da família mostra as saídas; uma rota pontilhada leva até o
// ponto de encontro, fora do bairro, numa praça no alto; a casa de um familiar
// de referência fica do outro lado. Conteúdo do Plano Emergencial Familiar da
// Defesa Civil SC. Tudo em código, sem créditos.

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

// Bairro plano à esquerda; morro suave ao fundo à direita, onde fica a praça.
export function relevo(x, z) {
  const morro = 1.0 * smooth((x - 2.6) / 2.2) * smooth((0.4 - z) / 2.0);
  const ondula = 0.04 * Math.sin(x * 0.9 + z * 1.3) * smooth((x - 2.0) / 1.0);
  return morro + ondula;
}

// Lugares
const RUA = { z0: 0.3, z1: 1.3, x1: 2.6 }; // rua do bairro (asfalto)
const CASA_FAMILIA = { x: -3.6, z: -2.0, w: 2.6, h: 1.5, d: 2.0 };
const PORTA_FRENTE = [-4.15, -0.85];
const PORTA_LADO = [-2.3, -1.6]; // porta lateral, no nível do chão (sem degrau)
const PRACA = [5.4, -2.3];
const CASA_PARENTE = [5.6, 3.3];

export const ENQUADRAMENTOS_PLANO = {
  geral: { centro: [0.2, 0.3, 0.2], largura: 15.5, altura: 10.5 },
  casa: { centro: [-3.2, 0.7, -1.3], largura: 7.2, altura: 5.2 },
  rota: { centro: [0.8, 0.4, -0.6], largura: 13, altura: 8.6 },
  encontro: { centro: [4.6, 1.0, -1.6], largura: 7, altura: 5.2 },
  contato: { centro: [1.0, 0.5, 1.0], largura: 14, altura: 9 },
};

export const POSICOES_AGENTE_PLANO = {
  geral: [-2.0, 0.9],
  casa: [-2.4, 0.5],
  rota: [-1.8, 0.9],
  encontro: [4.3, -1.3],
  contato: [-1.8, 0.9],
};

const POS_VIZINHO = [-3.5, 0.05];
export const VIZINHOS_PLANO = {
  encosta: { chave: 'vizinhoEncosta', pos: POS_VIZINHO },
  baixada: { chave: 'vizinhoBaixada', pos: POS_VIZINHO },
  aberto: { chave: 'vizinhoAberto', pos: POS_VIZINHO },
};

// Rota de fuga externa: da porta até a praça (usada pelos pontos e pela caminhada).
export const ROTA = [
  [-4.15, -0.05],
  [-4.0, 0.8],
  [-1.0, 0.8],
  [2.2, 0.8],
  [3.4, 0.2],
  [4.2, -0.9],
  [4.9, -1.8],
];

// ---------- Terreno ----------

function faixa(x0, x1, z0, z1, mat, dy = 0.012, seg = 40) {
  const geo = new THREE.PlaneGeometry(x1 - x0, z1 - z0, seg, 4);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + (x0 + x1) / 2;
    const z = pos.getZ(i) + (z0 + z1) / 2;
    pos.setXYZ(i, x, relevo(x, z) + dy, z);
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
  g.fillStyle = '#4d4f52';
  g.fillRect(0, 0, 512, 64);
  for (let i = 0; i < 5000; i++) {
    g.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.1)';
    g.fillRect(Math.random() * 512, Math.random() * 64, 2, 2);
  }
  // faixa central tracejada
  g.fillStyle = '#e8d36a';
  for (let x = 10; x < 512; x += 64) g.fillRect(x, 30, 34, 4);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.repeat.set(4, 1);
  return t;
}

function terreno() {
  const g = new THREE.Group();
  const geo = new THREE.PlaneGeometry(LARGURA, PROFUNDIDADE, 110, 80);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const cores = [];
  const c = new THREE.Color();
  const g1 = new THREE.Color(0x8cbf6a);
  const g2 = new THREE.Color(0x6fa452);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, relevo(x, z));
    const ruido = 0.5 + 0.25 * Math.sin(x * 1.3 + z * 0.8) + 0.25 * Math.sin(z * 2.1 - x * 0.6);
    c.copy(g1).lerp(g2, ruido * 0.5);
    cores.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cores, 3));
  geo.computeVertexNormals();
  const chao = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, map: TX.grama(), roughness: 0.95 }));
  chao.receiveShadow = true;
  g.add(chao);

  // Rua, calçadas e meio-fio
  const x0 = -LARGURA / 2;
  g.add(faixa(x0, RUA.x1, RUA.z0, RUA.z1, new THREE.MeshStandardMaterial({ map: asfalto(), roughness: 0.9 }), 0.015, 60));
  const matCalcada = new THREE.MeshStandardMaterial({ map: TX.cimento(), roughness: 0.95 });
  g.add(faixa(x0, RUA.x1, RUA.z0 - 0.45, RUA.z0, matCalcada, 0.05, 60));
  g.add(faixa(x0, RUA.x1, RUA.z1, RUA.z1 + 0.45, matCalcada, 0.05, 60));
  // estrada de terra que sobe o morro até a praça
  const terra = new THREE.MeshStandardMaterial({ color: 0xb79a72, roughness: 1 });
  const curva = new THREE.CatmullRomCurve3(
    [[2.4, 0.8], [3.4, 0.2], [4.2, -0.9], [4.9, -1.8]].map(([x, z]) => new THREE.Vector3(x, 0, z)),
  );
  const N = 30;
  const p = [];
  const idx = [];
  const lado = new THREE.Vector3();
  const t = new THREE.Vector3();
  curva.getSpacedPoints(N).forEach((q, i) => {
    curva.getTangentAt(Math.min(i / N, 0.999), t);
    lado.set(-t.z, 0, t.x).normalize().multiplyScalar(0.42);
    for (const s of [-1, 1]) {
      const v = q.clone().addScaledVector(lado, s);
      p.push(v.x, relevo(v.x, v.z) + 0.02, v.z);
    }
    if (i < N) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  });
  const geoT = new THREE.BufferGeometry();
  geoT.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  geoT.setIndex(idx);
  geoT.computeVertexNormals();
  const estrada = new THREE.Mesh(geoT, terra);
  estrada.receiveShadow = true;
  g.add(estrada);

  // Laterais do diorama
  const matSolo = new THREE.MeshStandardMaterial({ map: TX.solo(), roughness: 1, side: THREE.DoubleSide });
  const lados = [
    (u) => [-LARGURA / 2 + u * LARGURA, PROFUNDIDADE / 2],
    (u) => [LARGURA / 2, -PROFUNDIDADE / 2 + u * PROFUNDIDADE],
    (u) => [-LARGURA / 2 + u * LARGURA, -PROFUNDIDADE / 2],
    (u) => [-LARGURA / 2, -PROFUNDIDADE / 2 + u * PROFUNDIDADE],
  ];
  for (const ladoF of lados) {
    const n = 80;
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

// Seta laranja no chão, indicando uma saída.
function seta(x, z, ang) {
  const forma = new THREE.Shape();
  forma.moveTo(-0.09, 0);
  forma.lineTo(0.09, 0);
  forma.lineTo(0.09, 0.32);
  forma.lineTo(0.22, 0.32);
  forma.lineTo(0, 0.6);
  forma.lineTo(-0.22, 0.32);
  forma.lineTo(-0.09, 0.32);
  forma.closePath();
  const geo = new THREE.ShapeGeometry(forma);
  geo.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: LARANJA, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
  m.position.set(x, relevo(x, z) + 0.07, z);
  m.rotation.y = ang;
  m.renderOrder = 4;
  return m;
}

// Caixas de papelão e um vaso diante da porta (saída obstruída).
function entulho() {
  const g = new THREE.Group();
  const papelao = new THREE.MeshStandardMaterial({ color: 0xb98d5a, roughness: 0.95 });
  const fita = new THREE.MeshStandardMaterial({ color: 0xd8c39a, roughness: 0.8 });
  [
    [0, 0.14, 0, 0.36, 0.28, 0.3],
    [0.08, 0.4, 0.02, 0.28, 0.24, 0.26],
    [-0.36, 0.1, 0.05, 0.24, 0.2, 0.22],
  ].forEach(([x, y, z, w, h, d]) => {
    const c = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), papelao);
    c.position.set(x, y, z);
    c.castShadow = true;
    const f = new THREE.Mesh(new THREE.BoxGeometry(w + 0.005, 0.03, d + 0.005), fita);
    f.position.set(x, y + h / 2 - 0.02, z);
    g.add(c, f);
  });
  const vaso = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.09, 0.24, 14), new THREE.MeshStandardMaterial({ color: 0xa5532f, roughness: 0.9 }));
  vaso.position.set(0.38, 0.12, 0.02);
  vaso.castShadow = true;
  const planta = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 1), new THREE.MeshStandardMaterial({ color: 0x4f8f42, roughness: 0.9 }));
  planta.position.set(0.38, 0.34, 0.02);
  g.add(vaso, planta);
  return g;
}

// Praça do ponto de encontro: piso circular, banco, árvore e mastro com bandeira laranja.
function praca() {
  const [x, z] = PRACA;
  const g = new THREE.Group();
  g.position.set(x, relevo(x, z), z);
  const piso = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.1, 0.08, 40), new THREE.MeshStandardMaterial({ map: TX.cimento(), roughness: 0.95 }));
  piso.position.y = 0.0;
  piso.receiveShadow = true;
  g.add(piso);
  const madeira = new THREE.MeshStandardMaterial({ color: 0x8a5a36, roughness: 0.8 });
  const ferro = new THREE.MeshStandardMaterial({ color: 0x3a3d40, roughness: 0.5, metalness: 0.5 });
  const banco = new THREE.Group();
  const assento = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.04, 0.2), madeira);
  assento.position.y = 0.22;
  const encosto = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.16, 0.03), madeira);
  encosto.position.set(0, 0.34, -0.09);
  banco.add(assento, encosto);
  for (const s of [-0.3, 0.3]) {
    const pe = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 0.18), ferro);
    pe.position.set(s, 0.11, 0);
    banco.add(pe);
  }
  banco.traverse((o) => o.isMesh && (o.castShadow = true));
  banco.position.set(-0.45, 0.04, -0.6);
  banco.rotation.y = 0.5;
  g.add(banco);
  const arv = new THREE.Group();
  const tronco = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.8, 8), new THREE.MeshStandardMaterial({ color: 0x6b4a2e, roughness: 1 }));
  tronco.position.y = 0.4;
  tronco.castShadow = true;
  arv.add(tronco);
  copaRealista(arv, 0.7, { raio: 0.6, semente: 21 });
  arv.position.set(0.55, 0, -0.55);
  g.add(arv);

  // Mastro e bandeira (a bandeira sobe no efeito "ponto")
  const mastro = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 1.7, 8), new THREE.MeshStandardMaterial({ color: 0xd7d7d7, metalness: 0.6, roughness: 0.3 }));
  mastro.position.set(0.1, 0.85, 0.35);
  mastro.castShadow = true;
  g.add(mastro);
  const bandeira = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.32, 8, 2), new THREE.MeshStandardMaterial({ color: LARANJA, roughness: 0.7, side: THREE.DoubleSide }));
  bandeira.geometry.translate(0.25, -0.16, 0);
  bandeira.position.set(0.12, 0.4, 0.35);
  bandeira.castShadow = true;
  g.add(bandeira);

  // anel pulsante no chão
  const anel = new THREE.Mesh(new THREE.RingGeometry(1.15, 1.3, 48), new THREE.MeshBasicMaterial({ color: LARANJA, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
  anel.rotation.x = -Math.PI / 2;
  anel.position.y = 0.06;
  anel.renderOrder = 3;
  g.add(anel);

  const ancora = new THREE.Object3D();
  ancora.position.set(0.1, 1.8, 0.35);
  g.add(ancora);
  return { grupo: g, bandeira, anel, ancora };
}

// Pontos laranja da rota, revelados em ordem.
function pontosRota(caminho, espaco = 0.24) {
  const curva = new THREE.CurvePath();
  for (let i = 1; i < caminho.length; i++) {
    const [ax, az] = caminho[i - 1];
    const [bx, bz] = caminho[i];
    curva.add(new THREE.LineCurve3(new THREE.Vector3(ax, 0, az), new THREE.Vector3(bx, 0, bz)));
  }
  const n = Math.floor(curva.getLength() / espaco);
  const geo = new THREE.CylinderGeometry(0.065, 0.065, 0.03, 12);
  const mat = new THREE.MeshBasicMaterial({ color: LARANJA });
  const inst = new THREE.InstancedMesh(geo, mat, n + 1);
  const m = new THREE.Matrix4();
  for (let i = 0; i <= n; i++) {
    const p = curva.getPointAt(i / n);
    m.makeTranslation(p.x, relevo(p.x, p.z) + 0.075, p.z);
    inst.setMatrixAt(i, m);
  }
  inst.count = 0;
  inst.userData.total = n + 1;
  inst.renderOrder = 4;
  return inst;
}

// Pino laranja com ícone de telefone (contato de referência).
function pino() {
  const g = new THREE.Group();
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#f77f00';
  ctx.beginPath();
  ctx.arc(64, 64, 60, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // fone estilizado
  ctx.beginPath();
  ctx.moveTo(44, 36);
  ctx.quadraticCurveTo(30, 40, 36, 60);
  ctx.quadraticCurveTo(46, 86, 70, 94);
  ctx.quadraticCurveTo(88, 98, 92, 84);
  ctx.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0, depthTest: false }));
  sprite.scale.set(0.6, 0.6, 1);
  sprite.renderOrder = 10;
  g.add(sprite);
  return { grupo: g, sprite };
}

// ---------- Cena ----------

export function criarCenaPlano({ palco }) {
  const raiz = new THREE.Group();
  raiz.name = 'cena-plano';
  raiz.add(terreno());

  // Casa da família: porta na frente (com degrau) e porta lateral no nível do chão.
  const casaFamilia = casa({
    ...CASA_FAMILIA,
    cor: '#f1e4c8',
    semente: 101,
    aberturas: [
      { face: 'frente', tipo: 'porta', u: 0.29, largura: 0.22, altura: 0.62 },
      { face: 'frente', tipo: 'janela', u: 0.72, v: 0.52, largura: 0.28, altura: 0.27 },
      { face: 'leste', tipo: 'porta', u: 0.3, largura: 0.24, altura: 0.62 },
      { face: 'leste', tipo: 'janela', u: 0.75, v: 0.52, largura: 0.26, altura: 0.27 },
      { face: 'oeste', tipo: 'janela', u: 0.5, v: 0.52, largura: 0.34, altura: 0.27 },
    ],
  });
  raiz.add(casaFamilia);

  // Vizinhança
  raiz.add(
    casa({ x: -6.3, z: -2.0, w: 1.9, cor: '#dfe7ea', semente: 103 }),
    casa({ x: 0.4, z: -2.0, w: 2.2, cor: '#f3d9c9', semente: 105, caixaDagua: false }),
    casa({ x: -5.8, z: 3.2, rot: Math.PI, cor: '#e6edd9', semente: 107 }),
    casa({ x: -2.6, z: 3.2, rot: Math.PI, w: 2.4, cor: '#efe6d6', semente: 109, caixaDagua: false }),
    casa({ x: 0.7, z: 3.3, rot: Math.PI, w: 2.0, cor: '#e9dcc0', semente: 111 }),
  );
  // Casa do familiar de referência, fora do bairro
  const casaParente = casa({ x: CASA_PARENTE[0], z: CASA_PARENTE[1], w: 1.8, h: 1.2, d: 1.5, rot: -Math.PI / 2, cor: '#d8e2e6', semente: 113 });
  raiz.add(casaParente);

  // Cercas, árvores, arbustos, grama
  raiz.add(
    cerca(relevo, [-5.0, -0.22], [-1.4, -0.22], { vao: [0.15, 0.31] }),
    arvore(-7.0, -3.9, 1.0, 3),
    arvore(-4.4, -4.0, 0.9, 5),
    arvore(1.6, -3.6, 1.1, 7),
    arvore(2.5, 3.8, 0.9, 9),
    arvore(6.6, -3.8, 0.8, 11),
    arvore(6.6, 1.0, 0.9, 13),
    bananeira(relevo, -7.0, 4.2, 1.0, 4),
    arbusto(relevo, -1.2, -0.7, 0.9, 3),
    arbusto(relevo, -5.4, -0.6, 1.0, 5),
    arbusto(relevo, 4.0, 2.4, 1.1, 7),
    arbusto(relevo, 3.3, -2.8, 1.0, 9),
    pedras(relevo, [
      [3.0, -1.2, 0.1],
      [6.4, -1.0, 0.13],
      [4.6, 0.9, 0.08],
    ]),
  );
  const ocupado = (x, z) => {
    if (z > RUA.z0 - 0.5 && z < RUA.z1 + 0.5 && x < RUA.x1 + 0.1) return true; // rua e calçadas
    if (Math.hypot(x - PRACA[0], z - PRACA[1]) < 1.2) return true;
    const casas = [
      [-3.6, -2.0, 1.5, 1.2],
      [-6.3, -2.0, 1.2, 1.1],
      [0.4, -2.0, 1.3, 1.1],
      [-5.8, 3.2, 1.3, 1.1],
      [-2.6, 3.2, 1.4, 1.1],
      [0.7, 3.3, 1.2, 1.1],
      [5.6, 3.3, 1.0, 1.2],
    ];
    if (casas.some(([cx, cz, hx, hz]) => Math.abs(x - cx) < hx && Math.abs(z - cz) < hz)) return true;
    // estrada de terra
    for (let i = 1; i < ROTA.length; i++) {
      const [ax, az] = ROTA[i - 1];
      const [bx, bz] = ROTA[i];
      const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (z - az) * (bz - az)) / ((bx - ax) ** 2 + (bz - az) ** 2)));
      if (Math.hypot(x - (ax + (bx - ax) * t), z - (az + (bz - az) * t)) < 0.5 && ax > 2) return true;
    }
    return false;
  };
  raiz.add(
    grama(relevo, {
      area: [-LARGURA / 2 + 0.05, LARGURA / 2 - 0.05, -PROFUNDIDADE / 2 + 0.05, PROFUNDIDADE / 2 - 0.05],
      quantidade: 9000,
      pode: (x, z) => !ocupado(x, z),
      semente: 13,
    }),
  );

  // Efeitos
  const setaFrente = seta(PORTA_FRENTE[0], PORTA_FRENTE[1] + 0.3, Math.PI);
  const setaFundos = seta(PORTA_LADO[0] + 0.15, PORTA_LADO[1], -Math.PI / 2);
  raiz.add(setaFrente, setaFundos);
  const objEntulho = entulho();
  const entulhoDe = new THREE.Vector3(PORTA_FRENTE[0] + 0.05, relevo(...PORTA_FRENTE), PORTA_FRENTE[1] + 0.28);
  const entulhoPara = new THREE.Vector3(PORTA_FRENTE[0] - 0.95, relevo(...PORTA_FRENTE), PORTA_FRENTE[1] + 0.12);
  objEntulho.position.copy(entulhoDe);
  raiz.add(objEntulho);
  const rota = pontosRota(ROTA);
  raiz.add(rota);
  const objPraca = praca();
  raiz.add(objPraca.grupo);
  const objPino = pino();
  objPino.grupo.position.set(CASA_PARENTE[0], relevo(...CASA_PARENTE) + 2.3, CASA_PARENTE[1]);
  raiz.add(objPino.grupo);
  // linha tracejada de contato entre as duas casas, em arco
  const arcoPts = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(-3.6, 2.4, -2.0),
    new THREE.Vector3(1.0, 4.2, 1.0),
    new THREE.Vector3(CASA_PARENTE[0], relevo(...CASA_PARENTE) + 2.0, CASA_PARENTE[1]),
  ).getPoints(60);
  const arco = new THREE.Line(new THREE.BufferGeometry().setFromPoints(arcoPts), new THREE.LineDashedMaterial({ color: LARANJA, dashSize: 0.18, gapSize: 0.12, transparent: true, opacity: 0 }));
  arco.computeLineDistances();
  arco.geometry.setDrawRange(0, 0);
  arco.frustumCulled = false;
  raiz.add(arco);

  // Âncoras
  const ancora = (x, y, z) => {
    const o = new THREE.Object3D();
    o.position.set(x, y, z);
    raiz.add(o);
    return o;
  };
  const ancoras = {
    frente: ancora(PORTA_FRENTE[0], 1.2, PORTA_FRENTE[1] + 0.3),
    lado: ancora(PORTA_LADO[0] + 0.1, 1.1, PORTA_LADO[1]),
    entulho: ancora(entulhoPara.x, 0.7, entulhoPara.z),
    casa: ancora(-3.6, 2.3, -1.6),
    rota: ancora(0.6, 0.4, 0.8),
    encontro: objPraca.ancora,
    contato: objPino.grupo,
  };

  const estado = { saidas: 0, liberar: 0, rota: 0, ponto: 0, contato: 0 };
  const DURACAO = { saidas: 1.4, liberar: 2.2, rota: 3.6, ponto: 2.2, contato: 2.4 };

  function desenhar() {
    setaFrente.material.opacity = 0.95 * estado.saidas;
    setaFundos.material.opacity = 0.95 * estado.saidas;
    objEntulho.position.lerpVectors(entulhoDe, entulhoPara, smooth(estado.liberar));
    rota.count = Math.floor(estado.rota * rota.userData.total);
    objPraca.bandeira.position.y = 0.4 + 1.2 * smooth(estado.ponto);
    objPraca.anel.material.opacity = 0.85 * estado.ponto;
    objPino.sprite.material.opacity = smooth(estado.contato);
    arco.material.opacity = smooth(estado.contato);
    arco.geometry.setDrawRange(0, Math.floor(estado.contato * arcoPts.length));
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
    desenhar();
  }
  limpar();

  function animar(tempo, dt, reduzido) {
    if (reduzido) return;
    // bandeira tremula, anel pulsa, pino flutua
    const pos = objPraca.bandeira.geometry.attributes.position;
    if (!objPraca.bandeira.userData.base) objPraca.bandeira.userData.base = pos.array.slice();
    const base = objPraca.bandeira.userData.base;
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3];
      pos.setZ(i, Math.sin(tempo * 4 + x * 9) * 0.05 * x * 2);
    }
    pos.needsUpdate = true;
    if (estado.ponto > 0) objPraca.anel.scale.setScalar(1 + 0.06 * Math.sin(tempo * 3));
    if (estado.contato > 0) objPino.grupo.position.y = relevo(...CASA_PARENTE) + 2.3 + Math.sin(tempo * 2) * 0.08;
  }

  const efeitos = { grupo: raiz, ancoras, aplicar, limpar, animar };
  return { raiz, efeitos, alvos: [], enquadramento: ENQUADRAMENTOS_PLANO.geral };
}
