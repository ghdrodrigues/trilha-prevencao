// Cena 7 ("Depois da água baixar") no método "fazer": um quintal só, sem
// personagens, onde cada subpasso é uma ação animada que deixa seu resultado
// na cena. A cena se acumula: a água baixa, o dia nasce, a casa é conferida,
// as botas andam até a porta, a água é tratada, os alimentos saem, os bichos
// aparecem e a lama é raspada até o quintal ficar limpo.
// Cada ação tem um estado de 0 a 1; `desenhar()` monta tudo a partir dos
// estados, então pular para qualquer subpasso é só definir os estados.
// Conteúdo: F4 (Enxurradas) e Ministério da Saúde (F9a, F9b, F9c). Tudo em
// código, sem créditos.

import * as THREE from 'three';
import * as TX from './texturas.js';
import { criarCasa } from './casa-realista.js';
import { grama, cerca, arbusto, pedras, bananeira, varal, copaRealista } from './cenario-detalhes.js';
import { easing } from '../motor/tween.js';

const LARGURA = 13;
const PROFUNDIDADE = 9;
const FUNDO = -1.5;
const LARANJA = 0xf77f00;
const EXPOSICAO = 0.92;

const clamp = (t) => Math.min(Math.max(t, 0), 1);
const smooth = (t) => {
  const x = clamp(t);
  return x * x * (3 - 2 * x);
};
const fase = (p, a, b) => smooth((p - a) / (b - a));
const linear = (p, a, b) => clamp((p - a) / (b - a));
const pouso = (p, a, b) => {
  const t = linear(p, a, b);
  return t <= 0 ? 0 : t >= 1 ? 1 : easing.pouso(t);
};
const mix = (a, b, t) => a + (b - a) * t;

const RIO_Z = -3.4;
export function relevo(x, z) {
  const rio = -0.5 * smooth(1 - Math.abs(z - RIO_Z) / 0.7);
  const morro = 0.9 * smooth((x - 3.6) / 2.4);
  return morro + rio + 0.025 * Math.sin(x * 1.3 + z * 0.9);
}
const chao = (x, z) => relevo(x, z);

const CASA = { x: -1.6, z: -1.2, w: 2.6, h: 1.5, d: 2.0 };
const PORTA = [-2.25, -0.15];
const POCO = [1.7, -1.9];
const MESA = [1.5, 0.9];
const COMIDA = [-0.3, 0.7];
const SACO = [0.45, 1.55];
const SOFA = [-3.9, 1.0];
const SAPATO = [2.35, -0.05];
const MARCA_LAMA = 0.42;
const NIVEL_CHEIA = 0.46;
const NIVEL_RIO = -0.3;
// trajeto das botas: do portão até a porta
const BOTAS_DE = [-2.4, 2.25];
const BOTAS_PARA_Z = 0.45;
const DESCALCO = [-1.45, 1.35];

export const ENQUADRAMENTOS_FAZER = {
  geral: { centro: [-0.2, 0.4, 0], largura: 13.2, altura: 9.0 },
  casa: { centro: [-1.5, 0.8, -0.7], largura: 9.2, altura: 6.6 },
  caminho: { centro: [-2.1, 0.4, 1.0], largura: 7.6, altura: 5.4 },
  poco: { centro: [1.6, 0.6, -1.6], largura: 6.2, altura: 4.4 },
  mesa: { centro: [1.4, 0.85, 0.8], largura: 2.9, altura: 2.15 },
  comida: { centro: [0.05, 0.35, 1.1], largura: 5.6, altura: 4.0 },
  varal: { centro: [2.3, 0.45, -0.2], largura: 4.8, altura: 3.5 },
  moveis: { centro: [-3.6, 0.4, 1.1], largura: 6.2, altura: 4.5 },
  quintal: { centro: [-1.8, 0.3, 0.7], largura: 8.4, altura: 6.0 },
};

// Ordem das ações: cada uma só aparece depois das anteriores.
export const ACOES = ['baixar', 'dia', 'vistoria', 'epi', 'descalco', 'poco', 'gotas', 'espera', 'ferver', 'alimentos', 'sacudir', 'vassoura', 'bichos', 'raspar', 'lavar'];
const DURACAO = { baixar: 4.2, dia: 3.4, vistoria: 4.4, epi: 5.6, descalco: 3.0, poco: 4.8, gotas: 5.2, espera: 4.4, ferver: 5.4, alimentos: 5.4, sacudir: 5.0, vassoura: 3.8, bichos: 4.4, raspar: 6.4, lavar: 5.4 };

// ---------- Texturas de canvas ----------

function canvasTex(w, h, pintar) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  pintar(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function sprite(tex, w, h, { profundidade = false } = {}) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0, depthTest: profundidade, depthWrite: false }));
  s.scale.set(w, h, 1);
  s.renderOrder = 12;
  return s;
}

// Disco laranja com X branco: "não use".
const texX = () =>
  canvasTex(128, 128, (ctx) => {
    ctx.fillStyle = '#f77f00';
    ctx.beginPath();
    ctx.arc(64, 64, 58, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.lineWidth = 15;
    ctx.lineCap = 'square';
    ctx.beginPath();
    ctx.moveTo(42, 42);
    ctx.lineTo(86, 86);
    ctx.moveTo(86, 42);
    ctx.lineTo(42, 86);
    ctx.stroke();
  });

// Brilho do sol.
const texSol = () =>
  canvasTex(256, 256, (ctx) => {
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(255,250,220,1)');
    g.addColorStop(0.28, 'rgba(255,225,130,1)');
    g.addColorStop(0.36, 'rgba(255,200,90,0.55)');
    g.addColorStop(1, 'rgba(255,190,80,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
  });

// Lupa (vistoria).
const texLupa = () =>
  canvasTex(128, 128, (ctx) => {
    ctx.strokeStyle = '#1d1f5a';
    ctx.lineCap = 'round';
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.moveTo(78, 78);
    ctx.lineTo(116, 116);
    ctx.stroke();
    ctx.fillStyle = 'rgba(220,240,255,0.55)';
    ctx.beginPath();
    ctx.arc(52, 52, 38, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#f77f00';
    ctx.stroke();
  });

// Marca de pegada: bota (sola com cravos) ou pé descalço.
const texPegadaBota = () =>
  canvasTex(64, 128, (ctx) => {
    ctx.fillStyle = 'rgba(60,40,22,0.85)';
    ctx.beginPath();
    ctx.ellipse(32, 40, 22, 34, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(32, 100, 17, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,92,62,0.9)';
    ctx.lineWidth = 4;
    for (let y = 16; y < 72; y += 11) {
      ctx.beginPath();
      ctx.moveTo(14, y);
      ctx.lineTo(50, y);
      ctx.stroke();
    }
  });
const texPegadaPe = () =>
  canvasTex(64, 128, (ctx) => {
    ctx.fillStyle = 'rgba(58,38,20,0.9)';
    ctx.beginPath();
    ctx.ellipse(30, 62, 17, 30, -0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(31, 106, 13, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    const dedos = [
      [20, 24, 8],
      [32, 20, 6],
      [42, 22, 5.5],
      [50, 27, 5],
      [56, 34, 4.5],
    ];
    for (const [x, y, r] of dedos) {
      ctx.beginPath();
      ctx.arc(x - 4, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  });

// Círculo tracejado no chão (atenção), como no exemplo.
const texTracejado = () =>
  canvasTex(256, 256, (ctx) => {
    ctx.strokeStyle = '#f77f00';
    ctx.lineWidth = 12;
    ctx.setLineDash([26, 18]);
    ctx.beginPath();
    ctx.arc(128, 128, 112, 0, Math.PI * 2);
    ctx.stroke();
  });

// Fumaça e vapor.
const texVapor = () =>
  canvasTex(64, 64, (ctx) => {
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  });

// Brilho de limpo (estrela de 4 pontas).
const texBrilho = () =>
  canvasTex(64, 64, (ctx) => {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(32, 0);
    ctx.quadraticCurveTo(36, 28, 64, 32);
    ctx.quadraticCurveTo(36, 36, 32, 64);
    ctx.quadraticCurveTo(28, 36, 0, 32);
    ctx.quadraticCurveTo(28, 28, 32, 0);
    ctx.fill();
  });

// Relógio que enche: mostra o tempo de espera passando.
function relogio(rotulo) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 300;
  const ctx = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = sprite(tex, 0.42, 0.49);
  let ultimo = -1;
  function definir(p) {
    const q = Math.round(p * 120);
    if (q === ultimo) return;
    ultimo = q;
    ctx.clearRect(0, 0, 256, 300);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(128, 118, 104, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#1d1f5a';
    ctx.stroke();
    if (p > 0) {
      ctx.fillStyle = p >= 1 ? '#2e7d32' : '#f77f00';
      ctx.beginPath();
      ctx.moveTo(128, 118);
      ctx.arc(128, 118, 90, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = '#1d1f5a';
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    const a = -Math.PI / 2 + p * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(128, 118);
    ctx.lineTo(128 + Math.cos(a) * 78, 118 + Math.sin(a) * 78);
    ctx.stroke();
    ctx.fillStyle = '#1d1f5a';
    ctx.beginPath();
    ctx.arc(128, 118, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1d1f5a';
    ctx.fillRect(28, 236, 200, 60);
    ctx.fillStyle = '#fff';
    ctx.font = '800 40px Montserrat, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p >= 1 ? `${rotulo} ✓` : rotulo, 128, 267);
    tex.needsUpdate = true;
  }
  definir(0);
  return { sprite: s, definir };
}

// Contador de gotas.
function contador() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 110;
  const ctx = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = sprite(tex, 0.5, 0.215);
  let ultimo = -1;
  function definir(n) {
    if (n === ultimo) return;
    ultimo = n;
    ctx.clearRect(0, 0, 256, 110);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, 256, 110);
    ctx.fillStyle = '#f77f00';
    ctx.fillRect(0, 0, 12, 110);
    ctx.fillStyle = '#1d1f5a';
    ctx.font = '900 48px Montserrat, Arial, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${n} gota${n === 1 ? '' : 's'}`, 30, 42);
    ctx.font = '700 24px Montserrat, Arial, sans-serif';
    ctx.fillText('em 1 litro', 30, 88);
    tex.needsUpdate = true;
  }
  definir(0);
  return { sprite: s, definir };
}

function sombras(o) {
  o.traverse((m) => {
    if (m.isMesh) {
      m.castShadow = true;
      m.receiveShadow = true;
    }
  });
  return o;
}

// Decalque no chão (pegada, mancha), acima da lama.
function decalque(tex, w, h, x, z, rot = 0) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }),
  );
  m.rotation.set(-Math.PI / 2, 0, rot);
  m.position.set(x, chao(x, z) + 0.035, z);
  m.renderOrder = 4;
  return m;
}

// ---------- Terreno ----------

function terreno() {
  const g = new THREE.Group();
  const geo = new THREE.PlaneGeometry(LARGURA, PROFUNDIDADE, 104, 72);
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
    const r = 0.5 + 0.25 * Math.sin(x * 1.3 + z * 0.8) + 0.25 * Math.sin(z * 2.1 - x * 0.6);
    c.copy(g1).lerp(g2, r * 0.5);
    if (y < -0.05) c.lerp(barro, smooth((-0.05 - y) / 0.2));
    cores.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cores, 3));
  geo.computeVertexNormals();
  const solo = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, map: TX.grama(), roughness: 0.95 }));
  solo.receiveShadow = true;
  g.add(solo);
  const rio = new THREE.Mesh(
    new THREE.PlaneGeometry(LARGURA - 0.02, 1.2),
    new THREE.MeshStandardMaterial({ map: TX.barrenta(), color: 0xb59a78, roughness: 0.08, transparent: true, opacity: 0.88 }),
  );
  rio.rotation.x = -Math.PI / 2;
  rio.position.set(0, -0.28, RIO_Z);
  g.add(rio);

  const matSolo = new THREE.MeshStandardMaterial({ map: TX.solo(), roughness: 1, side: THREE.DoubleSide });
  const lados = [
    (u) => [-LARGURA / 2 + u * LARGURA, PROFUNDIDADE / 2],
    (u) => [LARGURA / 2, -PROFUNDIDADE / 2 + u * PROFUNDIDADE],
    (u) => [-LARGURA / 2 + u * LARGURA, -PROFUNDIDADE / 2],
    (u) => [-LARGURA / 2, -PROFUNDIDADE / 2 + u * PROFUNDIDADE],
  ];
  for (const ladoF of lados) {
    const n = 80;
    const p = [];
    const uv = [];
    const ii = [];
    for (let i = 0; i <= n; i++) {
      const [x, z] = ladoF(i / n);
      p.push(x, relevo(x, z), z, x, FUNDO, z);
      uv.push((i / n) * 3, 1, (i / n) * 3, 0);
      if (i < n) ii.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    }
    const gl = new THREE.BufferGeometry();
    gl.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    gl.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    gl.setIndex(ii);
    gl.computeVertexNormals();
    g.add(new THREE.Mesh(gl, matSolo));
  }
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

// Água da cheia: um bloco barrento que cobre o quintal e desce até o rio.
function cheia() {
  const tex = canvasTex(256, 256, (ctx) => {
    ctx.fillStyle = '#9c7a50';
    ctx.fillRect(0, 0, 256, 256);
    let s = 7;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 110; i++) {
      const y = r() * 256;
      const x = r() * 256;
      const w = 12 + r() * 30;
      ctx.strokeStyle = r() > 0.4 ? `rgba(235,214,176,${0.35 + r() * 0.4})` : `rgba(90,62,35,${0.3 + r() * 0.3})`;
      ctx.lineWidth = 2 + r() * 3;
      ctx.beginPath();
      for (let k = 0; k <= 12; k++) {
        const xx = x + (k / 12) * w;
        const yy = y + Math.sin((k / 12) * Math.PI * 2) * 3;
        if (k) ctx.lineTo(xx % 256, yy);
        else ctx.moveTo(xx % 256, yy);
      }
      ctx.stroke();
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(5, 4);
  const mat = new THREE.MeshStandardMaterial({ map: tex, color: 0xffffff, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.88, depthWrite: false });
  const m = new THREE.Mesh(new THREE.BoxGeometry(LARGURA - 0.02, 1, PROFUNDIDADE - 0.02), mat);
  m.renderOrder = 5;
  // riscos claros da correnteza, que descem para o rio
  const n = 70;
  const pos = new Float32Array(n * 6);
  const base = [];
  for (let i = 0; i < n; i++) {
    const x = -LARGURA / 2 + 0.3 + ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1 * (LARGURA - 0.6);
    const z = -PROFUNDIDADE / 2 + 0.3 + ((Math.sin(i * 78.233) * 12345.678) % 1 + 1) % 1 * (PROFUNDIDADE - 0.6);
    base.push([x, z, 0.25 + (i % 4) * 0.12]);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const riscos = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xf3e6cf, transparent: true, opacity: 0.7, depthWrite: false }));
  riscos.renderOrder = 6;
  riscos.frustumCulled = false;
  return { malha: m, tex, riscos, base, pos };
}

// Manchas de lama no quintal: a raspagem tira uma por uma.
const MANCHAS = [
  [-3.5, 0.55, 1.8, 1.1],
  [-1.7, 0.7, 2.4, 1.3],
  [0.2, 0.0, 1.6, 1.3],
  [-2.6, 1.6, 2.0, 0.9],
  [-0.9, 1.7, 1.8, 0.8],
  [-4.5, -1.2, 1.6, 1.3],
  [1.1, -2.3, 2.2, 1.0],
];
function lama() {
  const tex = TX.manchaRadial();
  return MANCHAS.map(([x, z, sx, sz]) => {
    const mat = new THREE.MeshStandardMaterial({ color: 0x6e5236, alphaMap: tex, transparent: true, roughness: 0.35, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    const m = new THREE.Mesh(new THREE.CircleGeometry(0.5, 28), mat);
    m.rotation.x = -Math.PI / 2;
    m.scale.set(sx, sz, 1);
    m.position.set(x, relevo(x, z) + 0.02, z);
    m.renderOrder = 2;
    return m;
  });
}

// Faixa de lama nas paredes, até onde a água chegou.
function marcaParede() {
  const { x, z, w, d } = CASA;
  const g = new THREE.Group();
  const geo = new THREE.BoxGeometry(w + 0.04, 1, d + 0.04);
  geo.translate(0, 0.5, 0);
  const faixa = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x7b5c3c, roughness: 0.9, transparent: true, opacity: 0.82 }));
  faixa.scale.y = MARCA_LAMA;
  const linha = new THREE.Mesh(new THREE.BoxGeometry(w + 0.05, 0.03, d + 0.05), new THREE.MeshStandardMaterial({ color: 0x4d3722, roughness: 0.9, transparent: true, opacity: 0.9 }));
  linha.position.y = MARCA_LAMA;
  g.add(faixa, linha);
  g.position.set(x, relevo(x, z) + 0.005, z);
  return { grupo: g, faixa, linha };
}

// Contorno da casa que se desenha aresta por aresta (vistoria).
function contorno() {
  const { x, z, w, h, d } = CASA;
  const y0 = relevo(x, z);
  const x0 = x - w / 2 - 0.06;
  const x1 = x + w / 2 + 0.06;
  const z0 = z - d / 2 - 0.06;
  const z1 = z + d / 2 + 0.06;
  const y1 = y0 + h + 0.03;
  const P = (a, b, c) => new THREE.Vector3(a, b, c);
  // caminho: base da frente, base do lado, sobe, topo, desce; cobre as faces visíveis
  const arestas = [
    [P(x0, y0, z1), P(x1, y0, z1)],
    [P(x1, y0, z1), P(x1, y0, z0)],
    [P(x1, y0, z0), P(x1, y1, z0)],
    [P(x1, y1, z0), P(x1, y1, z1)],
    [P(x1, y1, z1), P(x0, y1, z1)],
    [P(x0, y1, z1), P(x0, y0, z1)],
    [P(x1, y1, z1), P(x1, y0, z1)],
    [P(x0, y1, z1), P(x0, y1, z0)],
    [P(x0, y1, z0), P(x1, y1, z0)],
  ];
  const mat = new THREE.MeshBasicMaterial({ color: LARANJA, transparent: true, opacity: 1, depthTest: false });
  const g = new THREE.Group();
  const barras = arestas.map(([a, b]) => {
    const len = a.distanceTo(b);
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.045, len), mat);
    m.renderOrder = 11;
    m.userData = { a, b, len };
    m.lookAt(b.clone().sub(a));
    g.add(m);
    return m;
  });
  return { grupo: g, barras, mat };
}

// Botas de borracha (cano e pé), com o bico para -z.
function bota() {
  const g = new THREE.Group();
  const borracha = new THREE.MeshStandardMaterial({ color: 0xf2c418, roughness: 0.42 });
  const cano = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.066, 0.3, 14), borracha);
  cano.position.y = 0.18;
  const pe = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.065, 0.22), borracha);
  pe.position.set(0, 0.032, -0.05);
  const sola = new THREE.Mesh(new THREE.BoxGeometry(0.125, 0.02, 0.225), new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.9 }));
  sola.position.set(0, 0.01, -0.05);
  const borda = new THREE.Mesh(new THREE.TorusGeometry(0.064, 0.008, 6, 18), new THREE.MeshStandardMaterial({ color: 0x3a3a3a }));
  borda.rotation.x = Math.PI / 2;
  borda.position.y = 0.33;
  g.add(cano, pe, sola, borda);
  return sombras(g);
}

// Luva de borracha em pé (dedos para baixo, punho para cima).
function luva() {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x2f9e5a, roughness: 0.48 });
  const palma = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.035), mat);
  const punho = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.12, 12), mat);
  punho.position.y = 0.11;
  g.add(palma, punho);
  for (let f = 0; f < 4; f++) {
    const dedo = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.065, 0.025), mat);
    dedo.position.set(-0.034 + f * 0.023, -0.088, 0);
    g.add(dedo);
  }
  const polegar = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.055, 0.025), mat);
  polegar.position.set(0.06, -0.03, 0);
  polegar.rotation.z = 0.6;
  g.add(polegar);
  return sombras(g);
}

// Poço com mureta, telhadinho, sarilho, corda e balde.
function poco() {
  const g = new THREE.Group();
  const tijolo = new THREE.MeshStandardMaterial({ map: TX.blocos(), roughness: 0.95 });
  const mureta = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.36, 0.42, 22, 1, true), tijolo);
  mureta.position.y = 0.21;
  const borda = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.035, 6, 24), new THREE.MeshStandardMaterial({ color: 0x9c9488, roughness: 0.9 }));
  borda.rotation.x = Math.PI / 2;
  borda.position.y = 0.42;
  const fundo = new THREE.Mesh(new THREE.CircleGeometry(0.33, 22), new THREE.MeshStandardMaterial({ color: 0x3b2e1f, roughness: 0.2 }));
  fundo.rotation.x = -Math.PI / 2;
  fundo.position.y = 0.12;
  const madeira = new THREE.MeshStandardMaterial({ color: 0x7a5534, roughness: 0.9 });
  for (const s of [-1, 1]) {
    const pe = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.75, 0.05), madeira);
    pe.position.set(s * 0.33, 0.6, 0);
    g.add(pe);
  }
  const telhado = new THREE.Mesh(new THREE.ConeGeometry(0.52, 0.28, 4, 1), new THREE.MeshStandardMaterial({ map: TX.telhasColonial(), roughness: 0.8 }));
  telhado.rotation.y = Math.PI / 4;
  telhado.position.y = 1.1;
  const sarilho = new THREE.Group();
  const eixo = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.66, 10), madeira);
  eixo.rotation.z = Math.PI / 2;
  const manivela = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.14, 0.03), madeira);
  manivela.position.set(0.36, 0.06, 0);
  sarilho.add(eixo, manivela);
  sarilho.position.y = 0.82;
  const corda = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 1, 5), new THREE.MeshStandardMaterial({ color: 0xc8b48a }));
  corda.geometry.translate(0, -0.5, 0);
  corda.position.set(0.1, 0.8, 0);
  const balde = new THREE.Group();
  const lata = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.065, 0.14, 14, 1, true), new THREE.MeshStandardMaterial({ color: 0x8b9196, metalness: 0.6, roughness: 0.4, side: THREE.DoubleSide }));
  const alca = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.006, 4, 16, Math.PI), new THREE.MeshStandardMaterial({ color: 0x555 }));
  alca.position.y = 0.07;
  const aguaBalde = new THREE.Mesh(new THREE.CircleGeometry(0.08, 14), new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.15 }));
  aguaBalde.rotation.x = -Math.PI / 2;
  aguaBalde.position.y = 0.066;
  aguaBalde.visible = false;
  balde.add(lata, alca, aguaBalde);
  balde.position.set(0.1, 0.6, 0);
  g.add(mureta, borda, fundo, telhado, sarilho, corda, balde);
  sombras(g);
  const [x, z] = POCO;
  g.position.set(x, relevo(x, z), z);
  return { grupo: g, balde, corda, sarilho, aguaBalde };
}

// Mesa: garrafa de 1 litro, frasco de hipoclorito, copo, fogareiro e panela.
function mesa() {
  const g = new THREE.Group();
  const madeira = new THREE.MeshStandardMaterial({ color: 0x9a6b42, roughness: 0.8 });
  const tampo = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.05, 0.6), madeira);
  tampo.position.y = 0.48;
  g.add(tampo);
  for (const [x, z] of [
    [0.6, 0.25],
    [-0.6, 0.25],
    [0.6, -0.25],
    [-0.6, -0.25],
  ]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.48, 0.05), madeira);
    p.position.set(x, 0.24, z);
    g.add(p);
  }
  const TOPO = 0.505;
  const vidro = new THREE.MeshPhysicalMaterial({ color: 0xe6f4ff, roughness: 0.05, transmission: 0.5, transparent: true, opacity: 0.45, thickness: 0.04, depthWrite: false });
  // garrafa de 1 litro
  const garrafa = new THREE.Group();
  const corpo = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.26, 20), vidro);
  corpo.position.y = 0.13;
  const gargalo = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.075, 0.07, 20), vidro);
  gargalo.position.y = 0.295;
  const agua = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.22, 20), new THREE.MeshStandardMaterial({ color: 0x8fcbed, transparent: true, opacity: 0.75, roughness: 0.1 }));
  agua.position.y = 0.115;
  const rotulo = new THREE.Mesh(new THREE.CylinderGeometry(0.077, 0.077, 0.06, 20, 1, true), new THREE.MeshStandardMaterial({ color: 0x2f6fb0, roughness: 0.5 }));
  rotulo.position.y = 0.12;
  garrafa.add(agua, corpo, gargalo, rotulo);
  garrafa.position.set(-0.42, TOPO, 0.02);
  const superficie = new THREE.Vector3(-0.42, TOPO + 0.36, 0.02); // boca da garrafa
  // onda na boca da garrafa quando a gota cai
  const onda = new THREE.Mesh(new THREE.RingGeometry(0.02, 0.03, 18), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
  onda.rotation.x = -Math.PI / 2;
  onda.position.copy(superficie);
  onda.renderOrder = 6;
  // frasco de hipoclorito (pivô na base)
  const frasco = new THREE.Group();
  const fcorpo = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.048, 0.15, 14), new THREE.MeshStandardMaterial({ color: 0xf4f4f4, roughness: 0.35 }));
  fcorpo.position.y = 0.075;
  const frot = new THREE.Mesh(new THREE.CylinderGeometry(0.049, 0.049, 0.065, 14, 1, true), new THREE.MeshStandardMaterial({ color: 0x2f9e5a, roughness: 0.5 }));
  frot.position.y = 0.07;
  const fbico = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.06, 10), new THREE.MeshStandardMaterial({ color: 0xf4f4f4 }));
  fbico.position.y = 0.18;
  const ponta = new THREE.Object3D();
  ponta.position.y = 0.215;
  frasco.add(fcorpo, frot, fbico, ponta);
  const FRASCO0 = new THREE.Vector3(-0.16, TOPO, 0.12);
  frasco.position.copy(FRASCO0);
  // gotas
  const gotas = [0, 1].map(() => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.016, 10, 8), new THREE.MeshStandardMaterial({ color: 0xbfe6ff, roughness: 0.05, transparent: true, opacity: 0 }));
    m.scale.y = 1.4;
    g.add(m);
    return m;
  });
  // copo que enche quando a espera termina
  const copo = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.038, 0.11, 14, 1, true), vidro);
  copo.position.set(-0.2, TOPO + 0.055, -0.15);
  const aguaCopo = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.1, 14), new THREE.MeshStandardMaterial({ color: 0x8fcbed, transparent: true, opacity: 0.8 }));
  aguaCopo.geometry.translate(0, 0.05, 0);
  aguaCopo.position.set(-0.2, TOPO + 0.003, -0.15);
  aguaCopo.scale.y = 0.001;
  // fogareiro e panela
  const fog = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0x3d4247, metalness: 0.6, roughness: 0.45 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.07, 0.26), metal);
  base.position.y = 0.035;
  const queimador = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.02, 14), new THREE.MeshStandardMaterial({ color: 0x1f2226, metalness: 0.5 }));
  queimador.position.y = 0.08;
  const botao = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.02, 10), new THREE.MeshStandardMaterial({ color: 0xd9534f }));
  botao.rotation.x = Math.PI / 2;
  botao.position.set(0.07, 0.035, 0.135);
  const chama = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.09, 14, 1, true), new THREE.MeshBasicMaterial({ color: 0x4ea6ff, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }));
  chama.position.y = 0.13;
  chama.scale.setScalar(0.001);
  const panela = new THREE.Group();
  const parede = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.12, 0.14, 22, 1, true), new THREE.MeshStandardMaterial({ color: 0xb8bfc6, metalness: 0.8, roughness: 0.28, side: THREE.DoubleSide }));
  const fundoP = new THREE.Mesh(new THREE.CircleGeometry(0.12, 22), parede.material);
  fundoP.rotation.x = -Math.PI / 2;
  fundoP.position.y = -0.07;
  const aguaP = new THREE.Mesh(new THREE.CircleGeometry(0.122, 22), new THREE.MeshStandardMaterial({ color: 0x9cd2ef, roughness: 0.1 }));
  aguaP.rotation.x = -Math.PI / 2;
  aguaP.position.y = 0.04;
  for (const s of [-1, 1]) {
    const cabo = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.025), new THREE.MeshStandardMaterial({ color: 0x222 }));
    cabo.position.set(s * 0.16, 0.05, 0);
    panela.add(cabo);
  }
  panela.add(parede, fundoP, aguaP);
  panela.position.y = 0.17;
  const bolhas = Array.from({ length: 9 }, (_, i) => {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, roughness: 0.1 }));
    const a = i * 2.4;
    const r = 0.02 + (i % 3) * 0.032;
    b.userData = { x: Math.cos(a) * r, z: Math.sin(a) * r, fase: i * 0.37 };
    b.scale.setScalar(0.001);
    panela.add(b);
    return b;
  });
  fog.add(base, queimador, botao, chama, panela);
  fog.position.set(0.36, TOPO, 0);
  g.add(garrafa, onda, frasco, copo, aguaCopo, fog);
  sombras(g);
  const [x, z] = MESA;
  g.position.set(x, relevo(x, z), z);
  return { grupo: g, frasco, FRASCO0, ponta, gotas, onda, superficie, aguaCopo, chama, bolhas, panela, fog, TOPO };
}

// Caixa de feira com alimentos que tiveram contato com a água.
function caixaComida() {
  const g = new THREE.Group();
  const madeira = new THREE.MeshStandardMaterial({ color: 0xb88a57, roughness: 0.9 });
  const fundo = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.04, 0.38), madeira);
  fundo.position.y = 0.02;
  g.add(fundo);
  for (const [x, z, w, d] of [
    [0, 0.17, 0.55, 0.03],
    [0, -0.17, 0.55, 0.03],
    [0.26, 0, 0.03, 0.38],
    [-0.26, 0, 0.03, 0.38],
  ]) {
    for (const y of [0.07, 0.17]) {
      const r = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, d), madeira);
      r.position.set(x, y, z);
      g.add(r);
    }
  }
  const cores = [0xd9534f, 0xf0c419, 0x5aa469, 0xe8e1d2, 0xd98c3f];
  const itens = [];
  for (let i = 0; i < 7; i++) {
    const item =
      i % 2
        ? new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.11, 12), new THREE.MeshStandardMaterial({ color: 0xbfc3c7, metalness: 0.7, roughness: 0.3 }))
        : new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.06), new THREE.MeshStandardMaterial({ color: cores[i % 5], roughness: 0.7 }));
    item.position.set(-0.17 + (i % 4) * 0.11, 0.11, -0.07 + Math.floor(i / 4) * 0.13);
    item.userData.p0 = item.position.clone();
    g.add(item);
    itens.push(item);
  }
  const lamaCx = new THREE.Mesh(new THREE.BoxGeometry(0.57, 0.08, 0.4), new THREE.MeshStandardMaterial({ color: 0x6e5236, transparent: true, opacity: 0.7, roughness: 0.4 }));
  lamaCx.position.y = 0.04;
  g.add(lamaCx);
  sombras(g);
  const [x, z] = COMIDA;
  g.position.set(x, relevo(x, z), z);
  g.rotation.y = 0.4;
  return { grupo: g, itens };
}

// Saco de lixo preto que recebe os alimentos.
function saco() {
  const g = new THREE.Group();
  const perfil = [
    [0.001, 0],
    [0.16, 0.01],
    [0.21, 0.1],
    [0.22, 0.22],
    [0.18, 0.33],
    [0.1, 0.4],
    [0.06, 0.42],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const corpo = new THREE.Mesh(new THREE.LatheGeometry(perfil, 20), new THREE.MeshStandardMaterial({ color: 0x1e2124, roughness: 0.38, metalness: 0.1 }));
  const no = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), corpo.material);
  no.position.y = 0.45;
  no.scale.setScalar(0.001);
  g.add(corpo, no);
  sombras(g);
  const [x, z] = SACO;
  g.position.set(x, relevo(x, z), z);
  g.scale.setScalar(0.001);
  return { grupo: g, no, boca: new THREE.Vector3(x, relevo(x, z) + 0.42, z) };
}

// Tênis no chão perto do varal; uma aranha escondida dentro.
function sapato() {
  const g = new THREE.Group();
  const tenis = new THREE.Group();
  const sola = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.03, 0.26), new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.6 }));
  sola.position.y = 0.015;
  const cabedal = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 0.2), new THREE.MeshStandardMaterial({ color: 0x3b6fb6, roughness: 0.7 }));
  cabedal.position.set(0, 0.065, 0.02);
  const bico = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), cabedal.material);
  bico.scale.set(1, 0.8, 1);
  bico.position.set(0, 0.03, -0.08);
  const abertura = new THREE.Mesh(new THREE.CircleGeometry(0.04, 14), new THREE.MeshBasicMaterial({ color: 0x15161a }));
  abertura.rotation.x = -Math.PI / 2;
  abertura.position.set(0, 0.101, 0.07);
  tenis.add(sola, cabedal, bico, abertura);
  g.add(tenis);
  const par = tenis.clone();
  par.position.set(0.14, 0, 0.03);
  par.rotation.y = 0.2;
  g.add(par);
  sombras(g);
  const [x, z] = SAPATO;
  g.position.set(x, relevo(x, z), z);
  g.rotation.y = 0.6;
  g.scale.setScalar(1.4);
  return { grupo: g, tenis };
}

function aranha() {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x2a1f18, roughness: 0.6 });
  const abd = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), mat);
  abd.position.z = 0.035;
  const cef = new THREE.Mesh(new THREE.SphereGeometry(0.026, 10, 8), mat);
  cef.position.z = -0.02;
  g.add(abd, cef);
  const pernas = [];
  for (const s of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const perna = new THREE.Group();
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.004, 0.08, 4), mat);
      seg.rotation.z = (s * Math.PI) / 2.6;
      seg.position.x = s * 0.035;
      seg.position.y = 0.012;
      perna.add(seg);
      perna.position.z = -0.035 + i * 0.022;
      perna.rotation.y = s * (-0.5 + i * 0.33);
      perna.userData = { s, i };
      g.add(perna);
      pernas.push(perna);
    }
  }
  g.position.y = 0.03;
  g.scale.setScalar(0.001);
  return { grupo: g, pernas };
}

// Sofá posto para secar; cabo de vassoura; cobra escondida embaixo.
function moveis() {
  const g = new THREE.Group();
  const tecido = new THREE.MeshStandardMaterial({ color: 0x5c6f9a, roughness: 0.95 });
  const sofa = new THREE.Group();
  const assento = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.18, 0.48), tecido);
  assento.position.y = 0.2;
  const encosto = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.34, 0.14), tecido);
  encosto.position.set(0, 0.42, -0.2);
  sofa.add(assento, encosto);
  for (const s of [-1, 1]) {
    const braco = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.28, 0.48), tecido);
    braco.position.set(s * 0.55, 0.3, 0);
    sofa.add(braco);
    for (const zz of [-0.18, 0.18]) {
      const pe = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.11, 0.05), new THREE.MeshStandardMaterial({ color: 0x3a2a1c }));
      pe.position.set(s * 0.52, 0.055, zz);
      sofa.add(pe);
    }
  }
  const mancha = new THREE.Mesh(new THREE.BoxGeometry(1.26, 0.16, 0.5), new THREE.MeshStandardMaterial({ color: 0x6e5236, transparent: true, opacity: 0.6, roughness: 0.6 }));
  mancha.position.y = 0.17;
  sofa.add(mancha);
  // espuma da lavagem
  const espuma = [];
  for (let i = 0; i < 14; i++) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.035 + (i % 3) * 0.012, 10, 8), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, transparent: true, opacity: 0.95 }));
    b.position.set(-0.42 + (i % 7) * 0.14, 0.3, -0.04 + Math.floor(i / 7) * 0.16);
    b.scale.setScalar(0.001);
    sofa.add(b);
    espuma.push(b);
  }
  sombras(sofa);
  g.add(sofa);

  const cobra = new THREE.Group();
  const pele = new THREE.MeshStandardMaterial({ color: 0x6b5a2a, roughness: 0.55 });
  for (let i = 0; i < 3; i++) {
    const anel = new THREE.Mesh(new THREE.TorusGeometry(0.11 - i * 0.025, 0.026, 8, 24), pele);
    anel.rotation.x = Math.PI / 2;
    anel.position.y = 0.026 + i * 0.042;
    cobra.add(anel);
  }
  const pescoco = new THREE.Group();
  const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.2, 8), pele);
  seg.position.y = 0.1;
  const cabeca = new THREE.Mesh(new THREE.SphereGeometry(0.038, 10, 8), pele);
  cabeca.scale.set(1, 0.75, 1.5);
  cabeca.position.set(0, 0.2, 0.025);
  const lingua = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.004, 0.05), new THREE.MeshBasicMaterial({ color: 0xc0392b }));
  lingua.position.set(0, 0.195, 0.09);
  pescoco.add(seg, cabeca, lingua);
  pescoco.position.set(0.06, 0.1, 0.03);
  pescoco.scale.y = 0.3;
  cobra.add(pescoco);
  sombras(cobra);
  cobra.position.set(0.1, 0, 0.05);
  cobra.scale.setScalar(0.001);
  g.add(cobra);

  const vassoura = new THREE.Group();
  const haste = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 1.3, 8), new THREE.MeshStandardMaterial({ color: 0xc9a46a, roughness: 0.7 }));
  haste.rotation.z = Math.PI / 2;
  haste.position.x = 0.65;
  const escova = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.3), new THREE.MeshStandardMaterial({ color: 0xd8b04a, roughness: 0.9 }));
  escova.position.x = 1.33;
  const travessa = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.3), new THREE.MeshStandardMaterial({ color: 0xd9534f }));
  travessa.position.x = 1.28;
  vassoura.add(haste, escova, travessa);
  vassoura.rotation.z = 0.32; // inclinada, ponta encostando no braço do sofá
  sombras(vassoura);
  vassoura.position.set(0.62, 0.22, 0.05);
  vassoura.visible = false;
  g.add(vassoura);

  const rato = new THREE.Group();
  const pelo = new THREE.MeshStandardMaterial({ color: 0x77706a, roughness: 0.9 });
  const rcorpo = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), pelo);
  rcorpo.scale.set(0.8, 0.7, 1.4);
  rcorpo.position.y = 0.045;
  const rcab = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.08, 10), pelo);
  rcab.rotation.x = Math.PI / 2;
  rcab.position.set(0, 0.05, 0.11);
  const orelhas = [-1, 1].map((s) => {
    const o = new THREE.Mesh(new THREE.CircleGeometry(0.018, 10), new THREE.MeshStandardMaterial({ color: 0xd7a3a3, side: THREE.DoubleSide }));
    o.position.set(s * 0.025, 0.085, 0.08);
    return o;
  });
  const rabo = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.007, 0.16, 5), new THREE.MeshStandardMaterial({ color: 0xc89b93 }));
  rabo.rotation.x = Math.PI / 2.3;
  rabo.position.set(0, 0.03, -0.15);
  rato.add(rcorpo, rcab, ...orelhas, rabo);
  sombras(rato);
  rato.scale.setScalar(0.001);
  g.add(rato);

  const [x, z] = SOFA;
  g.position.set(x, relevo(x, z), z);
  g.rotation.y = 0.25;
  return { grupo: g, sofa, mancha, espuma, cobra, pescoco, vassoura, rato };
}

// Rodo para raspar a lama.
function rodo() {
  const g = new THREE.Group();
  const lamina = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 0.55), new THREE.MeshStandardMaterial({ color: 0x2d3e8c, roughness: 0.6 }));
  lamina.position.y = 0.05;
  const borracha = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.56), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 }));
  borracha.position.set(-0.03, 0.015, 0);
  const cabo = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 1.1, 8), new THREE.MeshStandardMaterial({ color: 0xc9a46a, roughness: 0.7 }));
  cabo.geometry.translate(0, 0.55, 0);
  cabo.position.set(0.02, 0.06, 0);
  cabo.rotation.z = 0.9; // cabo para trás do movimento
  g.add(lamina, borracha, cabo);
  const monte = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x5f4630, roughness: 0.5 }));
  monte.scale.set(0.5, 0.35, 1.3);
  monte.position.set(0.14, 0, 0);
  g.add(monte);
  sombras(g);
  g.visible = false;
  return { grupo: g, monte };
}

// Balde com água e espuma, e a esponja.
function lavagem() {
  const g = new THREE.Group();
  const balde = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.13, 0.24, 18, 1, true), new THREE.MeshStandardMaterial({ color: 0x2f7fd0, roughness: 0.45, side: THREE.DoubleSide }));
  balde.position.y = 0.12;
  const fundo = new THREE.Mesh(new THREE.CircleGeometry(0.13, 18), balde.material);
  fundo.rotation.x = -Math.PI / 2;
  fundo.position.y = 0.005;
  const agua = new THREE.Mesh(new THREE.CircleGeometry(0.155, 18), new THREE.MeshStandardMaterial({ color: 0xeaf4fb, roughness: 0.2 }));
  agua.rotation.x = -Math.PI / 2;
  agua.position.y = 0.2;
  const alca = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.008, 4, 18, Math.PI), new THREE.MeshStandardMaterial({ color: 0x222 }));
  alca.position.y = 0.24;
  alca.rotation.x = -0.4;
  g.add(balde, fundo, agua, alca);
  sombras(g);
  const esponja = new THREE.Group();
  const amarela = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.09), new THREE.MeshStandardMaterial({ color: 0xf6d04d, roughness: 0.95 }));
  const verde = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.02, 0.09), new THREE.MeshStandardMaterial({ color: 0x2f9e5a, roughness: 0.9 }));
  verde.position.y = 0.035;
  esponja.add(amarela, verde);
  sombras(esponja);
  return { grupo: g, esponja };
}

// ---------- Cena ----------

export function criarCenaFazer7({ palco }) {
  const raiz = new THREE.Group();
  raiz.name = 'cena-depois-fazer';
  raiz.add(terreno());

  const casa = criarCasa({
    w: CASA.w,
    h: CASA.h,
    d: CASA.d,
    cor: '#f1e4c8',
    semente: 151,
    aberturas: [
      { face: 'frente', tipo: 'porta', u: 0.25, largura: 0.22, altura: 0.62 },
      { face: 'frente', tipo: 'janela', u: 0.66, v: 0.52, largura: 0.3, altura: 0.27 },
      { face: 'leste', tipo: 'janela', u: 0.5, v: 0.52, largura: 0.3, altura: 0.27 },
      { face: 'oeste', tipo: 'janela', u: 0.5, v: 0.52, largura: 0.3, altura: 0.27 },
    ],
  });
  casa.position.set(CASA.x, relevo(CASA.x, CASA.z), CASA.z);
  raiz.add(casa);
  const marca = marcaParede();
  raiz.add(marca.grupo);
  const manchas = lama();
  raiz.add(...manchas);

  for (const [w, h, d, cor, sem, x, z] of [
    [2.0, 1.3, 1.7, '#dfe7ea', 153, -5.0, -1.4],
    [1.9, 1.3, 1.6, '#f2dcc8', 155, 4.9, -1.5],
  ]) {
    const v = criarCasa({ w, h, d, cor, semente: sem, caixaDagua: false });
    v.position.set(x, relevo(x, z), z);
    raiz.add(v);
  }
  const objPoco = poco();
  const objMesa = mesa();
  const objComida = caixaComida();
  const objSaco = saco();
  const objSapato = sapato();
  const objAranha = aranha();
  const objMoveis = moveis();
  const objRodo = rodo();
  const objLavagem = lavagem();
  const objVaral = varal(relevo, [0.9, -0.95], [2.7, -0.45]);
  raiz.add(objPoco.grupo, objMesa.grupo, objComida.grupo, objSaco.grupo, objSapato.grupo, objAranha.grupo, objMoveis.grupo, objRodo.grupo, objLavagem.grupo, objLavagem.esponja, objVaral);
  const LAV = [-3.05, 1.75];
  objLavagem.grupo.position.set(LAV[0], relevo(...LAV), LAV[1]);

  raiz.add(
    cerca(relevo, [-6.3, 2.6], [3.0, 2.6], { vao: [0.37, 0.47] }),
    arvore(-5.6, 3.6, 0.9, 3),
    arvore(2.6, -2.6, 0.9, 5),
    arvore(5.4, 2.4, 1.0, 7),
    arvore(-3.3, -2.7, 0.8, 9),
    bananeira(relevo, 3.5, 3.6, 0.9, 4),
    arbusto(relevo, 0.3, -1.9, 0.9, 3),
    arbusto(relevo, -5.8, 0.6, 0.9, 5),
    pedras(relevo, [
      [3.3, 1.4, 0.1],
      [-0.6, 2.2, 0.08],
    ]),
  );
  raiz.add(
    grama(relevo, {
      area: [-LARGURA / 2 + 0.05, LARGURA / 2 - 0.05, -PROFUNDIDADE / 2 + 0.05, PROFUNDIDADE / 2 - 0.05],
      quantidade: 6000,
      pode: (x, z) =>
        Math.abs(z - RIO_Z) > 0.75 &&
        !(Math.abs(x - CASA.x) < 1.45 && Math.abs(z - CASA.z) < 1.15) &&
        !(Math.abs(x + 5.0) < 1.15 && Math.abs(z + 1.4) < 1.0) &&
        !(Math.abs(x - 4.9) < 1.1 && Math.abs(z + 1.5) < 0.95) &&
        Math.hypot(x - POCO[0], z - POCO[1]) > 0.45 &&
        !(Math.abs(x + 2.4) < 0.45 && z > 0.2) &&
        MANCHAS.every(([mx, mz, sx, sz]) => ((x - mx) / (sx * 0.5)) ** 2 + ((z - mz) / (sz * 0.5)) ** 2 > 1),
      semente: 23,
    }),
  );

  // ---------- Efeitos ----------
  const agua = cheia();
  raiz.add(agua.malha, agua.riscos);
  const sol = sprite(texSol(), 2.6, 2.6, { profundidade: true });
  sol.material.opacity = 1;
  sol.renderOrder = 0;
  raiz.add(sol);
  const linhas = contorno();
  raiz.add(linhas.grupo);
  const lupa = sprite(texLupa(), 0.42, 0.42);
  raiz.add(lupa);

  const luvas = [luva(), luva()];
  const botas = [bota(), bota()];
  raiz.add(...botas, ...luvas);
  const texBota = texPegadaBota();
  const pegadas = [];
  const PASSO = (BOTAS_DE[1] - BOTAS_PARA_Z) / 4;
  // 5 passos alternados: esquerda, direita, esquerda, direita, junta os pés
  const PASSOS = [
    [0, BOTAS_DE[1], BOTAS_DE[1] - PASSO],
    [1, BOTAS_DE[1], BOTAS_DE[1] - 2 * PASSO],
    [0, BOTAS_DE[1] - PASSO, BOTAS_DE[1] - 3 * PASSO],
    [1, BOTAS_DE[1] - 2 * PASSO, BOTAS_DE[1] - 4 * PASSO],
    [0, BOTAS_DE[1] - 3 * PASSO, BOTAS_DE[1] - 4 * PASSO],
  ];
  const ladoX = (lado) => BOTAS_DE[0] + (lado ? 0.09 : -0.09);
  for (const [lado, , z] of PASSOS) {
    const m = decalque(texBota, 0.13, 0.26, ladoX(lado), z - 0.05);
    raiz.add(m);
    pegadas.push(m);
  }
  const pe = decalque(texPegadaPe(), 0.12, 0.24, DESCALCO[0], DESCALCO[1], 0.3);
  raiz.add(pe);
  const xPe = sprite(texX(), 0.36, 0.36);
  xPe.position.set(DESCALCO[0], chao(...DESCALCO) + 0.45, DESCALCO[1]);
  const xPoco = sprite(texX(), 0.4, 0.4);
  xPoco.position.set(POCO[0], chao(...POCO) + 1.55, POCO[1]);
  const xComida = sprite(texX(), 0.36, 0.36);
  xComida.position.set(COMIDA[0], chao(...COMIDA) + 0.62, COMIDA[1]);
  raiz.add(xPe, xPoco, xComida);

  const mesaW = (v) => objMesa.grupo.localToWorld(v.clone());
  const relGotas = contador();
  relGotas.sprite.position.copy(mesaW(new THREE.Vector3(-0.95, 0.75, 0.1)));
  const relEspera = relogio('30 min');
  relEspera.sprite.position.copy(mesaW(new THREE.Vector3(-0.42, 1.1, 0.02)));
  const relFerver = relogio('5 min');
  relFerver.sprite.position.copy(mesaW(new THREE.Vector3(0.36, 1.12, 0)));
  raiz.add(relGotas.sprite, relEspera.sprite, relFerver.sprite);
  const texV = texVapor();
  const vapores = Array.from({ length: 7 }, (_, i) => {
    const s = sprite(texV, 0.16, 0.16, { profundidade: true });
    s.userData.fase = i / 7;
    raiz.add(s);
    return s;
  });

  const tracejado = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.7), new THREE.MeshBasicMaterial({ map: texTracejado(), transparent: true, opacity: 0, depthWrite: false }));
  tracejado.rotation.x = -Math.PI / 2;
  objMoveis.grupo.add(tracejado);
  tracejado.position.set(0.1, 0.03, 0.05);
  tracejado.renderOrder = 6;

  const texB = texBrilho();
  const brilhos = Array.from({ length: 8 }, (_, i) => {
    const s = sprite(texB, 0.16, 0.16);
    s.userData.fase = i * 0.37;
    raiz.add(s);
    return s;
  });
  const PONTOS_BRILHO = [
    [-4.1, 0.6, 1.0],
    [-3.6, 0.5, 1.2],
    [-3.9, 0.75, 0.8],
    [-1.6, 0.55, -0.1],
    [-0.6, 0.5, -0.15],
    [-2.6, 0.9, -0.15],
    [-1.2, 0.1, 0.9],
    [-2.9, 0.1, 0.6],
  ];
  brilhos.forEach((s, i) => s.position.set(...PONTOS_BRILHO[i]));

  // ---------- Âncoras das etiquetas ----------
  const ancora = (x, y, z) => {
    const o = new THREE.Object3D();
    o.position.set(x, y, z);
    raiz.add(o);
    return o;
  };
  const yc = relevo(CASA.x, CASA.z);
  const ancBotas = ancora(BOTAS_DE[0], 0.5, BOTAS_DE[1]);
  const ancoras = {
    baixar: ancora(CASA.x + CASA.w / 2, yc + MARCA_LAMA, CASA.z + CASA.d / 2),
    dia: sol,
    vistoria: ancora(CASA.x + CASA.w / 2 + 0.06, yc + CASA.h, CASA.z + CASA.d / 2 + 0.06),
    epi: ancBotas,
    descalco: xPe,
    poco: ancora(POCO[0], chao(...POCO) + 0.7, POCO[1]),
    gotas: ancora(...mesaW(new THREE.Vector3(-0.16, 0.7, 0.12)).toArray()),
    espera: relEspera.sprite,
    ferver: ancora(...mesaW(new THREE.Vector3(0.36, 0.75, 0)).toArray()),
    alimentos: xComida,
    sacudir: ancora(SAPATO[0], chao(...SAPATO) + 0.25, SAPATO[1]),
    vassoura: ancora(SOFA[0] + 0.5, chao(...SOFA) + 0.5, SOFA[1]),
    bichos: ancora(SOFA[0] + 0.12, chao(...SOFA) + 0.25, SOFA[1] + 0.05),
    raspar: ancora(-1.7, chao(-1.7, 0.7) + 0.1, 0.7),
    lavar: ancora(SOFA[0], chao(...SOFA) + 0.45, SOFA[1]),
  };

  // ---------- Estado e desenho ----------
  const estado = Object.fromEntries(ACOES.map((k) => [k, 0]));
  const v3 = new THREE.Vector3();
  const sapatoW = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  const ySofa = chao(...SOFA);

  function desenhar() {
    const e = estado;
    // 1. A água baixa até o leito do rio.
    const nivel = mix(NIVEL_CHEIA, NIVEL_RIO, fase(e.baixar, 0, 1));
    agua.malha.visible = e.baixar < 1;
    agua.malha.scale.y = Math.max(nivel - NIVEL_RIO + 0.02, 0.001);
    agua.malha.position.y = NIVEL_RIO + agua.malha.scale.y / 2 - 0.02;
    agua.malha.material.opacity = 0.88 * (1 - fase(e.baixar, 0.85, 1));

    // 2. O dia nasce atrás do morro.
    const d = fase(e.dia, 0, 1);
    palco.renderer.toneMappingExposure = mix(0.62, EXPOSICAO, d);
    sol.position.set(4.2, mix(-1.6, 3.6, d), -6.2);
    sol.material.opacity = d > 0 ? 1 : 0;

    // 3. Vistoria: o contorno da casa se desenha e a lupa percorre as paredes.
    const nb = linhas.barras.length;
    const pv = linear(e.vistoria, 0, 0.82);
    linhas.barras.forEach((b, i) => {
      const t = clamp(pv * nb - i);
      const { a, b: fim, len } = b.userData;
      b.visible = t > 0;
      b.scale.z = Math.max(t, 0.001);
      b.position.copy(a).lerp(fim, t / 2);
      if (t > 0 && t < 1) lupa.position.copy(a).lerp(fim, t).add(tmp.set(0.12, 0.18, 0.12));
    });
    linhas.grupo.visible = e.epi === 0;
    linhas.mat.opacity = e.vistoria >= 1 ? 0.55 : 1;
    lupa.material.opacity = e.vistoria > 0 ? 1 - fase(e.vistoria, 0.85, 1) : 0;
    if (e.vistoria >= 0.82) lupa.position.set(CASA.x + CASA.w / 2 + 0.2, yc + 0.9, CASA.z + 0.3);

    // 4. Botas e luvas caem no portão; as botas andam até a porta.
    const queda = pouso(e.epi, 0, 0.18);
    const quedaL = pouso(e.epi, 0.08, 0.26);
    const sobe = fase(e.epi, 0.28, 0.4) * (1 - fase(e.epi, 0.94, 1));
    const pes = [BOTAS_DE[1], BOTAS_DE[1]];
    const alto = [0, 0];
    PASSOS.forEach(([lado, de, para], k) => {
      const u = linear(e.epi, 0.42 + k * 0.11, 0.42 + (k + 1) * 0.11);
      if (u > 0) {
        pes[lado] = mix(de, para, smooth(u));
        alto[lado] = u < 1 ? 0.1 * Math.sin(Math.PI * u) : 0;
      }
      pegadas[k].material.opacity = u >= 1 ? 0.9 * (1 - limpo(ladoX(lado), para)) : 0;
    });
    botas.forEach((b, lado) => {
      const x = ladoX(lado);
      b.position.set(x, chao(x, pes[lado]) + alto[lado] + (1 - queda) * 2.2, pes[lado]);
      b.rotation.set(alto[lado] * 1.2, 0, 0);
      b.visible = e.epi > 0;
    });
    const zm = (pes[0] + pes[1]) / 2;
    luvas.forEach((l, lado) => {
      const x = BOTAS_DE[0] + (lado ? 0.3 : -0.3) + (lado ? 0.1 : -0.1) * (1 - sobe);
      const yChao = chao(x, zm) + 0.02;
      const balanco = e.epi > 0.42 && e.epi < 0.97 ? 0.04 * Math.sin(e.epi * 60 + lado * Math.PI) : 0;
      l.position.set(x, mix(yChao, chao(x, zm) + 0.5, sobe) + (1 - quedaL) * 2.4, zm + 0.12 * (1 - sobe) + balanco);
      l.rotation.set(-Math.PI / 2 * (1 - sobe), lado ? -0.2 : 0.2, 0);
      l.visible = e.epi > 0.08;
    });
    ancBotas.position.set(BOTAS_DE[0], chao(BOTAS_DE[0], zm) + 0.45, zm);

    // 5. Pegada de pé descalço na lama e o "não".
    pe.material.opacity = 0.95 * fase(e.descalco, 0, 0.3) * (1 - limpo(...DESCALCO));
    pe.scale.setScalar(0.6 + 0.4 * pouso(e.descalco, 0, 0.3));
    const xp = pouso(e.descalco, 0.35, 0.65);
    xPe.material.opacity = e.descalco > 0.35 ? (e.descalco >= 1 ? 0 : 1 - fase(e.descalco, 0.9, 1)) : 0;
    xPe.scale.setScalar(0.36 * Math.max(xp, 0.001));

    // 6. Poço: o balde desce, volta com água barrenta e aparece o "não use".
    let yb = 0.6;
    if (e.poco > 0) {
      if (e.poco < 0.32) yb = mix(0.6, 0.12, fase(e.poco, 0, 0.32));
      else if (e.poco < 0.45) yb = 0.12;
      else yb = mix(0.12, 0.62, fase(e.poco, 0.45, 0.72));
    }
    objPoco.balde.position.y = yb;
    objPoco.corda.scale.y = Math.max(0.8 - (yb + 0.07), 0.01);
    objPoco.sarilho.rotation.x = -yb * 14;
    objPoco.aguaBalde.visible = e.poco > 0.4;
    const xpp = pouso(e.poco, 0.74, 0.95);
    xPoco.material.opacity = e.poco > 0.74 ? 1 : 0;
    xPoco.scale.setScalar(0.4 * Math.max(xpp, 0.001));

    // 7. Hipoclorito: o frasco inclina sobre a garrafa e pinga 2 gotas.
    const inc = fase(e.gotas, 0.04, 0.2) * (1 - fase(e.gotas, 0.84, 0.98));
    const f = objMesa.frasco;
    f.position.set(mix(objMesa.FRASCO0.x, -0.25, inc), objMesa.FRASCO0.y + 0.56 * inc, mix(objMesa.FRASCO0.z, 0.02, inc));
    f.rotation.z = 2.25 * inc;
    f.updateMatrix();
    f.updateMatrixWorld(true);
    objMesa.grupo.updateMatrixWorld(true);
    let gotasCaidas = 0;
    let onda = 0;
    objMesa.gotas.forEach((g, i) => {
      const a = 0.26 + i * 0.27;
      const u = linear(e.gotas, a, a + 0.14);
      if (e.gotas >= a + 0.14) gotasCaidas++;
      v3.copy(objMesa.ponta.position);
      objMesa.frasco.localToWorld(v3);
      objMesa.grupo.worldToLocal(v3);
      g.position.set(mix(v3.x, objMesa.superficie.x, u), mix(v3.y, objMesa.superficie.y, u * u), mix(v3.z, objMesa.superficie.z, u));
      g.material.opacity = u > 0 && u < 1 ? 1 : 0;
      const w = linear(e.gotas, a + 0.14, a + 0.26);
      if (w > 0 && w < 1) onda = w;
    });
    objMesa.onda.material.opacity = onda > 0 ? 0.9 * (1 - onda) : 0;
    objMesa.onda.scale.setScalar(1 + onda * 2.2);
    relGotas.definir(gotasCaidas);
    relGotas.sprite.material.opacity = e.gotas > 0.22 ? 1 - fase(e.gotas, 0.92, 1) : 0;

    // 8. Espera de 30 minutos; depois a água vai para o copo.
    relEspera.definir(linear(e.espera, 0.08, 0.78));
    relEspera.sprite.material.opacity = e.espera > 0 ? fase(e.espera, 0, 0.08) * (1 - fase(e.espera, 0.94, 1)) : 0;
    objMesa.aguaCopo.scale.y = Math.max(fase(e.espera, 0.8, 0.96), 0.001);

    // 9. Sem hipoclorito: ferva 5 minutos.
    const chama = fase(e.ferver, 0, 0.12) * (1 - fase(e.ferver, 0.9, 1));
    objMesa.chama.scale.setScalar(Math.max(chama, 0.001));
    relFerver.definir(linear(e.ferver, 0.3, 0.86));
    relFerver.sprite.material.opacity = e.ferver > 0.26 ? fase(e.ferver, 0.26, 0.32) * (1 - fase(e.ferver, 0.94, 1)) : 0;

    // 10. Alimentos vão, um a um, para o saco; o saco é fechado.
    xComida.material.opacity = e.alimentos > 0 ? 1 - fase(e.alimentos, 0.2, 0.3) : 0;
    xComida.scale.setScalar(0.36 * Math.max(pouso(e.alimentos, 0, 0.12), 0.001));
    objSaco.grupo.scale.setScalar(Math.max(pouso(e.alimentos, 0.08, 0.2), 0.001));
    let dentro = 0;
    objComida.itens.forEach((it, i) => {
      const a = 0.22 + i * 0.095;
      const u = linear(e.alimentos, a, a + 0.12);
      const p0 = objComida.grupo.localToWorld(it.userData.p0.clone());
      const pos = p0.clone().lerp(objSaco.boca, smooth(u));
      pos.y += Math.sin(Math.PI * u) * 0.45;
      objComida.grupo.worldToLocal(pos);
      it.position.copy(pos);
      it.rotation.x = u * 6;
      it.visible = u < 1;
      if (u >= 1) dentro++;
    });
    objSaco.grupo.scale.y *= 1 + dentro * 0.025;
    objSaco.no.scale.setScalar(Math.max(pouso(e.alimentos, 0.9, 1), 0.001));

    // 11. Sacudir: as roupas balançam; o tênis vira e cai uma aranha.
    const ten = objSapato.tenis;
    const ergue = fase(e.sacudir, 0.3, 0.42) * (1 - fase(e.sacudir, 0.86, 1));
    ten.position.y = 0.45 * ergue;
    ten.rotation.x = Math.PI * 0.85 * fase(e.sacudir, 0.36, 0.46) * (1 - fase(e.sacudir, 0.86, 1));
    ten.rotation.z = e.sacudir > 0.46 && e.sacudir < 0.7 ? 0.35 * Math.sin(e.sacudir * 120) : 0;
    const ca = linear(e.sacudir, 0.55, 0.66);
    const corre = fase(e.sacudir, 0.68, 1);
    objSapato.grupo.updateMatrixWorld(true);
    sapatoW.set(0, 0.3, 0.07);
    objSapato.grupo.localToWorld(sapatoW);
    objAranha.grupo.visible = e.sacudir > 0.55;
    objAranha.grupo.scale.setScalar(e.sacudir > 0.55 ? 2.6 : 0.001);
    const destinoX = SAPATO[0] + 0.85;
    const ax = mix(sapatoW.x, destinoX, corre);
    const az = mix(sapatoW.z, SAPATO[1] + 0.45, corre);
    objAranha.grupo.position.set(ax, mix(sapatoW.y, chao(ax, az) + 0.02, Math.min(ca * ca * 1.2, 1)), az);
    objAranha.grupo.rotation.y = Math.atan2(destinoX - sapatoW.x, 0.45) + Math.PI;

    // 12. O cabo de vassoura empurra o sofá; a cobra fica à mostra.
    const m = objMoveis;
    m.vassoura.visible = e.vassoura > 0 && e.vassoura < 1;
    const chega = fase(e.vassoura, 0, 0.3);
    const empurra = fase(e.vassoura, 0.34, 0.8);
    const volta = fase(e.vassoura, 0.84, 1);
    m.vassoura.position.x = 0.62 + (1 - chega) * 1.2 - empurra * 0.7 + volta * 1.4;
    m.sofa.position.x = -0.7 * empurra;
    const vc = fase(e.vassoura, 0.62, 0.86);
    m.cobra.scale.setScalar(Math.max(1.5 * vc, 0.001));

    // 13. A cobra ergue a cabeça; um rato sai correndo; círculo de atenção.
    m.pescoco.scale.y = mix(0.3, 1, fase(e.bichos, 0.02, 0.25));
    tracejado.material.opacity = e.bichos > 0 ? fase(e.bichos, 0, 0.15) * (e.bichos >= 1 ? 0.8 : 1) : 0;
    const r = linear(e.bichos, 0.3, 0.95);
    m.rato.scale.setScalar(r > 0 && r < 1 ? 2.0 : 0.001);
    m.rato.position.set(mix(0.6, 1.9, r), 0, mix(-0.3, 0.55, r));
    m.rato.rotation.y = Math.atan2(1.3, 0.85);

    // 14. O rodo raspa a lama em duas passadas; a marca das paredes sai.
    const rp = e.raspar;
    const passada1 = linear(rp, 0.02, 0.4);
    const passada2 = linear(rp, 0.46, 0.82);
    objRodo.grupo.visible = rp > 0 && rp < 1;
    if (rp < 0.43) {
      const x = mix(-4.6, 0.9, smooth(passada1));
      objRodo.grupo.position.set(x, chao(x, 0.65), 0.65);
      objRodo.grupo.rotation.y = 0;
      objRodo.grupo.scale.setScalar(1.4);
    } else {
      const x = mix(0.9, -4.6, smooth(passada2));
      objRodo.grupo.position.set(x, chao(x, 1.6), 1.6);
      objRodo.grupo.rotation.y = Math.PI;
      objRodo.grupo.scale.setScalar(1.4);
    }
    objRodo.monte.scale.set(0.5 + (rp < 0.43 ? passada1 : passada2), 0.35 + 0.3 * (rp < 0.43 ? passada1 : passada2), 1.3);
    manchas.forEach((mm, i) => {
      mm.material.opacity = 0.92 * (1 - limpoMancha(i));
    });
    const parede = fase(rp, 0.84, 1);
    marca.faixa.scale.y = Math.max(MARCA_LAMA * (1 - parede), 0.001);
    marca.linha.position.y = MARCA_LAMA * (1 - parede);
    marca.linha.visible = parede < 1;
    marca.faixa.visible = parede < 1;

    // 15. Lavar e desinfetar: balde, esponja esfregando, espuma, brilho.
    const lv = e.lavar;
    objLavagem.grupo.scale.setScalar(Math.max(pouso(lv, 0, 0.14), 0.001));
    const esf = linear(lv, 0.18, 0.78);
    objLavagem.esponja.visible = lv > 0.14 && lv < 0.9;
    if (lv > 0.14) {
      const ang = esf * Math.PI * 8;
      const base = m.sofa.localToWorld(tmp.set(Math.cos(ang) * 0.3, 0.32, 0.02 + Math.sin(ang) * 0.1));
      const daAgua = new THREE.Vector3(LAV[0], chao(...LAV) + 0.25, LAV[1]);
      const ida = fase(lv, 0.14, 0.2);
      objLavagem.esponja.position.copy(daAgua).lerp(base, ida);
      objLavagem.esponja.rotation.y = 0.25;
    }
    m.espuma.forEach((b, i) => {
      const cresce = fase(esf, i / 18, i / 18 + 0.2);
      const some = fase(lv, 0.82, 0.95);
      b.scale.setScalar(Math.max(cresce * (1 - some), 0.001));
    });
    m.mancha.material.opacity = 0.6 * (1 - fase(lv, 0.3, 0.8));
    m.mancha.visible = lv < 0.8;
    brilhos.forEach((s) => (s.visible = lv > 0.82));
  }

  // quanto da lama já foi raspada num ponto (0 a 1)
  function limpo(x, z) {
    const rp = estado.raspar;
    if (rp <= 0) return 0;
    if (rp >= 1) return 1;
    const p1 = mix(-4.6, 0.9, smooth(linear(rp, 0.02, 0.4)));
    const p2 = mix(0.9, -4.6, smooth(linear(rp, 0.46, 0.82)));
    if (Math.abs(z - 0.65) < 0.5) return smooth((p1 - x) / 0.3);
    if (Math.abs(z - 1.6) < 0.6) return rp < 0.46 ? 0 : smooth((x - p2) / 0.3);
    return fase(rp, 0.84, 1);
  }
  function limpoMancha(i) {
    const [x, z] = MANCHAS[i];
    return limpo(x, z);
  }

  function definir(chave, p) {
    estado[chave] = p;
  }

  // Leva a ação de 0 a 1 em tempo de lição (pausa e velocidade valem).
  function aplicar(chave, { instantaneo = false } = {}) {
    if (!(chave in estado)) return Promise.resolve();
    if (instantaneo || palco.movimentoReduzido()) {
      estado[chave] = 1;
      desenhar();
      return Promise.resolve();
    }
    estado[chave] = 0;
    return palco.tweens.animar({
      duracao: DURACAO[chave],
      ease: easing.linear,
      aoAtualizar: (p) => {
        estado[chave] = p;
        desenhar();
      },
    });
  }

  // Todas as ações antes de `n` prontas; as outras zeradas.
  function definirAte(n) {
    ACOES.forEach((k, i) => (estado[k] = i < n ? 1 : 0));
    desenhar();
  }
  definirAte(0);

  function animar(tempo, dt, reduzido) {
    if (reduzido) return;
    const e = estado;
    agua.riscos.visible = agua.malha.visible;
    if (agua.malha.visible) {
      agua.tex.offset.y = -tempo * 0.03;
      const topo = agua.malha.position.y + agua.malha.scale.y / 2 + 0.012;
      agua.base.forEach(([x, z0, len], i) => {
        const z = PROFUNDIDADE / 2 - 0.3 - ((PROFUNDIDADE / 2 - 0.3 - z0 + tempo * 0.35) % (PROFUNDIDADE - 0.6));
        const o = i * 6;
        agua.pos[o] = x;
        agua.pos[o + 1] = Math.max(topo, relevo(x, z) + 0.01);
        agua.pos[o + 2] = z;
        agua.pos[o + 3] = x + 0.04;
        agua.pos[o + 4] = agua.pos[o + 1];
        agua.pos[o + 5] = z - len;
      });
      agua.riscos.geometry.attributes.position.needsUpdate = true;
      agua.riscos.material.opacity = agua.malha.material.opacity * 0.8;
    }
    if (e.vistoria >= 1) linhas.mat.opacity = 0.45 + 0.1 * Math.sin(tempo * 2);
    // roupas: balançam ao vento; sacudidas no começo de "sacudir"
    const roupas = objVaral.userData.roupas ?? [];
    const sacode = e.sacudir > 0.02 && e.sacudir < 0.3;
    roupas.forEach((rr, i) => {
      rr.rotation.z = sacode ? 0.35 * Math.sin(tempo * 18 + i * 1.3) : 0.03 * Math.sin(tempo * 1.5 + i);
    });
    // aranha mexe as pernas enquanto corre
    if (e.sacudir > 0.55 && e.sacudir < 1) objAranha.pernas.forEach((p) => (p.rotation.x = 0.35 * Math.sin(tempo * 30 + p.userData.i * 1.7 + p.userData.s)));
    // chama tremula, bolhas e vapor
    const fervendo = e.ferver > 0.22 && e.ferver < 0.92;
    objMesa.chama.scale.y = objMesa.chama.scale.x * (1 + 0.15 * Math.sin(tempo * 25));
    objMesa.bolhas.forEach((b) => {
      const ff = (tempo * 1.6 + b.userData.fase) % 1;
      b.scale.setScalar(fervendo ? 0.5 + ff : 0.001);
      b.position.set(b.userData.x, 0.04 + ff * 0.012, b.userData.z);
    });
    vapores.forEach((s) => {
      const ff = (tempo * 0.5 + s.userData.fase) % 1;
      const vis = fervendo ? fase(e.ferver, 0.22, 0.4) : 0;
      v3.set(0.36 + Math.sin(ff * 6 + s.userData.fase * 9) * 0.05, objMesa.TOPO + 0.28 + ff * 0.55, 0);
      objMesa.grupo.localToWorld(v3);
      s.position.copy(v3);
      s.material.opacity = vis * 0.95 * Math.sin(Math.PI * ff);
      s.scale.setScalar(0.14 + ff * 0.3);
    });
    // cobra balança a cabeça e mostra a língua
    if (e.bichos > 0) {
      objMoveis.pescoco.rotation.z = 0.25 * Math.sin(tempo * 2.2);
      objMoveis.pescoco.children[2].visible = Math.sin(tempo * 7) > 0.3;
    }
    if (e.bichos > 0 && e.bichos < 1) tracejado.rotation.z = tempo * 0.6;
    // brilhos de limpo
    if (e.lavar > 0.82) {
      brilhos.forEach((s) => {
        const ff = (tempo * 0.8 + s.userData.fase) % 1;
        s.material.opacity = Math.sin(Math.PI * ff);
        s.scale.setScalar(0.08 + 0.12 * Math.sin(Math.PI * ff));
      });
    }
  }

  // Ao sair da lição, a exposição volta ao normal.
  function sair() {
    palco.renderer.toneMappingExposure = EXPOSICAO;
  }

  return {
    raiz,
    alvos: [],
    enquadramento: ENQUADRAMENTOS_FAZER.geral,
    enquadramentos: ENQUADRAMENTOS_FAZER,
    ancoras,
    acoes: ACOES,
    duracao: DURACAO,
    estado,
    aplicar,
    definir,
    definirAte,
    desenhar,
    animar,
    sair,
  };
}
