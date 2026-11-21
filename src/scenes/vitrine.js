// Vitrine: palco limpo, sem cenário. Mostra só os objetos da etapa atual,
// grandes, cada um num pedestal quadrado. O objeto do subpasso ativo sobe um
// pouco e ganha a borda laranja. Método das lições do exemplo backcountry-101:
// um objeto por subpasso; tocar no objeto abre o subpasso.

import * as THREE from 'three';
import { easing } from '../motor/tween.js';
import * as TX from './texturas.js';

const R2 = Math.SQRT1_2;
// Direções da tela no chão (câmera isométrica a 45°).
const DIREITA = new THREE.Vector3(R2, 0, -R2);
const FRENTE = new THREE.Vector3(R2, 0, R2);
const ALTO_PEDESTAL = 0.14;

// itens: { id: { criar: () => Object3D, tamanho?: número } }
// etapas: [[id, id, ...], ...] na ordem dos subpassos
export function criarVitrine({ itens, etapas, tamanho = 2.2 }) {
  const raiz = new THREE.Group();

  const chao = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.ShadowMaterial({ opacity: 0.22 }));
  chao.rotation.x = -Math.PI / 2;
  chao.receiveShadow = true;
  raiz.add(chao);

  const matPedestal = new THREE.MeshStandardMaterial({ color: 0xeef0f6, roughness: 0.7 });
  const matBorda = new THREE.MeshStandardMaterial({ color: 0xc9cede, roughness: 0.8 });
  const matAtivo = new THREE.MeshStandardMaterial({ color: 0xf77f00, roughness: 0.6 });
  const texSombra = TX.sombraContato();

  const pecas = {};
  const ancoras = {};
  for (const [id, def] of Object.entries(itens)) {
    const peca = new THREE.Group();
    peca.userData.toque = id;
    peca.visible = false;
    // objeto normalizado: a maior medida vira `tamanho` (ou a do item)
    const obj = def.criar();
    const caixa = new THREE.Box3().setFromObject(obj);
    const med = caixa.getSize(new THREE.Vector3());
    const esc = (def.tamanho ?? tamanho) / Math.max(med.x, med.y, med.z, 0.01);
    obj.scale.multiplyScalar(esc);
    const centro = caixa.getCenter(new THREE.Vector3()).multiplyScalar(esc);
    obj.position.set(-centro.x, ALTO_PEDESTAL - caixa.min.y * esc, -centro.z);
    obj.traverse((m) => {
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    const flutua = new THREE.Group();
    flutua.add(obj);
    peca.add(flutua);
    // pedestal quadrado (cantos retos, identidade da Defesa Civil SC)
    const lado = Math.max(med.x, med.z) * esc + 0.7;
    const base = new THREE.Mesh(new THREE.BoxGeometry(lado, ALTO_PEDESTAL, lado), [matBorda, matBorda, matPedestal, matBorda, matBorda, matBorda]);
    base.position.y = ALTO_PEDESTAL / 2;
    base.receiveShadow = true;
    peca.add(base);
    const friso = new THREE.Mesh(new THREE.BoxGeometry(lado + 0.06, 0.05, lado + 0.06), matAtivo);
    friso.position.y = 0.025;
    friso.visible = false;
    peca.add(friso);
    const sombra = new THREE.Mesh(
      new THREE.PlaneGeometry(lado * 1.5, lado * 1.5),
      new THREE.MeshBasicMaterial({ map: texSombra, transparent: true, opacity: 0.35, depthWrite: false, color: 0x0b0d2a }),
    );
    sombra.rotation.x = -Math.PI / 2;
    sombra.position.y = 0.004;
    peca.add(sombra);
    const ancora = new THREE.Object3D();
    ancora.position.set(0, ALTO_PEDESTAL + med.y * esc + 0.15, 0);
    flutua.add(ancora);
    peca.userData = { ...peca.userData, flutua, friso, lado, altura: med.y * esc + ALTO_PEDESTAL, gira: def.girar !== false };
    raiz.add(peca);
    pecas[id] = peca;
    ancoras[id] = ancora;
  }

  let palco = null;
  let ativo = null;
  let etapaAtual = -1;

  // Fila (ou grade, em tela estreita) centrada na origem.
  function dispor(ids, colunas) {
    const n = ids.length;
    const cols = Math.max(1, Math.min(colunas, n));
    const linhas = Math.ceil(n / cols);
    const maior = Math.max(...ids.map((id) => pecas[id].userData.lado));
    // pedestal vira losango na tela: largura ≈ lado × √2
    const passo = maior * 1.42 + 0.5;
    const passoV = maior * 1.42 + 1.2;
    const alt = Math.max(...ids.map((id) => pecas[id].userData.altura));
    ids.forEach((id, i) => {
      const lin = Math.floor(i / cols);
      const naLinha = lin === linhas - 1 ? n - lin * cols : cols;
      const col = i - lin * cols;
      const u = (col - (naLinha - 1) / 2) * passo;
      const v = (lin - (linhas - 1) / 2) * passoV;
      const p = DIREITA.clone().multiplyScalar(u).addScaledVector(FRENTE, v);
      pecas[id].position.copy(p);
    });
    // altura na tela: linhas no chão encurtam (sen da elevação ≈ 0,577)
    return {
      centro: [0, alt * 0.45, 0],
      largura: cols * passo + 0.4,
      altura: (linhas - 1) * passoV * 0.577 + linhas * passo * 0.5 + alt * 0.82 + 1.6,
    };
  }

  // Mostra os objetos da etapa. colunas: quantos cabem lado a lado.
  function mostrarEtapa(ei, { colunas = 4, instantaneo = false } = {}) {
    const ids = etapas[ei] ?? [];
    for (const [id, p] of Object.entries(pecas)) {
      const vis = ids.includes(id);
      if (vis && (!p.visible || etapaAtual !== ei) && !instantaneo && palco && !palco.movimentoReduzido()) {
        p.scale.setScalar(0.001);
        const k = ids.indexOf(id);
        palco.tweens.animar({ duracao: 0.3, atraso: k * 0.05, ease: easing.saida, aoAtualizar: (t) => p.scale.setScalar(Math.max(t, 0.001)) });
      } else if (vis) p.scale.setScalar(1);
      p.visible = vis;
    }
    etapaAtual = ei;
    api.alvos = ids.map((id) => pecas[id]);
    api.enquadramento = dispor(ids, colunas);
    return api.enquadramento;
  }

  function destacar(id) {
    ativo = id;
    for (const [k, p] of Object.entries(pecas)) p.userData.friso.visible = k === id;
  }

  function animar(t, dt, reduzido) {
    for (const [id, p] of Object.entries(pecas)) {
      if (!p.visible) continue;
      const f = p.userData.flutua;
      const alvo = id === ativo && !reduzido ? 0.22 + Math.sin(t * 2.4) * 0.05 : 0;
      f.position.y += (alvo - f.position.y) * Math.min(dt * 8, 1);
      if (id === ativo && !reduzido && p.userData.gira) f.rotation.y += dt * 0.25;
      else f.rotation.y += (0 - f.rotation.y) * Math.min(dt * 6, 1);
    }
  }

  const api = {
    raiz,
    alvos: [],
    ancoras,
    enquadramento: { centro: [0, 1, 0], largura: 8, altura: 5 },
    conectar(p) {
      palco = p;
    },
    mostrarEtapa,
    destacar,
    animar,
    aoTocar: null,
  };
  return api;
}
