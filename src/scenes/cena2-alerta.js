// Cena 2 ("Cadastre o alerta"): o quintal de uma casa do bairro, uma torre de
// celular no morro e um celular grande ao lado da família, cuja tela mostra o
// cadastro por SMS (40199), o WhatsApp da Defesa Civil e o Defesa Civil Alerta.
// Conteúdo: F1, F6, F7 e F8. Tudo em código, sem créditos.

import * as THREE from 'three';
import * as TX from './texturas.js';
import { criarCasa } from './casa-realista.js';
import { grama, cerca, arbusto, bananeira, varal, copaRealista } from './cenario-detalhes.js';

const LARGURA = 11;
const PROFUNDIDADE = 8;
const FUNDO = -1.4;
const LARANJA = '#f77f00';
const INDIGO = '#2b2f7a';

const smooth = (t) => {
  const x = Math.min(Math.max(t, 0), 1);
  return x * x * (3 - 2 * x);
};

export function relevo(x, z) {
  const morro = 1.3 * smooth((x - 2.2) / 2.6) * smooth((0.5 - z) / 2.6);
  return morro + 0.03 * Math.sin(x * 1.2 + z * 0.8);
}

const CASA = { x: -2.2, z: -1.3, w: 2.5, h: 1.45, d: 1.9 };
const TORRE = [4.0, -2.4];
const CELULAR = [0.3, 0.9];

export const ENQUADRAMENTOS_ALERTA = {
  geral: { centro: [0.4, 0.6, -0.2], largura: 11.5, altura: 7.8 },
  celular: { centro: [0.1, 1.1, 0.6], largura: 5.2, altura: 3.7 },
  torre: { centro: [1.8, 1.4, -0.9], largura: 9, altura: 6.4 },
};

export const POSICOES_AGENTE_ALERTA = {
  geral: [1.4, 1.0],
  celular: [1.5, 1.15],
  torre: [1.35, 1.1],
};

const POS_VIZINHO = [-0.75, 0.75];
export const VIZINHOS_ALERTA = {
  encosta: { chave: 'vizinhoEncosta', pos: POS_VIZINHO },
  baixada: { chave: 'vizinhoBaixada', pos: POS_VIZINHO },
  aberto: { chave: 'vizinhoAberto', pos: POS_VIZINHO },
};

// ---------- Terreno ----------

function terreno() {
  const g = new THREE.Group();
  const geo = new THREE.PlaneGeometry(LARGURA, PROFUNDIDADE, 90, 64);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const cores = [];
  const c = new THREE.Color();
  const g1 = new THREE.Color(0x8cbf6a);
  const g2 = new THREE.Color(0x6fa452);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, relevo(x, z));
    const r = 0.5 + 0.25 * Math.sin(x * 1.3 + z * 0.8) + 0.25 * Math.sin(z * 2.1 - x * 0.6);
    c.copy(g1).lerp(g2, r * 0.5);
    cores.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cores, 3));
  geo.computeVertexNormals();
  const chao = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, map: TX.grama(), roughness: 0.95 }));
  chao.receiveShadow = true;
  g.add(chao);

  // calçada de cimento na frente da casa
  const piso = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.4, 20, 4), new THREE.MeshStandardMaterial({ map: TX.cimento(), roughness: 0.95 }));
  piso.geometry.rotateX(-Math.PI / 2);
  const pp = piso.geometry.attributes.position;
  for (let i = 0; i < pp.count; i++) {
    const x = pp.getX(i) + CASA.x + 0.6;
    const z = pp.getZ(i) + 0.75;
    pp.setXYZ(i, x - CASA.x - 0.6, relevo(x, z) + 0.02 - relevo(CASA.x + 0.6, 0.75), z - 0.75);
  }
  piso.geometry.computeVertexNormals();
  piso.position.set(CASA.x + 0.6, relevo(CASA.x + 0.6, 0.75), 0.75);
  piso.receiveShadow = true;
  g.add(piso);

  const matSolo = new THREE.MeshStandardMaterial({ map: TX.solo(), roughness: 1, side: THREE.DoubleSide });
  const lados = [
    (u) => [-LARGURA / 2 + u * LARGURA, PROFUNDIDADE / 2],
    (u) => [LARGURA / 2, -PROFUNDIDADE / 2 + u * PROFUNDIDADE],
    (u) => [-LARGURA / 2 + u * LARGURA, -PROFUNDIDADE / 2],
    (u) => [-LARGURA / 2, -PROFUNDIDADE / 2 + u * PROFUNDIDADE],
  ];
  for (const ladoF of lados) {
    const n = 70;
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

// Torre de telefonia em treliça, com antenas no topo.
function torre() {
  const g = new THREE.Group();
  const aco = new THREE.MeshStandardMaterial({ color: 0xc9ccd0, roughness: 0.45, metalness: 0.6 });
  const H = 3.2;
  const base = 0.32;
  const topo = 0.1;
  const cant = [
    [1, 1],
    [1, -1],
    [-1, -1],
    [-1, 1],
  ];
  const vertical = (a, b) => {
    const v = new THREE.Vector3().subVectors(b, a);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, v.length(), 5), aco);
    m.position.copy(a).addScaledVector(v, 0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize());
    m.castShadow = true;
    g.add(m);
  };
  const ponto = (sx, sz, y) => {
    const r = base + (topo - base) * (y / H);
    return new THREE.Vector3(sx * r, y, sz * r);
  };
  for (const [sx, sz] of cant) vertical(ponto(sx, sz, 0), ponto(sx, sz, H));
  for (let k = 0; k < 6; k++) {
    const y0 = (k / 6) * H;
    const y1 = ((k + 1) / 6) * H;
    for (let i = 0; i < 4; i++) {
      const [ax, az] = cant[i];
      const [bx, bz] = cant[(i + 1) % 4];
      vertical(ponto(ax, az, y0), ponto(bx, bz, y1));
      vertical(ponto(ax, az, y1), ponto(bx, bz, y1));
    }
  }
  const painel = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.5 });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.42, 0.04), painel);
    p.position.set(Math.cos(a) * 0.17, H - 0.15, Math.sin(a) * 0.17);
    p.rotation.y = -a;
    p.castShadow = true;
    g.add(p);
  }
  const luz = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), new THREE.MeshStandardMaterial({ color: 0xff3b30, emissive: 0xff2010, emissiveIntensity: 1.2 }));
  luz.position.y = H + 0.05;
  g.add(luz);
  const [x, z] = TORRE;
  g.position.set(x, relevo(x, z), z);
  return { grupo: g, topo: new THREE.Vector3(x, relevo(x, z) + H - 0.1, z), luz };
}

// Ondas de sinal saindo da torre (anéis que crescem).
function ondasSinal(origem) {
  const g = new THREE.Group();
  g.position.copy(origem);
  const aneis = [];
  for (let i = 0; i < 4; i++) {
    const a = new THREE.Mesh(
      new THREE.TorusGeometry(1, 0.012, 6, 64),
      new THREE.MeshBasicMaterial({ color: 0xf77f00, transparent: true, opacity: 0, depthWrite: false }),
    );
    a.rotation.x = Math.PI / 2;
    g.add(a);
    aneis.push(a);
  }
  return { grupo: g, aneis };
}

// ---------- Tela do celular ----------

function balao(ctx, x, y, w, h, cor) {
  ctx.fillStyle = cor;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 14);
  ctx.fill();
}

function textoQuebrado(ctx, texto, x, y, largura, linha) {
  const palavras = texto.split(' ');
  let atual = '';
  let yy = y;
  for (const p of palavras) {
    const teste = atual ? `${atual} ${p}` : p;
    if (ctx.measureText(teste).width > largura && atual) {
      ctx.fillText(atual, x, yy);
      atual = p;
      yy += linha;
    } else atual = teste;
  }
  if (atual) ctx.fillText(atual, x, yy);
  return yy + linha;
}

// Desenha a tela conforme o estado: sms, whats e alerta (0 a 1 cada).
function desenharTela(ctx, W, H, e) {
  ctx.fillStyle = '#f3f4f8';
  ctx.fillRect(0, 0, W, H);
  // barra de status
  ctx.fillStyle = '#1d1f2b';
  ctx.font = '600 22px Montserrat, Arial, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText('18:40', 28, 34);
  ctx.textAlign = 'right';
  ctx.fillText(e.alerta > 0 || e.torre > 0 ? '5G' : '4G', W - 28, 34);
  ctx.textAlign = 'left';

  const modo = e.whats > 0 ? 'whats' : e.sms > 0 ? 'sms' : 'inicio';
  if (modo === 'inicio') {
    ctx.fillStyle = INDIGO;
    ctx.fillRect(0, 60, W, 90);
    ctx.fillStyle = '#fff';
    ctx.font = '700 30px Montserrat, Arial, sans-serif';
    ctx.fillText('Mensagens', 28, 105);
  } else {
    const whats = modo === 'whats';
    ctx.fillStyle = whats ? '#0f6b5c' : INDIGO;
    ctx.fillRect(0, 60, W, 90);
    ctx.fillStyle = '#fff';
    ctx.font = '700 30px Montserrat, Arial, sans-serif';
    ctx.fillText(whats ? '(61) 2034-4611' : '40199', 28, 98);
    ctx.font = '500 20px Montserrat, Arial, sans-serif';
    ctx.fillText(whats ? 'WhatsApp · Defesa Civil' : 'SMS · Defesa Civil', 28, 128);
    ctx.font = '600 28px Montserrat, Arial, sans-serif';
    const p = whats ? e.whats : e.sms;
    // mensagem enviada
    if (p > 0.15) {
      const t = whats ? 'olá' : 'CEP 88000-000';
      const w = ctx.measureText(t).width + 40;
      balao(ctx, W - w - 24, 190, w, 58, whats ? '#d8f5c6' : '#dfe2ff');
      ctx.fillStyle = '#1d1f2b';
      ctx.fillText(t, W - w - 4, 220);
      if (p > 0.45) {
        ctx.fillStyle = '#4a7bd8';
        ctx.font = '600 20px Montserrat, Arial, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('✓✓ enviada', W - 28, 270);
        ctx.textAlign = 'left';
      }
    }
    if (whats && p > 0.7) {
      balao(ctx, 24, 300, W - 110, 120, '#ffffff');
      ctx.fillStyle = '#1d1f2b';
      ctx.font = '500 22px Montserrat, Arial, sans-serif';
      textoQuebrado(ctx, 'Siga os passos da tela e cadastre as áreas de interesse.', 44, 334, W - 150, 30);
    }
    if (!whats && p > 0.7) {
      ctx.fillStyle = '#5c6070';
      ctx.font = '500 21px Montserrat, Arial, sans-serif';
      textoQuebrado(ctx, 'Gratuito. Envie o CEP da área de interesse.', 28, 320, W - 56, 30);
    }
  }

  // pop-up do Defesa Civil Alerta
  if (e.alerta > 0) {
    ctx.globalAlpha = Math.min(e.alerta * 1.5, 1);
    ctx.fillStyle = 'rgba(15,17,40,0.55)';
    ctx.fillRect(0, 0, W, H);
    const y = 150;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(22, y, W - 44, 470);
    ctx.fillStyle = '#c62828';
    ctx.fillRect(22, y, W - 44, 92);
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 26px Montserrat, Arial, sans-serif';
    ctx.fillText('DEFESA CIVIL ALERTA', 44, y + 34);
    ctx.font = '500 20px Montserrat, Arial, sans-serif';
    ctx.fillText('Mensagem de exemplo', 44, y + 66);
    ctx.fillStyle = '#1d1f2b';
    ctx.font = '600 25px Montserrat, Arial, sans-serif';
    let yy = textoQuebrado(ctx, 'Risco na sua área.', 44, y + 136, W - 88, 34);
    ctx.font = '500 23px Montserrat, Arial, sans-serif';
    yy = textoQuebrado(ctx, 'Siga as recomendações das autoridades locais.', 44, yy + 6, W - 88, 32);
    ctx.fillStyle = INDIGO;
    ctx.fillRect(44, y + 400, W - 88, 50);
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 22px Montserrat, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('OK', W / 2, y + 425);
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  }
}

// Celular grande de pé no quintal, com tela em canvas.
function celular() {
  const g = new THREE.Group();
  const W = 360;
  const H = 720;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const corpo = new THREE.Mesh(new THREE.BoxGeometry(0.66, 1.3, 0.06), new THREE.MeshPhysicalMaterial({ color: 0x1c1e26, roughness: 0.3, metalness: 0.4, clearcoat: 1 }));
  corpo.castShadow = true;
  const tela = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 1.2), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  tela.position.z = 0.031;
  const suporte = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.25), new THREE.MeshStandardMaterial({ color: 0x3a3d48, roughness: 0.6 }));
  suporte.position.set(0, -0.68, -0.02);
  const pivo = new THREE.Group();
  pivo.add(corpo, tela);
  pivo.position.y = 0.71;
  g.add(pivo, suporte);
  const [x, z] = CELULAR;
  g.position.set(x, relevo(x, z), z);
  g.scale.setScalar(1.4);
  return { grupo: g, pivo, ctx, tex, W, H };
}

// Sino cortado (modo silencioso) que aparece ao lado do celular e "toca".
function sinoSilencioso() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = LARANJA;
  ctx.beginPath();
  ctx.arc(64, 64, 60, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 8;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(40, 82);
  ctx.lineTo(88, 82);
  ctx.quadraticCurveTo(80, 74, 80, 60);
  ctx.quadraticCurveTo(80, 36, 64, 34);
  ctx.quadraticCurveTo(48, 36, 48, 60);
  ctx.quadraticCurveTo(48, 74, 40, 82);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(64, 92, 7, 0, Math.PI);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(34, 30);
  ctx.lineTo(94, 98);
  ctx.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0, depthTest: false }));
  s.scale.set(0.34, 0.34, 1);
  s.renderOrder = 10;
  return s;
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

// ---------- Cena ----------

export function criarCenaAlerta({ palco }) {
  const raiz = new THREE.Group();
  raiz.name = 'cena-alerta';
  raiz.add(terreno());

  const casa = criarCasa({
    w: CASA.w,
    h: CASA.h,
    d: CASA.d,
    cor: '#e8eef0',
    semente: 141,
    aberturas: [
      { face: 'frente', tipo: 'porta', u: 0.3, largura: 0.22, altura: 0.62 },
      { face: 'frente', tipo: 'janela', u: 0.7, v: 0.52, largura: 0.3, altura: 0.27 },
      { face: 'leste', tipo: 'janela', u: 0.5, v: 0.52, largura: 0.3, altura: 0.27 },
    ],
  });
  casa.position.set(CASA.x, relevo(CASA.x, CASA.z), CASA.z);
  raiz.add(casa);
  const vizinha = criarCasa({ w: 1.9, h: 1.3, d: 1.6, cor: '#f2dcc8', semente: 143, caixaDagua: false });
  vizinha.position.set(-4.6, relevo(-4.6, -2.2), -2.2);
  raiz.add(vizinha);

  const objTorre = torre();
  raiz.add(objTorre.grupo);
  const objCel = celular();
  raiz.add(objCel.grupo);
  const sino = sinoSilencioso();
  sino.position.set(CELULAR[0] + 0.75, relevo(...CELULAR) + 1.95, CELULAR[1]);
  raiz.add(sino);
  const sinal = ondasSinal(objTorre.topo);
  raiz.add(sinal.grupo);

  raiz.add(
    cerca(relevo, [-5.3, 1.9], [1.9, 1.9], { vao: [0.48, 0.6] }),
    varal(relevo, [-4.6, 0.2], [-3.4, 0.9]),
    bananeira(relevo, -0.6, -2.6, 0.9, 5),
    arbusto(relevo, -0.4, -0.5, 0.9, 3),
    arbusto(relevo, -3.8, -0.1, 0.8, 9),
    arvore(2.4, 2.8, 0.9, 7),
    arvore(-5.0, 3.0, 0.9, 11),
    arvore(5.0, 0.4, 1.0, 13),
    arvore(2.6, -3.2, 0.9, 15),
  );
  raiz.add(
    grama(relevo, {
      area: [-LARGURA / 2 + 0.05, LARGURA / 2 - 0.05, -PROFUNDIDADE / 2 + 0.05, PROFUNDIDADE / 2 - 0.05],
      quantidade: 6500,
      pode: (x, z) =>
        !(Math.abs(x - CASA.x) < 1.4 && Math.abs(z - CASA.z) < 1.1) &&
        !(Math.abs(x + 4.6) < 1.1 && Math.abs(z + 2.2) < 0.95) &&
        !(Math.abs(x - (CASA.x + 0.6)) < 1.75 && Math.abs(z - 0.75) < 0.72) &&
        Math.hypot(x - TORRE[0], z - TORRE[1]) > 0.45,
      semente: 19,
    }),
  );

  const ancora = (x, y, z) => {
    const o = new THREE.Object3D();
    o.position.set(x, y, z);
    raiz.add(o);
    return o;
  };
  const ancoras = {
    celular: ancora(CELULAR[0], relevo(...CELULAR) + 2.1, CELULAR[1]),
    torre: ancora(TORRE[0], objTorre.topo.y + 0.4, TORRE[1]),
    sino: sino,
  };

  const estado = { sms: 0, whats: 0, torre: 0, alerta: 0, silencioso: 0 };
  const DURACAO = { sms: 2.6, whats: 2.6, torre: 2.4, alerta: 1.4, silencioso: 1.2 };
  let ultimo = '';

  function desenhar() {
    const chave = JSON.stringify(estado);
    if (chave !== ultimo) {
      ultimo = chave;
      desenharTela(objCel.ctx, objCel.W, objCel.H, estado);
      objCel.tex.needsUpdate = true;
    }
    sino.material.opacity = smooth(estado.silencioso);
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

  const alvo = new THREE.Vector3();
  function animar(tempo, dt, reduzido) {
    // o celular sempre de frente para a câmera
    const cam = palco.camera.position;
    objCel.grupo.getWorldPosition(alvo);
    objCel.grupo.rotation.y = Math.atan2(cam.x - alvo.x, cam.z - alvo.z);
    objCel.pivo.rotation.x = -0.08;
    if (reduzido) return;
    objTorre.luz.material.emissiveIntensity = 0.6 + 0.8 * (Math.sin(tempo * 3) > 0 ? 1 : 0);
    sinal.aneis.forEach((a, i) => {
      const f = (tempo * 0.35 + i / 4) % 1;
      a.scale.setScalar(0.3 + f * 6);
      a.position.y = -f * 1.2;
      a.material.opacity = 0.75 * (1 - f) * estado.torre;
    });
    // vibração do celular quando o alerta chega
    objCel.pivo.rotation.z = estado.alerta > 0 && estado.alerta < 1 ? 0.03 * Math.sin(tempo * 60) : estado.silencioso > 0 ? 0.015 * Math.sin(tempo * 50) * (Math.sin(tempo * 2) > 0.4 ? 1 : 0) : 0;
    if (estado.silencioso > 0) sino.position.y = relevo(...CELULAR) + 1.95 + Math.sin(tempo * 4) * 0.03;
  }

  const efeitos = { grupo: raiz, ancoras, aplicar, limpar, animar };
  return { raiz, efeitos, alvos: [], enquadramento: ENQUADRAMENTOS_ALERTA.geral };
}
