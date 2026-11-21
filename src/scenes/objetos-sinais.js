// Sinais de perigo para a vitrine da parada 4: cada sinal que a Defesa Civil
// lista vira uma peça isolada (um pedaço de terreno com o sinal), grande e
// sem cenário em volta. Tudo em código, sem créditos.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import * as TX from './texturas.js';
import { criarCasa } from './casa-realista.js';
import { copaRealista } from './cenario-detalhes.js';

const L = 2.4; // lado do pedaço de terreno
const H = 0.32; // espessura

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...extra });

function malha(geo, material, pos = [0, 0, 0], rot = [0, 0, 0]) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(...pos);
  m.rotation.set(...rot);
  return m;
}

// Pedaço de terreno: lados com camadas de solo, topo de grama ou terra.
function terreno({ topo = 'grama', w = L, d = L } = {}) {
  const lado = mat(0xffffff, { map: TX.solo() });
  const cima = topo === 'grama' ? mat(0x86b061, { map: TX.grama() }) : mat(0xa07f58, { roughness: 1 });
  const m = malha(new THREE.BoxGeometry(w, H, d), [lado, lado, cima, lado, lado, lado], [0, H / 2, 0]);
  return m;
}

// Fita escura em zigue-zague (rachadura), deitada num plano.
function zigue(a, b, n, amp, semente) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const desvio = i === 0 || i === n ? 0 : amp * Math.sin(i * 2.1 + semente) * (0.6 + 0.4 * Math.sin(i * 5.3 + semente));
    out.push([a[0] + (b[0] - a[0]) * t - (b[1] - a[1]) * desvio, a[1] + (b[1] - a[1]) * t + (b[0] - a[0]) * desvio]);
  }
  return out;
}
function fenda(pontos, normal, largura) {
  const N = pontos.length - 1;
  const pos = [];
  const lado = new THREE.Vector3();
  const t = new THREE.Vector3();
  const bordas = pontos.map((p, i) => {
    t.subVectors(pontos[Math.min(i + 1, N)], pontos[Math.max(i - 1, 0)]).normalize();
    lado.crossVectors(t, normal).normalize();
    const w = largura * (1 - 0.6 * (i / N)) * (0.75 + 0.25 * Math.sin(i * 2.7));
    return [p.clone().addScaledVector(lado, -w / 2), p.clone().addScaledVector(lado, w / 2)];
  });
  for (let i = 0; i < N; i++) {
    const [a0, b0] = bordas[i];
    const [a1, b1] = bordas[i + 1];
    pos.push(...a0.toArray(), ...b0.toArray(), ...a1.toArray(), ...b0.toArray(), ...b1.toArray(), ...a1.toArray());
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x2a2016, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
}
const noChao = (y) => ([x, z]) => new THREE.Vector3(x, y, z);
const CIMA = new THREE.Vector3(0, 1, 0);

// ---------- Sinais ----------

function chaoRachado() {
  const g = new THREE.Group();
  g.add(terreno({ topo: 'terra' }));
  const y = H + 0.004;
  g.add(fenda(zigue([-1.05, -0.6], [1.0, 0.55], 34, 0.04, 2).map(noChao(y)), CIMA, 0.16));
  g.add(fenda(zigue([-0.1, 0.0], [0.15, 0.95], 14, 0.07, 5).map(noChao(y)), CIMA, 0.09));
  g.add(fenda(zigue([0.4, 0.25], [0.95, -0.4], 10, 0.06, 8).map(noChao(y)), CIMA, 0.07));
  return g;
}

function paredeTrincada() {
  const g = new THREE.Group();
  g.add(terreno());
  const pw = 2.1;
  const ph = 1.7;
  const parede = malha(new THREE.BoxGeometry(pw, ph, 0.22), mat(0xffffff, { map: TX.reboco('#efe6d6', 93) }), [0, H + ph / 2, -0.2]);
  g.add(parede);
  // janela com moldura
  const moldura = mat(0xf4f1ea, { roughness: 0.5 });
  const vidro = new THREE.MeshPhysicalMaterial({ color: 0x2c4658, roughness: 0.08, clearcoat: 1 });
  const jx = -0.35;
  const jy = H + 1.0;
  g.add(malha(new THREE.BoxGeometry(0.72, 0.62, 0.05), moldura, [jx, jy, -0.07]));
  g.add(malha(new THREE.BoxGeometry(0.6, 0.5, 0.06), vidro, [jx, jy, -0.06]));
  g.add(malha(new THREE.BoxGeometry(0.03, 0.5, 0.07), moldura, [jx, jy, -0.05]));
  // trincas saindo dos cantos da janela, na diagonal
  const z = -0.2 + 0.111;
  const naFace = ([u, v]) => new THREE.Vector3(u, v, z);
  const frente = new THREE.Vector3(0, 0, 1);
  g.add(fenda(zigue([jx + 0.36, jy - 0.31], [0.95, H + 0.05], 18, 0.05, 1).map(naFace), frente, 0.05));
  g.add(fenda(zigue([jx - 0.36, jy + 0.31], [-0.95, H + ph - 0.05], 14, 0.06, 3).map(naFace), frente, 0.045));
  g.add(fenda(zigue([0.55, H + 1.55], [0.75, H + 0.9], 10, 0.07, 6).map(naFace), frente, 0.035));
  return g;
}

function chaoEstufado() {
  const g = new THREE.Group();
  g.add(terreno());
  const calota = malha(new THREE.SphereGeometry(0.85, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xa58460, { roughness: 1 }), [0, H - 0.01, 0]);
  calota.scale.set(1, 0.42, 0.75);
  g.add(calota);
  // fenda no alto da saliência
  const pts = zigue([-0.6, -0.05], [0.6, 0.1], 16, 0.08, 4).map(([x, zz]) => {
    const dx = x / 0.85;
    const dz = zz / (0.85 * 0.75);
    return new THREE.Vector3(x, H - 0.01 + 0.85 * 0.42 * Math.sqrt(Math.max(0, 1 - dx * dx - dz * dz)) + 0.012, zz);
  });
  g.add(fenda(pts, CIMA, 0.07));
  return g;
}

function muroEstufado() {
  const g = new THREE.Group();
  g.add(terreno());
  // terra atrás do muro (o barranco que ele segura)
  const lado = mat(0xffffff, { map: TX.solo() });
  g.add(malha(new THREE.BoxGeometry(L, 1.25, 0.9), [lado, lado, mat(0x86b061, { map: TX.grama() }), lado, lado, lado], [0, H + 0.62, -0.75]));
  const larg = 2.3;
  const alt = 1.2;
  const geo = new THREE.BoxGeometry(larg, alt, 0.22, 40, 10, 1);
  const a = geo.attributes.position.array;
  for (let i = 0; i < a.length; i += 3) {
    const fx = Math.exp(-((a[i] / 0.7) ** 2));
    const fy = Math.sin(Math.PI * Math.min(Math.max((a[i + 1] + alt / 2) / alt, 0), 1));
    a[i + 2] += 0.6 * fx * fy;
  }
  geo.computeVertexNormals();
  g.add(malha(geo, mat(0xffffff, { map: TX.blocos(), roughness: 0.95 }), [0, H + alt / 2, -0.2]));
  return g;
}

function arvoreInclinada() {
  const g = new THREE.Group();
  g.add(terreno());
  // grupo girado 45°: x local aponta para a direita da tela
  const tela = new THREE.Group();
  tela.rotation.y = Math.PI / 4;
  g.add(tela);
  const pivo = new THREE.Group();
  pivo.position.set(-0.35, H, 0);
  pivo.rotation.set(0.12, 0, -0.5);
  pivo.add(malha(new THREE.CylinderGeometry(0.09, 0.16, 1.5, 10), mat(0x6b4a2e), [0, 0.75, 0]));
  copaRealista(pivo, 1.5, { raio: 0.7, semente: 4 });
  tela.add(pivo);
  // terra revolvida e raízes expostas do lado de cima (esquerda da tela)
  const cova = malha(new THREE.CircleGeometry(0.5, 28), mat(0x5e4126, { roughness: 1 }), [-0.6, H + 0.006, 0.1], [-Math.PI / 2, 0, 0]);
  cova.scale.set(1.2, 0.8, 1);
  tela.add(cova);
  const matRaiz = mat(0x5c3d22);
  [-0.8, -0.35, 0.1, 0.55, 1.0].forEach((ang, i) => {
    const comp = 0.5 + (i % 2) * 0.22;
    const r = malha(new THREE.CylinderGeometry(0.025, 0.06, comp, 6), matRaiz);
    r.geometry.translate(0, comp / 2, 0);
    r.position.set(-0.4, H + 0.04, 0);
    r.rotation.set(0, -Math.PI / 2 + ang, Math.PI / 2 - 0.3, 'YXZ');
    tela.add(r);
  });
  return g;
}

function posteInclinado() {
  const g = new THREE.Group();
  g.add(terreno());
  const pivo = new THREE.Group();
  pivo.position.set(0, H, 0);
  pivo.rotation.set(0, 0, -0.28);
  const concreto = mat(0x8d8779);
  pivo.add(malha(new THREE.CylinderGeometry(0.06, 0.09, 2.6, 10), concreto, [0, 1.3, 0]));
  pivo.add(malha(new THREE.BoxGeometry(0.85, 0.07, 0.07), mat(0x6b4a2e), [0, 2.4, 0], [0, 0.9, 0]));
  for (const x of [-0.3, 0.3]) pivo.add(malha(new THREE.CylinderGeometry(0.03, 0.03, 0.08, 8), mat(0xe9eef2), [x * 0.62, 2.47, x * -0.78]));
  g.add(pivo);
  // fio esticado até a borda
  const a = new THREE.Vector3(0.62, H + 2.37, -0.25);
  const curva = new THREE.QuadraticBezierCurve3(a, new THREE.Vector3(-0.2, H + 1.75, -0.6), new THREE.Vector3(-1.15, H + 1.9, -0.9));
  g.add(malha(new THREE.TubeGeometry(curva, 30, 0.012, 5), mat(0x222222)));
  // terra levantada na base do lado que cede
  const monte = malha(new THREE.SphereGeometry(0.35, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x8a6440), [-0.22, H - 0.02, 0]);
  monte.scale.set(1, 0.4, 1);
  g.add(monte);
  return g;
}

function barrancoAgua() {
  const g = new THREE.Group();
  g.add(terreno({ d: L }));
  // barranco atrás: bloco alto com a face de terra clara exposta
  const lado = mat(0xffffff, { map: TX.solo() });
  const terra = mat(0xc29a6b, { roughness: 1 });
  g.add(malha(new THREE.BoxGeometry(L, 1.4, 1.0), [lado, lado, mat(0x86b061, { map: TX.grama() }), lado, terra, lado], [0, H + 0.7, -0.7]));
  // água barrenta: sai da face, escorre e forma poça no chão
  const agua = new THREE.MeshStandardMaterial({ color: 0x6e4524, roughness: 0.08, metalness: 0.1, polygonOffset: true, polygonOffsetFactor: -3 });
  g.add(malha(new THREE.PlaneGeometry(0.42, 1.0), agua, [0.15, H + 0.5, -0.195]));
  g.add(malha(new THREE.CircleGeometry(0.14, 20), new THREE.MeshStandardMaterial({ color: 0x3e2614, roughness: 0.6 }), [0.15, H + 1.02, -0.192]));
  g.add(malha(new THREE.PlaneGeometry(0.42, 0.5), agua, [0.15, H + 0.008, 0.05], [-Math.PI / 2, 0, 0]));
  const poca = malha(new THREE.CircleGeometry(0.62, 32), agua, [0.2, H + 0.007, 0.5], [-Math.PI / 2, 0, 0]);
  poca.scale.set(1.2, 0.75, 1);
  g.add(poca);
  return g;
}

// Seta laranja no chão (saída).
function seta() {
  const s = new THREE.Shape();
  s.moveTo(-0.6, -0.14);
  s.lineTo(0.2, -0.14);
  s.lineTo(0.2, -0.34);
  s.lineTo(0.7, 0);
  s.lineTo(0.2, 0.34);
  s.lineTo(0.2, 0.14);
  s.lineTo(-0.6, 0.14);
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2);
  return new THREE.Mesh(geo, mat(0xf77f00, { roughness: 0.5 }));
}

function saida() {
  const g = new THREE.Group();
  g.add(terreno());
  // porta aberta num pedaço de parede
  const parede = mat(0xffffff, { map: TX.reboco('#efe6d6', 95) });
  g.add(malha(new THREE.BoxGeometry(0.55, 1.7, 0.2), parede, [-0.85, H + 0.85, -0.6]));
  g.add(malha(new THREE.BoxGeometry(0.55, 1.7, 0.2), parede, [0.85, H + 0.85, -0.6]));
  g.add(malha(new THREE.BoxGeometry(2.25, 0.35, 0.2), parede, [0, H + 1.53, -0.6]));
  const folha = malha(new THREE.BoxGeometry(1.1, 1.35, 0.06), mat(0x7a4a2a, { roughness: 0.7 }), [0, 0, 0]);
  folha.geometry.translate(0.55, 0, 0);
  folha.position.set(-0.57, H + 0.68, -0.6);
  folha.rotation.y = 1.15;
  g.add(folha);
  const s = seta();
  s.position.set(0.05, H + 0.01, 0.45);
  s.rotation.y = -Math.PI / 2;
  g.add(s);
  return g;
}

function placaAlerta() {
  const g = new THREE.Group();
  const tex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#f77f00';
    ctx.beginPath();
    ctx.moveTo(128, 18);
    ctx.lineTo(240, 230);
    ctx.lineTo(16, 230);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#171a4e';
    ctx.font = '900 150px Montserrat, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', 128, 212);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  g.add(malha(new THREE.CylinderGeometry(0.03, 0.03, 1.2, 8), mat(0x9aa0a6, { metalness: 0.6 }), [0, 0.6, 0]));
  g.add(malha(new THREE.PlaneGeometry(0.75, 0.75), new THREE.MeshStandardMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, roughness: 0.6 }), [0, 1.35, 0.04]));
  return g;
}

function vizinhos() {
  const g = new THREE.Group();
  g.add(terreno({ w: 2.8 }));
  const a = criarCasa({ w: 1.0, h: 0.75, d: 0.85, cor: '#efe6d6', semente: 92, caixaDagua: false, relogio: false });
  a.position.set(-0.8, H, -0.45);
  const b = criarCasa({ w: 1.0, h: 0.75, d: 0.85, cor: '#e8d9c2', semente: 97, caixaDagua: false, relogio: false });
  b.position.set(0.8, H, -0.45);
  const p = placaAlerta();
  p.position.set(0, H, 0.55);
  g.add(a, b, p);
  return g;
}

function telefone199() {
  const g = new THREE.Group();
  const tela = (() => {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 512;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 256, 512);
    ctx.fillStyle = '#262976';
    ctx.fillRect(0, 0, 256, 120);
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 26px Montserrat, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Defesa Civil', 128, 74);
    ctx.fillStyle = '#171a4e';
    ctx.font = '900 110px Montserrat, Arial, sans-serif';
    ctx.fillText('199', 128, 270);
    ctx.fillStyle = '#2e7d32';
    ctx.beginPath();
    ctx.arc(128, 400, 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(128, 400, 20, Math.PI * 0.9, Math.PI * 1.6);
    ctx.stroke();
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const corpo = new THREE.Mesh(new RoundedBoxGeometry(1.0, 2.0, 0.12, 4, 0.12), mat(0x1c1f26, { roughness: 0.35 }));
  const visor = new THREE.Mesh(new THREE.PlaneGeometry(0.88, 1.76), new THREE.MeshStandardMaterial({ map: tela, roughness: 0.2, emissive: 0xffffff, emissiveMap: tela, emissiveIntensity: 0.35 }));
  visor.position.z = 0.062;
  const fone = new THREE.Group();
  fone.add(corpo, visor);
  // em pé, levemente inclinado para trás, apoiado num suporte
  fone.position.set(0, 1.05, 0);
  fone.rotation.x = -0.25;
  g.add(fone);
  g.add(malha(new THREE.BoxGeometry(0.7, 0.12, 0.55), mat(0x9aa0a6, { metalness: 0.5, roughness: 0.4 }), [0, 0.06, 0.1]));
  return g;
}

// ---------- Itens da vitrine ----------
const fixo = (criar, tamanho = 2.6) => ({ criar, tamanho, girar: false });
export const ITENS_SINAIS = {
  chaoRachado: fixo(chaoRachado),
  paredeTrincada: fixo(paredeTrincada),
  chaoEstufado: fixo(chaoEstufado),
  muroEstufado: fixo(muroEstufado),
  arvoreInclinada: fixo(arvoreInclinada),
  posteInclinado: fixo(posteInclinado),
  barranco: fixo(barrancoAgua),
  saida: fixo(saida),
  vizinhos: fixo(vizinhos, 2.8),
  telefone199: { criar: telefone199, tamanho: 2.2 },
};
