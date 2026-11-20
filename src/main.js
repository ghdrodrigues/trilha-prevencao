// Setup Three.js, cena 1 (trilha) e ligação com a interface.

import * as THREE from 'three';
import './style.css';
import dados from '../data/licoes.json';
import { criarCena1 } from './scenes/cena1-terreno.js';
import { criarPainel } from './ui/painel.js';
import { criarSeletorPerfil } from './ui/perfil.js';

const movimentoReduzido = window.matchMedia('(prefers-reduced-motion: reduce)');

// ---------- Renderizador e cena ----------
const palco = document.getElementById('palco');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
palco.appendChild(renderer.domElement);
renderer.domElement.setAttribute('aria-hidden', 'true');

const cena = new THREE.Scene();

cena.add(new THREE.HemisphereLight(0xfff4e6, 0x5a6b7d, 1.4));
const sol = new THREE.DirectionalLight(0xffffff, 2.2);
sol.position.set(8, 14, 6);
sol.castShadow = true;
sol.shadow.mapSize.set(2048, 2048);
Object.assign(sol.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14 });
cena.add(sol);

const cena1 = criarCena1();
cena.add(cena1.raiz);

// Câmera isométrica fixa (ortográfica). O enquadramento cabe o diorama
// tanto em tela larga quanto em retrato (celular).
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
camera.position.set(18, 16, 18);
camera.lookAt(0, 0.6, 0);
const ALVO_LARGURA = 27; // largura visível mínima em unidades de cena
const ALVO_ALTURA = 16; // altura visível mínima
const LARGURA_PAINEL = 412; // painel lateral no desktop (380 px + margens)
const painelEl = document.getElementById('painel');

function redimensionar() {
  const { clientWidth: w, clientHeight: h } = palco;
  renderer.setSize(w, h, false);
  // No desktop, o painel lateral cobre a direita da cena: o diorama
  // se centraliza na área que sobra.
  const painelLateral = !painelEl.hidden && window.matchMedia('(min-width: 1000px)').matches;
  const wUtil = painelLateral ? w - LARGURA_PAINEL : w;
  const aspecto = wUtil / h;
  let meiaAltura = ALVO_ALTURA / 2;
  if (meiaAltura * aspecto < ALVO_LARGURA / 2) meiaAltura = ALVO_LARGURA / 2 / aspecto;
  const meiaLargura = (meiaAltura * w) / h;
  const deslocamento = painelLateral ? (LARGURA_PAINEL / 2) * ((2 * meiaLargura) / w) : 0;
  camera.top = meiaAltura;
  camera.bottom = -meiaAltura;
  camera.left = -meiaLargura + deslocamento;
  camera.right = meiaLargura + deslocamento;
  camera.updateProjectionMatrix();
}
new ResizeObserver(redimensionar).observe(palco);
redimensionar();

// ---------- Toque e clique nos marcadores ----------
const raycaster = new THREE.Raycaster();
const ponteiro = new THREE.Vector2();
let inicioToque = null;

function paradaSob(evento) {
  const r = renderer.domElement.getBoundingClientRect();
  ponteiro.set(((evento.clientX - r.left) / r.width) * 2 - 1, -((evento.clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(ponteiro, camera);
  return raycaster.intersectObjects(cena1.alvos, false)[0]?.object.userData.parada ?? null;
}

renderer.domElement.addEventListener('pointerdown', (e) => {
  inicioToque = { x: e.clientX, y: e.clientY };
});
renderer.domElement.addEventListener('pointerup', (e) => {
  // Ignora arrasto (rolagem da página no celular).
  if (!inicioToque || Math.hypot(e.clientX - inicioToque.x, e.clientY - inicioToque.y) > 10) return;
  const parada = paradaSob(e);
  if (parada) abrirLicao(parada);
});
renderer.domElement.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse') return;
  renderer.domElement.style.cursor = paradaSob(e) ? 'pointer' : '';
});

// ---------- Interface ----------
let perfilAtual = null;
const painel = criarPainel({
  elemento: document.getElementById('painel'),
  dados,
  aoFechar: () => {
    cena1.selecionar(null);
    redimensionar();
  },
  aoNavegar: (id) => abrirLicao(id),
});

function abrirLicao(id) {
  cena1.selecionar(id);
  painel.abrir(id, perfilAtual);
  redimensionar();
  for (const b of document.querySelectorAll('[data-parada]')) {
    b.setAttribute('aria-current', String(Number(b.dataset.parada) === id));
  }
}

criarSeletorPerfil({
  elemento: document.getElementById('perfis'),
  perfis: dados.perfis,
  aoEscolher: (perfil) => {
    perfilAtual = perfil;
    cena1.aplicarPerfil(perfil);
    painel.atualizarPerfil(perfil);
    document.getElementById('lista-paradas').dataset.perfil = perfil;
  },
});

// Lista de paradas em texto: alternativa acessível à cena 3D.
const lista = document.getElementById('lista-paradas');
for (const l of dados.licoes) {
  const li = document.createElement('li');
  const b = document.createElement('button');
  b.type = 'button';
  b.dataset.parada = l.id;
  b.innerHTML = `<span class="num">${l.id}</span> ${l.titulo}`;
  b.addEventListener('click', () => abrirLicao(l.id));
  li.appendChild(b);
  lista.appendChild(li);
}

// ---------- Loop ----------
const relogio = new THREE.Timer();
renderer.setAnimationLoop((t) => {
  relogio.update(t);
  cena1.animar(relogio.getElapsed(), movimentoReduzido.matches);
  renderer.render(cena, camera);
});
