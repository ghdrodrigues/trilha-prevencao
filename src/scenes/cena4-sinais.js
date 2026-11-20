// Cena 4 ("Leia os sinais de perigo"): uma casa num corte da encosta, com muro
// de arrimo nos fundos, árvore no barranco e poste na frente. Cada sinal que a
// Defesa Civil lista aparece aos poucos, sem nada desabar (decisão do George:
// animações calmas, sem destruir casas). Tudo em primitivas e texturas de canvas.

import * as THREE from 'three';
import * as TX from './texturas.js';
import { criarCasa } from './casa-realista.js';
import { grama, cerca, varal, bananeira, arbusto, pedras, copaRealista } from './cenario-detalhes.js';

const LARGURA = 12;
const PROFUNDIDADE = 10;
const FUNDO = -2.4; // base do diorama

const smooth = (t) => {
  const x = Math.min(Math.max(t, 0), 1);
  return x * x * (3 - 2 * x);
};

// Platô plano onde fica a casa; barranco atrás (corte de 1,1 de altura, contido
// pelo muro) e encosta que desce na frente.
const CORTE_Z = -1.8;
export function relevo(x, z) {
  const atras = CORTE_Z - z;
  const corte = 1.1 * smooth(atras / 0.3) + 1.7 * smooth((atras - 0.3) / 3.2);
  const frente = -1.3 * smooth((z - 2.9) / 2.1);
  const ondula = 0.05 * Math.sin(x * 1.1 + z * 0.6) * smooth((Math.abs(z - 0.4) - 2.2) / 1.5);
  return corte + frente + ondula;
}

const inclinacao = (x, z) => {
  const e = 0.05;
  return Math.hypot(relevo(x + e, z) - relevo(x - e, z), relevo(x, z + e) - relevo(x, z - e)) / (2 * e);
};

// Lugares fixos da cena.
const CASA = { x: -2.0, z: 0.0, w: 2.6, h: 1.6, d: 2.0 };
const MURO = { x0: -4.6, x1: 1.5, z: CORTE_Z - 0.06, h: 1.12, bojo: 0.45 };
const ARVORE = [3.7, -3.0];
const POSTE = [3.3, 2.1];
const NASCENTE = [2.4, -2.02]; // onde a água barrenta sai do barranco
const SALIENCIA = [0.55, 1.75];
const SAIDA = [3.6, 4.0]; // para onde o vizinho sai

export const ENQUADRAMENTOS_SINAIS = {
  geral: { centro: [0, 0.5, 0], largura: 13.5, altura: 9.5 },
  chao: { centro: [-1.6, 0.4, 1.5], largura: 7, altura: 5 },
  parede: { centro: [-1.8, 0.9, 1.0], largura: 6.5, altura: 4.8 },
  estufado: { centro: [0.4, 0.5, 0.0], largura: 7.5, altura: 5.4 },
  inclinado: { centro: [3.0, 1.2, -0.2], largura: 8, altura: 6.2 },
  agua: { centro: [2.2, 0.6, -1.4], largura: 6.5, altura: 4.8 },
  saida: { centro: [0.6, 0.4, 2.0], largura: 10.5, altura: 7.2 },
};

// Onde a Agente fica em cada enquadramento: [x, z].
export const POSICOES_AGENTE_SINAIS = {
  geral: [0.6, 2.7],
  chao: [0.1, 2.6],
  parede: [0.5, 2.1],
  estufado: [1.7, 1.2],
  inclinado: [1.2, 1.4],
  agua: [1.3, -0.5],
  saida: [2.0, 1.4],
};

// O vizinho do perfil fica no quintal, em frente à casa.
const POS_VIZINHO = [-1.3, 1.9];
export const VIZINHOS_SINAIS = {
  encosta: { chave: 'vizinhoEncosta', pos: POS_VIZINHO },
  baixada: { chave: 'vizinhoBaixada', pos: POS_VIZINHO },
  aberto: { chave: 'vizinhoAberto', pos: POS_VIZINHO },
};
export const DESTINO_SAIDA = SAIDA;

// ---------- Terreno ----------

function terreno() {
  const g = new THREE.Group();
  const geo = new THREE.PlaneGeometry(LARGURA, PROFUNDIDADE, 120, 100);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const cores = [];
  const c = new THREE.Color();
  const grama = new THREE.Color(0x8cbf6a);
  const gramaEscura = new THREE.Color(0x6fa452);
  const terra = new THREE.Color(0xa77b4f);
  const quintal = new THREE.Color(0xc2a77f);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, relevo(x, z));
    const ruido = 0.5 + 0.25 * Math.sin(x * 1.7 + z * 0.9) + 0.25 * Math.sin(z * 2.3 - x * 0.5);
    c.copy(grama).lerp(gramaEscura, ruido * 0.5);
    // corte do barranco em terra exposta
    c.lerp(terra, smooth((inclinacao(x, z) - 0.9) / 0.8));
    // quintal de terra batida na frente da casa
    const noQuintal = smooth((x + 3.7) / 0.3) * smooth((1.3 - x) / 0.3) * smooth((z - 0.9) / 0.2) * smooth((2.7 - z) / 0.3);
    c.lerp(quintal, noQuintal * 0.9);
    cores.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cores, 3));
  geo.computeVertexNormals();
  const chao = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ vertexColors: true, map: TX.grama(), roughness: 0.95, bumpMap: TX.grama(), bumpScale: 0.8 }),
  );
  chao.receiveShadow = true;
  g.add(chao);

  // Laterais do diorama: faixa de solo do terreno até a base.
  const matSolo = new THREE.MeshStandardMaterial({ map: TX.solo(), roughness: 1, side: THREE.DoubleSide });
  const lados = [
    (t) => [-LARGURA / 2 + t * LARGURA, PROFUNDIDADE / 2], // frente
    (t) => [LARGURA / 2, -PROFUNDIDADE / 2 + t * PROFUNDIDADE], // direita
    (t) => [-LARGURA / 2 + t * LARGURA, -PROFUNDIDADE / 2], // fundo
    (t) => [-LARGURA / 2, -PROFUNDIDADE / 2 + t * PROFUNDIDADE], // esquerda
  ];
  for (const lado of lados) {
    const N = 80;
    const p = [];
    const uv = [];
    const idx = [];
    for (let i = 0; i <= N; i++) {
      const [x, z] = lado(i / N);
      p.push(x, relevo(x, z), z, x, FUNDO, z);
      uv.push((i / N) * 3, 1, (i / N) * 3, 0);
      if (i < N) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    }
    const gl = new THREE.BufferGeometry();
    gl.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    gl.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    gl.setIndex(idx);
    gl.computeVertexNormals();
    g.add(new THREE.Mesh(gl, matSolo));
  }
  const fundo = new THREE.Mesh(new THREE.PlaneGeometry(LARGURA, PROFUNDIDADE), new THREE.MeshStandardMaterial({ color: 0x5e4126 }));
  fundo.rotation.x = Math.PI / 2;
  fundo.position.y = FUNDO;
  g.add(fundo);
  return g;
}

// ---------- Objetos ----------

function sombra(x, z, larg, prof, opacidade = 0.4) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(larg, prof),
    new THREE.MeshBasicMaterial({ map: TX.sombraContato(), transparent: true, opacity: opacidade, depthWrite: false, color: 0x1f2a10 }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, relevo(x, z) + 0.02, z);
  m.renderOrder = 1;
  return m;
}

function casa({ x, z, w, h, d, cor, semente, rot = 0, caixaDagua = true }) {
  const g = criarCasa({ w, h, d, cor, semente, caixaDagua });
  g.position.set(x, relevo(x, z), z);
  g.rotation.y = rot;
  return g;
}

// Árvore do barranco: o grupo gira na base (inclina) e as raízes sobem da terra.
function arvoreBarranco() {
  const [x, z] = ARVORE;
  const base = new THREE.Group();
  base.position.set(x, relevo(x, z), z);
  const pivo = new THREE.Group();
  base.add(pivo);
  const tronco = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.15, 1.5, 9), new THREE.MeshStandardMaterial({ color: 0x6b4a2e, roughness: 1 }));
  tronco.position.y = 0.75;
  tronco.castShadow = true;
  pivo.add(tronco);
  copaRealista(pivo, 1.5, { raio: 0.8, semente: 4 });
  const topo = new THREE.Object3D();
  topo.position.y = 2.2;
  pivo.add(topo);

  // raízes expostas do lado de baixo da encosta (+z)
  const raizes = new THREE.Group();
  const matRaiz = new THREE.MeshStandardMaterial({ color: 0x5c3d22, roughness: 1 });
  [-0.9, -0.4, 0.1, 0.55, 1.0].forEach((ang, i) => {
    const comp = 0.45 + (i % 2) * 0.2;
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.05, comp, 6), matRaiz);
    r.geometry.translate(0, comp / 2, 0);
    r.rotation.set(Math.PI / 2 - 0.25, ang, 0, 'YXZ');
    r.castShadow = true;
    raizes.add(r);
  });
  base.add(raizes);
  // terra revolvida ao redor das raízes
  const cova = new THREE.Mesh(
    new THREE.CircleGeometry(0.75, 24),
    new THREE.MeshBasicMaterial({ color: 0x6e4a2c, map: TX.manchaRadial(), transparent: true, opacity: 0, depthWrite: false }),
  );
  cova.rotation.x = -Math.PI / 2 + 0.35;
  cova.position.set(0, 0.06, 0.25);
  cova.renderOrder = 2;
  base.add(cova);
  return { base, pivo, raizes, cova, topo };
}

function arvorePequena(x, z, esc, semente) {
  const g = new THREE.Group();
  const tronco = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 0.7, 8), new THREE.MeshStandardMaterial({ color: 0x6b4a2e, roughness: 1 }));
  tronco.position.y = 0.35;
  tronco.castShadow = true;
  g.add(tronco);
  copaRealista(g, 0.6, { raio: 0.6, semente: semente + 9 });
  g.scale.setScalar(esc);
  g.position.set(x, relevo(x, z), z);
  return g;
}

// Poste de madeira com cruzeta; o fio vai até a casa.
function poste() {
  const [x, z] = POSTE;
  const base = new THREE.Group();
  base.position.set(x, relevo(x, z), z);
  const pivo = new THREE.Group();
  base.add(pivo);
  const mat = new THREE.MeshStandardMaterial({ color: 0x8d8779, roughness: 0.9 });
  const haste = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.08, 2.9, 10), mat);
  haste.position.y = 1.45;
  const cruzeta = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.07, 0.07), new THREE.MeshStandardMaterial({ color: 0x6b4a2e, roughness: 1 }));
  cruzeta.position.y = 2.65;
  cruzeta.rotation.y = 0.9;
  for (const m of [haste, cruzeta]) {
    m.castShadow = true;
    pivo.add(m);
  }
  const topo = new THREE.Object3D();
  topo.position.y = 2.65;
  pivo.add(topo);
  return { base, pivo, topo };
}

// Fenda que cresce: fita escura em zigue-zague, revelada com drawRange.
// pontos: Vector3 no espaço do pai; normal: lado "de fora" da superfície.
function fenda(pontos, normal, largura) {
  const N = pontos.length - 1;
  const pos = [];
  const lado = new THREE.Vector3();
  const t = new THREE.Vector3();
  const bordas = pontos.map((p, i) => {
    t.subVectors(pontos[Math.min(i + 1, N)], pontos[Math.max(i - 1, 0)]).normalize();
    lado.crossVectors(t, normal).normalize();
    const w = largura * (1 - 0.65 * (i / N)) * (0.75 + 0.25 * Math.sin(i * 2.7));
    return [p.clone().addScaledVector(lado, -w / 2), p.clone().addScaledVector(lado, w / 2)];
  });
  for (let i = 0; i < N; i++) {
    const [a0, b0] = bordas[i];
    const [a1, b1] = bordas[i + 1];
    pos.push(...a0.toArray(), ...b0.toArray(), ...a1.toArray(), ...b0.toArray(), ...b1.toArray(), ...a1.toArray());
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setDrawRange(0, 0);
  const m = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({ color: 0x2e241a, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }),
  );
  m.userData.N = N;
  m.renderOrder = 3;
  return m;
}

// Zigue-zague entre dois pontos 2D, com desvio lateral determinístico.
function zigue(a, b, n, amp, semente) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const desvio = i === 0 || i === n ? 0 : amp * Math.sin(i * 2.1 + semente) * (0.6 + 0.4 * Math.sin(i * 5.3 + semente));
    out.push([a[0] + (b[0] - a[0]) * t - (b[1] - a[1]) * desvio, a[1] + (b[1] - a[1]) * t + (b[0] - a[0]) * desvio]);
  }
  return out;
}

function trincaParede(casaGrupo) {
  const { w, h, d } = CASA;
  // coordenadas (u, v) da fachada: sai do canto da janela, como costuma aparecer
  const noPlano = ([u, v]) => new THREE.Vector3((u - 0.5) * w, v * h, d / 2 + 0.004);
  const n = new THREE.Vector3(0, 0, 1);
  const principal = fenda(zigue([0.84, 0.37], [0.93, 0.12], 16, 0.05, 1).map(noPlano), n, 0.055);
  const ramo = fenda(zigue([0.56, 0.65], [0.5, 0.97], 12, 0.06, 3).map(noPlano), n, 0.045);
  casaGrupo.add(principal, ramo);
  const ancora = new THREE.Object3D();
  ancora.position.copy(noPlano([0.88, 0.25]));
  casaGrupo.add(ancora);
  return { fendas: [principal, ramo], ancora };
}

function trincaChao() {
  const noChao = ([x, z]) => new THREE.Vector3(x, relevo(x, z) + 0.015, z);
  const n = new THREE.Vector3(0, 1, 0);
  const principal = fenda(zigue([-3.3, 1.55], [-0.6, 2.35], 40, 0.025, 2).map(noChao), n, 0.13);
  const ramo = fenda(zigue([-1.9, 1.97], [-1.5, 2.6], 14, 0.05, 5).map(noChao), n, 0.08);
  const ancora = new THREE.Object3D();
  ancora.position.copy(noChao([-2.0, 1.95]));
  return { fendas: [principal, ramo], ancora };
}

// Muro de arrimo: malha subdividida; o meio estufa para a frente (+z).
function muro() {
  const { x0, x1, z, h } = MURO;
  const larg = x1 - x0;
  const geo = new THREE.BoxGeometry(larg, h, 0.24, 48, 10, 1);
  const base = geo.attributes.position.array.slice();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: TX.blocos(), roughness: 0.95 }));
  m.position.set((x0 + x1) / 2, h / 2 - 0.02, z);
  m.castShadow = true;
  m.receiveShadow = true;
  const centroX = MURO.bojo - m.position.x; // centro do bojo no espaço do muro
  function estufar(p) {
    const a = geo.attributes.position.array;
    for (let i = 0; i < a.length; i += 3) {
      const lx = base[i];
      const ly = base[i + 1];
      const fx = Math.exp(-(((lx - centroX) / 0.85) ** 2));
      const fy = Math.sin(Math.PI * Math.min(Math.max((ly + h / 2) / h, 0), 1));
      a[i + 2] = base[i + 2] + 0.42 * p * fx * fy;
    }
    geo.attributes.position.needsUpdate = true;
    geo.computeVertexNormals();
  }
  const ancora = new THREE.Object3D();
  ancora.position.set(MURO.bojo, h * 0.6, z + 0.3);
  return { malha: m, estufar, ancora };
}

// Chão estufado: calota de terra que sobe do quintal, com fenda por cima.
function saliencia() {
  const [x, z] = SALIENCIA;
  const g = new THREE.Group();
  g.position.set(x, relevo(x, z) - 0.005, z);
  const calota = new THREE.Mesh(
    new THREE.SphereGeometry(0.6, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0xb0916a, roughness: 1 }),
  );
  calota.scale.set(1, 0.001, 0.7);
  calota.receiveShadow = true;
  calota.castShadow = true;
  g.add(calota);
  const n = new THREE.Vector3(0, 1, 0);
  const pts = zigue([-0.45, -0.05], [0.42, 0.08], 10, 0.1, 4).map(([px, pz]) => new THREE.Vector3(px, 0, pz));
  const f = fenda(pts, n, 0.05);
  g.add(f);
  const ancora = new THREE.Object3D();
  ancora.position.set(0, 0.25, 0);
  g.add(ancora);
  return {
    grupo: g,
    ancora,
    aplicar(p) {
      calota.scale.y = Math.max(p * 0.5, 0.001);
      // a fenda acompanha o topo da calota
      const a = f.geometry.attributes.position.array;
      const ry = 0.6 * calota.scale.y;
      for (let i = 0; i < a.length; i += 3) {
        const dx = a[i] / 0.6;
        const dz = a[i + 2] / (0.6 * 0.7);
        a[i + 1] = ry * Math.sqrt(Math.max(0, 1 - dx * dx - dz * dz)) + 0.01;
      }
      f.geometry.attributes.position.needsUpdate = true;
      f.geometry.setDrawRange(0, Math.floor(smooth((p - 0.3) / 0.7) * f.userData.N) * 6);
    },
  };
}

// Água barrenta: fita que escorre do barranco e forma uma poça no platô.
function aguaBarrenta() {
  const g = new THREE.Group();
  const curva = new THREE.CatmullRomCurve3(
    [
      [NASCENTE[0], NASCENTE[1]],
      [2.45, -1.86],
      [2.5, -1.6],
      [2.62, -1.2],
      [2.7, -0.85],
    ].map(([x, z]) => new THREE.Vector3(x, relevo(x, z) + 0.03, z)),
  );
  const N = 40;
  const pts = curva.getSpacedPoints(N);
  const pos = [];
  const uv = [];
  const idx = [];
  const lado = new THREE.Vector3();
  const t = new THREE.Vector3();
  pts.forEach((p, i) => {
    curva.getTangentAt(Math.min(i / N, 0.999), t);
    lado.set(-t.z, 0, t.x).normalize();
    const w = 0.07 + (i / N) * 0.16;
    const a = p.clone().addScaledVector(lado, -w);
    const b = p.clone().addScaledVector(lado, w);
    a.y = relevo(a.x, a.z) + 0.03;
    b.y = relevo(b.x, b.z) + 0.03;
    pos.push(...a.toArray(), ...b.toArray());
    uv.push(0, (i / N) * 3, 1, (i / N) * 3);
    if (i < N) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  geo.setDrawRange(0, 0);
  const tex = TX.barrenta().clone();
  tex.needsUpdate = true;
  const fita = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.25, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3 }),
  );
  fita.renderOrder = 2;
  const poca = new THREE.Mesh(
    new THREE.CircleGeometry(0.62, 32),
    new THREE.MeshStandardMaterial({ color: 0x86603a, alphaMap: TX.manchaRadial(), transparent: true, opacity: 0, roughness: 0.2, depthWrite: false }),
  );
  poca.rotation.x = -Math.PI / 2;
  poca.scale.set(1, 0.7, 1);
  poca.position.set(2.75, relevo(2.75, -0.7) + 0.025, -0.7);
  poca.renderOrder = 2;
  g.add(fita, poca);
  const ancora = new THREE.Object3D();
  ancora.position.set(NASCENTE[0], relevo(...NASCENTE) + 0.15, NASCENTE[1] + 0.05);
  g.add(ancora);
  return {
    grupo: g,
    ancora,
    tex,
    aplicar(p) {
      geo.setDrawRange(0, Math.floor(Math.min(p / 0.8, 1) * N) * 6);
      poca.material.opacity = 0.9 * smooth((p - 0.6) / 0.4);
      poca.scale.setScalar(0.4 + 0.6 * smooth((p - 0.6) / 0.4));
      poca.scale.y *= 0.7;
    },
  };
}

// Chuva leve sobre o diorama.
function chuva() {
  const N = 500;
  const pos = new Float32Array(N * 6);
  const r = () => Math.random();
  for (let i = 0; i < N; i++) {
    const x = (r() - 0.5) * LARGURA;
    const z = (r() - 0.5) * PROFUNDIDADE;
    const y = r() * 7;
    pos.set([x, y, z, x - 0.04, y + 0.38, z], i * 6);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xd6e6ff, transparent: true, opacity: 0, depthWrite: false }));
  m.frustumCulled = false;
  return m;
}

// ---------- Cena ----------

export function criarCenaSinais({ palco }) {
  const raiz = new THREE.Group();
  raiz.name = 'cena-sinais';
  raiz.add(terreno());

  const casaGrupo = casa(CASA);
  raiz.add(casaGrupo, sombra(CASA.x, CASA.z, CASA.w + 0.8, CASA.d + 0.8, 0.35));
  // vizinhança no alto do barranco
  raiz.add(
    casa({ x: -3.4, z: -3.9, w: 1.7, h: 1.1, d: 1.4, cor: '#e9dcc0', semente: 93, caixaDagua: false }),
    casa({ x: 0.7, z: -4.1, w: 1.6, h: 1.05, d: 1.3, cor: '#d8e2e6', semente: 95 }),
  );
  raiz.add(arvorePequena(-5.2, 3.9, 0.9, 0), arvorePequena(5.2, 0.8, 0.8, 1), arvorePequena(-5.0, -2.9, 1.0, 1), arvorePequena(4.9, -4.2, 0.9, 0));

  // Quintal: cerca com portão, varal, bananeira, arbustos e pedras no corte.
  const noQuintal = (x, z) => x > -3.8 && x < 1.4 && z > 0.85 && z < 2.75;
  const naCasa = (x, z) => x > -3.5 && x < -0.5 && z > -1.25 && z < 1.25;
  const naAgua = (x, z) => x > 2.0 && x < 3.5 && z > -2.2 && z < -0.15; // fita e poça da água barrenta
  raiz.add(
    grama(relevo, {
      area: [-LARGURA / 2, LARGURA / 2, -PROFUNDIDADE / 2, PROFUNDIDADE / 2],
      quantidade: 9000,
      pode: (x, z) => !noQuintal(x, z) && !naCasa(x, z) && !naAgua(x, z) && inclinacao(x, z) < 0.75 && Math.abs(x) < LARGURA / 2 - 0.05 && Math.abs(z) < PROFUNDIDADE / 2 - 0.05,
    }),
    cerca(relevo, [-3.9, 2.8], [1.5, 2.8], { vao: [0.74, 0.93] }),
    varal(relevo, [-4.5, -0.6], [-4.5, 1.4]),
    bananeira(relevo, -5.0, 2.2, 1.1, 3),
    bananeira(relevo, 5.1, -2.6, 0.9, 8),
    arbusto(relevo, 1.6, 2.5, 1.1, 2),
    arbusto(relevo, -4.0, 2.5, 1.2, 4),
    arbusto(relevo, 5.3, 3.4, 1.0, 6),
    arbusto(relevo, -5.3, -1.2, 1.2, 8),
    arbusto(relevo, 2.0, -3.6, 1.0, 10),
    arbusto(relevo, -0.4, 1.35, 0.8, 12),
    pedras(relevo, [
      [1.8, -1.95, 0.12],
      [3.2, -2.05, 0.16],
      [4.4, -1.9, 0.1],
      [5.3, -2.1, 0.14],
      [3.9, -1.75, 0.08],
      [-5.4, 0.4, 0.12],
      [4.6, 1.6, 0.09],
    ]),
  );

  const tParede = trincaParede(casaGrupo);
  const tChao = trincaChao();
  tChao.fendas.forEach((f) => raiz.add(f));
  raiz.add(tChao.ancora);
  const objMuro = muro();
  raiz.add(objMuro.malha, objMuro.ancora);
  const objSal = saliencia();
  raiz.add(objSal.grupo);
  const objArv = arvoreBarranco();
  raiz.add(objArv.base);
  const objPoste = poste();
  raiz.add(objPoste.base);
  const objAgua = aguaBarrenta();
  raiz.add(objAgua.grupo);
  const objChuva = chuva();
  raiz.add(objChuva);

  // Fio do poste até a casa (refeito quando o poste inclina).
  const pontoCasa = casaGrupo.userData.pontoFio.clone().add(casaGrupo.position);
  const fioGeo = new THREE.BufferGeometry().setFromPoints(Array.from({ length: 17 }, () => new THREE.Vector3()));
  const fio = new THREE.Line(fioGeo, new THREE.LineBasicMaterial({ color: 0x2a2a2a }));
  fio.frustumCulled = false;
  raiz.add(fio);
  const tmp = new THREE.Vector3();
  const meio = new THREE.Vector3();
  function refazerFio() {
    raiz.updateMatrixWorld(true);
    objPoste.topo.getWorldPosition(tmp);
    raiz.worldToLocal(tmp);
    meio.addVectors(tmp, pontoCasa).multiplyScalar(0.5);
    meio.y -= 0.35;
    const curva = new THREE.QuadraticBezierCurve3(tmp.clone(), meio, pontoCasa);
    const a = fioGeo.attributes.position;
    curva.getPoints(16).forEach((p, i) => a.setXYZ(i, p.x, p.y, p.z));
    a.needsUpdate = true;
  }

  const ancoraSaida = new THREE.Object3D();
  ancoraSaida.position.set(SAIDA[0], relevo(...SAIDA) + 1.3, SAIDA[1]);
  const ancoraAgente = new THREE.Object3D();
  const pa = POSICOES_AGENTE_SINAIS.saida;
  ancoraAgente.position.set(pa[0], relevo(...pa) + 1.25, pa[1]);
  raiz.add(ancoraSaida, ancoraAgente);

  const ancoras = {
    chao: tChao.ancora,
    parede: tParede.ancora,
    saliencia: objSal.ancora,
    muro: objMuro.ancora,
    arvore: objArv.topo,
    poste: objPoste.topo,
    agua: objAgua.ancora,
    saida: ancoraSaida,
    telefone: ancoraAgente,
  };

  // Progresso de cada sinal, de 0 a 1.
  const estado = { chuva: 0, chao: 0, parede: 0, saliencia: 0, muro: 0, arvore: 0, poste: 0, agua: 0 };
  const DURACAO = { chuva: 1.2, chao: 3.0, parede: 2.6, saliencia: 2.6, muro: 3.0, arvore: 3.0, poste: 2.6, agua: 3.4 };

  function desenhar() {
    const revela = (f, p) => f.geometry.setDrawRange(0, Math.floor(p * f.userData.N) * 6);
    tChao.fendas.forEach((f, i) => revela(f, i ? smooth((estado.chao - 0.5) / 0.5) : Math.min(estado.chao / 0.8, 1)));
    tParede.fendas.forEach((f, i) => revela(f, i ? smooth((estado.parede - 0.45) / 0.55) : Math.min(estado.parede / 0.75, 1)));
    objSal.aplicar(estado.saliencia);
    objMuro.estufar(estado.muro);
    // árvore pende para o lado de baixo da encosta e as raízes saem da terra
    objArv.pivo.rotation.x = 0.3 * smooth(estado.arvore);
    objArv.raizes.position.y = -0.22 + 0.24 * smooth(estado.arvore);
    objArv.raizes.visible = estado.arvore > 0;
    objArv.cova.material.opacity = 0.8 * smooth(estado.arvore);
    objPoste.pivo.rotation.z = -0.2 * smooth(estado.poste);
    refazerFio();
    objAgua.aplicar(estado.agua);
    objChuva.material.opacity = 0.38 * estado.chuva;
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
    if (estado.chuva > 0) {
      const pos = objChuva.geometry.attributes.position;
      const a = pos.array;
      for (let i = 0; i < a.length; i += 6) {
        a[i + 1] -= dt * 7;
        a[i + 4] -= dt * 7;
        if (a[i + 1] < -1) {
          a[i + 1] += 8;
          a[i + 4] += 8;
        }
      }
      pos.needsUpdate = true;
    }
    if (estado.agua > 0) objAgua.tex.offset.y = (objAgua.tex.offset.y + dt * 0.5) % 1;
  }

  const efeitos = { grupo: raiz, ancoras, aplicar, limpar, animar };
  return { raiz, efeitos, alvos: [], enquadramento: ENQUADRAMENTOS_SINAIS.geral };
}
