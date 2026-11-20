// Cena 1: diorama do terreno (morro com casas na encosta, rio na baixada)
// com a trilha de 7 paradas. Tudo em primitivas (blockout). O terreno inteiro
// é trocável pelo GLB `terreno-base.glb`; trilha e marcadores ficam no motor.

import * as THREE from 'three';
import { assetTrocavel } from './assets.js';

export const CORES = {
  laranja: 0xf77f00,
  azul: 0x1d3557,
  grama: 0x8cbf6a,
  gramaEscura: 0x6fa452,
  terra: 0xb58b5a,
  base: 0x7a5c3e,
  rio: 0x4a90c2,
  parede: 0xf4efe6,
  telhado: 0xc4553b,
  arvore: 0x3f7d4a,
};

// Dimensões do diorama (unidades de cena).
const LARGURA = 20;
const PROFUNDIDADE = 14;

// Morro gaussiano no fundo à esquerda; leito do rio na frente.
const MORRO = { x: -3.5, z: -2.5, altura: 5.2, raio: 4.2 };
const RIO_Z = 4.4;

export function altura(x, z) {
  const dx = x - MORRO.x;
  const dz = z - MORRO.z;
  const morro = MORRO.altura * Math.exp(-(dx * dx + dz * dz) / (2 * MORRO.raio * MORRO.raio));
  const leito = -0.35 * Math.exp(-((z - RIO_Z) ** 2) / 0.9);
  return morro + leito;
}

function terreno() {
  const g = new THREE.Group();

  const geo = new THREE.PlaneGeometry(LARGURA, PROFUNDIDADE, 60, 42);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const cores = [];
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = altura(pos.getX(i), pos.getZ(i));
    pos.setY(i, y);
    c.set(y > 2.2 ? CORES.gramaEscura : CORES.grama);
    if (y < -0.1) c.set(CORES.terra);
    cores.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cores, 3));
  geo.computeVertexNormals();
  const chao = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true }));
  chao.receiveShadow = true;
  g.add(chao);

  // Base do diorama (bloco de terra).
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(LARGURA, 1.4, PROFUNDIDADE),
    new THREE.MeshStandardMaterial({ color: CORES.base, flatShading: true }),
  );
  base.position.y = -1.05;
  g.add(base);

  // Rio.
  const rio = new THREE.Mesh(
    new THREE.BoxGeometry(LARGURA, 0.12, 1.5),
    new THREE.MeshStandardMaterial({ color: CORES.rio, roughness: 0.3, transparent: true, opacity: 0.9 }),
  );
  rio.position.set(0, -0.12, RIO_Z);
  rio.name = 'rio';
  g.add(rio);

  // Casas na encosta.
  for (const [x, z, r] of [
    [-5.6, -0.2, 0.3],
    [-2.0, -0.6, -0.2],
    [-4.0, 0.9, 0.1],
    [-1.0, -3.2, 0.5],
  ]) {
    g.add(casa(x, z, r));
  }
  // Casas na baixada, perto do rio.
  for (const [x, z, r] of [
    [2.5, 2.9, 0],
    [4.5, 3.0, 0.2],
    [6.6, 2.8, -0.1],
    [0.4, 3.0, 0.1],
  ]) {
    g.add(casa(x, z, r));
  }
  // Área aberta à direita, com poucas árvores.
  for (const [x, z] of [
    [-7.5, -4.5],
    [-6.5, 1.8],
    [7.8, -4.8],
    [5.2, -3.8],
    [8.4, -1.2],
    [-0.8, 1.2],
  ]) {
    g.add(arvore(x, z));
  }
  return g;
}

function casa(x, z, rot) {
  const g = new THREE.Group();
  const corpo = new THREE.Mesh(
    new THREE.BoxGeometry(1, 0.8, 0.9),
    new THREE.MeshStandardMaterial({ color: CORES.parede, flatShading: true }),
  );
  corpo.position.y = 0.4;
  const telhado = new THREE.Mesh(
    new THREE.ConeGeometry(0.85, 0.55, 4),
    new THREE.MeshStandardMaterial({ color: CORES.telhado, flatShading: true }),
  );
  telhado.position.y = 1.07;
  telhado.rotation.y = Math.PI / 4;
  for (const m of [corpo, telhado]) {
    m.castShadow = true;
    g.add(m);
  }
  g.position.set(x, altura(x, z), z);
  g.rotation.y = rot;
  return g;
}

function arvore(x, z) {
  const g = new THREE.Group();
  const tronco = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.1, 0.5, 6),
    new THREE.MeshStandardMaterial({ color: CORES.base }),
  );
  tronco.position.y = 0.25;
  const copa = new THREE.Mesh(
    new THREE.ConeGeometry(0.45, 1.1, 7),
    new THREE.MeshStandardMaterial({ color: CORES.arvore, flatShading: true }),
  );
  copa.position.y = 0.95;
  for (const m of [tronco, copa]) {
    m.castShadow = true;
    g.add(m);
  }
  g.position.set(x, altura(x, z), z);
  return g;
}

// Trilha: do alto do morro até a margem do rio, passando pela área aberta.
const PONTOS_TRILHA = [
  [-3.5, -2.5],
  [-5.8, -1.4],
  [-3.2, 0.6],
  [-0.2, -1.6],
  [3.4, -2.6],
  [6.4, -0.4],
  [3.4, 1.7],
  [0.8, 2.2],
].map(([x, z]) => new THREE.Vector3(x, altura(x, z) + 0.06, z));

function trilha() {
  const curva = new THREE.CatmullRomCurve3(PONTOS_TRILHA, false, 'centripetal');
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xfff3e0 });
  const pontos = curva.getSpacedPoints(90);
  const geo = new THREE.CylinderGeometry(0.07, 0.07, 0.05, 8);
  pontos.forEach((p, i) => {
    if (i % 2) return;
    const m = new THREE.Mesh(geo, mat);
    m.position.set(p.x, altura(p.x, p.z) + 0.05, p.z);
    g.add(m);
  });
  return { grupo: g, curva };
}

function marcador(numero) {
  const g = new THREE.Group();
  g.name = `parada-${numero}`;
  g.userData.parada = numero;

  const haste = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 1.1, 6),
    new THREE.MeshStandardMaterial({ color: CORES.azul }),
  );
  haste.position.y = 0.55;
  const cabeca = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 20, 14),
    new THREE.MeshStandardMaterial({ color: CORES.laranja, roughness: 0.4 }),
  );
  cabeca.position.y = 1.35;
  cabeca.castShadow = true;
  cabeca.name = 'cabeca';

  // Número sempre de frente para a câmera.
  const rotulo = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaNumero(numero), depthTest: false }));
  rotulo.scale.set(0.62, 0.62, 1);
  rotulo.position.y = 1.35;
  rotulo.renderOrder = 10;
  rotulo.name = 'rotulo';

  // Área de toque maior que o marcador visível (alvo de dedo).
  const alvo = new THREE.Mesh(
    new THREE.SphereGeometry(1.1, 8, 6),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  alvo.position.y = 1.1;
  alvo.userData.toque = numero;
  alvo.name = 'alvo';

  // Anel de destaque por perfil de risco.
  const anel = new THREE.Mesh(
    new THREE.RingGeometry(0.5, 0.68, 32),
    new THREE.MeshBasicMaterial({ color: CORES.laranja, transparent: true, opacity: 0.85, side: THREE.DoubleSide }),
  );
  anel.rotation.x = -Math.PI / 2;
  anel.position.y = 0.04;
  anel.visible = false;
  anel.name = 'anel';

  g.add(haste, cabeca, rotulo, alvo, anel);
  return g;
}

function texturaNumero(n) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 84px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(n), 64, 70);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Paradas destacadas por perfil (BRIEF §3.1: o perfil adapta as lições 1, 4 e 6).
export const DESTAQUES_PERFIL = {
  encosta: [1, 4, 6],
  baixada: [1, 4, 6],
  aberto: [1, 4, 6],
};

// Zona do terreno ligada a cada perfil (anel grande no chão).
const ZONAS_PERFIL = {
  encosta: { x: -3.6, z: -0.6, raio: 3.2 },
  baixada: { x: 3.4, z: 3.4, raio: 3.4 },
  aberto: { x: 6.6, z: -3.0, raio: 2.6 },
};

export function criarCena1() {
  const raiz = new THREE.Group();
  raiz.add(assetTrocavel('terreno', terreno()));

  const { grupo: grupoTrilha, curva } = trilha();
  raiz.add(grupoTrilha);

  const marcadores = [];
  for (let i = 0; i < 7; i++) {
    const p = curva.getPointAt(i / 6);
    const m = marcador(i + 1);
    m.position.set(p.x, altura(p.x, p.z), p.z);
    raiz.add(m);
    marcadores.push(m);
  }

  const zona = new THREE.Mesh(
    new THREE.RingGeometry(0.92, 1, 64),
    new THREE.MeshBasicMaterial({ color: CORES.laranja, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthTest: false }),
  );
  zona.rotation.x = -Math.PI / 2;
  zona.visible = false;
  zona.renderOrder = 5;
  raiz.add(zona);

  function aplicarPerfil(perfil) {
    const destaque = DESTAQUES_PERFIL[perfil] ?? [];
    for (const m of marcadores) {
      m.getObjectByName('anel').visible = destaque.includes(m.userData.parada);
    }
    const z = ZONAS_PERFIL[perfil];
    zona.visible = Boolean(z);
    if (z) {
      zona.position.set(z.x, altura(z.x, z.z) + 0.3, z.z);
      zona.scale.setScalar(z.raio);
    }
  }

  function selecionar(numero) {
    for (const m of marcadores) {
      const ativo = m.userData.parada === numero;
      m.getObjectByName('cabeca').material.color.set(ativo ? CORES.azul : CORES.laranja);
    }
  }

  const alvos = marcadores.map((m) => m.getObjectByName('alvo'));

  function animar(tempo, dt, movimentoReduzido) {
    if (movimentoReduzido) return;
    marcadores.forEach((m, i) => {
      const y = 1.35 + Math.sin(tempo * 2 + i) * 0.06;
      m.getObjectByName('cabeca').position.y = y;
      m.getObjectByName('rotulo').position.y = y;
      const anel = m.getObjectByName('anel');
      if (anel.visible) anel.scale.setScalar(1 + 0.15 * Math.sin(tempo * 3 + i));
    });
  }

  return {
    raiz,
    marcadores,
    alvos,
    aplicarPerfil,
    selecionar,
    animar,
    enquadramento: { centro: [0, 0.6, 0], largura: 25, altura: 15 },
    aoTocar: null,
  };
}
