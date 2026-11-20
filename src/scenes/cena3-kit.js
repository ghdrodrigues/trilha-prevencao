// Cena 3: Kit 72h. Uma lona no chão, a mochila laranja ao fundo e os itens
// do kit, cada um um objeto separado (um GLB por objeto, ver assets.js).
// Cada subpasso da lição faz seus objetos entrarem voando e pousarem na lona.

import * as THREE from 'three';
import { assetTrocavel } from './assets.js';
import { easing } from '../motor/tween.js';

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

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, flatShading: true, ...extra });

function malha(geo, material, pos = [0, 0, 0], rot = [0, 0, 0]) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(...pos);
  m.rotation.set(...rot);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// ---------- Objetos (blockout em primitivas) ----------

function mochila() {
  const g = new THREE.Group();
  const corpo = mat(COR.laranja);
  g.add(malha(new THREE.BoxGeometry(1.8, 2.3, 1.1), corpo, [0, 1.15, 0]));
  g.add(malha(new THREE.CylinderGeometry(0.55, 0.55, 1.8, 12, 1, false, 0, Math.PI), corpo, [0, 2.3, 0], [0, 0, Math.PI / 2]));
  g.add(malha(new THREE.BoxGeometry(1.3, 0.9, 0.35), mat(COR.laranjaEscuro), [0, 0.75, 0.68]));
  for (const x of [-0.55, 0.55]) {
    g.add(malha(new THREE.BoxGeometry(0.18, 2.2, 0.12), mat(COR.azul), [x, 1.3, -0.6]));
  }
  g.add(malha(new THREE.TorusGeometry(0.22, 0.05, 6, 12, Math.PI), mat(COR.azul), [0, 2.85, 0]));
  return g;
}

function garrafa() {
  const g = new THREE.Group();
  g.add(malha(new THREE.CylinderGeometry(0.32, 0.32, 1.3, 16), mat(COR.agua, { transparent: true, opacity: 0.85, roughness: 0.2 }), [0, 0.65, 0]));
  g.add(malha(new THREE.CylinderGeometry(0.32, 0.18, 0.25, 16), mat(COR.agua, { transparent: true, opacity: 0.85, roughness: 0.2 }), [0, 1.42, 0]));
  g.add(malha(new THREE.CylinderGeometry(0.19, 0.19, 0.18, 16), mat(COR.tampa), [0, 1.62, 0]));
  g.add(malha(new THREE.CylinderGeometry(0.325, 0.325, 0.4, 16), mat(COR.branco), [0, 0.7, 0]));
  return g;
}

function lata() {
  const g = new THREE.Group();
  g.add(malha(new THREE.CylinderGeometry(0.34, 0.34, 0.62, 18), mat(COR.metal, { metalness: 0.4, roughness: 0.4 }), [0, 0.31, 0]));
  g.add(malha(new THREE.CylinderGeometry(0.345, 0.345, 0.38, 18), mat(COR.vermelho), [0, 0.31, 0]));
  return g;
}

function barra() {
  const g = new THREE.Group();
  g.add(malha(new THREE.BoxGeometry(1.0, 0.16, 0.36), mat(COR.amarelo), [0, 0.08, 0]));
  g.add(malha(new THREE.BoxGeometry(0.4, 0.165, 0.365), mat(COR.verde), [0, 0.08, 0]));
  return g;
}

function documentos() {
  const g = new THREE.Group();
  const cores = [0x3b6fb6, COR.verde, COR.papel];
  cores.forEach((c, i) => {
    g.add(malha(new THREE.BoxGeometry(1.05 - i * 0.12, 0.05, 1.4 - i * 0.15), mat(c), [i * 0.06, 0.04 + i * 0.05, i * 0.04], [0, 0.08 * i, 0]));
  });
  // Saco plástico: caixa transparente por cima.
  g.add(
    malha(new THREE.BoxGeometry(1.35, 0.26, 1.75), new THREE.MeshStandardMaterial({ color: 0xe8f4fb, transparent: true, opacity: 0.35, roughness: 0.1 }), [0.05, 0.13, 0.03]),
  );
  g.add(malha(new THREE.BoxGeometry(1.36, 0.06, 0.08), mat(COR.azul), [0.05, 0.27, -0.84]));
  return g;
}

function lanterna() {
  const g = new THREE.Group();
  g.add(malha(new THREE.CylinderGeometry(0.17, 0.17, 1.0, 12), mat(COR.preto), [0, 0.2, 0], [0, 0, Math.PI / 2]));
  g.add(malha(new THREE.CylinderGeometry(0.3, 0.18, 0.35, 12), mat(COR.laranja), [0.66, 0.3, 0], [0, 0, Math.PI / 2]));
  g.add(malha(new THREE.CylinderGeometry(0.27, 0.27, 0.03, 16), mat(0xfff7c2, { emissive: 0xffe680, emissiveIntensity: 0.6 }), [0.84, 0.3, 0], [0, 0, Math.PI / 2]));
  return g;
}

function radio() {
  const g = new THREE.Group();
  g.add(malha(new THREE.BoxGeometry(1.4, 0.9, 0.5), mat(COR.verde), [0, 0.45, 0]));
  g.add(malha(new THREE.CylinderGeometry(0.28, 0.28, 0.06, 16), mat(COR.preto), [-0.32, 0.45, 0.26], [Math.PI / 2, 0, 0]));
  g.add(malha(new THREE.BoxGeometry(0.5, 0.25, 0.05), mat(COR.papel), [0.32, 0.55, 0.26]));
  g.add(malha(new THREE.CylinderGeometry(0.03, 0.03, 1.1, 6), mat(COR.metalEscuro), [0.55, 1.25, -0.1], [0, 0, -0.35]));
  return g;
}

function carregador() {
  const g = new THREE.Group();
  g.add(malha(new THREE.BoxGeometry(0.6, 0.18, 1.0), mat(COR.azul), [0, 0.09, 0]));
  g.add(malha(new THREE.BoxGeometry(0.3, 0.03, 0.08), mat(0x7cf28a, { emissive: 0x3cc45a, emissiveIntensity: 0.5 }), [0, 0.19, 0.3]));
  g.add(malha(new THREE.TorusGeometry(0.32, 0.035, 6, 20), mat(COR.preto), [0.55, 0.04, -0.2], [Math.PI / 2, 0, 0]));
  return g;
}

function remedios() {
  const g = new THREE.Group();
  g.add(malha(new THREE.BoxGeometry(1.2, 0.55, 0.8), mat(COR.branco), [0, 0.28, 0]));
  g.add(malha(new THREE.BoxGeometry(0.42, 0.04, 0.13), mat(COR.vermelho), [0, 0.57, 0]));
  g.add(malha(new THREE.BoxGeometry(0.13, 0.04, 0.42), mat(COR.vermelho), [0, 0.57, 0]));
  g.add(malha(new THREE.BoxGeometry(0.5, 0.08, 0.1), mat(COR.metalEscuro), [0, 0.6, -0.3]));
  return g;
}

function apito() {
  const g = new THREE.Group();
  g.add(malha(new THREE.CylinderGeometry(0.17, 0.17, 0.55, 12), mat(COR.laranja), [0, 0.17, 0], [0, 0, Math.PI / 2]));
  g.add(malha(new THREE.BoxGeometry(0.4, 0.12, 0.22), mat(COR.laranja), [0.4, 0.22, 0]));
  g.add(malha(new THREE.TorusGeometry(0.12, 0.03, 6, 12), mat(COR.azul), [-0.32, 0.17, 0], [0, Math.PI / 2, 0]));
  // cordão
  const curva = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.42, 0.05, 0),
    new THREE.Vector3(-0.9, 0.03, 0.4),
    new THREE.Vector3(-0.6, 0.03, 0.9),
    new THREE.Vector3(-0.1, 0.03, 0.6),
  ]);
  g.add(malha(new THREE.TubeGeometry(curva, 24, 0.025, 5), mat(COR.azul)));
  return g;
}

function lona() {
  const g = new THREE.Group();
  const l = malha(new THREE.BoxGeometry(13, 0.08, 8.5), mat(COR.lona, { flatShading: false }), [0, -0.04, 0.4]);
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
  documentos: { fabrica: documentos, glb: 'kitDocumentos', pos: [2.0, 2.8, -0.25] },
  lanterna: { fabrica: lanterna, glb: 'kitLanterna', pos: [-1.3, -1.2, 0.5] },
  radio: { fabrica: radio, glb: 'kitRadio', pos: [0.8, -1.7, -0.2] },
  carregador: { fabrica: carregador, glb: 'kitCarregador', pos: [2.6, -1.0, 0.4] },
  remedios: { fabrica: remedios, glb: 'kitRemedios', pos: [4.6, 2.3, -0.2] },
  apito: { fabrica: apito, glb: 'kitApito', pos: [4.5, -1.1, 0.6] },
};

export function criarCenaKit() {
  const raiz = new THREE.Group();
  raiz.add(lona());

  // Recebe sombra no chão fora da lona.
  const chao = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ opacity: 0.18 }));
  chao.rotation.x = -Math.PI / 2;
  chao.position.y = -0.08;
  chao.receiveShadow = true;
  raiz.add(chao);

  const objetos = {};
  const ancoras = {};
  for (const [id, def] of Object.entries(OBJETOS)) {
    const grupo = assetTrocavel(def.glb, def.fabrica());
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
  }

  let palco = null;
  const flutuando = new Set();

  // Entrada: cai do alto girando e pousa no lugar com um quique.
  function entrar(id, { atraso = 0, reduzido = false } = {}) {
    const o = objetos[id];
    const casa = o.userData.casa;
    o.visible = true;
    if (reduzido) {
      o.position.copy(casa);
      o.scale.setScalar(1);
      return Promise.resolve();
    }
    const giro = o.rotation.y;
    o.position.set(casa.x, 7, casa.z);
    o.scale.setScalar(0.001);
    return palco.tweens.animar({
      duracao: 0.85,
      atraso,
      ease: easing.pouso,
      aoAtualizar: (p) => {
        o.position.y = 7 * (1 - p);
        o.scale.setScalar(Math.max(0.001, Math.min(1, p * 1.6)));
        o.rotation.y = giro + (1 - p) * Math.PI;
      },
    });
  }

  function mostrarImediato(id) {
    const o = objetos[id];
    o.visible = true;
    o.position.copy(o.userData.casa);
    o.scale.setScalar(1);
    o.rotation.y = OBJETOS[id].pos[2];
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

  function animar(tempo, dt, reduzido) {
    for (const [id, o] of Object.entries(objetos)) {
      if (!o.visible) continue;
      const casaY = o.userData.casa.y;
      if (flutuando.has(id) && !reduzido) {
        o.position.y += (casaY + 0.35 + Math.sin(tempo * 3) * 0.1 - o.position.y) * Math.min(dt * 8, 1);
      } else if (!palco.tweens.ativos.size) {
        o.position.y += (casaY - o.position.y) * Math.min(dt * 8, 1);
      }
    }
  }

  return {
    raiz,
    objetos,
    ancoras,
    alvos: Object.values(objetos),
    enquadramento: { centro: [0, 0.6, 0.8], largura: 15, altura: 10 },
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
}
