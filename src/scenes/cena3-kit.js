// Cena 3: Kit de emergência. Uma lona no chão, a mochila laranja ao fundo e os itens
// do kit, cada um um objeto separado (um GLB por objeto, ver assets.js).
// Cada subpasso da lição faz seus objetos entrarem voando e pousarem na lona.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { assetTrocavel } from './assets.js';
import { easing } from '../motor/tween.js';
import * as TX from './texturas.js';

const COR = {
  laranja: 0xf77f00,
  laranjaEscuro: 0xc45f00,
  azul: 0x1d3557,
  lona: 0xd9cdb4,
  lonaBorda: 0xb8a988,
  agua: 0x7cc4ef,
  tampa: 0x1d3557,
  metal: 0xb9c0c7,
  metalEscuro: 0x6d7680,
  papel: 0xf6f1e4,
  verde: 0x4f8a5b,
  vermelho: 0xc62828,
  branco: 0xfafafa,
  preto: 0x2b2f36,
  amarelo: 0xf4c20d,
};

// Materiais: sombreamento suave e brilho moderado (o ambiente do palco dá reflexos).
const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...extra });
const plastico = (color) => mat(color, { roughness: 0.45 });
const tecido = (color, rep = [6, 6]) => mat(color, { roughness: 0.88, bumpMap: TX.tramaTecido(rep), bumpScale: 1.5 });
const metal = (color) => mat(color, { roughness: 0.45, metalness: 0.8, roughnessMap: TX.metalEscovado() });
const comMapa = (map, extra = {}) => mat(0xffffff, { map, roughness: 0.5, ...extra });

function malha(geo, material, pos = [0, 0, 0], rot = [0, 0, 0]) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(...pos);
  m.rotation.set(...rot);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

const caixa = (w, h, d, r = 0.06, seg = 3) => new RoundedBoxGeometry(w, h, d, seg, r);
// Perfil girado (garrafas, latas, apito): pontos [raio, altura].
const torno = (pts, seg = 32) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg);

// ---------- Objetos (blockout refinado; o GLB do Tripo substitui cada um) ----------

function mochila() {
  const g = new THREE.Group();
  const corpo = tecido(COR.laranja);
  const escuro = tecido(COR.laranjaEscuro);
  const alca = tecido(COR.azul);
  // corpo arredondado, mais estreito em cima
  g.add(malha(caixa(1.8, 2.2, 1.05, 0.32, 5), corpo, [0, 1.12, 0]));
  g.add(malha(caixa(1.6, 0.5, 0.95, 0.24, 5), corpo, [0, 2.25, -0.02]));
  // bolso frontal com zíper
  g.add(malha(caixa(1.3, 1.0, 0.36, 0.14, 4), escuro, [0, 0.72, 0.62]));
  g.add(malha(new THREE.BoxGeometry(1.1, 0.03, 0.02), metal(COR.metalEscuro), [0, 1.18, 0.81]));
  g.add(malha(caixa(0.12, 0.2, 0.05, 0.02, 2), metal(COR.metal), [0.48, 1.12, 0.82]));
  // zíper da tampa
  g.add(malha(new THREE.TorusGeometry(0.62, 0.018, 6, 40, Math.PI), metal(COR.metalEscuro), [0, 2.2, 0.49]));
  // bolsos laterais
  for (const x of [-0.98, 0.98]) g.add(malha(caixa(0.3, 0.8, 0.7, 0.12, 3), escuro, [x, 0.6, 0.05]));
  // alças nas costas e alça de mão
  for (const x of [-0.5, 0.5]) g.add(malha(caixa(0.22, 2.0, 0.1, 0.05, 2), alca, [x, 1.25, -0.58]));
  g.add(malha(new THREE.TorusGeometry(0.2, 0.05, 8, 16, Math.PI), alca, [0, 2.5, -0.05]));
  // faixa refletiva
  g.add(malha(new THREE.BoxGeometry(1.32, 0.08, 0.02), mat(0xe9eef2, { roughness: 0.2, metalness: 0.5 }), [0, 0.95, 0.81]));
  return g;
}

function garrafa() {
  const g = new THREE.Group();
  const vidro = new THREE.MeshPhysicalMaterial({
    color: 0xcfe9f7,
    roughness: 0.08,
    transmission: 0.6,
    thickness: 0.4,
    transparent: true,
    opacity: 0.75,
  });
  g.add(malha(torno([[0, 0], [0.3, 0], [0.33, 0.06], [0.33, 1.05], [0.3, 1.2], [0.2, 1.38], [0.17, 1.45], [0, 1.45]]), vidro));
  // água dentro
  g.add(malha(torno([[0, 0.03], [0.3, 0.03], [0.3, 1.0], [0, 1.0]]), mat(0x5fb3e6, { roughness: 0.1, transparent: true, opacity: 0.55 })));
  g.add(malha(new THREE.CylinderGeometry(0.19, 0.19, 0.2, 24), plastico(COR.tampa), [0, 1.55, 0]));
  g.add(malha(new THREE.CylinderGeometry(0.335, 0.335, 0.38, 32, 1, true), comMapa(TX.rotuloGarrafa(), { roughness: 0.35 }), [0, 0.68, 0]));
  return g;
}

function lata() {
  const g = new THREE.Group();
  const aco = metal(0xc9ced4);
  // corpo com frisos e bordas
  g.add(malha(torno([[0, 0], [0.3, 0], [0.34, 0.03], [0.34, 0.6], [0.3, 0.63], [0, 0.63]]), aco));
  for (const y of [0.05, 0.58]) g.add(malha(new THREE.TorusGeometry(0.335, 0.015, 6, 32), aco, [0, y, 0], [Math.PI / 2, 0, 0]));
  g.add(malha(new THREE.CylinderGeometry(0.343, 0.343, 0.46, 40, 1, true), comMapa(TX.rotuloLata(), { roughness: 0.4 }), [0, 0.31, 0]));
  // anel de abertura
  g.add(malha(new THREE.TorusGeometry(0.08, 0.015, 6, 16), aco, [0.12, 0.64, 0], [Math.PI / 2, 0, 0]));
  return g;
}

function barra() {
  const g = new THREE.Group();
  g.add(malha(new THREE.BoxGeometry(1.0, 0.16, 0.36), comMapa(TX.embalagemBarra(), { roughness: 0.3, metalness: 0.15 }), [0, 0.08, 0]));
  // pontas seladas da embalagem
  for (const x of [-0.53, 0.53]) g.add(malha(new THREE.BoxGeometry(0.08, 0.04, 0.38), plastico(COR.amarelo), [x, 0.08, 0]));
  return g;
}

function documentos() {
  const g = new THREE.Group();
  // carteira de identidade, carteira de trabalho e folha
  g.add(malha(new THREE.BoxGeometry(1.0, 0.04, 1.35), comMapa(TX.folhaPapel(), { roughness: 0.9 }), [0, 0.03, 0]));
  g.add(malha(new THREE.BoxGeometry(0.6, 0.06, 0.85), comMapa(TX.capaDocumento('#2f5f9e', 'DOCUMENTO'), { roughness: 0.7 }), [-0.12, 0.09, -0.12], [0, 0.12, 0]));
  g.add(malha(new THREE.BoxGeometry(0.55, 0.04, 0.36), comMapa(TX.capaDocumento('#3f8f5a', 'CARTÃO'), { roughness: 0.6 }), [0.2, 0.14, 0.3], [0, -0.2, 0]));
  // saco plástico com fecho
  g.add(
    malha(
      caixa(1.35, 0.28, 1.75, 0.1, 3),
      new THREE.MeshPhysicalMaterial({ color: 0xeaf6fd, roughness: 0.05, transmission: 0.7, transparent: true, opacity: 0.35 }),
      [0.03, 0.14, 0.03],
    ),
  );
  g.add(malha(caixa(1.36, 0.06, 0.1, 0.02, 2), plastico(COR.azul), [0.03, 0.27, -0.82]));
  return g;
}

function lanterna() {
  const g = new THREE.Group();
  // perfil: corpo, empunhadura e cabeça
  const perfil = torno([[0, -0.55], [0.15, -0.55], [0.17, -0.5], [0.17, 0.15], [0.2, 0.2], [0.28, 0.42], [0.3, 0.5], [0, 0.5]], 28);
  const corpo = malha(perfil, mat(COR.preto, { roughness: 0.4 }), [0, 0.3, 0], [0, 0, -Math.PI / 2]);
  g.add(corpo);
  for (const x of [-0.35, -0.2, -0.05]) g.add(malha(new THREE.TorusGeometry(0.172, 0.018, 6, 24), mat(COR.laranja), [x, 0.3, 0], [0, Math.PI / 2, 0]));
  g.add(malha(new THREE.CylinderGeometry(0.27, 0.27, 0.02, 28), mat(0xfff7c2, { emissive: 0xffe680, emissiveIntensity: 0.8 }), [0.5, 0.3, 0], [0, 0, Math.PI / 2]));
  g.add(malha(caixa(0.12, 0.05, 0.1, 0.02, 2), plastico(COR.laranja), [-0.15, 0.48, 0]));
  return g;
}

function radio() {
  const g = new THREE.Group();
  g.add(malha(caixa(1.4, 0.9, 0.5, 0.12, 4), plastico(0x3d6e4a), [0, 0.45, 0]));
  // alto-falante com furos
  g.add(malha(new THREE.CylinderGeometry(0.3, 0.3, 0.04, 40), metal(COR.metalEscuro), [-0.32, 0.45, 0.25], [Math.PI / 2, 0, 0]));
  g.add(malha(new THREE.CylinderGeometry(0.27, 0.27, 0.045, 40), comMapa(TX.gradeAltoFalante(), { roughness: 0.7 }), [-0.32, 0.45, 0.255], [Math.PI / 2, 0, 0]));
  // visor e botões
  g.add(malha(caixa(0.5, 0.24, 0.04, 0.03, 2), mat(0xf3e9c6, { emissive: 0x403410, emissiveIntensity: 0.3 }), [0.3, 0.58, 0.25]));
  g.add(malha(new THREE.BoxGeometry(0.02, 0.18, 0.045), mat(COR.vermelho), [0.36, 0.58, 0.26]));
  for (const x of [0.15, 0.45]) g.add(malha(new THREE.CylinderGeometry(0.07, 0.07, 0.08, 16), metal(COR.metal), [x, 0.27, 0.27], [Math.PI / 2, 0, 0]));
  // antena telescópica
  g.add(malha(new THREE.CylinderGeometry(0.025, 0.035, 1.1, 8), metal(COR.metal), [0.5, 1.4, -0.1], [0, 0, -0.35]));
  g.add(malha(new THREE.SphereGeometry(0.045, 10, 8), metal(COR.metal), [0.69, 1.92, -0.1]));
  // alça
  g.add(malha(new THREE.TorusGeometry(0.42, 0.04, 8, 24, Math.PI), plastico(COR.preto), [0, 0.9, -0.05]));
  return g;
}

function carregador() {
  const g = new THREE.Group();
  g.add(malha(caixa(0.6, 0.18, 1.0, 0.07, 3), plastico(COR.azul), [0, 0.09, 0]));
  for (let i = 0; i < 4; i++) {
    g.add(malha(new THREE.CylinderGeometry(0.025, 0.025, 0.02, 10), mat(0x7cf28a, { emissive: 0x3cc45a, emissiveIntensity: i < 3 ? 0.9 : 0 }), [-0.12 + i * 0.08, 0.185, 0.3]));
  }
  // cabo enrolado
  const pts = [];
  for (let i = 0; i <= 60; i++) {
    const a = (i / 60) * Math.PI * 3.2;
    pts.push(new THREE.Vector3(0.62 + Math.cos(a) * 0.28, 0.03 + i * 0.0006, -0.15 + Math.sin(a) * 0.28));
  }
  pts.push(new THREE.Vector3(0.3, 0.06, -0.42));
  pts.push(new THREE.Vector3(0.05, 0.09, -0.5));
  g.add(malha(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, 0.025, 6), plastico(COR.preto)));
  return g;
}

function remedios() {
  const g = new THREE.Group();
  g.add(malha(caixa(1.2, 0.55, 0.8, 0.1, 4), plastico(COR.branco), [0, 0.28, 0]));
  g.add(malha(new THREE.BoxGeometry(1.21, 0.04, 0.81), plastico(0xd8d8d8), [0, 0.42, 0]));
  g.add(malha(caixa(0.42, 0.03, 0.13, 0.015, 2), mat(COR.vermelho), [0, 0.56, 0]));
  g.add(malha(caixa(0.13, 0.03, 0.42, 0.015, 2), mat(COR.vermelho), [0, 0.56, 0]));
  g.add(malha(new THREE.TorusGeometry(0.16, 0.035, 8, 16, Math.PI), plastico(COR.metalEscuro), [0, 0.55, -0.3], [-Math.PI / 2, 0, 0]));
  // cartela de comprimidos ao lado
  g.add(malha(caixa(0.5, 0.03, 0.3, 0.01, 2), metal(0xdfe3e7), [0.85, 0.02, 0.3], [0, 0.4, 0]));
  return g;
}

function apito() {
  const g = new THREE.Group();
  const laranja = plastico(COR.laranja);
  g.add(malha(new THREE.CylinderGeometry(0.17, 0.17, 0.5, 24), laranja, [0, 0.17, 0], [0, 0, Math.PI / 2]));
  g.add(malha(caixa(0.4, 0.12, 0.22, 0.04, 2), laranja, [0.38, 0.13, 0]));
  g.add(malha(new THREE.BoxGeometry(0.1, 0.06, 0.18), mat(0x111111), [0.1, 0.33, 0]));
  g.add(malha(new THREE.TorusGeometry(0.1, 0.025, 8, 16), metal(COR.metal), [-0.3, 0.17, 0], [0, Math.PI / 2, 0]));
  const curva = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.38, 0.12, 0),
    new THREE.Vector3(-0.9, 0.03, 0.4),
    new THREE.Vector3(-0.6, 0.03, 0.95),
    new THREE.Vector3(-0.05, 0.03, 0.65),
    new THREE.Vector3(-0.35, 0.05, 0.1),
  ]);
  g.add(malha(new THREE.TubeGeometry(curva, 48, 0.025, 6), tecido(COR.azul)));
  return g;
}

function lona() {
  const g = new THREE.Group();
  const l = malha(new THREE.BoxGeometry(13, 0.08, 8.5), mat(0xffffff, { map: TX.lonaCor(), roughness: 0.95, bumpMap: TX.tramaTecido([40, 26]), bumpScale: 0.6 }), [0, -0.04, 0.4]);
  l.castShadow = false;
  g.add(l);
  // costura tracejada na borda
  const pontos = [];
  const [w, d] = [6.2, 3.95];
  for (const [ax, az, bx, bz] of [
    [-w, -d, w, -d],
    [w, -d, w, d],
    [w, d, -w, d],
    [-w, d, -w, -d],
  ]) {
    pontos.push(new THREE.Vector3(ax, 0.01, az + 0.4), new THREE.Vector3(bx, 0.01, bz + 0.4));
  }
  const linhas = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(pontos),
    new THREE.LineDashedMaterial({ color: COR.lonaBorda, dashSize: 0.3, gapSize: 0.2 }),
  );
  linhas.computeLineDistances();
  g.add(linhas);
  for (const [x, z] of [[-6.2, -3.55], [6.2, -3.55], [6.2, 4.35], [-6.2, 4.35]]) {
    g.add(malha(new THREE.TorusGeometry(0.14, 0.04, 6, 12), mat(COR.metal), [x, 0.02, z], [Math.PI / 2, 0, 0]));
  }
  return g;
}

// ---------- Catálogo: objeto → fábrica, chave de GLB e posição na lona ----------
// Posições em [x, z, rotY]. Chaves de GLB definidas em assets.js.
export const OBJETOS = {
  mochila: { fabrica: mochila, glb: 'kitMochila', pos: [-4.4, -1.6, 0.35] },
  garrafa1: { fabrica: garrafa, glb: 'kitGarrafa', pos: [-4.9, 2.4, 0] },
  garrafa2: { fabrica: garrafa, glb: 'kitGarrafa', pos: [-4.0, 2.9, 0] },
  lata1: { fabrica: lata, glb: 'kitLata', pos: [-1.8, 2.6, 0] },
  lata2: { fabrica: lata, glb: 'kitLata', pos: [-1.0, 2.9, 0] },
  lata3: { fabrica: lata, glb: 'kitLata', pos: [-1.45, 3.55, 0] },
  barra1: { fabrica: barra, glb: 'kitBarra', pos: [-0.2, 2.2, 0.3] },
  barra2: { fabrica: barra, glb: 'kitBarra', pos: [0.1, 2.75, 0.2] },
  documentos: { fabrica: documentos, glb: 'kitDocumentos', pos: [2.0, 2.8, -0.25], girar: [-Math.PI / 2, 0, 0] },
  lanterna: { fabrica: lanterna, glb: 'kitLanterna', pos: [-1.3, -1.2, 0.5], escala: 1.25 },
  radio: { fabrica: radio, glb: 'kitRadio', pos: [0.8, -1.7, -0.2], escala: 0.65 },
  carregador: { fabrica: carregador, glb: 'kitCarregador', pos: [2.6, -1.0, 0.4] },
  remedios: { fabrica: remedios, glb: 'kitRemedios', pos: [4.6, 2.3, -0.2] },
  apito: { fabrica: apito, glb: 'kitApito', pos: [4.5, -1.1, 0.6] },
};

// Celular: grade na tela, com 2 a 4 colunas conforme o formato da área livre.
// Cada grupo ocupa uma célula. Deslocamentos em [u, v, rotY], com u para a
// direita e v para baixo na tela (vista isométrica a 45°).
const GRUPOS = [
  [['mochila', 0, 0, 0.35]],
  [['garrafa1', -0.4, -0.3, 0], ['garrafa2', 0.4, 0.3, 0]],
  [['lata1', -0.4, -0.3, 0], ['lata2', 0.4, -0.1, 0], ['lata3', 0, 0.5, 0]],
  [['barra1', -0.1, -0.35, 0.3], ['barra2', 0.1, 0.35, 0.2]],
  [['documentos', 0, 0, -0.25]],
  [['lanterna', 0, 0, 0.5]],
  [['radio', 0, 0, -0.2]],
  [['carregador', 0, 0, 0.4]],
  [['remedios', 0, 0, -0.2]],
  [['apito', 0, 0, 0.6]],
];
const CEL_U = 3.0; // largura da célula na tela
const CEL_V = 3.2; // profundidade da célula no chão (encurta na tela)
const SEN_ELEV = Math.sin(Math.atan(1 / Math.SQRT2));
const R2 = Math.SQRT1_2;
const daTela = ([u, v, r]) => [(u + v) * R2, (v - u) * R2, r];
const ENQ_PAISAGEM = { centro: [0, 0.6, 0.8], largura: 15, altura: 10 };

// Tamanho na tela (unidades de mundo) de uma grade com essas colunas.
function medidasGrade(colunas) {
  const linhas = Math.ceil(GRUPOS.length / colunas);
  return { colunas, linhas, largura: colunas * CEL_U + 0.4, altura: linhas * CEL_V * SEN_ELEV + 1.8 };
}

// Escolhe as colunas que deixam os itens maiores na área livre (em pixels).
export function colunasPara(largura, altura) {
  let melhor = 2;
  let escala = 0;
  for (const c of [2, 3, 4]) {
    const m = medidasGrade(c);
    const e = Math.min(largura / m.largura, altura / m.altura);
    if (e > escala + 0.5) [melhor, escala] = [c, e];
  }
  return melhor;
}

export function criarCenaKit() {
  const raiz = new THREE.Group();
  const objLona = lona();
  raiz.add(objLona);

  // Recebe sombra no chão fora da lona.
  const chao = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ opacity: 0.18 }));
  chao.rotation.x = -Math.PI / 2;
  chao.position.y = -0.08;
  chao.receiveShadow = true;
  raiz.add(chao);

  const objetos = {};
  const ancoras = {};
  const sombras = {};
  const texSombra = TX.sombraContato();
  for (const [id, def] of Object.entries(OBJETOS)) {
    const grupo = assetTrocavel(def.glb, def.fabrica(), { girar: def.girar, escala: def.escala });
    const [x, z, r] = def.pos;
    grupo.position.set(x, 0, z);
    grupo.rotation.y = r;
    grupo.userData.toque = id;
    grupo.userData.casa = grupo.position.clone();
    grupo.visible = false;
    raiz.add(grupo);
    objetos[id] = grupo;
    // ponto da etiqueta: topo do objeto
    const caixa = new THREE.Box3().setFromObject(grupo);
    const ancora = new THREE.Object3D();
    ancora.position.set(0, caixa.max.y - caixa.min.y + 0.1, 0);
    grupo.add(ancora);
    ancoras[id] = ancora;
    // Sombra de contato: mancha escura colada na lona, do tamanho da base.
    const larg = (caixa.max.x - caixa.min.x) * 1.35;
    const prof = (caixa.max.z - caixa.min.z) * 1.35;
    const sombra = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: texSombra, transparent: true, opacity: 0.5, depthWrite: false, color: 0x2a2010 }),
    );
    sombra.rotation.x = -Math.PI / 2;
    sombra.position.set((caixa.max.x + caixa.min.x) / 2, 0.006, (caixa.max.z + caixa.min.z) / 2);
    sombra.userData.base = [larg, prof];
    sombra.userData.desvio = [sombra.position.x - x, sombra.position.z - z];
    sombra.scale.set(larg, prof, 1);
    sombra.visible = false;
    sombra.renderOrder = 1;
    raiz.add(sombra);
    sombras[id] = sombra;
  }

  let palco = null;
  const flutuando = new Set();

  // Entrada: cai do alto (aceleração da gravidade), achata no impacto,
  // dá um quique curto e assenta. Nunca passa abaixo da lona.
  function entrar(id, { atraso = 0, reduzido = false } = {}) {
    const o = objetos[id];
    const casa = o.userData.casa;
    const giroFinal = o.userData.giro ?? OBJETOS[id].pos[2];
    o.visible = true;
    if (reduzido) {
      o.position.copy(casa);
      o.scale.setScalar(1);
      o.rotation.y = giroFinal;
      return Promise.resolve();
    }
    const ALTURA = 6;
    const QUEDA = 0.55; // fração do tempo em queda
    o.position.set(casa.x, casa.y + ALTURA, casa.z);
    o.scale.setScalar(0.6);
    return palco.tweens.animar({
      duracao: 1.0,
      atraso,
      ease: easing.linear,
      aoAtualizar: (p) => {
        let y;
        let sx = 1;
        let sy = 1;
        if (p < QUEDA) {
          const t = p / QUEDA;
          y = ALTURA * (1 - t * t);
          const s = 0.6 + 0.4 * Math.min(t * 1.5, 1);
          sx = s;
          sy = s * (1 + 0.12 * t); // estica um pouco na queda
        } else {
          const t = (p - QUEDA) / (1 - QUEDA);
          // quique amortecido acima do chão
          y = Math.abs(Math.sin(t * Math.PI * 2)) * 0.35 * (1 - t) ** 2;
          // achata no impacto e volta
          const impacto = Math.max(0, 1 - t * 4);
          sy = 1 - 0.22 * impacto;
          sx = 1 + 0.12 * impacto;
        }
        o.position.y = casa.y + Math.max(y, 0);
        o.scale.set(sx, sy, sx);
        o.rotation.y = giroFinal + (1 - Math.min(p / QUEDA, 1)) * Math.PI * 0.6;
        if (p >= 1) {
          o.scale.setScalar(1);
          o.rotation.y = giroFinal;
        }
      },
    });
  }

  function mostrarImediato(id) {
    const o = objetos[id];
    o.visible = true;
    o.position.copy(o.userData.casa);
    o.scale.setScalar(1);
    o.rotation.y = o.userData.giro ?? OBJETOS[id].pos[2];
  }

  function ocultar(id) {
    objetos[id].visible = false;
  }

  // Destaque: o objeto sobe um pouco e flutua enquanto selecionado.
  function destacar(ids) {
    flutuando.clear();
    for (const id of ids) flutuando.add(id);
  }

  // Final: tudo entra na mochila.
  async function guardarNaMochila(reduzido) {
    const alvo = objetos.mochila.position.clone().add(new THREE.Vector3(0, 2.2, 0));
    const ids = Object.keys(objetos).filter((id) => id !== 'mochila' && objetos[id].visible);
    flutuando.clear();
    await Promise.all(
      ids.map((id, i) => {
        const o = objetos[id];
        if (reduzido) {
          o.visible = false;
          return null;
        }
        const de = o.position.clone();
        return palco.tweens.animar({
          duracao: 0.7,
          atraso: i * 0.12,
          ease: easing.entradaSaida,
          aoAtualizar: (p) => {
            o.position.lerpVectors(de, alvo, p);
            o.position.y += Math.sin(p * Math.PI) * 2.5;
            o.scale.setScalar(Math.max(0.001, 1 - p * 0.95));
            if (p >= 1) o.visible = false;
          },
        });
      }),
    );
    // mochila "fecha": pulo curto
    if (!reduzido) {
      const m = objetos.mochila;
      await palco.tweens.animar({
        duracao: 0.5,
        ease: easing.saida,
        aoAtualizar: (p) => {
          const s = 1 + Math.sin(p * Math.PI) * 0.12;
          m.scale.set(s, 2 - s, s);
        },
      });
      objetos.mochila.scale.setScalar(1);
    }
  }

  // Troca a disposição: lona horizontal (desktop, colunas = 0) ou grade de
  // 2 a 4 colunas alinhada à tela (celular).
  let colunasAtual = 0;
  function layout(colunas) {
    if (colunas === colunasAtual) return false;
    colunasAtual = colunas;
    if (!colunas) {
      objLona.rotation.y = 0;
      objLona.scale.set(1, 1, 1);
      objLona.position.set(0, 0, 0);
      for (const [id, o] of Object.entries(objetos)) posicionar(o, OBJETOS[id].pos);
      api.enquadramento = ENQ_PAISAGEM;
      return true;
    }
    const m = medidasGrade(colunas);
    // Distribui os grupos por igual entre as linhas (10 em 4 linhas: 3, 3, 2, 2),
    // com as linhas mais curtas centralizadas.
    let i = 0;
    for (let lin = 0; lin < m.linhas; lin++) {
      const naLinha = Math.floor(GRUPOS.length / m.linhas) + (lin < GRUPOS.length % m.linhas ? 1 : 0);
      const v = (lin - (m.linhas - 1) / 2) * CEL_V;
      for (let col = 0; col < naLinha; col++, i++) {
        const u = (col - (naLinha - 1) / 2) * CEL_U;
        for (const [id, du, dv, r] of GRUPOS[i]) posicionar(objetos[id], daTela([u + du, v + dv, r]));
      }
    }
    // A lona gira 45° para alinhar com a tela: x local segue v, z local segue u.
    const sx = (m.linhas * CEL_V + 0.6) / 13;
    const sz = (colunas * CEL_U) / 8.5;
    objLona.rotation.y = -Math.PI / 4;
    objLona.scale.set(sx, 1, sz);
    const desvio = new THREE.Vector3(0, 0, 0.4 * sz).applyAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 4);
    objLona.position.set(-desvio.x, 0, -desvio.z);
    api.enquadramento = { centro: [0, 0.9, 0], largura: m.largura, altura: m.altura };
    return true;
  }

  function posicionar(o, [x, z, r]) {
    o.userData.casa.set(x, 0, z);
    o.userData.giro = r;
    o.position.x = x;
    o.position.z = z;
    o.rotation.y = r;
  }

  function animar(tempo, dt, reduzido) {
    for (const [id, o] of Object.entries(objetos)) {
      // A sombra de contato acompanha o objeto: some e abre conforme ele sobe.
      const s = sombras[id];
      s.visible = o.visible;
      if (o.visible) {
        const alt = Math.max(o.position.y - o.userData.casa.y, 0);
        const k = Math.max(0, 1 - alt / 4);
        const [lw, lp] = s.userData.base;
        const abre = 1 + alt * 0.25;
        const esc = o.scale.x;
        s.scale.set(lw * abre * esc, lp * abre * esc, 1);
        s.material.opacity = 0.5 * k * k;
        s.position.x = o.position.x + s.userData.desvio[0] * esc;
        s.position.z = o.position.z + s.userData.desvio[1] * esc;
      }
      if (!o.visible) continue;
      const casaY = o.userData.casa.y;
      if (flutuando.has(id) && !reduzido) {
        o.position.y += (casaY + 0.35 + Math.sin(tempo * 3) * 0.1 - o.position.y) * Math.min(dt * 8, 1);
      } else if (!palco.tweens.ativos.size) {
        o.position.y += (casaY - o.position.y) * Math.min(dt * 8, 1);
      }
    }
  }

  const api = {
    layout,
    raiz,
    objetos,
    ancoras,
    alvos: Object.values(objetos),
    enquadramento: ENQ_PAISAGEM,
    conectar(p) {
      palco = p;
    },
    entrar,
    mostrarImediato,
    ocultar,
    destacar,
    guardarNaMochila,
    animar,
  };
  return api;
}
