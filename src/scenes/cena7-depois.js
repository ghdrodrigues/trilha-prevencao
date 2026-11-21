// Cena 7 ("Depois da água baixar"): a casa da baixada logo depois da cheia,
// com marca de lama nas paredes, lama no quintal, móveis secando, um poço, a
// mesa onde a água é tratada e os alimentos que tiveram contato com a água.
// Conteúdo: F4 (Enxurradas) e as páginas de enchentes do Ministério da Saúde
// (F9, F9a, F9b, F9c). Tudo em código, sem créditos.

import * as THREE from 'three';
import * as TX from './texturas.js';
import { criarCasa } from './casa-realista.js';
import { grama, cerca, arbusto, pedras, bananeira, varal, copaRealista } from './cenario-detalhes.js';

const LARGURA = 13;
const PROFUNDIDADE = 9;
const FUNDO = -1.5;
const LARANJA = 0xf77f00;

const smooth = (t) => {
  const x = Math.min(Math.max(t, 0), 1);
  return x * x * (3 - 2 * x);
};

const RIO_Z = -3.4;
export function relevo(x, z) {
  const rio = -0.5 * smooth(1 - Math.abs(z - RIO_Z) / 0.7);
  const morro = 0.9 * smooth((x - 3.6) / 2.4);
  return morro + rio + 0.025 * Math.sin(x * 1.3 + z * 0.9);
}

const CASA = { x: -1.6, z: -1.2, w: 2.6, h: 1.5, d: 2.0 };
const PORTA = [-2.25, -0.15];
const POCO = [1.6, -1.9];
const MESA = [1.3, 0.9];
const COMIDA = [-0.35, 0.4];
const SOFA = [-3.9, 1.0];
const MARCA_LAMA = 0.42;

export const ENQUADRAMENTOS_DEPOIS = {
  geral: { centro: [0, 0.4, 0], largura: 13.5, altura: 9.2 },
  casa: { centro: [-1.6, 0.7, -0.6], largura: 6.6, altura: 4.8 },
  epi: { centro: [-1.8, 0.4, 0.4], largura: 4.8, altura: 3.4 },
  agua: { centro: [1.4, 0.5, -0.4], largura: 5.6, altura: 4.0 },
  comida: { centro: [-0.2, 0.3, 0.6], largura: 4.4, altura: 3.2 },
  moveis: { centro: [-3.6, 0.5, 0.6], largura: 5.6, altura: 4.0 },
};

export const POSICOES_AGENTE_DEPOIS = {
  geral: [0.6, 1.9],
  casa: [0.3, 0.6],
  epi: [-0.9, 0.9],
  agua: [2.4, 0.9],
  comida: [0.7, 1.2],
  moveis: [-4.7, 1.8],
};

const POS_VIZINHO = [-2.3, 0.5];
export const VIZINHOS_DEPOIS = {
  encosta: { chave: 'vizinhoEncosta', pos: POS_VIZINHO },
  baixada: { chave: 'vizinhoBaixada', pos: POS_VIZINHO },
  aberto: { chave: 'vizinhoAberto', pos: POS_VIZINHO },
};

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
  const chao = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, map: TX.grama(), roughness: 0.95 }));
  chao.receiveShadow = true;
  g.add(chao);
  // rio, de volta ao leito
  const rio = new THREE.Mesh(new THREE.PlaneGeometry(LARGURA - 0.02, 1.2), new THREE.MeshStandardMaterial({ map: TX.barrenta(), color: 0xb59a78, roughness: 0.08, transparent: true, opacity: 0.88 }));
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

// Lama espalhada no quintal: manchas que somem com a limpeza.
function lama() {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x6e5236, alphaMap: TX.manchaRadial(), transparent: true, roughness: 0.35, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  const manchas = [
    [-1.6, 0.6, 2.6, 1.3],
    [-3.4, 0.4, 1.8, 1.2],
    [0.1, -0.2, 1.6, 1.4],
    [-1.0, 1.6, 2.0, 0.9],
    [-4.4, -1.2, 1.6, 1.4],
    [1.0, -2.2, 2.4, 1.0],
  ];
  for (const [x, z, sx, sz] of manchas) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(0.5, 28), mat);
    m.rotation.x = -Math.PI / 2;
    m.scale.set(sx, sz, 1);
    m.position.set(x, relevo(x, z) + 0.02, z);
    m.renderOrder = 2;
    g.add(m);
  }
  return { grupo: g, mat };
}

// Faixa de lama nas paredes, até a altura que a água chegou.
function marcaParede() {
  const { x, z, w, d } = CASA;
  const geo = new THREE.BoxGeometry(w + 0.04, MARCA_LAMA, d + 0.04);
  geo.translate(0, MARCA_LAMA / 2, 0);
  const mat = new THREE.MeshStandardMaterial({ color: 0x7b5c3c, roughness: 0.9, transparent: true, opacity: 0.8 });
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, relevo(x, z) + 0.005, z);
  // linha mais escura no topo da marca
  const linha = new THREE.Mesh(new THREE.BoxGeometry(w + 0.05, 0.03, d + 0.05), new THREE.MeshStandardMaterial({ color: 0x4d3722, roughness: 0.9, transparent: true, opacity: 0.9 }));
  linha.position.set(x, relevo(x, z) + MARCA_LAMA, z);
  return { malhas: [m, linha] };
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

// Poço com mureta de tijolo, telhadinho e balde.
function poco() {
  const g = new THREE.Group();
  const tijolo = new THREE.MeshStandardMaterial({ map: TX.blocos(), roughness: 0.95 });
  const mureta = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.36, 0.42, 20, 1, true), tijolo);
  mureta.position.y = 0.21;
  const borda = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.035, 6, 24), new THREE.MeshStandardMaterial({ color: 0x9c9488, roughness: 0.9 }));
  borda.rotation.x = Math.PI / 2;
  borda.position.y = 0.42;
  const fundo = new THREE.Mesh(new THREE.CircleGeometry(0.33, 20), new THREE.MeshStandardMaterial({ color: 0x5a4630, roughness: 0.2 }));
  fundo.rotation.x = -Math.PI / 2;
  fundo.position.y = 0.3;
  const madeira = new THREE.MeshStandardMaterial({ color: 0x7a5534, roughness: 0.9 });
  for (const s of [-1, 1]) {
    const pe = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.75, 0.05), madeira);
    pe.position.set(s * 0.33, 0.6, 0);
    g.add(pe);
  }
  const telhado = new THREE.Mesh(new THREE.ConeGeometry(0.52, 0.28, 4, 1), new THREE.MeshStandardMaterial({ map: TX.telhasColonial(), roughness: 0.8 }));
  telhado.rotation.y = Math.PI / 4;
  telhado.position.y = 1.1;
  const sarilho = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.66, 8), madeira);
  sarilho.rotation.z = Math.PI / 2;
  sarilho.position.y = 0.82;
  const balde = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.13, 12), new THREE.MeshStandardMaterial({ color: 0x8b9196, metalness: 0.6, roughness: 0.4 }));
  balde.position.set(0.12, 0.55, 0);
  g.add(mureta, borda, fundo, telhado, sarilho, balde);
  g.traverse((o) => o.isMesh && (o.castShadow = true));
  const [x, z] = POCO;
  g.position.set(x, relevo(x, z), z);
  return g;
}

// Mesa com galão, copo, frasco de hipoclorito e conta-gotas.
function mesaAgua() {
  const g = new THREE.Group();
  const madeira = new THREE.MeshStandardMaterial({ color: 0x9a6b42, roughness: 0.8 });
  const tampo = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 0.55), madeira);
  tampo.position.y = 0.48;
  g.add(tampo);
  for (const [x, z] of [
    [0.4, 0.23],
    [-0.4, 0.23],
    [0.4, -0.23],
    [-0.4, -0.23],
  ]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.48, 0.05), madeira);
    p.position.set(x, 0.24, z);
    g.add(p);
  }
  const vidro = new THREE.MeshPhysicalMaterial({ color: 0xdff1ff, roughness: 0.05, transmission: 0.6, transparent: true, opacity: 0.55, thickness: 0.05 });
  const galao = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.34, 18), vidro);
  galao.position.set(-0.2, 0.68, 0);
  const aguaDentro = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.26, 18), new THREE.MeshStandardMaterial({ color: 0x9fd3f0, transparent: true, opacity: 0.6, roughness: 0.1 }));
  aguaDentro.position.set(-0.2, 0.64, 0);
  const tampaG = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.05, 12), new THREE.MeshStandardMaterial({ color: 0x2f6fb0 }));
  tampaG.position.set(-0.2, 0.87, 0);
  const frasco = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.16, 12), new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.4 }));
  frasco.position.set(0.2, 0.585, 0.05);
  const rotulo = new THREE.Mesh(new THREE.CylinderGeometry(0.051, 0.051, 0.07, 12, 1, true), new THREE.MeshStandardMaterial({ color: 0x2f9e5a, roughness: 0.5 }));
  rotulo.position.copy(frasco.position);
  const bico = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.06, 8), new THREE.MeshStandardMaterial({ color: 0xf2f2f2 }));
  bico.position.set(0.2, 0.69, 0.05);
  const copo = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.1, 12), vidro);
  copo.position.set(0.05, 0.56, -0.15);
  g.add(galao, aguaDentro, tampaG, frasco, rotulo, bico, copo);
  g.traverse((o) => o.isMesh && (o.castShadow = true));
  // gotas que caem no galão
  const gotas = [];
  for (let i = 0; i < 2; i++) {
    const gt = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), new THREE.MeshStandardMaterial({ color: 0x8fd0ff, roughness: 0.05, transparent: true, opacity: 0 }));
    gt.scale.y = 1.4;
    gt.position.set(-0.2, 1.15, 0);
    g.add(gt);
    gotas.push(gt);
  }
  const [x, z] = MESA;
  g.position.set(x, relevo(x, z), z);
  g.rotation.y = -0.3;
  return { grupo: g, gotas, topo: new THREE.Vector3(x, relevo(x, z) + 1.0, z) };
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
  for (let i = 0; i < 7; i++) {
    const item = i % 2 ? new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.11, 12), new THREE.MeshStandardMaterial({ color: 0xbfc3c7, metalness: 0.7, roughness: 0.3 })) : new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.06), new THREE.MeshStandardMaterial({ color: cores[i % 5], roughness: 0.7 }));
    item.position.set(-0.17 + (i % 4) * 0.11, 0.12, -0.07 + Math.floor(i / 4) * 0.13);
    g.add(item);
  }
  // mancha de lama na caixa
  const lamaCx = new THREE.Mesh(new THREE.BoxGeometry(0.57, 0.08, 0.4), new THREE.MeshStandardMaterial({ color: 0x6e5236, transparent: true, opacity: 0.7, roughness: 0.4 }));
  lamaCx.position.y = 0.04;
  g.add(lamaCx);
  g.traverse((o) => o.isMesh && (o.castShadow = true));
  const [x, z] = COMIDA;
  g.position.set(x, relevo(x, z), z);
  g.rotation.y = 0.4;
  return g;
}

// Sofá e cadeira postos para secar no quintal; uma cobra escondida embaixo.
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
  }
  const manchaSofa = new THREE.Mesh(new THREE.BoxGeometry(1.26, 0.14, 0.5), new THREE.MeshStandardMaterial({ color: 0x6e5236, transparent: true, opacity: 0.55, roughness: 0.6 }));
  manchaSofa.position.y = 0.14;
  sofa.add(manchaSofa);
  sofa.traverse((o) => o.isMesh && (o.castShadow = true));
  g.add(sofa);

  // cobra enrolada (anéis) com cabeça
  const cobra = new THREE.Group();
  const pele = new THREE.MeshStandardMaterial({ color: 0x6b5a2a, roughness: 0.6 });
  for (let i = 0; i < 3; i++) {
    const anel = new THREE.Mesh(new THREE.TorusGeometry(0.11 - i * 0.025, 0.025, 8, 24), pele);
    anel.rotation.x = Math.PI / 2;
    anel.position.y = 0.025 + i * 0.04;
    cobra.add(anel);
  }
  const cabeca = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), pele);
  cabeca.scale.set(1.4, 0.8, 1);
  cabeca.position.set(0.12, 0.13, 0.05);
  cobra.add(cabeca);
  cobra.position.set(0.15, 0, 0.05);
  cobra.scale.setScalar(0.001);
  g.add(cobra);

  // cabo de vassoura
  const cabo = new THREE.Group();
  const haste = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.1, 8), new THREE.MeshStandardMaterial({ color: 0xc9a46a, roughness: 0.7 }));
  haste.rotation.z = Math.PI / 2 - 0.35;
  haste.position.set(0.85, 0.3, 0.3);
  cabo.add(haste);
  cabo.visible = false;
  g.add(cabo);

  const [x, z] = SOFA;
  g.position.set(x, relevo(x, z), z);
  g.rotation.y = 0.25;
  return { grupo: g, sofa, cobra, cabo };
}

// Botas e luvas de borracha diante da porta.
function botasLuvas() {
  const g = new THREE.Group();
  const borracha = new THREE.MeshStandardMaterial({ color: 0xf2c418, roughness: 0.45 });
  for (const s of [-1, 1]) {
    const cano = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.065, 0.3, 14), borracha);
    cano.position.set(s * 0.09, 0.17, 0);
    const pe = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.2), borracha);
    pe.position.set(s * 0.09, 0.03, 0.05);
    g.add(cano, pe);
  }
  const luva = new THREE.MeshStandardMaterial({ color: 0x2f9e5a, roughness: 0.5 });
  for (const s of [0, 1]) {
    const palma = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.025, 0.13), luva);
    palma.position.set(0.3 + s * 0.13, 0.015, 0.02 + s * 0.04);
    palma.rotation.y = 0.3 - s * 0.6;
    g.add(palma);
    for (let f = 0; f < 4; f++) {
      const dedo = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.02, 0.06), luva);
      dedo.position.set(palma.position.x - 0.035 + f * 0.023, 0.014, palma.position.z + 0.09);
      g.add(dedo);
    }
  }
  g.traverse((o) => o.isMesh && (o.castShadow = true));
  g.position.set(PORTA[0] + 0.55, relevo(PORTA[0] + 0.55, PORTA[1] + 0.45), PORTA[1] + 0.45);
  g.scale.setScalar(0.001);
  return g;
}

// Marca laranja de "não use" (X sobre disco).
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
  ctx.beginPath();
  ctx.moveTo(40, 40);
  ctx.lineTo(88, 88);
  ctx.moveTo(88, 40);
  ctx.lineTo(40, 88);
  ctx.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0, depthTest: false }));
  s.scale.set(0.45, 0.45, 1);
  s.renderOrder = 10;
  return s;
}

// Plaquinha com texto curto (dose e tempo), sempre de frente.
function placa(linhas) {
  const c = document.createElement('canvas');
  c.width = 320;
  c.height = 150;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 320, 150);
  ctx.fillStyle = '#f77f00';
  ctx.fillRect(0, 0, 10, 150);
  ctx.fillStyle = '#1d1f5a';
  ctx.textBaseline = 'middle';
  ctx.font = '800 44px Montserrat, Arial, sans-serif';
  ctx.fillText(linhas[0], 28, 52);
  ctx.font = '600 26px Montserrat, Arial, sans-serif';
  ctx.fillText(linhas[1], 28, 108);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0, depthTest: false }));
  s.scale.set(0.8, 0.375, 1);
  s.renderOrder = 10;
  return s;
}

// Anel laranja pulsante no chão, em volta da casa (vistoria).
function anelCasa() {
  const m = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.08, 4, 1), new THREE.MeshBasicMaterial({ color: LARANJA, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
  m.rotation.set(-Math.PI / 2, 0, Math.PI / 4);
  m.scale.set(CASA.w * 0.78, CASA.d * 0.78, 1);
  m.position.set(CASA.x, relevo(CASA.x, CASA.z) + 0.04, CASA.z);
  m.renderOrder = 3;
  return m;
}

// ---------- Cena ----------

export function criarCenaDepois({ palco }) {
  const raiz = new THREE.Group();
  raiz.name = 'cena-depois';
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
  raiz.add(...marca.malhas);
  const objLama = lama();
  raiz.add(objLama.grupo);

  raiz.add(
    (() => {
      const v = criarCasa({ w: 2.0, h: 1.3, d: 1.7, cor: '#dfe7ea', semente: 153, caixaDagua: false });
      v.position.set(-5.0, relevo(-5.0, -1.4), -1.4);
      return v;
    })(),
    (() => {
      const v = criarCasa({ w: 1.9, h: 1.3, d: 1.6, cor: '#f2dcc8', semente: 155 });
      v.position.set(4.9, relevo(4.9, -1.5), -1.5);
      return v;
    })(),
  );
  const objPoco = poco();
  raiz.add(objPoco);
  const objMesa = mesaAgua();
  raiz.add(objMesa.grupo);
  const objComida = caixaComida();
  raiz.add(objComida);
  const objMoveis = moveis();
  raiz.add(objMoveis.grupo);
  const objBotas = botasLuvas();
  raiz.add(objBotas);
  const objVaral = varal(relevo, [0.9, -0.9], [2.6, -0.4]);
  raiz.add(objVaral);

  raiz.add(
    cerca(relevo, [-6.3, 2.6], [3.0, 2.6], { vao: [0.37, 0.47] }),
    arvore(-5.6, 3.6, 0.9, 3),
    arvore(2.6, -2.4, 0.9, 5),
    arvore(5.4, 2.4, 1.0, 7),
    arvore(-3.3, -2.6, 0.8, 9),
    bananeira(relevo, 3.5, 3.6, 0.9, 4),
    arbusto(relevo, 0.4, -1.8, 0.9, 3),
    arbusto(relevo, -5.8, 0.6, 0.9, 5),
    pedras(relevo, [
      [3.3, 1.3, 0.1],
      [-0.6, 2.0, 0.08],
    ]),
  );
  raiz.add(
    grama(relevo, {
      area: [-LARGURA / 2 + 0.05, LARGURA / 2 - 0.05, -PROFUNDIDADE / 2 + 0.05, PROFUNDIDADE / 2 - 0.05],
      quantidade: 6500,
      pode: (x, z) =>
        Math.abs(z - RIO_Z) > 0.75 &&
        !(Math.abs(x - CASA.x) < 1.45 && Math.abs(z - CASA.z) < 1.15) &&
        !(Math.abs(x + 5.0) < 1.15 && Math.abs(z + 1.4) < 1.0) &&
        !(Math.abs(x - 4.9) < 1.1 && Math.abs(z + 1.5) < 0.95) &&
        Math.hypot(x - POCO[0], z - POCO[1]) > 0.45 &&
        Math.hypot(x + 1.6, z - 0.7) > 1.1,
      semente: 23,
    }),
  );

  // Efeitos
  const anel = anelCasa();
  raiz.add(anel);
  const xPoco = marcaX();
  xPoco.position.set(POCO[0], relevo(...POCO) + 1.55, POCO[1]);
  const xComida = marcaX();
  xComida.position.set(COMIDA[0], relevo(...COMIDA) + 0.7, COMIDA[1]);
  raiz.add(xPoco, xComida);
  const placaDose = placa(['2 gotas', 'por litro · 2,5%']);
  placaDose.position.set(MESA[0] + 0.1, relevo(...MESA) + 1.75, MESA[1]);
  const placaTempo = placa(['30 min', 'antes de beber']);
  placaTempo.position.set(MESA[0] + 0.1, relevo(...MESA) + 1.75, MESA[1]);
  // (as etiquetas da lição já mostram dose e tempo; as placas ficam fora de cena)

  const ancora = (x, y, z) => {
    const o = new THREE.Object3D();
    o.position.set(x, y, z);
    raiz.add(o);
    return o;
  };
  const yc = relevo(CASA.x, CASA.z);
  const ancoras = {
    casa: ancora(CASA.x + 0.4, yc + 2.3, CASA.z),
    marca: ancora(CASA.x + CASA.w / 2 - 0.2, yc + MARCA_LAMA + 0.05, CASA.z + CASA.d / 2 + 0.03),
    porta: ancora(PORTA[0], relevo(...PORTA) + 0.9, PORTA[1] + 0.1),
    botas: ancora(PORTA[0] + 0.6, relevo(...PORTA) + 0.5, PORTA[1] + 0.45),
    poco: xPoco,
    mesa: ancora(MESA[0] - 0.2, relevo(...MESA) + 0.95, MESA[1]),
    comida: xComida,
    sofa: ancora(SOFA[0] + 0.2, relevo(...SOFA) + 0.45, SOFA[1] + 0.15),
    varal: ancora(1.75, relevo(1.75, -0.65) + 1.15, -0.65),
    lama: ancora(-1.0, 0.5, 1.4),
  };

  const estado = { vistoria: 0, epi: 0, poco: 0, gotas: 0, tempo: 0, descarte: 0, sacudir: 0, vassoura: 0, limpar: 0 };
  const DURACAO = { vistoria: 1.6, epi: 1.2, poco: 1.0, gotas: 2.2, tempo: 1.0, descarte: 2.4, sacudir: 2.4, vassoura: 2.6, limpar: 3.0 };
  const comidaDe = new THREE.Vector3(COMIDA[0], relevo(...COMIDA), COMIDA[1]);
  const comidaPara = new THREE.Vector3(1.0, relevo(1.0, 2.1), 2.1);

  function desenhar() {
    anel.material.opacity = 0.85 * estado.vistoria;
    objBotas.scale.setScalar(Math.max(smooth(estado.epi), 0.001));
    xPoco.material.opacity = estado.poco;
    placaDose.material.opacity = smooth(estado.gotas) * (1 - smooth(estado.tempo));
    placaTempo.material.opacity = smooth(estado.tempo);
    xComida.material.opacity = estado.descarte > 0 ? Math.min(estado.descarte * 3, 1) * (1 - smooth((estado.descarte - 0.6) / 0.4)) : 0;
    objComida.position.lerpVectors(comidaDe, comidaPara, smooth((estado.descarte - 0.35) / 0.65));
    xComida.position.set(objComida.position.x, objComida.position.y + 0.7, objComida.position.z);
    // vassoura: o sofá é afastado com o cabo e a cobra aparece
    objMoveis.cabo.visible = estado.vassoura > 0;
    objMoveis.sofa.position.x = -0.45 * smooth(estado.vassoura / 0.6);
    objMoveis.cobra.scale.setScalar(Math.max(1.6 * smooth((estado.vassoura - 0.5) / 0.4), 0.001));
    const l = 1 - smooth(estado.limpar);
    objLama.mat.opacity = 0.92 * l;
    marca.malhas.forEach((m, i) => (m.material.opacity = (i ? 0.9 : 0.8) * l));
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
    if (estado.vistoria > 0) anel.scale.set(CASA.w * 0.78 * (1 + 0.03 * Math.sin(tempo * 3)), CASA.d * 0.78 * (1 + 0.03 * Math.sin(tempo * 3)), 1);
    if (estado.gotas > 0 && estado.gotas < 1) {
      objMesa.gotas.forEach((g, i) => {
        const f = (tempo * 1.2 + i * 0.5) % 1;
        g.position.y = 1.0 - f * 0.25;
        g.material.opacity = 1 - f;
      });
    } else objMesa.gotas.forEach((g) => (g.material.opacity = 0));
    // roupas sacudidas no varal
    const roupas = objVaral.userData.roupas ?? [];
    roupas.forEach((r, i) => {
      if (!r.userData.rot0) r.userData.rot0 = r.rotation.y;
      r.rotation.z = estado.sacudir > 0 && estado.sacudir < 1 ? 0.25 * Math.sin(tempo * 14 + i) : 0.03 * Math.sin(tempo * 1.5 + i);
    });
  }

  const efeitos = { grupo: raiz, ancoras, aplicar, limpar, animar };
  return { raiz, efeitos, alvos: [], enquadramento: ENQUADRAMENTOS_DEPOIS.geral };
}
