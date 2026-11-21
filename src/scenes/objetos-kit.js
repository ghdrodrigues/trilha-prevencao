// Itens do kit de emergência para a vitrine da parada 3: um objeto por item
// da lista do Plano Emergencial Familiar (Defesa Civil SC). Os 10 itens com
// GLB do Tripo usam o modelo; os outros são feitos em código, sem créditos.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { assetTrocavel } from './assets.js';
import { OBJETOS } from './cena3-kit.js';
import * as TX from './texturas.js';

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...extra });
const plastico = (color) => mat(color, { roughness: 0.4 });
const caixa = (w, h, d, r = 0.04, seg = 3) => new RoundedBoxGeometry(w, h, d, seg, r);
const torno = (pts, seg = 32) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg);

function malha(geo, material, pos = [0, 0, 0], rot = [0, 0, 0]) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(...pos);
  m.rotation.set(...rot);
  return m;
}

// Textura de canvas simples (rótulos, foto, cédula).
function pintura(w, h, pintar) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  pintar(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function rotulo(texto, fundo, frente = '#ffffff') {
  return pintura(256, 128, (ctx, w, h) => {
    ctx.fillStyle = fundo;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = frente;
    ctx.font = '800 34px Montserrat, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(texto, w / 2, h / 2);
  });
}

// GLB do Tripo (ou o blockout de cena3-kit enquanto o arquivo não existe).
function doKit(id) {
  const def = OBJETOS[id];
  const g = assetTrocavel(def.glb, def.fabrica(), { girar: def.girar, escala: def.escala });
  return g;
}

function varios(ids, posicoes) {
  const g = new THREE.Group();
  ids.forEach((id, i) => {
    const o = doKit(id);
    const [x, z, r] = posicoes[i];
    o.position.set(x, 0, z);
    o.rotation.y = r;
    g.add(o);
  });
  return g;
}

// ---------- Itens feitos em código ----------

function foto() {
  const g = new THREE.Group();
  const img = pintura(256, 200, (ctx, w, h) => {
    const ceu = ctx.createLinearGradient(0, 0, 0, h);
    ceu.addColorStop(0, '#9fd3f2');
    ceu.addColorStop(1, '#e8f4fb');
    ctx.fillStyle = ceu;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#7bb36a';
    ctx.fillRect(0, h * 0.72, w, h * 0.28);
    // quatro pessoas, silhueta simples
    const pessoas = [
      [70, 1, '#3b3fb2'],
      [120, 1.1, '#f77f00'],
      [168, 0.75, '#2e7d32'],
      [205, 0.65, '#c62828'],
    ];
    for (const [x, e, cor] of pessoas) {
      ctx.fillStyle = cor;
      ctx.beginPath();
      ctx.ellipse(x, h * 0.72 - 30 * e, 20 * e, 38 * e, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(x - 20 * e, h * 0.72 - 30 * e, 40 * e, 30 * e);
      ctx.fillStyle = '#e0b08a';
      ctx.beginPath();
      ctx.arc(x, h * 0.72 - 82 * e, 15 * e, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  // moldura de papel fotográfico
  g.add(malha(new THREE.BoxGeometry(1.25, 0.03, 1.0), mat(0xffffff, { roughness: 0.3 }), [0, 0.015, 0]));
  g.add(malha(new THREE.PlaneGeometry(1.1, 0.82), mat(0xffffff, { map: img, roughness: 0.25 }), [0, 0.032, -0.02], [-Math.PI / 2, 0, 0]));
  // segunda foto por baixo, torta
  g.add(malha(new THREE.BoxGeometry(1.25, 0.02, 1.0), mat(0xf2efe8), [0.12, 0.0, 0.1], [0, 0.35, 0]));
  return g;
}

function dinheiro() {
  const g = new THREE.Group();
  const nota = (cor) =>
    pintura(256, 128, (ctx, w, h) => {
      ctx.fillStyle = cor;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 4;
      ctx.strokeRect(8, 8, w - 16, h - 16);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.arc(w * 0.72, h / 2, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.font = '800 36px Montserrat, Arial, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillText('R$', 26, h / 2);
    });
  const cores = ['#6aa6c9', '#d98a4b', '#8bb174'];
  cores.forEach((c, i) => {
    g.add(malha(new THREE.BoxGeometry(1.4, 0.02, 0.7), mat(0xffffff, { map: nota(c), roughness: 0.85 }), [i * 0.05, 0.012 + i * 0.022, i * 0.04], [0, i * 0.12 - 0.12, 0]));
  });
  // moedas
  const moeda = mat(0xc9a646, { metalness: 0.8, roughness: 0.35 });
  for (const [x, z, y] of [[0.75, 0.35, 0.02], [0.95, 0.15, 0.02], [0.85, 0.25, 0.06]]) {
    g.add(malha(new THREE.CylinderGeometry(0.13, 0.13, 0.04, 28), moeda, [x, y, z]));
  }
  return g;
}

function chaves() {
  const g = new THREE.Group();
  const aco = mat(0xc4c9cf, { metalness: 0.85, roughness: 0.3 });
  const latao = mat(0xd4b25a, { metalness: 0.85, roughness: 0.3 });
  // argola
  g.add(malha(new THREE.TorusGeometry(0.28, 0.03, 10, 40), aco, [0, 0.03, 0], [Math.PI / 2, 0, 0]));
  // chave de casa: cabeça redonda e haste dentada
  const chave = (material, ang, comp) => {
    const k = new THREE.Group();
    k.add(malha(new THREE.CylinderGeometry(0.2, 0.2, 0.04, 28), material, [0.42, 0.03, 0]));
    k.add(malha(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 20), mat(0x222222), [0.42, 0.03, 0]));
    k.add(malha(new THREE.BoxGeometry(comp, 0.04, 0.1), material, [0.6 + comp / 2, 0.03, 0]));
    for (let i = 0; i < 4; i++) k.add(malha(new THREE.BoxGeometry(0.06, 0.04, 0.06), material, [0.75 + i * 0.12, 0.03, -0.07 - (i % 2) * 0.03]));
    k.rotation.y = ang;
    return k;
  };
  g.add(chave(latao, 0.2, 0.7));
  g.add(chave(aco, -0.9, 0.6));
  // chave do carro com controle
  const carro = new THREE.Group();
  carro.add(malha(caixa(0.32, 0.12, 0.55, 0.06), plastico(0x22252b), [-0.5, 0.06, 0]));
  for (const z of [-0.1, 0.1]) carro.add(malha(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 16), plastico(0x4a4f57), [-0.5, 0.13, z]));
  carro.add(malha(new THREE.BoxGeometry(0.08, 0.04, 0.5), aco, [-0.5, 0.06, -0.5]));
  carro.rotation.y = 2.4;
  g.add(carro);
  return g;
}

function alcoolGel() {
  const g = new THREE.Group();
  const frasco = new THREE.MeshPhysicalMaterial({ color: 0xdff1fb, roughness: 0.08, transmission: 0.55, transparent: true, opacity: 0.8 });
  g.add(malha(torno([[0, 0], [0.32, 0], [0.34, 0.05], [0.34, 1.0], [0.26, 1.12], [0.12, 1.18], [0, 1.18]]), frasco));
  g.add(malha(torno([[0, 0.03], [0.31, 0.03], [0.31, 0.8], [0, 0.8]]), mat(0xa9dcf5, { roughness: 0.1, transparent: true, opacity: 0.6 })));
  g.add(malha(new THREE.CylinderGeometry(0.345, 0.345, 0.42, 32, 1, true), mat(0xffffff, { map: rotulo('ÁLCOOL 70%', '#1d5fa8'), roughness: 0.4 }), [0, 0.5, 0]));
  // válvula pump
  g.add(malha(new THREE.CylinderGeometry(0.12, 0.12, 0.16, 16), plastico(0xffffff), [0, 1.26, 0]));
  g.add(malha(new THREE.CylinderGeometry(0.03, 0.03, 0.2, 8), plastico(0xffffff), [0, 1.42, 0]));
  g.add(malha(caixa(0.16, 0.08, 0.42, 0.03), plastico(0xffffff), [0, 1.54, 0.12]));
  return g;
}

function protetorRepelente() {
  const g = new THREE.Group();
  const tubo = (cor, texto, x, z, ang) => {
    const t = new THREE.Group();
    t.add(malha(new THREE.CylinderGeometry(0.22, 0.22, 1.1, 28), mat(0xffffff, { map: rotulo(texto, cor), roughness: 0.35 }), [0, 0.55, 0]));
    t.add(malha(new THREE.CylinderGeometry(0.2, 0.22, 0.28, 24), plastico(0xffffff), [0, 1.24, 0]));
    t.position.set(x, 0, z);
    t.rotation.y = ang;
    return t;
  };
  g.add(tubo('#f4a20d', 'FPS 50', -0.3, 0, -0.6));
  g.add(tubo('#2e8b57', 'REPELENTE', 0.3, 0.15, -0.9));
  return g;
}

function fosforoVelas() {
  const g = new THREE.Group();
  const capa = pintura(256, 160, (ctx, w, h) => {
    ctx.fillStyle = '#c62828';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#fff3d6';
    ctx.fillRect(16, 16, w - 32, h - 32);
    ctx.fillStyle = '#c62828';
    ctx.font = '900 40px Montserrat, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('FÓSFOROS', w / 2, h / 2);
  });
  const lixa = mat(0x5a3a28, { roughness: 1 });
  const branco = mat(0xf6efe0);
  // caixa de fósforos (tampa com capa, lixas nas laterais)
  g.add(malha(new THREE.BoxGeometry(0.85, 0.24, 0.55), [lixa, lixa, mat(0xffffff, { map: capa }), branco, branco, branco], [0.35, 0.12, 0.25]));
  // fósforos soltos
  for (let i = 0; i < 3; i++) {
    const f = new THREE.Group();
    f.add(malha(new THREE.BoxGeometry(0.5, 0.03, 0.03), mat(0xe8d3a9), [0, 0, 0]));
    f.add(malha(new THREE.SphereGeometry(0.035, 10, 8), mat(0xb3261e), [0.26, 0, 0]));
    f.position.set(0.3 + i * 0.05, 0.02, -0.25 + i * 0.09);
    f.rotation.y = 0.3 - i * 0.25;
    g.add(f);
  }
  // duas velas
  const cera = mat(0xfbf7ee, { roughness: 0.5 });
  for (const [x, z, alt] of [[-0.45, -0.1, 1.2], [-0.15, 0.25, 1.0]]) {
    g.add(malha(new THREE.CylinderGeometry(0.13, 0.13, alt, 24), cera, [x, alt / 2, z]));
    g.add(malha(new THREE.CylinderGeometry(0.012, 0.012, 0.1, 6), mat(0x222222), [x, alt + 0.05, z]));
  }
  return g;
}

function cobertor() {
  const g = new THREE.Group();
  const trama = TX.tramaTecido([8, 8]);
  const xadrez = pintura(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#3b3fb2';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(247,127,0,0.55)';
    for (let i = 0; i < w; i += 32) {
      ctx.fillRect(i, 0, 8, h);
      ctx.fillRect(0, i, w, 8);
    }
  });
  xadrez.wrapS = xadrez.wrapT = THREE.RepeatWrapping;
  xadrez.repeat.set(3, 3);
  const tecido = mat(0xffffff, { map: xadrez, roughness: 0.95, bumpMap: trama, bumpScale: 1.2 });
  // dobrado em camadas, com a dobra arredondada
  for (let i = 0; i < 3; i++) g.add(malha(caixa(1.6, 0.16, 1.1, 0.08, 4), tecido, [0, 0.08 + i * 0.15, 0]));
  return g;
}

function sacolas() {
  const g = new THREE.Group();
  const plast = new THREE.MeshPhysicalMaterial({ color: 0xf2f4f7, roughness: 0.35, transmission: 0.25, transparent: true, opacity: 0.92 });
  // sacolas dobradas, uma por cima da outra
  for (let i = 0; i < 3; i++) {
    const s = malha(caixa(1.2, 0.07, 0.6, 0.03), plast, [i * 0.05, 0.04 + i * 0.07, i * 0.03], [0, i * 0.15, 0]);
    g.add(s);
  }
  // uma aberta, em pé, com alças
  const aberta = new THREE.Group();
  aberta.add(malha(caixa(0.8, 0.9, 0.35, 0.1, 4), plast, [0, 0.45, 0]));
  for (const x of [-0.22, 0.22]) aberta.add(malha(new THREE.TorusGeometry(0.13, 0.03, 8, 16, Math.PI), plast, [x, 0.9, 0]));
  aberta.position.set(-0.9, 0, -0.1);
  aberta.rotation.y = 0.3;
  g.add(aberta);
  return g;
}

function comprimidos() {
  const g = new THREE.Group();
  // frasco âmbar com tampa branca
  const ambar = new THREE.MeshPhysicalMaterial({ color: 0xc8741d, roughness: 0.15, transmission: 0.3, transparent: true, opacity: 0.9 });
  g.add(malha(new THREE.CylinderGeometry(0.28, 0.28, 0.75, 28), ambar, [-0.45, 0.375, 0]));
  g.add(malha(new THREE.CylinderGeometry(0.29, 0.29, 0.3, 28, 1, true), mat(0xffffff, { map: rotulo('USO DIÁRIO', '#ffffff', '#171a4e') }), [-0.45, 0.38, 0]));
  g.add(malha(new THREE.CylinderGeometry(0.3, 0.3, 0.18, 28), plastico(0xffffff), [-0.45, 0.84, 0]));
  // cartela de comprimidos
  const cartela = new THREE.Group();
  cartela.add(malha(new THREE.BoxGeometry(0.9, 0.02, 0.5), mat(0xdfe3e7, { metalness: 0.6, roughness: 0.35 }), [0, 0.01, 0]));
  const bolha = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.1, transmission: 0.5, transparent: true, opacity: 0.6 });
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 2; j++) {
      cartela.add(malha(new THREE.SphereGeometry(0.06, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), bolha, [-0.32 + i * 0.16, 0.02, -0.11 + j * 0.22]));
      cartela.add(malha(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 12), plastico(0xf4c20d), [-0.32 + i * 0.16, 0.035, -0.11 + j * 0.22]));
    }
  }
  cartela.position.set(0.4, 0, 0.2);
  cartela.rotation.y = -0.4;
  g.add(cartela);
  return g;
}

// ---------- Itens da vitrine (id usado em "objeto" no licoes.json) ----------
export const ITENS_KIT = {
  documentos: { criar: () => doKit('documentos') },
  foto: { criar: foto, tamanho: 1.8 },
  dinheiro: { criar: dinheiro, tamanho: 1.9 },
  chaves: { criar: chaves, tamanho: 1.9 },
  agua: { criar: () => varios(['garrafa1', 'garrafa2'], [[-0.45, 0, 0], [0.45, 0.3, 0.4]]) },
  barras: { criar: () => varios(['barra1', 'barra2'], [[0, -0.3, 0.3], [0.1, 0.3, 0.1]]), tamanho: 2 },
  latas: { criar: () => varios(['lata1', 'lata2', 'lata3'], [[-0.4, -0.25, 0], [0.4, -0.15, 0.5], [0, 0.45, 1]]), tamanho: 2 },
  comprimidos: { criar: comprimidos, tamanho: 1.9 },
  maleta: { criar: () => doKit('remedios') },
  alcool: { criar: alcoolGel, tamanho: 2 },
  protetor: { criar: protetorRepelente, tamanho: 2 },
  lanterna: { criar: () => doKit('lanterna') },
  radio: { criar: () => doKit('radio') },
  carregador: { criar: () => doKit('carregador'), tamanho: 1.9 },
  fosforo: { criar: fosforoVelas, tamanho: 1.9 },
  cobertor: { criar: cobertor, tamanho: 2 },
  sacolas: { criar: sacolas, tamanho: 2 },
  apito: { criar: () => doKit('apito'), tamanho: 1.9 },
};
