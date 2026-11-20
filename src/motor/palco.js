// Palco 3D em tela cheia: renderizador, câmera isométrica que gira em passos
// de 90°, enquadramento que respeita os painéis por cima da cena, relógio de
// lição (pausa e velocidade) e toque nos objetos.

import * as THREE from 'three';
import { Tweens, easing } from './tween.js';

const movimentoReduzido = window.matchMedia('(prefers-reduced-motion: reduce)');

export function criarPalco(container, { areaLivre }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  container.appendChild(renderer.domElement);

  const cena = new THREE.Scene();
  cena.add(new THREE.HemisphereLight(0xfff4e6, 0x6b5a48, 1.5));
  const sol = new THREE.DirectionalLight(0xffffff, 2.3);
  sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048);
  sol.shadow.bias = -0.0005;
  Object.assign(sol.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 0.5, far: 60 });
  cena.add(sol, sol.target);

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 300);

  // Estado da câmera: alvo, ângulo (azimute) e tamanho visível.
  const vista = {
    alvo: new THREE.Vector3(),
    azimute: Math.PI / 4,
    largura: 24, // largura mínima visível (unidades de cena)
    altura: 16,
  };
  const ELEVACAO = Math.atan(1 / Math.SQRT2); // ~35,26°: isométrica clássica
  const DIST = 40;

  const tweens = new Tweens(); // tempo de lição (pausa/velocidade)
  const tweensUI = new Tweens(); // tempo real (câmera)
  let velocidade = 1;
  let pausado = false;
  let cenaAtual = null;

  function posicionarCamera() {
    const { alvo, azimute } = vista;
    camera.position.set(
      alvo.x + DIST * Math.cos(ELEVACAO) * Math.sin(azimute),
      alvo.y + DIST * Math.sin(ELEVACAO),
      alvo.z + DIST * Math.cos(ELEVACAO) * Math.cos(azimute),
    );
    camera.lookAt(alvo);
    sol.position.copy(alvo).add(new THREE.Vector3(8, 18, 6));
    sol.target.position.copy(alvo);
  }

  // Ajusta o frustum para o enquadramento caber na área livre (sem painéis).
  function redimensionar() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    renderer.setSize(w, h, false);
    const livre = areaLivre?.() ?? { esquerda: 0, topo: 0, direita: 0, base: 0 };
    const wl = Math.max(w - livre.esquerda - livre.direita, 120);
    const hl = Math.max(h - livre.topo - livre.base, 120);
    // unidades por pixel para caber largura e altura na área livre
    const upp = Math.max(vista.largura / wl, vista.altura / hl);
    const meiaW = (w * upp) / 2;
    const meiaH = (h * upp) / 2;
    // desloca o centro do frustum para o centro da área livre
    const dx = ((livre.direita - livre.esquerda) / 2) * upp;
    const dy = ((livre.base - livre.topo) / 2) * upp;
    camera.left = -meiaW + dx;
    camera.right = meiaW + dx;
    camera.top = meiaH - dy;
    camera.bottom = -meiaH - dy;
    camera.updateProjectionMatrix();
  }

  function enquadrar({ centro, largura, altura }, { instantaneo = false } = {}) {
    const de = { ...vista, alvo: vista.alvo.clone() };
    const para = { alvo: new THREE.Vector3(...centro), largura, altura };
    if (instantaneo || movimentoReduzido.matches) {
      Object.assign(vista, para);
      posicionarCamera();
      redimensionar();
      return Promise.resolve();
    }
    return tweensUI.animar({
      duracao: 0.9,
      ease: easing.entradaSaida,
      aoAtualizar: (p) => {
        vista.alvo.lerpVectors(de.alvo, para.alvo, p);
        vista.largura = de.largura + (para.largura - de.largura) * p;
        vista.altura = de.altura + (para.altura - de.altura) * p;
        posicionarCamera();
        redimensionar();
      },
    });
  }

  function girar(passos) {
    const de = vista.azimute;
    const para = de + (passos * Math.PI) / 2;
    if (movimentoReduzido.matches) {
      vista.azimute = para;
      posicionarCamera();
      return;
    }
    tweensUI.animar({
      duracao: 0.6,
      ease: easing.entradaSaida,
      aoAtualizar: (p) => {
        vista.azimute = de + (para - de) * p;
        posicionarCamera();
      },
    });
  }

  function redefinirVista() {
    const de = vista.azimute;
    // volta para o ângulo inicial pelo caminho mais curto
    const voltas = Math.round((de - Math.PI / 4) / (2 * Math.PI));
    const para = Math.PI / 4 + voltas * 2 * Math.PI;
    tweensUI.animar({
      duracao: movimentoReduzido.matches ? 0 : 0.6,
      ease: easing.entradaSaida,
      aoAtualizar: (p) => {
        vista.azimute = de + (para - de) * p;
        posicionarCamera();
      },
    });
    if (cenaAtual?.enquadramento) enquadrar(cenaAtual.enquadramento);
  }

  function definirCena(nova) {
    if (cenaAtual) cena.remove(cenaAtual.raiz);
    tweens.concluirTodos();
    cenaAtual = nova;
    cena.add(nova.raiz);
    if (nova.enquadramento) enquadrar(nova.enquadramento, { instantaneo: true });
  }

  // ---------- Toque ----------
  const raycaster = new THREE.Raycaster();
  const ponteiro = new THREE.Vector2();
  let inicio = null;
  function objetoSob(e) {
    if (!cenaAtual?.alvos?.length) return null;
    const r = renderer.domElement.getBoundingClientRect();
    ponteiro.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ponteiro, camera);
    const hit = raycaster.intersectObjects(cenaAtual.alvos, true)[0];
    if (!hit) return null;
    let o = hit.object;
    while (o && o.userData.toque === undefined) o = o.parent;
    return o?.userData.toque ?? null;
  }
  renderer.domElement.addEventListener('pointerdown', (e) => {
    inicio = { x: e.clientX, y: e.clientY };
  });
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!inicio || Math.hypot(e.clientX - inicio.x, e.clientY - inicio.y) > 10) return;
    const alvo = objetoSob(e);
    if (alvo !== null) cenaAtual?.aoTocar?.(alvo);
  });
  renderer.domElement.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    renderer.domElement.style.cursor = objetoSob(e) !== null ? 'pointer' : '';
  });

  // ---------- Loop ----------
  const ouvintesQuadro = new Set();
  const relogio = new THREE.Timer();
  let tempoLicao = 0;
  renderer.setAnimationLoop((t) => {
    relogio.update(t);
    const dtReal = Math.min(relogio.getDelta(), 0.1);
    const dt = pausado ? 0 : dtReal * velocidade;
    tempoLicao += dt;
    tweensUI.passo(dtReal);
    tweens.passo(dt);
    cenaAtual?.animar?.(tempoLicao, dt, movimentoReduzido.matches);
    renderer.render(cena, camera);
    for (const f of ouvintesQuadro) f();
  });

  new ResizeObserver(() => redimensionar()).observe(container);
  posicionarCamera();
  redimensionar();

  return {
    camera,
    renderer,
    tweens,
    redimensionar,
    enquadrar,
    girar,
    redefinirVista,
    definirCena,
    get cena() {
      return cenaAtual;
    },
    aCadaQuadro: (f) => ouvintesQuadro.add(f),
    get pausado() {
      return pausado;
    },
    set pausado(v) {
      pausado = v;
    },
    get velocidade() {
      return velocidade;
    },
    set velocidade(v) {
      velocidade = v;
    },
    movimentoReduzido: () => movimentoReduzido.matches,
  };
}
