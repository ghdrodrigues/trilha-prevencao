// Texturas pintadas em canvas: rótulos, trama de tecido, metal escovado e
// sombra de contato. Ficam em memória (sem download) e somem quando o GLB do
// Tripo substitui o objeto.

import * as THREE from 'three';

const cache = new Map();

function tela(w, h, pintar) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  pintar(c.getContext('2d'), w, h);
  return c;
}

function textura(chave, w, h, pintar, { cor = true, repetir = null } = {}) {
  if (cache.has(chave)) return cache.get(chave);
  const canvas = tela(w, h, pintar);
  const t = new THREE.CanvasTexture(canvas);
  // Rótulos usam Montserrat: repinta quando a fonte terminar de carregar.
  document.fonts?.ready.then(() => {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, w, h);
    pintar(ctx, w, h);
    t.needsUpdate = true;
  });
  if (cor) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repetir) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(...repetir);
  }
  cache.set(chave, t);
  return t;
}

// Ruído determinístico (mesma textura a cada carga).
function aleatorio(semente) {
  let s = semente >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

// ---------- Relevo (bumpMap): tons de cinza ----------

// Trama de tecido (nylon da mochila, alças).
export const tramaTecido = (rep = [6, 6]) =>
  textura(`trama-${rep}`, 128, 128, (g, w, h) => {
    g.fillStyle = '#808080';
    g.fillRect(0, 0, w, h);
    const passo = 8;
    for (let y = 0; y < h; y += passo) {
      for (let x = 0; x < w; x += passo) {
        const par = ((x + y) / passo) % 2 === 0;
        const grad = par ? g.createLinearGradient(x, y, x + passo, y) : g.createLinearGradient(x, y, x, y + passo);
        grad.addColorStop(0, '#5a5a5a');
        grad.addColorStop(0.5, '#b4b4b4');
        grad.addColorStop(1, '#5a5a5a');
        g.fillStyle = grad;
        g.fillRect(x + 0.5, y + 0.5, passo - 1, passo - 1);
      }
    }
  }, { cor: false, repetir: rep });

// Metal escovado: riscos horizontais finos (roughnessMap).
export const metalEscovado = () =>
  textura('escovado', 256, 256, (g, w, h) => {
    const r = aleatorio(7);
    g.fillStyle = '#6a6a6a';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      const v = 70 + r() * 90;
      g.strokeStyle = `rgba(${v},${v},${v},0.5)`;
      g.lineWidth = r() * 1.2;
      const y = r() * h;
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(w, y + (r() - 0.5) * 2);
      g.stroke();
    }
  }, { cor: false, repetir: [1, 2] });

// ---------- Cor (map) ----------

// Lona de algodão cru: trama fina e manchas leves de uso.
export const lonaCor = () =>
  textura('lona', 512, 512, (g, w, h) => {
    const r = aleatorio(11);
    g.fillStyle = '#ddd2ba';
    g.fillRect(0, 0, w, h);
    // manchas
    for (let i = 0; i < 14; i++) {
      const x = r() * w;
      const y = r() * h;
      const rad = 30 + r() * 90;
      const grad = g.createRadialGradient(x, y, 0, x, y, rad);
      grad.addColorStop(0, `rgba(150,130,95,${0.05 + r() * 0.07})`);
      grad.addColorStop(1, 'rgba(150,130,95,0)');
      g.fillStyle = grad;
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    // trama
    for (let y = 0; y < h; y += 3) {
      g.fillStyle = `rgba(120,100,70,${0.05 + r() * 0.06})`;
      g.fillRect(0, y, w, 1);
    }
    for (let x = 0; x < w; x += 3) {
      g.fillStyle = `rgba(255,255,255,${0.04 + r() * 0.05})`;
      g.fillRect(x, 0, 1, h);
    }
  }, { repetir: [3, 2] });

// Rótulo da garrafa: faixa branca com onda azul e texto genérico.
export const rotuloGarrafa = () =>
  textura('rotulo-garrafa', 512, 128, (g, w, h) => {
    g.fillStyle = '#fbfdff';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#2a78c2';
    g.beginPath();
    g.moveTo(0, h * 0.72);
    for (let x = 0; x <= w; x += 8) g.lineTo(x, h * 0.72 + Math.sin(x / 26) * 7);
    g.lineTo(w, h);
    g.lineTo(0, h);
    g.fill();
    g.fillStyle = '#1d3557';
    g.font = '800 34px Montserrat, Arial, sans-serif';
    g.textAlign = 'center';
    for (const x of [w * 0.25, w * 0.75]) {
      g.fillText('ÁGUA', x, 48);
      g.font = '600 18px "Open Sans", Arial, sans-serif';
      g.fillText('MINERAL · 1,5 L', x, 74);
      g.font = '800 34px Montserrat, Arial, sans-serif';
    }
  });

// Rótulo da lata: vermelho com faixa amarela, tigela e texto genérico.
export const rotuloLata = () =>
  textura('rotulo-lata', 512, 128, (g, w, h) => {
    g.fillStyle = '#c62828';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#f4c20d';
    g.fillRect(0, h * 0.62, w, h * 0.14);
    g.fillStyle = '#7a1414';
    g.fillRect(0, h * 0.06, w, 3);
    g.fillRect(0, h * 0.92, w, 3);
    for (const x of [w * 0.25, w * 0.75]) {
      // grãos de feijão
      for (const [dx, dy, ang] of [[-84, 34, 0.4], [-66, 30, -0.3], [-76, 50, 0.1], [-58, 46, 0.6], [-92, 50, -0.5]]) {
        g.fillStyle = '#4a1f0c';
        g.beginPath();
        g.ellipse(x + dx, dy, 8, 5, ang, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = 'rgba(255,255,255,0.35)';
        g.beginPath();
        g.ellipse(x + dx - 2, dy - 2, 3, 1.5, ang, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = '#ffffff';
      g.font = '800 30px Montserrat, Arial, sans-serif';
      g.textAlign = 'left';
      g.fillText('FEIJÃO', x - 36, 56);
    }
  });

// Embalagem da barra de cereal.
export const embalagemBarra = () =>
  textura('barra', 256, 96, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#f7cf3a');
    grad.addColorStop(1, '#e0a90a');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#4f8a5b';
    g.fillRect(w * 0.3, 0, w * 0.4, h);
    g.fillStyle = '#ffffff';
    g.font = '800 22px Montserrat, Arial, sans-serif';
    g.textAlign = 'center';
    g.fillText('CEREAL', w / 2, h / 2 + 8);
    // grãos
    const r = aleatorio(3);
    for (let i = 0; i < 26; i++) {
      g.fillStyle = r() > 0.5 ? '#8a5a20' : '#c58a3c';
      g.beginPath();
      g.ellipse(10 + r() * (w * 0.26), 10 + r() * (h - 20), 5, 3, r() * 3, 0, Math.PI * 2);
      g.fill();
    }
  });

// Capa de documento genérico (sem brasão nem dados reais).
export const capaDocumento = (cor, texto) =>
  textura(`doc-${cor}-${texto}`, 256, 256, (g, w, h) => {
    g.fillStyle = cor;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,0.35)';
    g.lineWidth = 3;
    g.strokeRect(14, 14, w - 28, h - 28);
    g.fillStyle = '#e8c96a';
    g.font = '800 26px Montserrat, Arial, sans-serif';
    g.textAlign = 'center';
    g.fillText(texto, w / 2, h * 0.58);
  });

// Folha com linhas de texto simuladas.
export const folhaPapel = () =>
  textura('folha', 256, 256, (g, w, h) => {
    g.fillStyle = '#f6f1e4';
    g.fillRect(0, 0, w, h);
    const r = aleatorio(5);
    g.fillStyle = 'rgba(40,40,60,0.45)';
    for (let y = 30; y < h - 20; y += 16) g.fillRect(22, y, 120 + r() * 90, 4);
  });

// Grade do alto-falante do rádio: furos em malha.
export const gradeAltoFalante = () =>
  textura('grade', 128, 128, (g, w, h) => {
    g.fillStyle = '#2b2f36';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#0c0d10';
    for (let y = 6; y < h; y += 10) for (let x = 6 + ((y / 10) % 2) * 5; x < w; x += 10) {
      g.beginPath();
      g.arc(x, y, 3, 0, Math.PI * 2);
      g.fill();
    }
  });

// Sombra de contato: mancha radial escura, opaca no centro.
export const sombraContato = () =>
  textura('sombra', 128, 128, (g, w, h) => {
    const grad = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    grad.addColorStop(0, 'rgba(0,0,0,1)');
    grad.addColorStop(0.45, 'rgba(0,0,0,0.6)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  });

// ---------- Mapa da trilha ----------

// Grama: manchas e tufos em tons claros (multiplica a cor dos vértices).
export const grama = () =>
  textura('grama', 512, 512, (g, w, h) => {
    const r = aleatorio(21);
    g.fillStyle = '#e9efe2';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) {
      const x = r() * w;
      const y = r() * h;
      const rad = 60 + r() * 120;
      const grad = g.createRadialGradient(x, y, 0, x, y, rad);
      const claro = r() > 0.5;
      grad.addColorStop(0, claro ? 'rgba(255,255,230,0.18)' : 'rgba(150,170,120,0.14)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grad;
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    for (let i = 0; i < 5000; i++) {
      const v = r();
      g.fillStyle = v > 0.6 ? 'rgba(255,255,240,0.5)' : 'rgba(110,140,80,0.45)';
      const x = r() * w;
      const y = r() * h;
      g.fillRect(x, y, 1, 2 + r() * 3);
    }
  }, { repetir: [5, 4] });

// Camadas de solo na lateral do diorama.
export const solo = () =>
  textura('solo', 512, 128, (g, w, h) => {
    const r = aleatorio(31);
    const faixas = [
      [0, 0.12, '#5b7f3a'],
      [0.12, 0.45, '#8a6440'],
      [0.45, 0.75, '#74512f'],
      [0.75, 1, '#5e4126'],
    ];
    for (const [a, b, cor] of faixas) {
      g.fillStyle = cor;
      g.beginPath();
      g.moveTo(0, a * h);
      for (let x = 0; x <= w; x += 16) g.lineTo(x, a * h + (a ? Math.sin(x / 37 + a * 9) * 3 : 0));
      g.lineTo(w, b * h);
      g.lineTo(0, b * h);
      g.fill();
    }
    // pedras e raízes
    for (let i = 0; i < 90; i++) {
      const v = 120 + r() * 60;
      g.fillStyle = `rgba(${v},${v - 15},${v - 35},0.8)`;
      g.beginPath();
      g.ellipse(r() * w, h * (0.2 + r() * 0.78), 2 + r() * 5, 1.5 + r() * 3, r() * 3, 0, Math.PI * 2);
      g.fill();
    }
  }, { repetir: [4, 1] });

// Parede de reboco com janelas (e porta na fachada).
export const parede = (comPorta) =>
  textura(`parede-${comPorta}`, 256, 256, (g, w, h) => {
    const r = aleatorio(comPorta ? 41 : 43);
    g.fillStyle = '#f3ede2';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 600; i++) {
      g.fillStyle = `rgba(150,130,100,${r() * 0.08})`;
      g.fillRect(r() * w, r() * h, 2, 2);
    }
    // barra de sujeira perto do chão
    const grad = g.createLinearGradient(0, h * 0.8, 0, h);
    grad.addColorStop(0, 'rgba(120,95,60,0)');
    grad.addColorStop(1, 'rgba(120,95,60,0.35)');
    g.fillStyle = grad;
    g.fillRect(0, h * 0.8, w, h * 0.2);
    const janela = (x, y, jw, jh) => {
      g.fillStyle = '#e2d6bf';
      g.fillRect(x - 6, y - 6, jw + 12, jh + 12);
      g.fillStyle = '#3d5a73';
      g.fillRect(x, y, jw, jh);
      g.fillStyle = 'rgba(255,255,255,0.35)';
      g.fillRect(x + 4, y + 4, jw * 0.35, jh * 0.4);
      g.fillStyle = '#e2d6bf';
      g.fillRect(x + jw / 2 - 2, y, 4, jh);
      g.fillRect(x, y + jh / 2 - 2, jw, 4);
    };
    if (comPorta) {
      g.fillStyle = '#7a4a2a';
      g.fillRect(w * 0.18, h * 0.42, w * 0.22, h * 0.58);
      g.fillStyle = '#e8c96a';
      g.fillRect(w * 0.35, h * 0.72, 6, 6);
      janela(w * 0.56, h * 0.36, w * 0.28, h * 0.26);
    } else {
      janela(w * 0.34, h * 0.32, w * 0.32, h * 0.3);
    }
  });

// Telhas cerâmicas em fileiras.
export const telhas = () =>
  textura('telhas', 256, 256, (g, w, h) => {
    const r = aleatorio(51);
    g.fillStyle = '#b84a32';
    g.fillRect(0, 0, w, h);
    const lh = 22;
    for (let y = 0; y < h; y += lh) {
      for (let x = ((y / lh) % 2) * 14; x < w; x += 28) {
        const v = r() * 30 - 15;
        g.fillStyle = `rgb(${196 + v},${86 + v / 2},${60 + v / 2})`;
        g.beginPath();
        g.ellipse(x + 14, y + lh * 0.55, 13, lh * 0.55, 0, 0, Math.PI);
        g.fill();
      }
      g.fillStyle = 'rgba(60,20,10,0.35)';
      g.fillRect(0, y + lh - 3, w, 3);
    }
  }, { repetir: [2, 2] });

// Água do rio: ondulações claras sobre azul.
export const agua = () =>
  textura('agua', 256, 256, (g, w, h) => {
    const r = aleatorio(61);
    g.fillStyle = '#3f86b8';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 140; i++) {
      g.strokeStyle = `rgba(220,240,255,${0.15 + r() * 0.3})`;
      g.lineWidth = 1 + r() * 1.5;
      const x = r() * w;
      const y = r() * h;
      const l = 10 + r() * 30;
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + l / 2, y - 3, x + l, y);
      g.stroke();
    }
  }, { repetir: [8, 1] });

// Máscara de bordas suaves (alphaMap): branco no meio, some nas bordas.
export const bordaSuave = () =>
  textura('borda', 128, 128, (g, w, h) => {
    g.fillStyle = '#000';
    g.fillRect(0, 0, w, h);
    g.filter = 'blur(10px)';
    g.fillStyle = '#fff';
    g.fillRect(18, 18, w - 36, h - 36);
    g.filter = 'none';
  }, { cor: false });

// Mancha radial branca (tingida pela cor do material): zonas e mapa de risco.
export const manchaRadial = () =>
  textura('mancha', 128, 128, (g, w, h) => {
    const grad = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    grad.addColorStop(0, 'rgba(255,255,255,0.9)');
    grad.addColorStop(0.7, 'rgba(255,255,255,0.75)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  });

// Contorno de zona: borda forte e preenchimento leve (tingido pelo material).
export const anelZona = () =>
  textura('anel-zona', 256, 256, (g, w, h) => {
    const c = w / 2;
    g.fillStyle = 'rgba(255,255,255,0.22)';
    g.beginPath();
    g.arc(c, c, c * 0.9, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(255,255,255,1)';
    g.lineWidth = c * 0.07;
    g.setLineDash([c * 0.16, c * 0.08]);
    g.beginPath();
    g.arc(c, c, c * 0.88, 0, Math.PI * 2);
    g.stroke();
  });

// ---------- Parada 4: sinais de perigo ----------

// Muro de arrimo em blocos de concreto, com juntas e manchas de umidade.
export const blocos = () =>
  textura('blocos', 512, 128, (g, w, h) => {
    const r = aleatorio(71);
    g.fillStyle = '#a9a496';
    g.fillRect(0, 0, w, h);
    const bh = h / 4;
    const bw = w / 12;
    for (let linha = 0; linha < 4; linha++) {
      const off = (linha % 2) * (bw / 2);
      for (let x = -bw; x < w + bw; x += bw) {
        const v = r() * 22 - 11;
        g.fillStyle = `rgb(${178 + v},${173 + v},${160 + v})`;
        g.fillRect(x + off + 2, linha * bh + 2, bw - 4, bh - 4);
      }
    }
    for (let i = 0; i < 900; i++) {
      g.fillStyle = `rgba(90,85,70,${r() * 0.18})`;
      g.fillRect(r() * w, r() * h, 2, 2);
    }
    // escorrido de umidade na base
    const grad = g.createLinearGradient(0, h * 0.55, 0, h);
    grad.addColorStop(0, 'rgba(80,70,50,0)');
    grad.addColorStop(1, 'rgba(80,70,50,0.35)');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  }, { repetir: [2, 1] });

// Água barrenta: faixas de lama clara e escura que escorrem (offset em v).
export const barrenta = () =>
  textura('barrenta', 64, 256, (g, w, h) => {
    const r = aleatorio(81);
    g.fillStyle = '#7d5a35';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) {
      g.strokeStyle = r() > 0.5 ? `rgba(196,160,110,${0.25 + r() * 0.35})` : `rgba(70,45,25,${0.2 + r() * 0.3})`;
      g.lineWidth = 1 + r() * 2;
      const x = r() * w;
      const y = r() * h;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + (r() - 0.5) * 6, y + 10 + r() * 24);
      g.stroke();
    }
  }, { repetir: [1, 3] });

// ---------- Casa realista (paradas 4 e 5) ----------

// Reboco pintado, sem janelas (as esquadrias são geometria).
export const reboco = (cor = '#efe6d6', semente = 91) =>
  textura(`reboco-${cor}-${semente}`, 512, 512, (g, w, h) => {
    const r = aleatorio(semente);
    g.fillStyle = cor;
    g.fillRect(0, 0, w, h);
    // manchas largas e suaves de pintura gasta
    for (let i = 0; i < 26; i++) {
      const x = r() * w;
      const y = r() * h;
      const rad = 40 + r() * 110;
      const grad = g.createRadialGradient(x, y, 0, x, y, rad);
      grad.addColorStop(0, `rgba(${r() > 0.5 ? '255,255,250' : '150,130,105'},0.07)`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grad;
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    // grão do reboco
    for (let i = 0; i < 16000; i++) {
      const v = r();
      g.fillStyle = v > 0.5 ? `rgba(255,255,255,${r() * 0.12})` : `rgba(110,95,75,${r() * 0.1})`;
      g.fillRect(r() * w, r() * h, 1 + r() * 1.5, 1 + r() * 1.5);
    }
    // escorridos de chuva sob o beiral e respingo de barro no rodapé
    for (let i = 0; i < 18; i++) {
      const x = r() * w;
      const grad = g.createLinearGradient(0, 0, 0, h * (0.15 + r() * 0.25));
      grad.addColorStop(0, 'rgba(90,80,65,0.16)');
      grad.addColorStop(1, 'rgba(90,80,65,0)');
      g.fillStyle = grad;
      g.fillRect(x, 0, 3 + r() * 6, h * 0.4);
    }
    const base = g.createLinearGradient(0, h * 0.84, 0, h);
    base.addColorStop(0, 'rgba(120,90,55,0)');
    base.addColorStop(1, 'rgba(120,90,55,0.45)');
    g.fillStyle = base;
    g.fillRect(0, h * 0.84, w, h * 0.16);
  }, { repetir: [1, 1] });

// Telhas cerâmicas tipo colonial, com sombra entre fiadas e variação de queima.
export const telhasColonial = () =>
  textura('telhas-colonial', 512, 512, (g, w, h) => {
    const r = aleatorio(97);
    g.fillStyle = '#8f3a24';
    g.fillRect(0, 0, w, h);
    const cw = 32;
    const lh = 40;
    for (let y = -lh; y < h + lh; y += lh) {
      for (let x = 0; x < w; x += cw) {
        const v = r() * 34 - 17;
        const grad = g.createLinearGradient(x, 0, x + cw, 0);
        grad.addColorStop(0, `rgb(${150 + v},${62 + v / 2},${40 + v / 3})`);
        grad.addColorStop(0.5, `rgb(${200 + v},${96 + v / 2},${66 + v / 3})`);
        grad.addColorStop(1, `rgb(${140 + v},${58 + v / 2},${38 + v / 3})`);
        g.fillStyle = grad;
        g.fillRect(x + 1, y, cw - 2, lh + 6);
        // limo e sujeira
        if (r() > 0.8) {
          g.fillStyle = `rgba(60,70,40,${0.15 + r() * 0.2})`;
          g.fillRect(x + 4, y + lh * 0.5, cw - 8, lh * 0.4);
        }
      }
      g.fillStyle = 'rgba(40,12,5,0.45)';
      g.fillRect(0, y + lh - 2, w, 6);
    }
  }, { repetir: [3, 2] });

// Calçada de cimento com juntas.
export const cimento = () =>
  textura('cimento', 256, 256, (g, w, h) => {
    const r = aleatorio(101);
    g.fillStyle = '#b9b3a7';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 5000; i++) {
      g.fillStyle = r() > 0.5 ? `rgba(255,255,255,${r() * 0.12})` : `rgba(70,65,55,${r() * 0.12})`;
      g.fillRect(r() * w, r() * h, 1.5, 1.5);
    }
    g.fillStyle = 'rgba(70,65,55,0.35)';
    g.fillRect(0, h / 2 - 1, w, 2);
    g.fillRect(w / 2 - 1, 0, 2, h);
  }, { repetir: [2, 2] });
