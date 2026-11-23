// Cena 1: diorama do terreno (morro com casas na encosta, rio na baixada)
// com a trilha de 7 paradas. Tudo em primitivas (blockout). O terreno inteiro
// é trocável pelo GLB `terreno-base.glb`; trilha e marcadores ficam no motor.

import * as THREE from 'three';
import { assetTrocavel } from './assets.js';
import * as TX from './texturas.js';

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

// Vetor normal do terreno em (x, z), por diferença finita.
function normal(x, z) {
  const e = 0.05;
  return new THREE.Vector3(altura(x - e, z) - altura(x + e, z), 2 * e, altura(x, z - e) - altura(x, z + e)).normalize();
}

// Sombra de contato colada no terreno, inclinada conforme a encosta.
function sombraNoChao(x, z, larg, prof, rot = 0, opacidade = 0.42) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(larg, prof),
    new THREE.MeshBasicMaterial({ map: TX.sombraContato(), transparent: true, opacity: opacidade, depthWrite: false, color: 0x1f2a10 }),
  );
  m.position.set(x, altura(x, z) + 0.03, z);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal(x, z));
  m.rotateZ(rot);
  m.renderOrder = 1;
  return m;
}

export const CASAS_ENCOSTA = [
  [-5.6, -0.2, 0.3],
  [-2.0, -0.6, -0.2],
  [-4.0, 0.9, 0.1],
  [-1.0, -3.2, 0.5],
];
export const CASAS_BAIXADA = [
  [2.5, 2.9, 0],
  [4.5, 3.0, 0.2],
  [6.6, 2.8, -0.1],
  [0.4, 3.0, 0.1],
];
export { RIO_Z };

function terreno() {
  const g = new THREE.Group();

  const geo = new THREE.PlaneGeometry(LARGURA, PROFUNDIDADE, 90, 63);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const cores = [];
  const c = new THREE.Color();
  const claro = new THREE.Color(CORES.grama);
  const escuro = new THREE.Color(CORES.gramaEscura);
  const terra = new THREE.Color(CORES.terra);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = altura(x, z);
    pos.setY(i, y);
    // mais escuro no alto do morro, variação suave por ruído, terra no leito
    const ruido = 0.5 + 0.25 * Math.sin(x * 1.3 + z * 0.7) + 0.25 * Math.sin(z * 1.9 - x * 0.4);
    c.copy(claro).lerp(escuro, Math.min(1, Math.max(0, (y - 0.6) / 3) * 0.8 + ruido * 0.25));
    const leito = Math.max(0, 1 - Math.abs(z - RIO_Z) / 0.9);
    c.lerp(terra, leito * leito);
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

  // Base do diorama: camadas de solo nas laterais.
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(LARGURA, 1.4, PROFUNDIDADE),
    new THREE.MeshStandardMaterial({ map: TX.solo(), roughness: 1 }),
  );
  base.position.y = -1.05;
  g.add(base);

  // Rio com ondulações (a textura corre em animar()).
  const rio = new THREE.Mesh(
    new THREE.BoxGeometry(LARGURA, 0.12, 1.5),
    new THREE.MeshPhysicalMaterial({ map: TX.agua(), roughness: 0.15, metalness: 0.1, clearcoat: 1, transparent: true, opacity: 0.92 }),
  );
  rio.position.set(0, -0.12, RIO_Z);
  rio.name = 'rio';
  g.add(rio);

  // Casas na encosta.
  for (const [x, z, r] of CASAS_ENCOSTA) {
    g.add(casa(x, z, r), sombraNoChao(x, z, 1.7, 1.6, r));
  }
  // Casas na baixada, perto do rio.
  for (const [x, z, r] of CASAS_BAIXADA) {
    g.add(casa(x, z, r), sombraNoChao(x, z, 1.7, 1.6, r));
  }
  // Árvores: pinheiros e copas redondas.
  [
    [-7.5, -4.5, 'pinheiro'],
    [-6.5, 1.8, 'redonda'],
    [7.8, -4.8, 'pinheiro'],
    [5.2, -3.8, 'redonda'],
    [8.4, -1.2, 'pinheiro'],
    [-0.8, 1.2, 'redonda'],
    [-6.8, -3.2, 'redonda'],
    [8.6, 1.4, 'redonda'],
  ].forEach(([x, z, tipo], i) => {
    g.add(arvore(x, z, tipo, i), sombraNoChao(x, z, 1.3, 1.3, 0, 0.38));
  });
  return g;
}

function casa(x, z, rot) {
  const g = new THREE.Group();
  const lateral = new THREE.MeshStandardMaterial({ map: TX.parede(false), roughness: 0.9 });
  const fachada = new THREE.MeshStandardMaterial({ map: TX.parede(true), roughness: 0.9 });
  const tampa = new THREE.MeshStandardMaterial({ color: 0xe9e2d4 });
  // ordem das faces do BoxGeometry: +x, -x, +y, -y, +z, -z
  const corpo = new THREE.Mesh(new THREE.BoxGeometry(1, 0.8, 0.9), [lateral, lateral, tampa, tampa, fachada, lateral]);
  corpo.position.y = 0.4;
  // Baldrame mais escuro, para assentar a casa no chão.
  const baldrame = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.12, 0.96), new THREE.MeshStandardMaterial({ color: 0x9a8b75, roughness: 1 }));
  baldrame.position.y = 0.04;
  // Telhado de duas águas com beiral.
  const perfil = new THREE.Shape();
  perfil.moveTo(-0.62, 0);
  perfil.lineTo(0.62, 0);
  perfil.lineTo(0, 0.5);
  perfil.closePath();
  const geoTelhado = new THREE.ExtrudeGeometry(perfil, { depth: 1.12, bevelEnabled: false });
  geoTelhado.translate(0, 0, -0.56);
  const telhado = new THREE.Mesh(geoTelhado, [
    new THREE.MeshStandardMaterial({ color: 0xe9e2d4, roughness: 0.9 }), // oitões
    new THREE.MeshStandardMaterial({ map: TX.telhas(), roughness: 0.8 }), // águas
  ]);
  telhado.rotation.y = Math.PI / 2;
  telhado.position.y = 0.8;
  // Chaminé.
  const chamine = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.32, 0.14), new THREE.MeshStandardMaterial({ color: 0x8c5a43, roughness: 1 }));
  chamine.position.set(0.25, 1.15, -0.2);
  for (const m of [corpo, baldrame, telhado, chamine]) {
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
  }
  g.position.set(x, altura(x, z), z);
  g.rotation.y = rot;
  return g;
}

function arvore(x, z, tipo, semente) {
  const g = new THREE.Group();
  g.name = 'arvore';
  const tons = [0x3f7d4a, 0x4b8b45, 0x356e3f, 0x5a9a4c];
  const folha = (i) => new THREE.MeshStandardMaterial({ color: tons[(semente + i) % tons.length], roughness: 0.85 });
  const tronco = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 0.6, 8), new THREE.MeshStandardMaterial({ color: 0x6b4a2e, roughness: 1 }));
  tronco.position.y = 0.3;
  g.add(tronco);
  if (tipo === 'pinheiro') {
    // três camadas de cone, menores para cima
    [[0.55, 0.7, 0.65], [0.44, 0.6, 1.0], [0.3, 0.5, 1.32]].forEach(([r, h, y], i) => {
      const c = new THREE.Mesh(new THREE.ConeGeometry(r, h, 9), folha(i));
      c.position.y = y;
      c.rotation.y = i * 0.6;
      g.add(c);
    });
  } else {
    // copa redonda em tufos
    [[0, 1.0, 0, 0.48], [0.28, 0.88, 0.1, 0.34], [-0.26, 0.9, -0.08, 0.36], [0.05, 1.28, -0.05, 0.32]].forEach(([dx, y, dz, r], i) => {
      const c = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), folha(i));
      c.position.set(dx, y, dz);
      g.add(c);
    });
  }
  g.traverse((m) => {
    if (m.isMesh) {
      m.castShadow = true;
      m.receiveShadow = true;
    }
  });
  const esc = 0.85 + ((semente * 37) % 10) / 30;
  g.scale.setScalar(esc);
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
  ctx.font = '800 84px Montserrat, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(n), 64, 70);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Paradas destacadas por perfil (BRIEF §3.1: o perfil adapta as lições 1, 4 e 6).
export const DESTAQUES_PERFIL = {
  // só as paradas que têm texto próprio para o perfil (perfil_variacoes)
  encosta: [1, 4, 6],
  baixada: [1, 6],
  aberto: [1, 6],
};

// Zona do terreno ligada a cada perfil (anel grande no chão).
export const ZONAS_PERFIL = {
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

  const texAgua = TX.agua();
  function animar(tempo, dt, movimentoReduzido) {
    if (movimentoReduzido) return;
    texAgua.offset.x = (tempo * 0.04) % 1;
    marcadores.forEach((m, i) => {
      const y = 1.35 + Math.sin(tempo * 2 + i) * 0.06;
      m.getObjectByName('cabeca').position.y = y;
      m.getObjectByName('rotulo').position.y = y;
      const anel = m.getObjectByName('anel');
      if (anel.visible) anel.scale.setScalar(1 + 0.15 * Math.sin(tempo * 3 + i));
    });
  }

  // Marcadores, trilha e zona do perfil somem dentro da lição 1.
  function mostrarTrilha(sim) {
    grupoTrilha.visible = sim;
    for (const m of marcadores) m.visible = sim;
    if (!sim) zona.visible = false;
  }

  return {
    raiz,
    marcadores,
    mostrarTrilha,
    alvos,
    aplicarPerfil,
    selecionar,
    animar,
    enquadramento: { centro: [0, 0.6, 0], largura: 25, altura: 15 },
    aoTocar: null,
  };
}
